"""
Service Configuration Model
Defines individual service deployment parameters for F1 MCP Server services.
"""

import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ServiceType(str, Enum):
    """Types of services in the deployment"""
    MCP_SERVER = "mcp-server"
    MESSENGER_CLIENT = "messenger-client"
    MCP_BRIDGE = "mcp-bridge"
    NGINX = "nginx"
    API_GATEWAY = "api-gateway"
    MONITORING = "monitoring"


class ServiceStatus(str, Enum):
    """Service deployment status"""
    PENDING = "pending"
    DEPLOYING = "deploying"
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"
    UNKNOWN = "unknown"


@dataclass
class PortMapping:
    """Port mapping configuration"""
    container_port: int
    host_port: Optional[int] = None
    protocol: str = "tcp"
    expose: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "container_port": self.container_port,
            "host_port": self.host_port,
            "protocol": self.protocol,
            "expose": self.expose
        }


@dataclass
class HealthCheck:
    """Health check configuration"""
    endpoint: str
    interval_seconds: int = 30
    timeout_seconds: int = 10
    retry_count: int = 3
    start_period_seconds: int = 40
    expected_status: int = 200
    expected_response: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "endpoint": self.endpoint,
            "interval_seconds": self.interval_seconds,
            "timeout_seconds": self.timeout_seconds,
            "retry_count": self.retry_count,
            "start_period_seconds": self.start_period_seconds,
            "expected_status": self.expected_status,
            "expected_response": self.expected_response
        }


@dataclass
class ScalingConfig:
    """Service scaling configuration"""
    min_instances: int = 1
    max_instances: int = 5
    target_cpu_utilization: int = 70
    target_memory_utilization: int = 80
    scale_up_cooldown: int = 300  # 5 minutes
    scale_down_cooldown: int = 600  # 10 minutes
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "min_instances": self.min_instances,
            "max_instances": self.max_instances,
            "target_cpu_utilization": self.target_cpu_utilization,
            "target_memory_utilization": self.target_memory_utilization,
            "scale_up_cooldown": self.scale_up_cooldown,
            "scale_down_cooldown": self.scale_down_cooldown
        }


@dataclass
class ResourceRequirements:
    """Resource requirements for service"""
    cpu_request: str = "100m"
    memory_request: str = "128Mi"
    cpu_limit: str = "500m"
    memory_limit: str = "512Mi"
    storage_request: str = "1Gi"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "cpu_request": self.cpu_request,
            "memory_request": self.memory_request,
            "cpu_limit": self.cpu_limit,
            "memory_limit": self.memory_limit,
            "storage_request": self.storage_request
        }


@dataclass
class ServiceConfiguration:
    """Individual service configuration"""
    name: ServiceType
    image: str
    tag: str = "latest"
    ports: List[PortMapping] = field(default_factory=list)
    environment_vars: Dict[str, str] = field(default_factory=dict)
    health_check: Optional[HealthCheck] = None
    scaling: Optional[ScalingConfig] = None
    resources: Optional[ResourceRequirements] = None
    dependencies: List[ServiceType] = field(default_factory=list)
    restart_policy: str = "unless-stopped"
    status: ServiceStatus = ServiceStatus.PENDING
    replicas: int = 1
    
    def __post_init__(self):
        """Validate service configuration after initialization"""
        self._validate_config()
        self._set_defaults()
    
    def _validate_config(self):
        """Validate service configuration"""
        if not self.name:
            raise ValueError("Service name is required")
        
        if not self.image:
            raise ValueError("Service image is required")
        
        # Validate scaling configuration
        if self.scaling:
            if self.scaling.min_instances > self.scaling.max_instances:
                raise ValueError("min_instances cannot be greater than max_instances")
            
            if self.scaling.min_instances < 1:
                raise ValueError("min_instances must be at least 1")
        
        # Validate resource requirements
        if self.resources:
            # Basic validation for CPU and memory formats
            self._validate_resource_format(self.resources.cpu_request, "CPU request")
            self._validate_resource_format(self.resources.cpu_limit, "CPU limit")
            self._validate_resource_format(self.resources.memory_request, "Memory request")
            self._validate_resource_format(self.resources.memory_limit, "Memory limit")
        
        # Validate port mappings
        for port in self.ports:
            if port.container_port <= 0 or port.container_port > 65535:
                raise ValueError(f"Invalid container port: {port.container_port}")
            
            if port.host_port and (port.host_port <= 0 or port.host_port > 65535):
                raise ValueError(f"Invalid host port: {port.host_port}")
    
    def _validate_resource_format(self, resource: str, resource_name: str):
        """Validate Kubernetes resource format"""
        # Basic validation for CPU (e.g., "100m", "1", "0.5")
        # and memory (e.g., "128Mi", "1Gi", "1024M")
        if not resource:
            raise ValueError(f"{resource_name} cannot be empty")
        
        # Check for valid suffixes
        if resource.endswith(('m', 'Mi', 'Gi', 'M', 'G', 'K', 'Ki')):
            return
        elif resource.isdigit() or resource.replace('.', '').isdigit():
            return
        else:
            raise ValueError(f"Invalid {resource_name} format: {resource}")
    
    def _set_defaults(self):
        """Set default configurations based on service type"""
        if self.name == ServiceType.MCP_SERVER:
            self._set_mcp_server_defaults()
        elif self.name == ServiceType.MESSENGER_CLIENT:
            self._set_messenger_client_defaults()
        elif self.name == ServiceType.MCP_BRIDGE:
            self._set_mcp_bridge_defaults()
        elif self.name == ServiceType.NGINX:
            self._set_nginx_defaults()
        elif self.name == ServiceType.API_GATEWAY:
            self._set_api_gateway_defaults()
        elif self.name == ServiceType.MONITORING:
            self._set_monitoring_defaults()
    
    def _set_mcp_server_defaults(self):
        """Set defaults for MCP server"""
        if not self.ports:
            self.ports = [PortMapping(container_port=8000, host_port=8000)]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200,
                expected_response='{"status": "healthy"}'
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="200m",
                memory_request="256Mi",
                cpu_limit="1000m",
                memory_limit="1Gi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=1,
                max_instances=5,
                target_cpu_utilization=70
            )
        
        self.environment_vars.update({
            "MCP_SERVER_HOST": "0.0.0.0",
            "MCP_SERVER_PORT": "8000",
            "LOG_LEVEL": "INFO"
        })
    
    def _set_messenger_client_defaults(self):
        """Set defaults for messenger client"""
        if not self.ports:
            self.ports = [PortMapping(container_port=3000, host_port=3000)]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="100m",
                memory_request="128Mi",
                cpu_limit="500m",
                memory_limit="512Mi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=1,
                max_instances=3,
                target_cpu_utilization=60
            )
        
        self.environment_vars.update({
            "NODE_ENV": "production",
            "PORT": "3000",
            "MCP_SERVER_URL": "http://mcp-server:8000"
        })
        
        self.dependencies = [ServiceType.MCP_SERVER]
    
    def _set_mcp_bridge_defaults(self):
        """Set defaults for MCP bridge"""
        if not self.ports:
            self.ports = [PortMapping(container_port=8001, host_port=8001)]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="100m",
                memory_request="128Mi",
                cpu_limit="500m",
                memory_limit="512Mi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=1,
                max_instances=3,
                target_cpu_utilization=60
            )
        
        self.environment_vars.update({
            "BRIDGE_HOST": "0.0.0.0",
            "BRIDGE_PORT": "8001",
            "MCP_SERVER_URL": "http://mcp-server:8000"
        })
        
        self.dependencies = [ServiceType.MCP_SERVER]
    
    def _set_nginx_defaults(self):
        """Set defaults for Nginx"""
        if not self.ports:
            self.ports = [
                PortMapping(container_port=80, host_port=80),
                PortMapping(container_port=443, host_port=443)
            ]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="50m",
                memory_request="64Mi",
                cpu_limit="200m",
                memory_limit="256Mi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=1,
                max_instances=3,
                target_cpu_utilization=50
            )
        
        self.dependencies = [ServiceType.MCP_SERVER, ServiceType.MESSENGER_CLIENT, ServiceType.MCP_BRIDGE]
    
    def _set_api_gateway_defaults(self):
        """Set defaults for API gateway"""
        if not self.ports:
            self.ports = [
                PortMapping(container_port=8080, host_port=8080),
                PortMapping(container_port=9091, host_port=9091)
            ]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="200m",
                memory_request="256Mi",
                cpu_limit="1000m",
                memory_limit="1Gi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=2,
                max_instances=10,
                target_cpu_utilization=70
            )
        
        self.environment_vars.update({
            "GATEWAY_HOST": "0.0.0.0",
            "GATEWAY_PORT": "8080",
            "METRICS_PORT": "9091"
        })
        
        self.dependencies = [ServiceType.MCP_SERVER, ServiceType.MCP_BRIDGE, ServiceType.MESSENGER_CLIENT]
    
    def _set_monitoring_defaults(self):
        """Set defaults for monitoring service"""
        if not self.ports:
            self.ports = [
                PortMapping(container_port=3001, host_port=3001),
                PortMapping(container_port=9090, host_port=9090)
            ]
        
        if not self.health_check:
            self.health_check = HealthCheck(
                endpoint="/health",
                expected_status=200
            )
        
        if not self.resources:
            self.resources = ResourceRequirements(
                cpu_request="100m",
                memory_request="128Mi",
                cpu_limit="500m",
                memory_limit="512Mi"
            )
        
        if not self.scaling:
            self.scaling = ScalingConfig(
                min_instances=1,
                max_instances=2,
                target_cpu_utilization=60
            )
        
        self.environment_vars.update({
            "MONITORING_HOST": "0.0.0.0",
            "MONITORING_PORT": "3001",
            "METRICS_PORT": "9090"
        })
        
        self.dependencies = [ServiceType.MCP_SERVER, ServiceType.API_GATEWAY]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name.value,
            "image": self.image,
            "tag": self.tag,
            "ports": [port.to_dict() for port in self.ports],
            "environment_vars": self.environment_vars,
            "health_check": self.health_check.to_dict() if self.health_check else None,
            "scaling": self.scaling.to_dict() if self.scaling else None,
            "resources": self.resources.to_dict() if self.resources else None,
            "dependencies": [dep.value for dep in self.dependencies],
            "restart_policy": self.restart_policy,
            "status": self.status.value,
            "replicas": self.replicas
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ServiceConfiguration':
        """Create from dictionary"""
        ports = [PortMapping(**port_data) for port_data in data.get("ports", [])]
        health_check = HealthCheck(**data["health_check"]) if data.get("health_check") else None
        scaling = ScalingConfig(**data["scaling"]) if data.get("scaling") else None
        resources = ResourceRequirements(**data["resources"]) if data.get("resources") else None
        dependencies = [ServiceType(dep) for dep in data.get("dependencies", [])]
        
        return cls(
            name=ServiceType(data["name"]),
            image=data["image"],
            tag=data.get("tag", "latest"),
            ports=ports,
            environment_vars=data.get("environment_vars", {}),
            health_check=health_check,
            scaling=scaling,
            resources=resources,
            dependencies=dependencies,
            restart_policy=data.get("restart_policy", "unless-stopped"),
            status=ServiceStatus(data.get("status", "pending")),
            replicas=data.get("replicas", 1)
        )
    
    def update_status(self, status: ServiceStatus):
        """Update service status"""
        self.status = status
        logger.info(f"Service {self.name.value} status updated to {status.value}")
    
    def get_image_with_tag(self) -> str:
        """Get full image name with tag"""
        return f"{self.image}:{self.tag}"
    
    def get_port_mapping(self, container_port: int) -> Optional[PortMapping]:
        """Get port mapping for container port"""
        for port in self.ports:
            if port.container_port == container_port:
                return port
        return None
    
    def is_healthy(self) -> bool:
        """Check if service is healthy"""
        return self.status == ServiceStatus.RUNNING
    
    def can_scale(self) -> bool:
        """Check if service can be scaled"""
        return (self.scaling is not None and 
                self.status == ServiceStatus.RUNNING and
                self.replicas < self.scaling.max_instances)
    
    def can_scale_down(self) -> bool:
        """Check if service can be scaled down"""
        return (self.scaling is not None and 
                self.replicas > self.scaling.min_instances)
    
    def get_dependency_services(self) -> List[str]:
        """Get list of dependency service names"""
        return [dep.value for dep in self.dependencies]


# Factory functions for service configurations
def create_mcp_server_config(image: str = "f1-mcp-server", tag: str = "latest") -> ServiceConfiguration:
    """Create MCP server service configuration"""
    return ServiceConfiguration(
        name=ServiceType.MCP_SERVER,
        image=image,
        tag=tag
    )


def create_messenger_client_config(image: str = "f1-messenger-client", tag: str = "latest") -> ServiceConfiguration:
    """Create messenger client service configuration"""
    return ServiceConfiguration(
        name=ServiceType.MESSENGER_CLIENT,
        image=image,
        tag=tag
    )


def create_mcp_bridge_config(image: str = "f1-mcp-bridge", tag: str = "latest") -> ServiceConfiguration:
    """Create MCP bridge service configuration"""
    return ServiceConfiguration(
        name=ServiceType.MCP_BRIDGE,
        image=image,
        tag=tag
    )


def create_nginx_config(image: str = "nginx", tag: str = "alpine") -> ServiceConfiguration:
    """Create Nginx service configuration"""
    return ServiceConfiguration(
        name=ServiceType.NGINX,
        image=image,
        tag=tag
    )


def create_api_gateway_config(image: str = "f1-api-gateway", tag: str = "latest") -> ServiceConfiguration:
    """Create API gateway service configuration"""
    return ServiceConfiguration(
        name=ServiceType.API_GATEWAY,
        image=image,
        tag=tag
    )


def create_monitoring_config(image: str = "f1-monitoring", tag: str = "latest") -> ServiceConfiguration:
    """Create monitoring service configuration"""
    return ServiceConfiguration(
        name=ServiceType.MONITORING,
        image=image,
        tag=tag
    )


def create_all_service_configs() -> Dict[ServiceType, ServiceConfiguration]:
    """Create configurations for all services"""
    return {
        ServiceType.MCP_SERVER: create_mcp_server_config(),
        ServiceType.MESSENGER_CLIENT: create_messenger_client_config(),
        ServiceType.MCP_BRIDGE: create_mcp_bridge_config(),
        ServiceType.NGINX: create_nginx_config(),
        ServiceType.API_GATEWAY: create_api_gateway_config(),
        ServiceType.MONITORING: create_monitoring_config()
    }
