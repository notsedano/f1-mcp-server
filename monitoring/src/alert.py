"""
Alert Model
Represents system alerts and notifications for F1 MCP Server monitoring.
"""

import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AlertType(str, Enum):
    """Types of alerts"""
    HEALTH = "health"
    PERFORMANCE = "performance"
    SECURITY = "security"
    CAPACITY = "capacity"
    AVAILABILITY = "availability"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class AlertChannel(str, Enum):
    """Alert notification channels"""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SMS = "sms"
    PAGERDUTY = "pagerduty"


@dataclass
class AlertContext:
    """Additional context for alerts"""
    service_name: Optional[str] = None
    hostname: Optional[str] = None
    environment: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "service_name": self.service_name,
            "hostname": self.hostname,
            "environment": self.environment,
            "user_id": self.user_id,
            "request_id": self.request_id,
            "metadata": self.metadata
        }


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    condition: str
    severity: AlertSeverity
    channels: List[AlertChannel]
    cooldown_minutes: int = 15
    enabled: bool = True
    description: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "condition": self.condition,
            "severity": self.severity.value,
            "channels": [ch.value for ch in self.channels],
            "cooldown_minutes": self.cooldown_minutes,
            "enabled": self.enabled,
            "description": self.description
        }


@dataclass
class Alert:
    """Alert model"""
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    status: AlertStatus = AlertStatus.ACTIVE
    created_at: datetime = field(default_factory=datetime.now)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    context: Optional[AlertContext] = None
    rule_name: Optional[str] = None
    notifications_sent: List[AlertChannel] = field(default_factory=list)
    escalation_count: int = 0
    tags: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate alert after initialization"""
        self._validate_alert()
    
    def _validate_alert(self):
        """Validate alert data"""
        if not self.id:
            raise ValueError("Alert ID is required")
        
        if not self.title:
            raise ValueError("Alert title is required")
        
        if not self.message:
            raise ValueError("Alert message is required")
        
        if not isinstance(self.type, AlertType):
            raise ValueError(f"Invalid alert type: {self.type}")
        
        if not isinstance(self.severity, AlertSeverity):
            raise ValueError(f"Invalid alert severity: {self.severity}")
        
        if not isinstance(self.status, AlertStatus):
            raise ValueError(f"Invalid alert status: {self.status}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "type": self.type.value,
            "severity": self.severity.value,
            "title": self.title,
            "message": self.message,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "acknowledged_by": self.acknowledged_by,
            "resolved_by": self.resolved_by,
            "context": self.context.to_dict() if self.context else None,
            "rule_name": self.rule_name,
            "notifications_sent": [ch.value for ch in self.notifications_sent],
            "escalation_count": self.escalation_count,
            "tags": self.tags
        }
    
    def acknowledge(self, user_id: str) -> bool:
        """Acknowledge the alert"""
        if self.status == AlertStatus.ACTIVE:
            self.status = AlertStatus.ACKNOWLEDGED
            self.acknowledged_at = datetime.now()
            self.acknowledged_by = user_id
            logger.info(f"Alert {self.id} acknowledged by {user_id}")
            return True
        return False
    
    def resolve(self, user_id: str) -> bool:
        """Resolve the alert"""
        if self.status in [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED]:
            self.status = AlertStatus.RESOLVED
            self.resolved_at = datetime.now()
            self.resolved_by = user_id
            logger.info(f"Alert {self.id} resolved by {user_id}")
            return True
        return False
    
    def suppress(self) -> bool:
        """Suppress the alert"""
        if self.status == AlertStatus.ACTIVE:
            self.status = AlertStatus.SUPPRESSED
            logger.info(f"Alert {self.id} suppressed")
            return True
        return False
    
    def is_active(self) -> bool:
        """Check if alert is active"""
        return self.status == AlertStatus.ACTIVE
    
    def is_acknowledged(self) -> bool:
        """Check if alert is acknowledged"""
        return self.status == AlertStatus.ACKNOWLEDGED
    
    def is_resolved(self) -> bool:
        """Check if alert is resolved"""
        return self.status == AlertStatus.RESOLVED
    
    def is_suppressed(self) -> bool:
        """Check if alert is suppressed"""
        return self.status == AlertStatus.SUPPRESSED
    
    def get_age(self) -> timedelta:
        """Get age of the alert"""
        return datetime.now() - self.created_at
    
    def is_stale(self, stale_hours: int = 24) -> bool:
        """Check if alert is stale"""
        return self.get_age() > timedelta(hours=stale_hours)
    
    def can_escalate(self, escalation_interval_minutes: int = 60) -> bool:
        """Check if alert can be escalated"""
        if not self.is_active():
            return False
        
        # Check if enough time has passed since last escalation
        last_escalation = self.created_at + timedelta(minutes=escalation_interval_minutes * self.escalation_count)
        return datetime.now() >= last_escalation
    
    def escalate(self):
        """Escalate the alert"""
        if self.can_escalate():
            self.escalation_count += 1
            logger.info(f"Alert {self.id} escalated (count: {self.escalation_count})")
    
    def add_notification_sent(self, channel: AlertChannel):
        """Mark notification as sent"""
        if channel not in self.notifications_sent:
            self.notifications_sent.append(channel)
    
    def has_notification_sent(self, channel: AlertChannel) -> bool:
        """Check if notification was sent via channel"""
        return channel in self.notifications_sent
    
    def get_priority_score(self) -> int:
        """Get priority score for alert (higher = more urgent)"""
        base_scores = {
            AlertSeverity.CRITICAL: 100,
            AlertSeverity.HIGH: 75,
            AlertSeverity.MEDIUM: 50,
            AlertSeverity.LOW: 25,
            AlertSeverity.INFO: 10
        }
        
        base_score = base_scores.get(self.severity, 0)
        
        # Increase score for escalation
        escalation_bonus = self.escalation_count * 10
        
        # Increase score for age (stale alerts get higher priority)
        age_hours = self.get_age().total_seconds() / 3600
        age_bonus = min(age_hours * 2, 20)  # Cap at 20 points
        
        return int(base_score + escalation_bonus + age_bonus)


class AlertManager:
    """Manager for alerts"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.rules: Dict[str, AlertRule] = {}
        self.alert_history: List[Alert] = []
        self.max_history_size = 1000
    
    def add_rule(self, rule: AlertRule):
        """Add alert rule"""
        self.rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")
    
    def remove_rule(self, rule_name: str):
        """Remove alert rule"""
        if rule_name in self.rules:
            del self.rules[rule_name]
            logger.info(f"Removed alert rule: {rule_name}")
    
    def create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        context: Optional[AlertContext] = None,
        rule_name: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> Alert:
        """Create a new alert"""
        alert_id = str(uuid.uuid4())
        
        alert = Alert(
            id=alert_id,
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            context=context,
            rule_name=rule_name,
            tags=tags or []
        )
        
        self.alerts[alert_id] = alert
        logger.info(f"Created alert {alert_id}: {title}")
        
        return alert
    
    def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Get alert by ID"""
        return self.alerts.get(alert_id)
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        return [alert for alert in self.alerts.values() if alert.is_active()]
    
    def get_acknowledged_alerts(self) -> List[Alert]:
        """Get all acknowledged alerts"""
        return [alert for alert in self.alerts.values() if alert.is_acknowledged()]
    
    def get_resolved_alerts(self) -> List[Alert]:
        """Get all resolved alerts"""
        return [alert for alert in self.alerts.values() if alert.is_resolved()]
    
    def get_alerts_by_service(self, service_name: str) -> List[Alert]:
        """Get alerts for a specific service"""
        return [
            alert for alert in self.alerts.values()
            if alert.context and alert.context.service_name == service_name
        ]
    
    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Get alerts by severity"""
        return [alert for alert in self.alerts.values() if alert.severity == severity]
    
    def get_alerts_by_type(self, alert_type: AlertType) -> List[Alert]:
        """Get alerts by type"""
        return [alert for alert in self.alerts.values() if alert.type == alert_type]
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        alert = self.get_alert(alert_id)
        if alert:
            return alert.acknowledge(user_id)
        return False
    
    def resolve_alert(self, alert_id: str, user_id: str) -> bool:
        """Resolve an alert"""
        alert = self.get_alert(alert_id)
        if alert:
            success = alert.resolve(user_id)
            if success:
                # Move to history
                self.alert_history.append(alert)
                if len(self.alert_history) > self.max_history_size:
                    self.alert_history.pop(0)
            return success
        return False
    
    def suppress_alert(self, alert_id: str) -> bool:
        """Suppress an alert"""
        alert = self.get_alert(alert_id)
        if alert:
            return alert.suppress()
        return False
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary statistics"""
        total_alerts = len(self.alerts)
        active_alerts = len(self.get_active_alerts())
        acknowledged_alerts = len(self.get_acknowledged_alerts())
        resolved_alerts = len(self.get_resolved_alerts())
        
        # Count by severity
        severity_counts = {}
        for severity in AlertSeverity:
            severity_counts[severity.value] = len(self.get_alerts_by_severity(severity))
        
        # Count by type
        type_counts = {}
        for alert_type in AlertType:
            type_counts[alert_type.value] = len(self.get_alerts_by_type(alert_type))
        
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "acknowledged_alerts": acknowledged_alerts,
            "resolved_alerts": resolved_alerts,
            "severity_counts": severity_counts,
            "type_counts": type_counts,
            "history_size": len(self.alert_history)
        }
    
    def cleanup_old_alerts(self, days: int = 30):
        """Clean up old resolved alerts"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        alerts_to_remove = []
        for alert_id, alert in self.alerts.items():
            if (alert.is_resolved() and 
                alert.resolved_at and 
                alert.resolved_at < cutoff_date):
                alerts_to_remove.append(alert_id)
        
        for alert_id in alerts_to_remove:
            alert = self.alerts.pop(alert_id)
            self.alert_history.append(alert)
            logger.info(f"Moved old alert {alert_id} to history")
        
        # Trim history if needed
        if len(self.alert_history) > self.max_history_size:
            self.alert_history = self.alert_history[-self.max_history_size:]
    
    def get_alerts_for_escalation(self, escalation_interval_minutes: int = 60) -> List[Alert]:
        """Get alerts that can be escalated"""
        return [
            alert for alert in self.get_active_alerts()
            if alert.can_escalate(escalation_interval_minutes)
        ]
    
    def escalate_alerts(self, escalation_interval_minutes: int = 60):
        """Escalate eligible alerts"""
        alerts_to_escalate = self.get_alerts_for_escalation(escalation_interval_minutes)
        
        for alert in alerts_to_escalate:
            alert.escalate()
            logger.info(f"Escalated alert {alert.id} (count: {alert.escalation_count})")


# Factory functions for common alerts
def create_service_down_alert(service_name: str, hostname: Optional[str] = None) -> Alert:
    """Create service down alert"""
    context = AlertContext(
        service_name=service_name,
        hostname=hostname
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.HEALTH,
        severity=AlertSeverity.CRITICAL,
        title=f"Service {service_name} is down",
        message=f"Service {service_name} failed health check",
        context=context,
        rule_name="service_down",
        tags=["health", "service", "critical"]
    )


def create_high_cpu_alert(hostname: str, cpu_usage: float) -> Alert:
    """Create high CPU usage alert"""
    context = AlertContext(
        hostname=hostname,
        metadata={"cpu_usage": cpu_usage}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.PERFORMANCE,
        severity=AlertSeverity.HIGH,
        title=f"High CPU usage on {hostname}",
        message=f"CPU usage is {cpu_usage:.1f}% on {hostname}",
        context=context,
        rule_name="high_cpu_usage",
        tags=["performance", "cpu", "high"]
    )


def create_high_memory_alert(hostname: str, memory_usage: float) -> Alert:
    """Create high memory usage alert"""
    context = AlertContext(
        hostname=hostname,
        metadata={"memory_usage": memory_usage}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.PERFORMANCE,
        severity=AlertSeverity.HIGH,
        title=f"High memory usage on {hostname}",
        message=f"Memory usage is {memory_usage:.1f}% on {hostname}",
        context=context,
        rule_name="high_memory_usage",
        tags=["performance", "memory", "high"]
    )


def create_slow_response_alert(service_name: str, response_time_ms: int) -> Alert:
    """Create slow response time alert"""
    context = AlertContext(
        service_name=service_name,
        metadata={"response_time_ms": response_time_ms}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.PERFORMANCE,
        severity=AlertSeverity.MEDIUM,
        title=f"Slow response time for {service_name}",
        message=f"Response time is {response_time_ms}ms for {service_name}",
        context=context,
        rule_name="slow_response_time",
        tags=["performance", "response_time", "medium"]
    )


def create_high_error_rate_alert(service_name: str, error_rate: float) -> Alert:
    """Create high error rate alert"""
    context = AlertContext(
        service_name=service_name,
        metadata={"error_rate": error_rate}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.ERROR,
        severity=AlertSeverity.MEDIUM,
        title=f"High error rate for {service_name}",
        message=f"Error rate is {error_rate:.1f}% for {service_name}",
        context=context,
        rule_name="high_error_rate",
        tags=["error", "rate", "medium"]
    )


def create_disk_space_alert(hostname: str, disk_usage: float) -> Alert:
    """Create low disk space alert"""
    context = AlertContext(
        hostname=hostname,
        metadata={"disk_usage": disk_usage}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.CAPACITY,
        severity=AlertSeverity.HIGH,
        title=f"Low disk space on {hostname}",
        message=f"Disk usage is {disk_usage:.1f}% on {hostname}",
        context=context,
        rule_name="disk_space_low",
        tags=["capacity", "disk", "high"]
    )


def create_security_alert(alert_type: str, description: str, severity: AlertSeverity = AlertSeverity.HIGH) -> Alert:
    """Create security alert"""
    context = AlertContext(
        metadata={"alert_type": alert_type}
    )
    
    return Alert(
        id=str(uuid.uuid4()),
        type=AlertType.SECURITY,
        severity=severity,
        title=f"Security Alert: {alert_type}",
        message=description,
        context=context,
        rule_name="security_alert",
        tags=["security", severity.value]
    )
