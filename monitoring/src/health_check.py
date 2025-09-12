"""
Health Check Model
Monitors service health and availability for F1 MCP Server deployment.
"""

import asyncio
import aiohttp
import time
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status enumeration"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    DEGRADED = "degraded"


class CheckType(str, Enum):
    """Types of health checks"""
    HTTP = "http"
    TCP = "tcp"
    PING = "ping"
    CUSTOM = "custom"


@dataclass
class HealthCheckResult:
    """Result of a health check"""
    service_name: str
    status: HealthStatus
    response_time_ms: int
    timestamp: datetime
    error_message: Optional[str] = None
    status_code: Optional[int] = None
    response_data: Optional[Dict[str, Any]] = None
    check_type: CheckType = CheckType.HTTP
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "service_name": self.service_name,
            "status": self.status.value,
            "response_time_ms": self.response_time_ms,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message,
            "status_code": self.status_code,
            "response_data": self.response_data,
            "check_type": self.check_type.value
        }
    
    def is_healthy(self) -> bool:
        """Check if service is healthy"""
        return self.status == HealthStatus.HEALTHY
    
    def is_unhealthy(self) -> bool:
        """Check if service is unhealthy"""
        return self.status == HealthStatus.UNHEALTHY
    
    def is_unknown(self) -> bool:
        """Check if service status is unknown"""
        return self.status == HealthStatus.UNKNOWN


@dataclass
class HealthCheckConfig:
    """Configuration for health checks"""
    service_name: str
    endpoint: str
    check_type: CheckType = CheckType.HTTP
    interval_seconds: int = 30
    timeout_seconds: int = 10
    retry_count: int = 3
    expected_status: int = 200
    expected_response: Optional[str] = None
    headers: Dict[str, str] = field(default_factory=dict)
    custom_check_function: Optional[Callable] = None
    enabled: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "service_name": self.service_name,
            "endpoint": self.endpoint,
            "check_type": self.check_type.value,
            "interval_seconds": self.interval_seconds,
            "timeout_seconds": self.timeout_seconds,
            "retry_count": self.retry_count,
            "expected_status": self.expected_status,
            "expected_response": self.expected_response,
            "headers": self.headers,
            "enabled": self.enabled
        }


class HealthChecker:
    """Health checker for monitoring service health"""
    
    def __init__(self):
        self.checks: Dict[str, HealthCheckConfig] = {}
        self.results: Dict[str, HealthCheckResult] = {}
        self.running = False
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.stop()
    
    async def start(self):
        """Start the health checker"""
        if self.running:
            return
        
        self._session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=100)
        )
        self.running = True
        logger.info("Health checker started")
    
    async def stop(self):
        """Stop the health checker"""
        self.running = False
        if self._session:
            await self._session.close()
        logger.info("Health checker stopped")
    
    def add_check(self, config: HealthCheckConfig):
        """Add a health check configuration"""
        self.checks[config.service_name] = config
        logger.info(f"Added health check for service: {config.service_name}")
    
    def remove_check(self, service_name: str):
        """Remove a health check configuration"""
        if service_name in self.checks:
            del self.checks[service_name]
            if service_name in self.results:
                del self.results[service_name]
            logger.info(f"Removed health check for service: {service_name}")
    
    async def check_service(self, service_name: str) -> HealthCheckResult:
        """Check health of a specific service"""
        if service_name not in self.checks:
            raise ValueError(f"No health check configured for service: {service_name}")
        
        config = self.checks[service_name]
        if not config.enabled:
            return HealthCheckResult(
                service_name=service_name,
                status=HealthStatus.UNKNOWN,
                response_time_ms=0,
                timestamp=datetime.now(),
                error_message="Health check disabled"
            )
        
        start_time = time.time()
        result = None
        
        try:
            if config.check_type == CheckType.HTTP:
                result = await self._check_http(config)
            elif config.check_type == CheckType.TCP:
                result = await self._check_tcp(config)
            elif config.check_type == CheckType.PING:
                result = await self._check_ping(config)
            elif config.check_type == CheckType.CUSTOM:
                result = await self._check_custom(config)
            else:
                raise ValueError(f"Unsupported check type: {config.check_type}")
            
        except Exception as e:
            logger.error(f"Health check failed for {service_name}: {str(e)}")
            result = HealthCheckResult(
                service_name=service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=str(e),
                check_type=config.check_type
            )
        
        # Store result
        self.results[service_name] = result
        return result
    
    async def _check_http(self, config: HealthCheckConfig) -> HealthCheckResult:
        """Perform HTTP health check"""
        start_time = time.time()
        error_message = None
        status_code = None
        response_data = None
        
        try:
            async with self._session.get(
                config.endpoint,
                headers=config.headers,
                timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)
            ) as response:
                status_code = response.status
                response_time_ms = int((time.time() - start_time) * 1000)
                
                # Check status code
                if response.status == config.expected_status:
                    # Check response content if expected
                    if config.expected_response:
                        text = await response.text()
                        if config.expected_response not in text:
                            error_message = f"Expected response not found: {config.expected_response}"
                            status = HealthStatus.UNHEALTHY
                        else:
                            status = HealthStatus.HEALTHY
                    else:
                        status = HealthStatus.HEALTHY
                    
                    # Try to parse JSON response
                    try:
                        response_data = await response.json()
                    except:
                        response_data = {"raw_response": await response.text()}
                else:
                    status = HealthStatus.UNHEALTHY
                    error_message = f"Expected status {config.expected_status}, got {response.status}"
                
                return HealthCheckResult(
                    service_name=config.service_name,
                    status=status,
                    response_time_ms=response_time_ms,
                    timestamp=datetime.now(),
                    error_message=error_message,
                    status_code=status_code,
                    response_data=response_data,
                    check_type=CheckType.HTTP
                )
                
        except asyncio.TimeoutError:
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=f"Timeout after {config.timeout_seconds} seconds",
                check_type=CheckType.HTTP
            )
        except Exception as e:
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=str(e),
                check_type=CheckType.HTTP
            )
    
    async def _check_tcp(self, config: HealthCheckConfig) -> HealthCheckResult:
        """Perform TCP health check"""
        start_time = time.time()
        
        try:
            # Parse endpoint for host and port
            if "://" in config.endpoint:
                endpoint = config.endpoint.split("://", 1)[1]
            else:
                endpoint = config.endpoint
            
            if ":" in endpoint:
                host, port = endpoint.split(":", 1)
                port = int(port)
            else:
                host = endpoint
                port = 80
            
            # Try to connect
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=config.timeout_seconds
            )
            
            writer.close()
            await writer.wait_closed()
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time_ms,
                timestamp=datetime.now(),
                check_type=CheckType.TCP
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=str(e),
                check_type=CheckType.TCP
            )
    
    async def _check_ping(self, config: HealthCheckConfig) -> HealthCheckResult:
        """Perform ping health check"""
        start_time = time.time()
        
        try:
            # Parse endpoint for host
            if "://" in config.endpoint:
                endpoint = config.endpoint.split("://", 1)[1]
            else:
                endpoint = config.endpoint
            
            if ":" in endpoint:
                host = endpoint.split(":", 1)[0]
            else:
                host = endpoint
            
            # Use ping command (platform specific)
            import platform
            if platform.system().lower() == "windows":
                cmd = ["ping", "-n", "1", "-w", str(config.timeout_seconds * 1000), host]
            else:
                cmd = ["ping", "-c", "1", "-W", str(config.timeout_seconds), host]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=config.timeout_seconds
            )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if process.returncode == 0:
                status = HealthStatus.HEALTHY
                error_message = None
            else:
                status = HealthStatus.UNHEALTHY
                error_message = stderr.decode() if stderr else "Ping failed"
            
            return HealthCheckResult(
                service_name=config.service_name,
                status=status,
                response_time_ms=response_time_ms,
                timestamp=datetime.now(),
                error_message=error_message,
                check_type=CheckType.PING
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=str(e),
                check_type=CheckType.PING
            )
    
    async def _check_custom(self, config: HealthCheckConfig) -> HealthCheckResult:
        """Perform custom health check"""
        start_time = time.time()
        
        try:
            if not config.custom_check_function:
                raise ValueError("Custom check function not provided")
            
            # Execute custom check function
            result = await config.custom_check_function(config.endpoint)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            if isinstance(result, bool):
                status = HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY
                error_message = None
            elif isinstance(result, dict):
                status = HealthStatus(result.get("status", "unknown"))
                error_message = result.get("error_message")
            else:
                status = HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY
                error_message = None
            
            return HealthCheckResult(
                service_name=config.service_name,
                status=status,
                response_time_ms=response_time_ms,
                timestamp=datetime.now(),
                error_message=error_message,
                check_type=CheckType.CUSTOM
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name=config.service_name,
                status=HealthStatus.UNHEALTHY,
                response_time_ms=int((time.time() - start_time) * 1000),
                timestamp=datetime.now(),
                error_message=str(e),
                check_type=CheckType.CUSTOM
            )
    
    async def check_all_services(self) -> Dict[str, HealthCheckResult]:
        """Check health of all configured services"""
        if not self.running:
            raise RuntimeError("Health checker not started")
        
        tasks = []
        for service_name in self.checks:
            tasks.append(self.check_service(service_name))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        final_results = {}
        for i, result in enumerate(results):
            service_name = list(self.checks.keys())[i]
            if isinstance(result, Exception):
                final_results[service_name] = HealthCheckResult(
                    service_name=service_name,
                    status=HealthStatus.UNHEALTHY,
                    response_time_ms=0,
                    timestamp=datetime.now(),
                    error_message=str(result)
                )
            else:
                final_results[service_name] = result
        
        return final_results
    
    def get_service_status(self, service_name: str) -> Optional[HealthStatus]:
        """Get current status of a service"""
        if service_name in self.results:
            return self.results[service_name].status
        return None
    
    def get_all_statuses(self) -> Dict[str, HealthStatus]:
        """Get status of all services"""
        return {name: result.status for name, result in self.results.items()}
    
    def get_healthy_services(self) -> List[str]:
        """Get list of healthy services"""
        return [name for name, status in self.get_all_statuses().items() 
                if status == HealthStatus.HEALTHY]
    
    def get_unhealthy_services(self) -> List[str]:
        """Get list of unhealthy services"""
        return [name for name, status in self.get_all_statuses().items() 
                if status == HealthStatus.UNHEALTHY]
    
    def get_overall_status(self) -> HealthStatus:
        """Get overall system health status"""
        if not self.results:
            return HealthStatus.UNKNOWN
        
        statuses = list(self.get_all_statuses().values())
        
        if all(status == HealthStatus.HEALTHY for status in statuses):
            return HealthStatus.HEALTHY
        elif any(status == HealthStatus.UNHEALTHY for status in statuses):
            return HealthStatus.UNHEALTHY
        elif any(status == HealthStatus.DEGRADED for status in statuses):
            return HealthStatus.DEGRADED
        else:
            return HealthStatus.UNKNOWN
    
    def get_service_uptime(self, service_name: str, window_minutes: int = 60) -> float:
        """Calculate service uptime percentage over time window"""
        # This would require storing historical results
        # For now, return current status as percentage
        status = self.get_service_status(service_name)
        if status == HealthStatus.HEALTHY:
            return 100.0
        elif status == HealthStatus.DEGRADED:
            return 75.0
        elif status == HealthStatus.UNHEALTHY:
            return 0.0
        else:
            return 50.0
    
    def to_health_response(self) -> Dict[str, Any]:
        """Convert to health response format"""
        overall_status = self.get_overall_status()
        
        services = {}
        for service_name, result in self.results.items():
            services[service_name] = {
                "name": service_name,
                "status": result.status.value,
                "response_time_ms": result.response_time_ms,
                "last_check": result.timestamp.isoformat(),
                "error_message": result.error_message
            }
        
        return {
            "status": overall_status.value,
            "timestamp": datetime.now().isoformat(),
            "services": services
        }


# Factory functions for common health checks
def create_mcp_server_health_check() -> HealthCheckConfig:
    """Create health check for MCP server"""
    return HealthCheckConfig(
        service_name="mcp-server",
        endpoint="http://mcp-server:8000/health",
        expected_status=200,
        expected_response='{"status": "healthy"}',
        interval_seconds=30,
        timeout_seconds=10
    )


def create_messenger_client_health_check() -> HealthCheckConfig:
    """Create health check for messenger client"""
    return HealthCheckConfig(
        service_name="messenger-client",
        endpoint="http://messenger-client:3000/health",
        expected_status=200,
        interval_seconds=30,
        timeout_seconds=10
    )


def create_mcp_bridge_health_check() -> HealthCheckConfig:
    """Create health check for MCP bridge"""
    return HealthCheckConfig(
        service_name="mcp-bridge",
        endpoint="http://mcp-bridge:8001/health",
        expected_status=200,
        interval_seconds=30,
        timeout_seconds=10
    )


def create_nginx_health_check() -> HealthCheckConfig:
    """Create health check for Nginx"""
    return HealthCheckConfig(
        service_name="nginx",
        endpoint="http://nginx:80/health",
        expected_status=200,
        interval_seconds=30,
        timeout_seconds=5
    )


def create_api_gateway_health_check() -> HealthCheckConfig:
    """Create health check for API gateway"""
    return HealthCheckConfig(
        service_name="api-gateway",
        endpoint="http://api-gateway:8080/health",
        expected_status=200,
        interval_seconds=30,
        timeout_seconds=10
    )


def create_monitoring_health_check() -> HealthCheckConfig:
    """Create health check for monitoring service"""
    return HealthCheckConfig(
        service_name="monitoring",
        endpoint="http://monitoring:3001/health",
        expected_status=200,
        interval_seconds=30,
        timeout_seconds=10
    )


def create_all_health_checks() -> List[HealthCheckConfig]:
    """Create health checks for all services"""
    return [
        create_mcp_server_health_check(),
        create_messenger_client_health_check(),
        create_mcp_bridge_health_check(),
        create_nginx_health_check(),
        create_api_gateway_health_check(),
        create_monitoring_health_check()
    ]
