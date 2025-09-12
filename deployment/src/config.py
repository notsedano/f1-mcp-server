"""
Deployment Configuration Model
Manages deployment settings and environment configuration for F1 MCP Server cloud deployment.
"""

import os
import yaml
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class Environment(str, Enum):
    """Deployment environment types"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class CloudProvider(str, Enum):
    """Supported cloud providers"""
    AWS = "aws"
    GCP = "gcp"
    AZURE = "azure"
    DIGITALOCEAN = "digitalocean"
    OTHER = "other"


@dataclass
class ResourceLimits:
    """Resource limits for deployment"""
    cpu_limit: str = "1000m"
    memory_limit: str = "1Gi"
    storage_limit: str = "10Gi"
    max_instances: int = 10
    min_instances: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "cpu_limit": self.cpu_limit,
            "memory_limit": self.memory_limit,
            "storage_limit": self.storage_limit,
            "max_instances": self.max_instances,
            "min_instances": self.min_instances
        }


@dataclass
class SecurityConfig:
    """Security configuration for deployment"""
    api_secret_key: str
    jwt_secret: str
    cors_origins: List[str] = field(default_factory=list)
    rate_limit_requests_per_minute: int = 100
    rate_limit_burst_size: int = 200
    enable_ssl: bool = True
    ssl_cert_path: Optional[str] = None
    ssl_key_path: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "api_secret_key": self.api_secret_key,
            "jwt_secret": self.jwt_secret,
            "cors_origins": self.cors_origins,
            "rate_limit_requests_per_minute": self.rate_limit_requests_per_minute,
            "rate_limit_burst_size": self.rate_limit_burst_size,
            "enable_ssl": self.enable_ssl,
            "ssl_cert_path": self.ssl_cert_path,
            "ssl_key_path": self.ssl_key_path
        }


@dataclass
class MonitoringConfig:
    """Monitoring configuration for deployment"""
    enabled: bool = True
    metrics_port: int = 9090
    dashboard_port: int = 3001
    log_level: str = "INFO"
    log_format: str = "json"
    retention_days: int = 30
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "enabled": self.enabled,
            "metrics_port": self.metrics_port,
            "dashboard_port": self.dashboard_port,
            "log_level": self.log_level,
            "log_format": self.log_format,
            "retention_days": self.retention_days
        }


@dataclass
class DeploymentConfiguration:
    """Main deployment configuration"""
    environment: Environment
    version: str
    cloud_provider: CloudProvider
    region: str
    resources: ResourceLimits
    security: SecurityConfig
    monitoring: MonitoringConfig
    services: List[str] = field(default_factory=lambda: [
        "mcp-server",
        "messenger-client", 
        "mcp-bridge",
        "nginx",
        "api-gateway",
        "monitoring"
    ])
    secrets: Dict[str, str] = field(default_factory=dict)
    environment_vars: Dict[str, str] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate configuration after initialization"""
        self._validate_config()
    
    def _validate_config(self):
        """Validate deployment configuration"""
        # Validate version format (semantic versioning)
        if not self._is_valid_version(self.version):
            raise ValueError(f"Invalid version format: {self.version}. Expected format: MAJOR.MINOR.PATCH")
        
        # Validate resource limits
        if self.resources.min_instances > self.resources.max_instances:
            raise ValueError("min_instances cannot be greater than max_instances")
        
        if self.resources.min_instances < 1:
            raise ValueError("min_instances must be at least 1")
        
        # Validate security configuration
        if len(self.security.api_secret_key) < 32:
            raise ValueError("API secret key must be at least 32 characters long")
        
        if len(self.security.jwt_secret) < 32:
            raise ValueError("JWT secret must be at least 32 characters long")
        
        # Validate environment-specific settings
        if self.environment == Environment.PRODUCTION:
            if not self.security.enable_ssl:
                raise ValueError("SSL must be enabled in production environment")
            
            if self.monitoring.log_level == "DEBUG":
                logger.warning("Debug logging is enabled in production environment")
    
    def _is_valid_version(self, version: str) -> bool:
        """Check if version follows semantic versioning"""
        try:
            parts = version.split('.')
            if len(parts) != 3:
                return False
            
            for part in parts:
                if not part.isdigit():
                    return False
            
            return True
        except:
            return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "environment": self.environment.value,
            "version": self.version,
            "cloud_provider": self.cloud_provider.value,
            "region": self.region,
            "resources": self.resources.to_dict(),
            "security": self.security.to_dict(),
            "monitoring": self.monitoring.to_dict(),
            "services": self.services,
            "secrets": self.secrets,
            "environment_vars": self.environment_vars
        }
    
    def to_yaml(self) -> str:
        """Convert to YAML string"""
        return yaml.dump(self.to_dict(), default_flow_style=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DeploymentConfiguration':
        """Create from dictionary"""
        return cls(
            environment=Environment(data["environment"]),
            version=data["version"],
            cloud_provider=CloudProvider(data["cloud_provider"]),
            region=data["region"],
            resources=ResourceLimits(**data["resources"]),
            security=SecurityConfig(**data["security"]),
            monitoring=MonitoringConfig(**data["monitoring"]),
            services=data.get("services", []),
            secrets=data.get("secrets", {}),
            environment_vars=data.get("environment_vars", {})
        )
    
    @classmethod
    def from_yaml(cls, yaml_content: str) -> 'DeploymentConfiguration':
        """Create from YAML content"""
        data = yaml.safe_load(yaml_content)
        return cls.from_dict(data)
    
    @classmethod
    def from_file(cls, file_path: str) -> 'DeploymentConfiguration':
        """Create from YAML file"""
        with open(file_path, 'r') as f:
            return cls.from_yaml(f.read())
    
    @classmethod
    def from_environment(cls) -> 'DeploymentConfiguration':
        """Create from environment variables"""
        # Get environment
        env_str = os.getenv('ENVIRONMENT', 'development')
        try:
            environment = Environment(env_str)
        except ValueError:
            raise ValueError(f"Invalid environment: {env_str}")
        
        # Get cloud provider
        provider_str = os.getenv('CLOUD_PROVIDER', 'digitalocean')
        try:
            cloud_provider = CloudProvider(provider_str)
        except ValueError:
            raise ValueError(f"Invalid cloud provider: {provider_str}")
        
        # Create configuration
        config = cls(
            environment=environment,
            version=os.getenv('VERSION', '1.0.0'),
            cloud_provider=cloud_provider,
            region=os.getenv('REGION', 'nyc3'),
            resources=ResourceLimits(
                cpu_limit=os.getenv('CPU_LIMIT', '1000m'),
                memory_limit=os.getenv('MEMORY_LIMIT', '1Gi'),
                storage_limit=os.getenv('STORAGE_LIMIT', '10Gi'),
                max_instances=int(os.getenv('MAX_INSTANCES', '10')),
                min_instances=int(os.getenv('MIN_INSTANCES', '1'))
            ),
            security=SecurityConfig(
                api_secret_key=os.getenv('API_SECRET_KEY', ''),
                jwt_secret=os.getenv('JWT_SECRET', ''),
                cors_origins=os.getenv('CORS_ORIGINS', '').split(',') if os.getenv('CORS_ORIGINS') else [],
                rate_limit_requests_per_minute=int(os.getenv('RATE_LIMIT_REQUESTS_PER_MINUTE', '100')),
                rate_limit_burst_size=int(os.getenv('RATE_LIMIT_BURST_SIZE', '200')),
                enable_ssl=os.getenv('ENABLE_SSL', 'true').lower() == 'true',
                ssl_cert_path=os.getenv('SSL_CERT_PATH'),
                ssl_key_path=os.getenv('SSL_KEY_PATH')
            ),
            monitoring=MonitoringConfig(
                enabled=os.getenv('MONITORING_ENABLED', 'true').lower() == 'true',
                metrics_port=int(os.getenv('METRICS_PORT', '9090')),
                dashboard_port=int(os.getenv('DASHBOARD_PORT', '3001')),
                log_level=os.getenv('LOG_LEVEL', 'INFO'),
                log_format=os.getenv('LOG_FORMAT', 'json'),
                retention_days=int(os.getenv('RETENTION_DAYS', '30'))
            )
        )
        
        # Add environment variables
        config.environment_vars = dict(os.environ)
        
        return config
    
    def save_to_file(self, file_path: str):
        """Save configuration to YAML file"""
        with open(file_path, 'w') as f:
            f.write(self.to_yaml())
    
    def get_service_config(self, service_name: str) -> Dict[str, Any]:
        """Get configuration for a specific service"""
        base_config = {
            "environment": self.environment.value,
            "version": self.version,
            "region": self.region,
            "resources": self.resources.to_dict(),
            "monitoring": self.monitoring.to_dict()
        }
        
        # Add service-specific configuration
        if service_name == "api-gateway":
            base_config.update({
                "security": self.security.to_dict(),
                "cors_origins": self.security.cors_origins,
                "rate_limiting": {
                    "requests_per_minute": self.security.rate_limit_requests_per_minute,
                    "burst_size": self.security.rate_limit_burst_size
                }
            })
        elif service_name == "monitoring":
            base_config.update({
                "metrics_port": self.monitoring.metrics_port,
                "dashboard_port": self.monitoring.dashboard_port,
                "log_level": self.monitoring.log_level
            })
        
        return base_config


# Factory functions for common configurations
def create_development_config() -> DeploymentConfiguration:
    """Create development environment configuration"""
    return DeploymentConfiguration(
        environment=Environment.DEVELOPMENT,
        version="1.0.0-dev",
        cloud_provider=CloudProvider.DIGITALOCEAN,
        region="nyc3",
        resources=ResourceLimits(
            cpu_limit="500m",
            memory_limit="512Mi",
            storage_limit="5Gi",
            max_instances=3,
            min_instances=1
        ),
        security=SecurityConfig(
            api_secret_key="dev-api-secret-key-32-chars-long",
            jwt_secret="dev-jwt-secret-key-32-chars-long",
            cors_origins=["http://localhost:3000", "http://localhost:8080"],
            rate_limit_requests_per_minute=1000,
            rate_limit_burst_size=2000,
            enable_ssl=False
        ),
        monitoring=MonitoringConfig(
            enabled=True,
            log_level="DEBUG",
            retention_days=7
        )
    )


def create_staging_config() -> DeploymentConfiguration:
    """Create staging environment configuration"""
    return DeploymentConfiguration(
        environment=Environment.STAGING,
        version="1.0.0-staging",
        cloud_provider=CloudProvider.DIGITALOCEAN,
        region="nyc3",
        resources=ResourceLimits(
            cpu_limit="1000m",
            memory_limit="1Gi",
            storage_limit="10Gi",
            max_instances=5,
            min_instances=2
        ),
        security=SecurityConfig(
            api_secret_key="staging-api-secret-key-32-chars-long",
            jwt_secret="staging-jwt-secret-key-32-chars-long",
            cors_origins=["https://staging.f1mcp.com"],
            rate_limit_requests_per_minute=500,
            rate_limit_burst_size=1000,
            enable_ssl=True
        ),
        monitoring=MonitoringConfig(
            enabled=True,
            log_level="INFO",
            retention_days=14
        )
    )


def create_production_config() -> DeploymentConfiguration:
    """Create production environment configuration"""
    return DeploymentConfiguration(
        environment=Environment.PRODUCTION,
        version="1.0.0",
        cloud_provider=CloudProvider.DIGITALOCEAN,
        region="nyc3",
        resources=ResourceLimits(
            cpu_limit="2000m",
            memory_limit="2Gi",
            storage_limit="20Gi",
            max_instances=20,
            min_instances=3
        ),
        security=SecurityConfig(
            api_secret_key=os.getenv('API_SECRET_KEY', 'production-api-secret-key-32-chars-long'),
            jwt_secret=os.getenv('JWT_SECRET', 'production-jwt-secret-key-32-chars-long'),
            cors_origins=["https://api.f1mcp.com", "https://f1mcp.com"],
            rate_limit_requests_per_minute=100,
            rate_limit_burst_size=200,
            enable_ssl=True
        ),
        monitoring=MonitoringConfig(
            enabled=True,
            log_level="WARN",
            retention_days=30
        )
    )
