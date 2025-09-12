"""
Alerting Service
Handles alert notifications and escalation for the F1 MCP Server monitoring system.
"""

import asyncio
import smtplib
import json
import time
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import logging
import aiohttp

from .alert import AlertManager, Alert, AlertType, AlertSeverity, AlertChannel, AlertStatus
from .health_monitor import health_monitor

logger = logging.getLogger(__name__)


@dataclass
class NotificationChannel:
    """Notification channel configuration"""
    name: str
    channel_type: AlertChannel
    enabled: bool = True
    config: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "channel_type": self.channel_type.value,
            "enabled": self.enabled,
            "config": self.config
        }


@dataclass
class EscalationPolicy:
    """Alert escalation policy"""
    name: str
    escalation_rules: List[Dict[str, Any]] = field(default_factory=list)
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "escalation_rules": self.escalation_rules,
            "enabled": self.enabled
        }


class AlertingService:
    """Alerting service for notifications and escalation"""
    
    def __init__(self, config_path: str = "config.yml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.alert_manager = AlertManager()
        self.notification_channels: Dict[str, NotificationChannel] = {}
        self.escalation_policies: Dict[str, EscalationPolicy] = {}
        self.alerting_active = False
        self.notification_history: List[Dict[str, Any]] = []
        self.escalation_timers: Dict[str, asyncio.Task] = {}
        
        # Initialize notification channels and escalation policies
        self._setup_notification_channels()
        self._setup_escalation_policies()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "alerting": {
                "enabled": True,
                "notification_channels": {
                    "email": {
                        "enabled": True,
                        "smtp_server": "localhost",
                        "smtp_port": 587,
                        "username": "alerts@f1mcp.com",
                        "password": "password",
                        "from_email": "alerts@f1mcp.com",
                        "to_emails": ["admin@f1mcp.com"]
                    },
                    "slack": {
                        "enabled": False,
                        "webhook_url": "https://hooks.slack.com/services/...",
                        "channel": "#alerts"
                    },
                    "webhook": {
                        "enabled": False,
                        "url": "https://api.example.com/alerts",
                        "headers": {"Authorization": "Bearer token"}
                    }
                },
                "escalation_policies": {
                    "default": {
                        "enabled": True,
                        "rules": [
                            {
                                "delay_minutes": 15,
                                "channels": ["email"],
                                "severity": ["critical", "high"]
                            },
                            {
                                "delay_minutes": 60,
                                "channels": ["slack", "webhook"],
                                "severity": ["critical"]
                            }
                        ]
                    }
                }
            }
        }
    
    def _setup_notification_channels(self):
        """Setup notification channels"""
        channels_config = self.config.get("alerting", {}).get("notification_channels", {})
        
        # Email channel
        email_config = channels_config.get("email", {})
        if email_config.get("enabled", False):
            self.notification_channels["email"] = NotificationChannel(
                name="email",
                channel_type=AlertChannel.EMAIL,
                enabled=True,
                config=email_config
            )
        
        # Slack channel
        slack_config = channels_config.get("slack", {})
        if slack_config.get("enabled", False):
            self.notification_channels["slack"] = NotificationChannel(
                name="slack",
                channel_type=AlertChannel.SLACK,
                enabled=True,
                config=slack_config
            )
        
        # Webhook channel
        webhook_config = channels_config.get("webhook", {})
        if webhook_config.get("enabled", False):
            self.notification_channels["webhook"] = NotificationChannel(
                name="webhook",
                channel_type=AlertChannel.WEBHOOK,
                enabled=True,
                config=webhook_config
            )
        
        logger.info(f"Setup {len(self.notification_channels)} notification channels")
    
    def _setup_escalation_policies(self):
        """Setup escalation policies"""
        policies_config = self.config.get("alerting", {}).get("escalation_policies", {})
        
        for policy_name, policy_config in policies_config.items():
            if policy_config.get("enabled", True):
                policy = EscalationPolicy(
                    name=policy_name,
                    escalation_rules=policy_config.get("rules", []),
                    enabled=True
                )
                self.escalation_policies[policy_name] = policy
        
        logger.info(f"Setup {len(self.escalation_policies)} escalation policies")
    
    async def start_alerting(self):
        """Start alerting service"""
        if self.alerting_active:
            logger.warning("Alerting service is already active")
            return
        
        self.alerting_active = True
        logger.info("Starting alerting service...")
        
        # Start monitoring loop
        asyncio.create_task(self._alerting_loop())
        
        logger.info("Alerting service started")
    
    async def stop_alerting(self):
        """Stop alerting service"""
        self.alerting_active = False
        
        # Cancel escalation timers
        for timer in self.escalation_timers.values():
            if not timer.done():
                timer.cancel()
        
        logger.info("Alerting service stopped")
    
    async def _alerting_loop(self):
        """Main alerting loop"""
        while self.alerting_active:
            try:
                # Check for new alerts
                await self._process_new_alerts()
                
                # Check for escalations
                await self._process_escalations()
                
                # Wait for next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in alerting loop: {e}")
                await asyncio.sleep(5)  # Short delay before retry
    
    async def _process_new_alerts(self):
        """Process new alerts"""
        active_alerts = self.alert_manager.get_active_alerts()
        
        for alert in active_alerts:
            # Check if alert needs immediate notification
            if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
                if not alert.notifications_sent:
                    await self._send_immediate_notification(alert)
            
            # Setup escalation timer if not already set
            if alert.id not in self.escalation_timers:
                await self._setup_escalation_timer(alert)
    
    async def _process_escalations(self):
        """Process alert escalations"""
        alerts_for_escalation = self.alert_manager.get_alerts_for_escalation()
        
        for alert in alerts_for_escalation:
            await self._escalate_alert(alert)
    
    async def _send_immediate_notification(self, alert: Alert):
        """Send immediate notification for critical alerts"""
        try:
            # Determine which channels to use based on severity
            channels_to_notify = self._get_channels_for_severity(alert.severity)
            
            for channel_name in channels_to_notify:
                if channel_name in self.notification_channels:
                    channel = self.notification_channels[channel_name]
                    if channel.enabled:
                        await self._send_notification(alert, channel)
                        alert.add_notification_sent(channel.channel_type)
            
            logger.info(f"Sent immediate notification for alert {alert.id}")
            
        except Exception as e:
            logger.error(f"Error sending immediate notification: {e}")
    
    async def _setup_escalation_timer(self, alert: Alert):
        """Setup escalation timer for an alert"""
        try:
            # Get escalation policy for alert
            policy = self.escalation_policies.get("default")
            if not policy or not policy.enabled:
                return
            
            # Find applicable escalation rule
            for rule in policy.escalation_rules:
                if alert.severity.value in rule.get("severity", []):
                    delay_minutes = rule.get("delay_minutes", 60)
                    delay_seconds = delay_minutes * 60
                    
                    # Create escalation task
                    async def escalate_after_delay():
                        await asyncio.sleep(delay_seconds)
                        await self._escalate_alert(alert, rule)
                    
                    self.escalation_timers[alert.id] = asyncio.create_task(escalate_after_delay())
                    break
            
        except Exception as e:
            logger.error(f"Error setting up escalation timer: {e}")
    
    async def _escalate_alert(self, alert: Alert, rule: Optional[Dict[str, Any]] = None):
        """Escalate an alert"""
        try:
            if not rule:
                # Use default escalation rule
                policy = self.escalation_policies.get("default")
                if policy and policy.enabled:
                    for escalation_rule in policy.escalation_rules:
                        if alert.severity.value in escalation_rule.get("severity", []):
                            rule = escalation_rule
                            break
            
            if not rule:
                return
            
            # Escalate the alert
            alert.escalate()
            
            # Send notifications to escalation channels
            escalation_channels = rule.get("channels", [])
            for channel_name in escalation_channels:
                if channel_name in self.notification_channels:
                    channel = self.notification_channels[channel_name]
                    if channel.enabled:
                        await self._send_notification(alert, channel)
                        alert.add_notification_sent(channel.channel_type)
            
            logger.info(f"Escalated alert {alert.id} (escalation count: {alert.escalation_count})")
            
        except Exception as e:
            logger.error(f"Error escalating alert {alert.id}: {e}")
    
    def _get_channels_for_severity(self, severity: AlertSeverity) -> List[str]:
        """Get notification channels for severity level"""
        if severity == AlertSeverity.CRITICAL:
            return ["email", "slack", "webhook"]
        elif severity == AlertSeverity.HIGH:
            return ["email", "slack"]
        elif severity == AlertSeverity.MEDIUM:
            return ["email"]
        else:
            return ["email"]
    
    async def _send_notification(self, alert: Alert, channel: NotificationChannel):
        """Send notification via specific channel"""
        try:
            if channel.channel_type == AlertChannel.EMAIL:
                await self._send_email_notification(alert, channel)
            elif channel.channel_type == AlertChannel.SLACK:
                await self._send_slack_notification(alert, channel)
            elif channel.channel_type == AlertChannel.WEBHOOK:
                await self._send_webhook_notification(alert, channel)
            
            # Record notification in history
            self.notification_history.append({
                "alert_id": alert.id,
                "channel": channel.name,
                "timestamp": datetime.now().isoformat(),
                "success": True
            })
            
        except Exception as e:
            logger.error(f"Error sending notification via {channel.name}: {e}")
            
            # Record failed notification
            self.notification_history.append({
                "alert_id": alert.id,
                "channel": channel.name,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "error": str(e)
            })
    
    async def _send_email_notification(self, alert: Alert, channel: NotificationChannel):
        """Send email notification"""
        config = channel.config
        
        # Create email message
        msg = MimeMultipart()
        msg['From'] = config.get("from_email", "alerts@f1mcp.com")
        msg['To'] = ", ".join(config.get("to_emails", []))
        msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
        
        # Create email body
        body = f"""
Alert Details:
- ID: {alert.id}
- Type: {alert.type.value}
- Severity: {alert.severity.value}
- Title: {alert.title}
- Message: {alert.message}
- Created: {alert.created_at.isoformat()}
- Escalation Count: {alert.escalation_count}

Context:
{json.dumps(alert.context.to_dict() if alert.context else {}, indent=2)}

Please investigate this alert promptly.
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        # Send email
        server = smtplib.SMTP(config.get("smtp_server", "localhost"), config.get("smtp_port", 587))
        server.starttls()
        
        if config.get("username") and config.get("password"):
            server.login(config["username"], config["password"])
        
        text = msg.as_string()
        server.sendmail(msg['From'], config.get("to_emails", []), text)
        server.quit()
        
        logger.info(f"Sent email notification for alert {alert.id}")
    
    async def _send_slack_notification(self, alert: Alert, channel: NotificationChannel):
        """Send Slack notification"""
        config = channel.config
        webhook_url = config.get("webhook_url")
        
        if not webhook_url:
            raise ValueError("Slack webhook URL not configured")
        
        # Create Slack message
        color = {
            AlertSeverity.CRITICAL: "danger",
            AlertSeverity.HIGH: "warning",
            AlertSeverity.MEDIUM: "warning",
            AlertSeverity.LOW: "good",
            AlertSeverity.INFO: "good"
        }.get(alert.severity, "warning")
        
        slack_message = {
            "channel": config.get("channel", "#alerts"),
            "username": "F1 MCP Server Alerts",
            "icon_emoji": ":warning:",
            "attachments": [
                {
                    "color": color,
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {
                            "title": "Severity",
                            "value": alert.severity.value.upper(),
                            "short": True
                        },
                        {
                            "title": "Type",
                            "value": alert.type.value,
                            "short": True
                        },
                        {
                            "title": "Created",
                            "value": alert.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                            "short": True
                        },
                        {
                            "title": "Escalation Count",
                            "value": str(alert.escalation_count),
                            "short": True
                        }
                    ],
                    "footer": "F1 MCP Server Monitoring",
                    "ts": int(alert.created_at.timestamp())
                }
            ]
        }
        
        # Send to Slack
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=slack_message) as response:
                if response.status != 200:
                    raise Exception(f"Slack webhook returned status {response.status}")
        
        logger.info(f"Sent Slack notification for alert {alert.id}")
    
    async def _send_webhook_notification(self, alert: Alert, channel: NotificationChannel):
        """Send webhook notification"""
        config = channel.config
        webhook_url = config.get("url")
        
        if not webhook_url:
            raise ValueError("Webhook URL not configured")
        
        # Create webhook payload
        payload = {
            "alert": alert.to_dict(),
            "timestamp": datetime.now().isoformat(),
            "source": "f1-mcp-server-monitoring"
        }
        
        headers = config.get("headers", {})
        headers["Content-Type"] = "application/json"
        
        # Send webhook
        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook_url,
                json=payload,
                headers=headers
            ) as response:
                if response.status not in [200, 201, 202]:
                    raise Exception(f"Webhook returned status {response.status}")
        
        logger.info(f"Sent webhook notification for alert {alert.id}")
    
    def create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Create a new alert"""
        alert = self.alert_manager.create_alert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            context=context
        )
        
        logger.info(f"Created alert {alert.id}: {title}")
        return alert
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        success = self.alert_manager.acknowledge_alert(alert_id, user_id)
        if success:
            # Cancel escalation timer
            if alert_id in self.escalation_timers:
                timer = self.escalation_timers.pop(alert_id)
                if not timer.done():
                    timer.cancel()
            
            logger.info(f"Alert {alert_id} acknowledged by {user_id}")
        
        return success
    
    def resolve_alert(self, alert_id: str, user_id: str) -> bool:
        """Resolve an alert"""
        success = self.alert_manager.resolve_alert(alert_id, user_id)
        if success:
            # Cancel escalation timer
            if alert_id in self.escalation_timers:
                timer = self.escalation_timers.pop(alert_id)
                if not timer.done():
                    timer.cancel()
            
            logger.info(f"Alert {alert_id} resolved by {user_id}")
        
        return success
    
    def get_active_alerts(self) -> List[Alert]:
        """Get active alerts"""
        return self.alert_manager.get_active_alerts()
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary"""
        summary = self.alert_manager.get_alert_summary()
        summary.update({
            "notification_channels": len(self.notification_channels),
            "escalation_policies": len(self.escalation_policies),
            "escalation_timers_active": len(self.escalation_timers),
            "notification_history_size": len(self.notification_history)
        })
        return summary
    
    def get_notification_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get notification history"""
        return self.notification_history[-limit:]
    
    def is_alerting_active(self) -> bool:
        """Check if alerting is active"""
        return self.alerting_active


# Global alerting service instance
alerting_service = AlertingService()
