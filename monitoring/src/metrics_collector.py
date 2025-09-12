"""
Metrics Collection Service
Collects and exposes metrics in Prometheus format for the F1 MCP Server monitoring system.
"""

import time
import psutil
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, deque
import logging
import threading

from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry, generate_latest

logger = logging.getLogger(__name__)


@dataclass
class MetricPoint:
    """A single metric data point"""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "labels": self.labels
        }


@dataclass
class ServiceMetrics:
    """Metrics for a specific service"""
    service_name: str
    request_count: int = 0
    error_count: int = 0
    response_time_ms: float = 0.0
    last_request: Optional[datetime] = None
    uptime_seconds: float = 0.0
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "service_name": self.service_name,
            "request_count": self.request_count,
            "error_count": self.error_count,
            "response_time_ms": self.response_time_ms,
            "last_request": self.last_request.isoformat() if self.last_request else None,
            "uptime_seconds": self.uptime_seconds,
            "memory_usage_mb": self.memory_usage_mb,
            "cpu_usage_percent": self.cpu_usage_percent
        }


class MetricsCollector:
    """Metrics collection service"""
    
    def __init__(self):
        # Prometheus metrics registry
        self.registry = CollectorRegistry()
        
        # System metrics
        self.cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'System CPU usage percentage',
            registry=self.registry
        )
        
        self.memory_usage = Gauge(
            'system_memory_usage_percent',
            'System memory usage percentage',
            registry=self.registry
        )
        
        self.disk_usage = Gauge(
            'system_disk_usage_percent',
            'System disk usage percentage',
            registry=self.registry
        )
        
        self.network_bytes_sent = Counter(
            'system_network_bytes_sent_total',
            'Total network bytes sent',
            registry=self.registry
        )
        
        self.network_bytes_received = Counter(
            'system_network_bytes_received_total',
            'Total network bytes received',
            registry=self.registry
        )
        
        # Service metrics
        self.service_requests = Counter(
            'service_requests_total',
            'Total service requests',
            ['service_name', 'method', 'status_code'],
            registry=self.registry
        )
        
        self.service_response_time = Histogram(
            'service_response_time_seconds',
            'Service response time in seconds',
            ['service_name', 'method'],
            registry=self.registry
        )
        
        self.service_errors = Counter(
            'service_errors_total',
            'Total service errors',
            ['service_name', 'error_type'],
            registry=self.registry
        )
        
        self.service_uptime = Gauge(
            'service_uptime_seconds',
            'Service uptime in seconds',
            ['service_name'],
            registry=self.registry
        )
        
        self.service_memory_usage = Gauge(
            'service_memory_usage_mb',
            'Service memory usage in MB',
            ['service_name'],
            registry=self.registry
        )
        
        self.service_cpu_usage = Gauge(
            'service_cpu_usage_percent',
            'Service CPU usage percentage',
            ['service_name'],
            registry=self.registry
        )
        
        # Health check metrics
        self.health_check_status = Gauge(
            'health_check_status',
            'Health check status (1=healthy, 0=unhealthy)',
            ['service_name'],
            registry=self.registry
        )
        
        self.health_check_response_time = Gauge(
            'health_check_response_time_seconds',
            'Health check response time in seconds',
            ['service_name'],
            registry=self.registry
        )
        
        # API Gateway metrics
        self.api_requests = Counter(
            'api_requests_total',
            'Total API requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.api_response_time = Histogram(
            'api_response_time_seconds',
            'API response time in seconds',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.rate_limit_violations = Counter(
            'rate_limit_violations_total',
            'Total rate limit violations',
            ['endpoint', 'client_type'],
            registry=self.registry
        )
        
        # Authentication metrics
        self.auth_attempts = Counter(
            'auth_attempts_total',
            'Total authentication attempts',
            ['method', 'status'],
            registry=self.registry
        )
        
        self.active_sessions = Gauge(
            'active_sessions',
            'Number of active sessions',
            registry=self.registry
        )
        
        # Alert metrics
        self.alerts_total = Counter(
            'alerts_total',
            'Total alerts',
            ['type', 'severity', 'status'],
            registry=self.registry
        )
        
        self.active_alerts = Gauge(
            'active_alerts',
            'Number of active alerts',
            ['type', 'severity'],
            registry=self.registry
        )
        
        # Application info
        self.app_info = Info(
            'app_info',
            'Application information',
            registry=self.registry
        )
        
        # Set application info
        self.app_info.info({
            'name': 'F1 MCP Server',
            'version': '1.0.0',
            'environment': 'production'
        })
        
        # Internal data structures
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.metric_history: deque = deque(maxlen=10000)
        self.collection_active = False
        self.collection_interval = 30  # seconds
        self.start_time = time.time()
        
        # Thread lock for thread safety
        self.lock = threading.Lock()
    
    async def start_collection(self):
        """Start metrics collection"""
        if self.collection_active:
            logger.warning("Metrics collection is already active")
            return
        
        self.collection_active = True
        logger.info("Starting metrics collection...")
        
        # Start collection loop
        asyncio.create_task(self._collection_loop())
        
        logger.info("Metrics collection started")
    
    async def stop_collection(self):
        """Stop metrics collection"""
        self.collection_active = False
        logger.info("Metrics collection stopped")
    
    async def _collection_loop(self):
        """Main metrics collection loop"""
        while self.collection_active:
            try:
                # Collect system metrics
                await self._collect_system_metrics()
                
                # Collect service metrics
                await self._collect_service_metrics()
                
                # Update Prometheus metrics
                self._update_prometheus_metrics()
                
                # Wait for next collection
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error in metrics collection loop: {e}")
                await asyncio.sleep(5)  # Short delay before retry
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            self.cpu_usage.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            self.memory_usage.set(memory.percent)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.disk_usage.set(disk_percent)
            
            # Network stats
            network = psutil.net_io_counters()
            self.network_bytes_sent._value._value = network.bytes_sent
            self.network_bytes_received._value._value = network.bytes_received
            
            # Store in history
            with self.lock:
                self.metric_history.append(MetricPoint(
                    name="system_cpu_usage",
                    value=cpu_percent,
                    timestamp=datetime.now(),
                    labels={"type": "system"}
                ))
                
                self.metric_history.append(MetricPoint(
                    name="system_memory_usage",
                    value=memory.percent,
                    timestamp=datetime.now(),
                    labels={"type": "system"}
                ))
                
                self.metric_history.append(MetricPoint(
                    name="system_disk_usage",
                    value=disk_percent,
                    timestamp=datetime.now(),
                    labels={"type": "system"}
                ))
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _collect_service_metrics(self):
        """Collect service-level metrics"""
        try:
            # This would typically collect metrics from each service
            # For now, we'll simulate some metrics
            
            services = ["mcp-server", "messenger-client", "mcp-bridge", "nginx", "api-gateway"]
            
            for service_name in services:
                # Simulate service metrics
                service_metric = ServiceMetrics(
                    service_name=service_name,
                    request_count=100 + (hash(service_name) % 1000),
                    error_count=hash(service_name) % 10,
                    response_time_ms=50 + (hash(service_name) % 200),
                    last_request=datetime.now(),
                    uptime_seconds=time.time() - self.start_time,
                    memory_usage_mb=50 + (hash(service_name) % 100),
                    cpu_usage_percent=10 + (hash(service_name) % 20)
                )
                
                self.service_metrics[service_name] = service_metric
                
                # Update Prometheus metrics
                self.service_uptime.labels(service_name=service_name).set(service_metric.uptime_seconds)
                self.service_memory_usage.labels(service_name=service_name).set(service_metric.memory_usage_mb)
                self.service_cpu_usage.labels(service_name=service_name).set(service_metric.cpu_usage_percent)
                
                # Simulate health check status
                health_status = 1 if hash(service_name) % 10 > 1 else 0  # 90% healthy
                self.health_check_status.labels(service_name=service_name).set(health_status)
                self.health_check_response_time.labels(service_name=service_name).set(service_metric.response_time_ms / 1000.0)
            
        except Exception as e:
            logger.error(f"Error collecting service metrics: {e}")
    
    def _update_prometheus_metrics(self):
        """Update Prometheus metrics with collected data"""
        try:
            # Update service request counts
            for service_name, metrics in self.service_metrics.items():
                # Simulate request counts for different methods and status codes
                methods = ["GET", "POST", "PUT", "DELETE"]
                status_codes = ["200", "400", "401", "404", "500"]
                
                for method in methods:
                    for status_code in status_codes:
                        count = metrics.request_count // (len(methods) * len(status_codes))
                        if status_code == "200":
                            count = count * 8  # More successful requests
                        
                        self.service_requests.labels(
                            service_name=service_name,
                            method=method,
                            status_code=status_code
                        )._value._value = count
                        
                        # Update response time histogram
                        if status_code == "200":
                            self.service_response_time.labels(
                                service_name=service_name,
                                method=method
                            ).observe(metrics.response_time_ms / 1000.0)
            
        except Exception as e:
            logger.error(f"Error updating Prometheus metrics: {e}")
    
    def record_service_request(
        self,
        service_name: str,
        method: str,
        status_code: int,
        response_time_ms: float
    ):
        """Record a service request"""
        with self.lock:
            if service_name not in self.service_metrics:
                self.service_metrics[service_name] = ServiceMetrics(service_name=service_name)
            
            metrics = self.service_metrics[service_name]
            metrics.request_count += 1
            metrics.response_time_ms = response_time_ms
            metrics.last_request = datetime.now()
            
            if status_code >= 400:
                metrics.error_count += 1
            
            # Update Prometheus metrics
            self.service_requests.labels(
                service_name=service_name,
                method=method,
                status_code=str(status_code)
            ).inc()
            
            self.service_response_time.labels(
                service_name=service_name,
                method=method
            ).observe(response_time_ms / 1000.0)
            
            if status_code >= 400:
                self.service_errors.labels(
                    service_name=service_name,
                    error_type="http_error"
                ).inc()
    
    def record_api_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        response_time_ms: float
    ):
        """Record an API request"""
        with self.lock:
            # Update Prometheus metrics
            self.api_requests.labels(
                method=method,
                endpoint=endpoint,
                status_code=str(status_code)
            ).inc()
            
            self.api_response_time.labels(
                method=method,
                endpoint=endpoint
            ).observe(response_time_ms / 1000.0)
    
    def record_rate_limit_violation(self, endpoint: str, client_type: str):
        """Record a rate limit violation"""
        with self.lock:
            self.rate_limit_violations.labels(
                endpoint=endpoint,
                client_type=client_type
            ).inc()
    
    def record_auth_attempt(self, method: str, success: bool):
        """Record an authentication attempt"""
        with self.lock:
            status = "success" if success else "failure"
            self.auth_attempts.labels(
                method=method,
                status=status
            ).inc()
    
    def record_alert(self, alert_type: str, severity: str, status: str):
        """Record an alert"""
        with self.lock:
            self.alerts_total.labels(
                type=alert_type,
                severity=severity,
                status=status
            ).inc()
    
    def update_active_alerts(self, alerts_by_type: Dict[str, int]):
        """Update active alerts count"""
        with self.lock:
            for alert_type, count in alerts_by_type.items():
                self.active_alerts.labels(
                    type=alert_type,
                    severity="all"
                ).set(count)
    
    def update_active_sessions(self, count: int):
        """Update active sessions count"""
        with self.lock:
            self.active_sessions.set(count)
    
    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format"""
        try:
            return generate_latest(self.registry).decode('utf-8')
        except Exception as e:
            logger.error(f"Error generating Prometheus metrics: {e}")
            return ""
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        with self.lock:
            total_requests = sum(metrics.request_count for metrics in self.service_metrics.values())
            total_errors = sum(metrics.error_count for metrics in self.service_metrics.values())
            
            avg_response_time = 0
            if self.service_metrics:
                avg_response_time = sum(
                    metrics.response_time_ms for metrics in self.service_metrics.values()
                ) / len(self.service_metrics)
            
            return {
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": (total_errors / total_requests * 100) if total_requests > 0 else 0,
                "average_response_time_ms": avg_response_time,
                "services_monitored": len(self.service_metrics),
                "metrics_collected": len(self.metric_history),
                "collection_active": self.collection_active,
                "uptime_seconds": time.time() - self.start_time
            }
    
    def get_service_metrics(self, service_name: str) -> Optional[ServiceMetrics]:
        """Get metrics for a specific service"""
        with self.lock:
            return self.service_metrics.get(service_name)
    
    def get_all_service_metrics(self) -> Dict[str, ServiceMetrics]:
        """Get metrics for all services"""
        with self.lock:
            return self.service_metrics.copy()
    
    def get_metric_history(
        self,
        metric_name: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[MetricPoint]:
        """Get metric history"""
        with self.lock:
            history = list(self.metric_history)
            
            # Filter by metric name
            if metric_name:
                history = [point for point in history if point.name == metric_name]
            
            # Filter by time range
            if start_time:
                history = [point for point in history if point.timestamp >= start_time]
            
            if end_time:
                history = [point for point in history if point.timestamp <= end_time]
            
            return history
    
    def clear_metric_history(self):
        """Clear metric history"""
        with self.lock:
            self.metric_history.clear()
            logger.info("Metric history cleared")
    
    def get_top_endpoints(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top endpoints by request count"""
        # This would typically come from actual request tracking
        # For now, return simulated data
        return [
            {"endpoint": "/api/v1/f1/schedule", "requests": 1000, "avg_response_time": 150},
            {"endpoint": "/api/v1/chat", "requests": 800, "avg_response_time": 300},
            {"endpoint": "/api/v1/f1/drivers", "requests": 600, "avg_response_time": 120},
            {"endpoint": "/health", "requests": 500, "avg_response_time": 50},
            {"endpoint": "/api/v1/f1/events", "requests": 400, "avg_response_time": 180}
        ]
    
    def get_error_rates(self) -> Dict[str, float]:
        """Get error rates by service"""
        with self.lock:
            error_rates = {}
            for service_name, metrics in self.service_metrics.items():
                if metrics.request_count > 0:
                    error_rates[service_name] = (metrics.error_count / metrics.request_count) * 100
                else:
                    error_rates[service_name] = 0.0
            
            return error_rates
    
    def is_collection_active(self) -> bool:
        """Check if metrics collection is active"""
        return self.collection_active


# Global metrics collector instance
metrics_collector = MetricsCollector()
