"""
Health Monitoring Service
Monitors the health and availability of all services in the F1 MCP Server deployment.
"""

import asyncio
import time
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import yaml

# Local application imports
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from common.logging_config import setup_logging

from .health_check import HealthChecker, HealthCheckResult, HealthStatus, create_all_health_checks
from .alert import AlertManager, Alert, AlertType, AlertSeverity, create_service_down_alert

# Configure logging using common utilities
logger = setup_logging(__name__)


@dataclass
class ServiceHealth:
    """Health status of a service"""
    name: str
    status: HealthStatus
    last_check: datetime
    response_time_ms: int
    error_message: Optional[str] = None
    uptime_seconds: Optional[int] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "status": self.status.value,
            "last_check": self.last_check.isoformat(),
            "response_time_ms": self.response_time_ms,
            "error_message": self.error_message,
            "uptime_seconds": self.uptime_seconds,
            "cpu_usage": self.cpu_usage,
            "memory_usage": self.memory_usage
        }


@dataclass
class SystemHealth:
    """Overall system health"""
    overall_status: HealthStatus
    timestamp: datetime
    services: Dict[str, ServiceHealth] = field(default_factory=dict)
    system_metrics: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "status": self.overall_status.value,
            "timestamp": self.timestamp.isoformat(),
            "services": {name: service.to_dict() for name, service in self.services.items()},
            "system_metrics": self.system_metrics
        }


class HealthMonitor:
    """Health monitoring service"""
    
    def __init__(self, config_path: str = "config.yml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.health_checker = HealthChecker()
        self.alert_manager = AlertManager()
        self.services_health: Dict[str, ServiceHealth] = {}
        self.system_metrics: Dict[str, Any] = {}
        self.monitoring_active = False
        self.check_interval = self.config.get("monitoring", {}).get("check_interval", 30)
        self.alert_thresholds = self.config.get("monitoring", {}).get("alert_thresholds", {})
        
        # Initialize health checks
        self._setup_health_checks()
    
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
            "monitoring": {
                "check_interval": 30,
                "timeout": 10,
                "retry_count": 3,
                "alert_thresholds": {
                    "cpu_usage": 80.0,
                    "memory_usage": 85.0,
                    "disk_usage": 90.0,
                    "response_time_ms": 5000
                }
            },
            "services": {
                "mcp-server": {
                    "url": "http://mcp-server:8000",
                    "health_endpoint": "/health"
                },
                "messenger-client": {
                    "url": "http://messenger-client:3000",
                    "health_endpoint": "/health"
                },
                "mcp-bridge": {
                    "url": "http://mcp-bridge:8001",
                    "health_endpoint": "/health"
                },
                "nginx": {
                    "url": "http://nginx:80",
                    "health_endpoint": "/health"
                },
                "api-gateway": {
                    "url": "http://api-gateway:8080",
                    "health_endpoint": "/health"
                }
            }
        }
    
    def _setup_health_checks(self):
        """Setup health checks for all services"""
        health_checks = create_all_health_checks()
        
        for health_check_config in health_checks:
            self.health_checker.add_check(health_check_config)
            logger.info(f"Added health check for service: {health_check_config.service_name}")
    
    async def start_monitoring(self):
        """Start health monitoring"""
        if self.monitoring_active:
            logger.warning("Health monitoring is already active")
            return
        
        self.monitoring_active = True
        logger.info("Starting health monitoring...")
        
        # Start health checker
        await self.health_checker.start()
        
        # Start monitoring loop
        asyncio.create_task(self._monitoring_loop())
        
        logger.info("Health monitoring started")
    
    async def stop_monitoring(self):
        """Stop health monitoring"""
        if not self.monitoring_active:
            return
        
        self.monitoring_active = False
        logger.info("Stopping health monitoring...")
        
        # Stop health checker
        await self.health_checker.stop()
        
        logger.info("Health monitoring stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Check all services
                await self._check_all_services()
                
                # Collect system metrics
                await self._collect_system_metrics()
                
                # Check for alerts
                await self._check_alerts()
                
                # Wait for next check
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)  # Short delay before retry
    
    async def _check_all_services(self):
        """Check health of all services"""
        try:
            # Run health checks
            results = await self.health_checker.check_all_services()
            
            # Update service health status
            for service_name, result in results.items():
                service_health = ServiceHealth(
                    name=service_name,
                    status=result.status,
                    last_check=result.timestamp,
                    response_time_ms=result.response_time_ms,
                    error_message=result.error_message
                )
                
                self.services_health[service_name] = service_health
                
                logger.debug(f"Service {service_name}: {result.status.value} ({result.response_time_ms}ms)")
                
        except Exception as e:
            logger.error(f"Error checking services: {e}")
    
    async def _collect_system_metrics(self):
        """Collect system metrics"""
        try:
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage = (disk.used / disk.total) * 100
            
            # Network stats
            network = psutil.net_io_counters()
            
            # Process stats
            process = psutil.Process()
            process_cpu = process.cpu_percent()
            process_memory = process.memory_percent()
            
            self.system_metrics = {
                "cpu_usage_percent": cpu_usage,
                "memory_usage_percent": memory_usage,
                "disk_usage_percent": disk_usage,
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "process_cpu_percent": process_cpu,
                "process_memory_percent": process_memory,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _check_alerts(self):
        """Check for alert conditions"""
        try:
            # Check service health alerts
            await self._check_service_health_alerts()
            
            # Check system metrics alerts
            await self._check_system_metrics_alerts()
            
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")
    
    async def _check_service_health_alerts(self):
        """Check for service health alerts"""
        for service_name, service_health in self.services_health.items():
            # Check if service is unhealthy
            if service_health.status == HealthStatus.UNHEALTHY:
                # Check if we already have an active alert for this service
                existing_alerts = [
                    alert for alert in self.alert_manager.get_active_alerts()
                    if (alert.context and 
                        alert.context.service_name == service_name and
                        alert.type == AlertType.HEALTH)
                ]
                
                if not existing_alerts:
                    # Create new alert
                    alert = create_service_down_alert(service_name)
                    self.alert_manager.alerts[alert.id] = alert
                    logger.warning(f"Created service down alert for {service_name}")
            
            # Check response time alerts
            response_time_threshold = self.alert_thresholds.get("response_time_ms", 5000)
            if service_health.response_time_ms > response_time_threshold:
                # Check if we already have an alert for slow response
                existing_alerts = [
                    alert for alert in self.alert_manager.get_active_alerts()
                    if (alert.context and 
                        alert.context.service_name == service_name and
                        alert.type == AlertType.PERFORMANCE and
                        "slow response" in alert.title.lower())
                ]
                
                if not existing_alerts:
                    from .alert import create_slow_response_alert
                    alert = create_slow_response_alert(
                        service_name, 
                        service_health.response_time_ms
                    )
                    self.alert_manager.alerts[alert.id] = alert
                    logger.warning(f"Created slow response alert for {service_name}")
    
    async def _check_system_metrics_alerts(self):
        """Check for system metrics alerts"""
        if not self.system_metrics:
            return
        
        # Check CPU usage
        cpu_threshold = self.alert_thresholds.get("cpu_usage", 80.0)
        cpu_usage = self.system_metrics.get("cpu_usage_percent", 0)
        
        if cpu_usage > cpu_threshold:
            await self._check_or_create_metric_alert(
                "high_cpu_usage",
                f"High CPU usage: {cpu_usage:.1f}%",
                AlertType.PERFORMANCE,
                AlertSeverity.HIGH
            )
        
        # Check memory usage
        memory_threshold = self.alert_thresholds.get("memory_usage", 85.0)
        memory_usage = self.system_metrics.get("memory_usage_percent", 0)
        
        if memory_usage > memory_threshold:
            await self._check_or_create_metric_alert(
                "high_memory_usage",
                f"High memory usage: {memory_usage:.1f}%",
                AlertType.PERFORMANCE,
                AlertSeverity.HIGH
            )
        
        # Check disk usage
        disk_threshold = self.alert_thresholds.get("disk_usage", 90.0)
        disk_usage = self.system_metrics.get("disk_usage_percent", 0)
        
        if disk_usage > disk_threshold:
            await self._check_or_create_metric_alert(
                "high_disk_usage",
                f"High disk usage: {disk_usage:.1f}%",
                AlertType.CAPACITY,
                AlertSeverity.HIGH
            )
    
    async def _check_or_create_metric_alert(
        self,
        alert_type: str,
        message: str,
        alert_category: AlertType,
        severity: AlertSeverity
    ):
        """Check if alert exists or create new one"""
        # Check if we already have an active alert of this type
        existing_alerts = [
            alert for alert in self.alert_manager.get_active_alerts()
            if alert.title.lower() == message.lower()
        ]
        
        if not existing_alerts:
            from .alert import Alert, AlertContext
            alert = Alert(
                id=f"{alert_type}_{int(time.time())}",
                type=alert_category,
                severity=severity,
                title=message,
                message=message,
                context=AlertContext(metadata={"alert_type": alert_type})
            )
            self.alert_manager.alerts[alert.id] = alert
            logger.warning(f"Created metric alert: {message}")
    
    def get_overall_health(self) -> SystemHealth:
        """Get overall system health"""
        # Determine overall status
        if not self.services_health:
            overall_status = HealthStatus.UNKNOWN
        elif all(service.status == HealthStatus.HEALTHY for service in self.services_health.values()):
            overall_status = HealthStatus.HEALTHY
        elif any(service.status == HealthStatus.UNHEALTHY for service in self.services_health.values()):
            overall_status = HealthStatus.UNHEALTHY
        else:
            overall_status = HealthStatus.DEGRADED
        
        return SystemHealth(
            overall_status=overall_status,
            timestamp=datetime.now(),
            services=self.services_health.copy(),
            system_metrics=self.system_metrics.copy()
        )
    
    def get_service_health(self, service_name: str) -> Optional[ServiceHealth]:
        """Get health status of a specific service"""
        return self.services_health.get(service_name)
    
    def get_all_services_health(self) -> Dict[str, ServiceHealth]:
        """Get health status of all services"""
        return self.services_health.copy()
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics"""
        return self.system_metrics.copy()
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health summary statistics"""
        total_services = len(self.services_health)
        healthy_services = len([s for s in self.services_health.values() if s.status == HealthStatus.HEALTHY])
        unhealthy_services = len([s for s in self.services_health.values() if s.status == HealthStatus.UNHEALTHY])
        unknown_services = len([s for s in self.services_health.values() if s.status == HealthStatus.UNKNOWN])
        
        avg_response_time = 0
        if self.services_health:
            avg_response_time = sum(s.response_time_ms for s in self.services_health.values()) / len(self.services_health)
        
        return {
            "total_services": total_services,
            "healthy_services": healthy_services,
            "unhealthy_services": unhealthy_services,
            "unknown_services": unknown_services,
            "health_percentage": (healthy_services / total_services * 100) if total_services > 0 else 0,
            "average_response_time_ms": avg_response_time,
            "system_metrics": self.system_metrics,
            "active_alerts": len(self.alert_manager.get_active_alerts()),
            "last_check": datetime.now().isoformat()
        }
    
    def get_service_uptime(self, service_name: str) -> Optional[float]:
        """Get uptime percentage for a service"""
        service_health = self.get_service_health(service_name)
        if not service_health:
            return None
        
        # This is a simplified calculation
        # In production, you'd track historical health data
        if service_health.status == HealthStatus.HEALTHY:
            return 100.0
        elif service_health.status == HealthStatus.DEGRADED:
            return 75.0
        elif service_health.status == HealthStatus.UNHEALTHY:
            return 0.0
        else:
            return 50.0
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary"""
        return self.alert_manager.get_alert_summary()
    
    def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an alert"""
        return self.alert_manager.acknowledge_alert(alert_id, user_id)
    
    def resolve_alert(self, alert_id: str, user_id: str) -> bool:
        """Resolve an alert"""
        return self.alert_manager.resolve_alert(alert_id, user_id)
    
    def get_active_alerts(self) -> List[Alert]:
        """Get active alerts"""
        return self.alert_manager.get_active_alerts()
    
    def get_service_alerts(self, service_name: str) -> List[Alert]:
        """Get alerts for a specific service"""
        return self.alert_manager.get_alerts_by_service(service_name)
    
    async def manual_health_check(self, service_name: str) -> Optional[HealthCheckResult]:
        """Perform manual health check for a service"""
        try:
            result = await self.health_checker.check_service(service_name)
            
            # Update service health
            if result:
                service_health = ServiceHealth(
                    name=service_name,
                    status=result.status,
                    last_check=result.timestamp,
                    response_time_ms=result.response_time_ms,
                    error_message=result.error_message
                )
                self.services_health[service_name] = service_health
            
            return result
            
        except Exception as e:
            logger.error(f"Error performing manual health check for {service_name}: {e}")
            return None
    
    def is_monitoring_active(self) -> bool:
        """Check if monitoring is active"""
        return self.monitoring_active
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get monitoring status"""
        return {
            "active": self.monitoring_active,
            "check_interval": self.check_interval,
            "services_monitored": len(self.services_health),
            "last_check": datetime.now().isoformat(),
            "uptime_seconds": time.time() - (self.startup_time if hasattr(self, 'startup_time') else time.time())
        }


# Global health monitor instance
health_monitor = HealthMonitor()
