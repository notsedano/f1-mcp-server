"""
Unit tests for deployment models
Tests for DeploymentConfiguration, ServiceConfiguration, and related models.
"""

import pytest
import tempfile
import os
from unittest.mock import patch, mock_open
from typing import Dict, Any

from deployment.src.config import (
    DeploymentConfiguration, ResourceLimits, SecurityConfig, MonitoringConfig,
    Environment, CloudProvider, create_development_config, create_staging_config,
    create_production_config
)
from deployment.src.service_config import (
    ServiceConfiguration, PortMapping, HealthCheck, ScalingConfig,
    ResourceRequirements, ServiceType, ServiceStatus,
    create_mcp_server_config, create_messenger_client_config,
    create_mcp_bridge_config, create_nginx_config, create_api_gateway_config,
    create_monitoring_config, create_all_service_configs
)


class TestResourceLimits:
    """Test ResourceLimits model"""
    
    def test_resource_limits_creation(self):
        """Test creating ResourceLimits instance"""
        limits = ResourceLimits(
            cpu_limit="1000m",
            memory_limit="1Gi",
            storage_limit="10Gi",
            max_instances=10,
            min_instances=1
        )
        
        assert limits.cpu_limit == "1000m"
        assert limits.memory_limit == "1Gi"
        assert limits.storage_limit == "10Gi"
        assert limits.max_instances == 10
        assert limits.min_instances == 1
    
    def test_resource_limits_to_dict(self):
        """Test converting ResourceLimits to dictionary"""
        limits = ResourceLimits(
            cpu_limit="500m",
            memory_limit="512Mi",
            max_instances=5,
            min_instances=2
        )
        
        result = limits.to_dict()
        
        expected = {
            "cpu_limit": "500m",
            "memory_limit": "512Mi",
            "storage_limit": "10Gi",
            "max_instances": 5,
            "min_instances": 2
        }
        
        assert result == expected


class TestSecurityConfig:
    """Test SecurityConfig model"""
    
    def test_security_config_creation(self):
        """Test creating SecurityConfig instance"""
        config = SecurityConfig(
            api_secret_key="test-api-secret-key-32-chars-long",
            jwt_secret="test-jwt-secret-key-32-chars-long",
            cors_origins=["http://localhost:3000"],
            rate_limit_requests_per_minute=100,
            enable_ssl=True
        )
        
        assert config.api_secret_key == "test-api-secret-key-32-chars-long"
        assert config.jwt_secret == "test-jwt-secret-key-32-chars-long"
        assert config.cors_origins == ["http://localhost:3000"]
        assert config.rate_limit_requests_per_minute == 100
        assert config.enable_ssl is True
    
    def test_security_config_to_dict(self):
        """Test converting SecurityConfig to dictionary"""
        config = SecurityConfig(
            api_secret_key="test-secret",
            jwt_secret="test-jwt"
        )
        
        result = config.to_dict()
        
        assert result["api_secret_key"] == "test-secret"
        assert result["jwt_secret"] == "test-jwt"
        assert result["cors_origins"] == []
        assert result["rate_limit_requests_per_minute"] == 100


class TestMonitoringConfig:
    """Test MonitoringConfig model"""
    
    def test_monitoring_config_creation(self):
        """Test creating MonitoringConfig instance"""
        config = MonitoringConfig(
            enabled=True,
            metrics_port=9090,
            dashboard_port=3001,
            log_level="INFO"
        )
        
        assert config.enabled is True
        assert config.metrics_port == 9090
        assert config.dashboard_port == 3001
        assert config.log_level == "INFO"
    
    def test_monitoring_config_defaults(self):
        """Test MonitoringConfig default values"""
        config = MonitoringConfig()
        
        assert config.enabled is True
        assert config.metrics_port == 9090
        assert config.dashboard_port == 3001
        assert config.log_level == "INFO"
        assert config.log_format == "json"
        assert config.retention_days == 30


class TestDeploymentConfiguration:
    """Test DeploymentConfiguration model"""
    
    def test_deployment_config_creation(self):
        """Test creating DeploymentConfiguration instance"""
        resources = ResourceLimits()
        security = SecurityConfig(
            api_secret_key="test-api-secret-key-32-chars-long",
            jwt_secret="test-jwt-secret-key-32-chars-long"
        )
        monitoring = MonitoringConfig()
        
        config = DeploymentConfiguration(
            environment=Environment.DEVELOPMENT,
            version="1.0.0",
            cloud_provider=CloudProvider.DIGITALOCEAN,
            region="nyc3",
            resources=resources,
            security=security,
            monitoring=monitoring
        )
        
        assert config.environment == Environment.DEVELOPMENT
        assert config.version == "1.0.0"
        assert config.cloud_provider == CloudProvider.DIGITALOCEAN
        assert config.region == "nyc3"
        assert isinstance(config.resources, ResourceLimits)
        assert isinstance(config.security, SecurityConfig)
        assert isinstance(config.monitoring, MonitoringConfig)
    
    def test_deployment_config_validation_valid_version(self):
        """Test deployment config with valid version"""
        config = create_development_config()
        assert config.version == "1.0.0-dev"
    
    def test_deployment_config_validation_invalid_version(self):
        """Test deployment config with invalid version"""
        resources = ResourceLimits()
        security = SecurityConfig(
            api_secret_key="test-api-secret-key-32-chars-long",
            jwt_secret="test-jwt-secret-key-32-chars-long"
        )
        monitoring = MonitoringConfig()
        
        with pytest.raises(ValueError, match="Invalid version format"):
            DeploymentConfiguration(
                environment=Environment.DEVELOPMENT,
                version="invalid-version",
                cloud_provider=CloudProvider.DIGITALOCEAN,
                region="nyc3",
                resources=resources,
                security=security,
                monitoring=monitoring
            )
    
    def test_deployment_config_validation_resource_limits(self):
        """Test deployment config resource limits validation"""
        resources = ResourceLimits(min_instances=5, max_instances=3)
        security = SecurityConfig(
            api_secret_key="test-api-secret-key-32-chars-long",
            jwt_secret="test-jwt-secret-key-32-chars-long"
        )
        monitoring = MonitoringConfig()
        
        with pytest.raises(ValueError, match="min_instances cannot be greater than max_instances"):
            DeploymentConfiguration(
                environment=Environment.DEVELOPMENT,
                version="1.0.0",
                cloud_provider=CloudProvider.DIGITALOCEAN,
                region="nyc3",
                resources=resources,
                security=security,
                monitoring=monitoring
            )
    
    def test_deployment_config_validation_security(self):
        """Test deployment config security validation"""
        resources = ResourceLimits()
        security = SecurityConfig(
            api_secret_key="short",
            jwt_secret="test-jwt-secret-key-32-chars-long"
        )
        monitoring = MonitoringConfig()
        
        with pytest.raises(ValueError, match="API secret key must be at least 32 characters long"):
            DeploymentConfiguration(
                environment=Environment.DEVELOPMENT,
                version="1.0.0",
                cloud_provider=CloudProvider.DIGITALOCEAN,
                region="nyc3",
                resources=resources,
                security=security,
                monitoring=monitoring
            )
    
    def test_deployment_config_production_ssl_requirement(self):
        """Test production environment requires SSL"""
        resources = ResourceLimits()
        security = SecurityConfig(
            api_secret_key="test-api-secret-key-32-chars-long",
            jwt_secret="test-jwt-secret-key-32-chars-long",
            enable_ssl=False
        )
        monitoring = MonitoringConfig()
        
        with pytest.raises(ValueError, match="SSL must be enabled in production environment"):
            DeploymentConfiguration(
                environment=Environment.PRODUCTION,
                version="1.0.0",
                cloud_provider=CloudProvider.DIGITALOCEAN,
                region="nyc3",
                resources=resources,
                security=security,
                monitoring=monitoring
            )
    
    def test_deployment_config_to_dict(self):
        """Test converting DeploymentConfiguration to dictionary"""
        config = create_development_config()
        result = config.to_dict()
        
        assert result["environment"] == "development"
        assert result["version"] == "1.0.0-dev"
        assert result["cloud_provider"] == "digitalocean"
        assert result["region"] == "nyc3"
        assert "resources" in result
        assert "security" in result
        assert "monitoring" in result
        assert "services" in result
    
    def test_deployment_config_to_yaml(self):
        """Test converting DeploymentConfiguration to YAML"""
        config = create_development_config()
        yaml_content = config.to_yaml()
        
        assert isinstance(yaml_content, str)
        assert "development" in yaml_content
        assert "1.0.0-dev" in yaml_content
    
    def test_deployment_config_from_dict(self):
        """Test creating DeploymentConfiguration from dictionary"""
        data = {
            "environment": "development",
            "version": "1.0.0",
            "cloud_provider": "digitalocean",
            "region": "nyc3",
            "resources": {
                "cpu_limit": "1000m",
                "memory_limit": "1Gi",
                "storage_limit": "10Gi",
                "max_instances": 10,
                "min_instances": 1
            },
            "security": {
                "api_secret_key": "test-api-secret-key-32-chars-long",
                "jwt_secret": "test-jwt-secret-key-32-chars-long",
                "cors_origins": [],
                "rate_limit_requests_per_minute": 100,
                "rate_limit_burst_size": 200,
                "enable_ssl": False,
                "ssl_cert_path": None,
                "ssl_key_path": None
            },
            "monitoring": {
                "enabled": True,
                "metrics_port": 9090,
                "dashboard_port": 3001,
                "log_level": "INFO",
                "log_format": "json",
                "retention_days": 30
            },
            "services": [],
            "secrets": {},
            "environment_vars": {}
        }
        
        config = DeploymentConfiguration.from_dict(data)
        
        assert config.environment == Environment.DEVELOPMENT
        assert config.version == "1.0.0"
        assert config.cloud_provider == CloudProvider.DIGITALOCEAN
    
    def test_deployment_config_from_yaml(self):
        """Test creating DeploymentConfiguration from YAML"""
        yaml_content = """
environment: development
version: "1.0.0"
cloud_provider: digitalocean
region: nyc3
resources:
  cpu_limit: "1000m"
  memory_limit: "1Gi"
  storage_limit: "10Gi"
  max_instances: 10
  min_instances: 1
security:
  api_secret_key: "test-api-secret-key-32-chars-long"
  jwt_secret: "test-jwt-secret-key-32-chars-long"
  cors_origins: []
  rate_limit_requests_per_minute: 100
  rate_limit_burst_size: 200
  enable_ssl: false
monitoring:
  enabled: true
  metrics_port: 9090
  dashboard_port: 3001
  log_level: INFO
  log_format: json
  retention_days: 30
services: []
secrets: {}
environment_vars: {}
"""
        
        config = DeploymentConfiguration.from_yaml(yaml_content)
        
        assert config.environment == Environment.DEVELOPMENT
        assert config.version == "1.0.0"
        assert config.cloud_provider == CloudProvider.DIGITALOCEAN
    
    def test_deployment_config_from_file(self):
        """Test creating DeploymentConfiguration from file"""
        yaml_content = """
environment: development
version: "1.0.0"
cloud_provider: digitalocean
region: nyc3
resources:
  cpu_limit: "1000m"
  memory_limit: "1Gi"
  storage_limit: "10Gi"
  max_instances: 10
  min_instances: 1
security:
  api_secret_key: "test-api-secret-key-32-chars-long"
  jwt_secret: "test-jwt-secret-key-32-chars-long"
  cors_origins: []
  rate_limit_requests_per_minute: 100
  rate_limit_burst_size: 200
  enable_ssl: false
monitoring:
  enabled: true
  metrics_port: 9090
  dashboard_port: 3001
  log_level: INFO
  log_format: json
  retention_days: 30
services: []
secrets: {}
environment_vars: {}
"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            f.write(yaml_content)
            temp_file = f.name
        
        try:
            config = DeploymentConfiguration.from_file(temp_file)
            assert config.environment == Environment.DEVELOPMENT
            assert config.version == "1.0.0"
        finally:
            os.unlink(temp_file)
    
    @patch.dict(os.environ, {
        'ENVIRONMENT': 'development',
        'VERSION': '1.0.0',
        'CLOUD_PROVIDER': 'digitalocean',
        'REGION': 'nyc3',
        'API_SECRET_KEY': 'test-api-secret-key-32-chars-long',
        'JWT_SECRET': 'test-jwt-secret-key-32-chars-long'
    })
    def test_deployment_config_from_environment(self):
        """Test creating DeploymentConfiguration from environment variables"""
        config = DeploymentConfiguration.from_environment()
        
        assert config.environment == Environment.DEVELOPMENT
        assert config.version == "1.0.0"
        assert config.cloud_provider == CloudProvider.DIGITALOCEAN
        assert config.region == "nyc3"
        assert config.security.api_secret_key == "test-api-secret-key-32-chars-long"
        assert config.security.jwt_secret == "test-jwt-secret-key-32-chars-long"
    
    def test_deployment_config_save_to_file(self):
        """Test saving DeploymentConfiguration to file"""
        config = create_development_config()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
            temp_file = f.name
        
        try:
            config.save_to_file(temp_file)
            
            # Verify file was created and contains expected content
            assert os.path.exists(temp_file)
            with open(temp_file, 'r') as f:
                content = f.read()
                assert "development" in content
                assert "1.0.0-dev" in content
        finally:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def test_deployment_config_get_service_config(self):
        """Test getting service-specific configuration"""
        config = create_development_config()
        
        # Test API gateway service config
        service_config = config.get_service_config("api-gateway")
        assert "security" in service_config
        assert "cors_origins" in service_config
        assert "rate_limiting" in service_config
        
        # Test monitoring service config
        service_config = config.get_service_config("monitoring")
        assert "metrics_port" in service_config
        assert "dashboard_port" in service_config
        assert "log_level" in service_config


class TestFactoryFunctions:
    """Test factory functions for creating configurations"""
    
    def test_create_development_config(self):
        """Test create_development_config factory function"""
        config = create_development_config()
        
        assert config.environment == Environment.DEVELOPMENT
        assert config.version == "1.0.0-dev"
        assert config.cloud_provider == CloudProvider.DIGITALOCEAN
        assert config.security.enable_ssl is False
        assert config.monitoring.log_level == "DEBUG"
    
    def test_create_staging_config(self):
        """Test create_staging_config factory function"""
        config = create_staging_config()
        
        assert config.environment == Environment.STAGING
        assert config.version == "1.0.0-staging"
        assert config.security.enable_ssl is True
        assert config.monitoring.log_level == "INFO"
    
    def test_create_production_config(self):
        """Test create_production_config factory function"""
        config = create_production_config()
        
        assert config.environment == Environment.PRODUCTION
        assert config.version == "1.0.0"
        assert config.security.enable_ssl is True
        assert config.monitoring.log_level == "WARN"


class TestPortMapping:
    """Test PortMapping model"""
    
    def test_port_mapping_creation(self):
        """Test creating PortMapping instance"""
        mapping = PortMapping(
            container_port=8000,
            host_port=8000,
            protocol="tcp",
            expose=True
        )
        
        assert mapping.container_port == 8000
        assert mapping.host_port == 8000
        assert mapping.protocol == "tcp"
        assert mapping.expose is True
    
    def test_port_mapping_to_dict(self):
        """Test converting PortMapping to dictionary"""
        mapping = PortMapping(container_port=3000)
        result = mapping.to_dict()
        
        expected = {
            "container_port": 3000,
            "host_port": None,
            "protocol": "tcp",
            "expose": True
        }
        
        assert result == expected


class TestHealthCheck:
    """Test HealthCheck model"""
    
    def test_health_check_creation(self):
        """Test creating HealthCheck instance"""
        health_check = HealthCheck(
            endpoint="/health",
            interval_seconds=30,
            timeout_seconds=10,
            retry_count=3,
            expected_status=200
        )
        
        assert health_check.endpoint == "/health"
        assert health_check.interval_seconds == 30
        assert health_check.timeout_seconds == 10
        assert health_check.retry_count == 3
        assert health_check.expected_status == 200
    
    def test_health_check_defaults(self):
        """Test HealthCheck default values"""
        health_check = HealthCheck(endpoint="/health")
        
        assert health_check.interval_seconds == 30
        assert health_check.timeout_seconds == 10
        assert health_check.retry_count == 3
        assert health_check.start_period_seconds == 40
        assert health_check.expected_status == 200


class TestScalingConfig:
    """Test ScalingConfig model"""
    
    def test_scaling_config_creation(self):
        """Test creating ScalingConfig instance"""
        scaling = ScalingConfig(
            min_instances=2,
            max_instances=10,
            target_cpu_utilization=70,
            target_memory_utilization=80
        )
        
        assert scaling.min_instances == 2
        assert scaling.max_instances == 10
        assert scaling.target_cpu_utilization == 70
        assert scaling.target_memory_utilization == 80
    
    def test_scaling_config_defaults(self):
        """Test ScalingConfig default values"""
        scaling = ScalingConfig()
        
        assert scaling.min_instances == 1
        assert scaling.max_instances == 5
        assert scaling.target_cpu_utilization == 70
        assert scaling.target_memory_utilization == 80
        assert scaling.scale_up_cooldown == 300
        assert scaling.scale_down_cooldown == 600


class TestResourceRequirements:
    """Test ResourceRequirements model"""
    
    def test_resource_requirements_creation(self):
        """Test creating ResourceRequirements instance"""
        resources = ResourceRequirements(
            cpu_request="100m",
            memory_request="128Mi",
            cpu_limit="500m",
            memory_limit="512Mi"
        )
        
        assert resources.cpu_request == "100m"
        assert resources.memory_request == "128Mi"
        assert resources.cpu_limit == "500m"
        assert resources.memory_limit == "512Mi"
    
    def test_resource_requirements_defaults(self):
        """Test ResourceRequirements default values"""
        resources = ResourceRequirements()
        
        assert resources.cpu_request == "100m"
        assert resources.memory_request == "128Mi"
        assert resources.cpu_limit == "500m"
        assert resources.memory_limit == "512Mi"
        assert resources.storage_request == "1Gi"


class TestServiceConfiguration:
    """Test ServiceConfiguration model"""
    
    def test_service_config_creation(self):
        """Test creating ServiceConfiguration instance"""
        service = ServiceConfiguration(
            name=ServiceType.MCP_SERVER,
            image="f1-mcp-server",
            tag="latest"
        )
        
        assert service.name == ServiceType.MCP_SERVER
        assert service.image == "f1-mcp-server"
        assert service.tag == "latest"
        assert service.status == ServiceStatus.PENDING
    
    def test_service_config_validation_missing_name(self):
        """Test service config validation with missing name"""
        with pytest.raises(ValueError, match="Service name is required"):
            ServiceConfiguration(
                name=None,
                image="test-image"
            )
    
    def test_service_config_validation_missing_image(self):
        """Test service config validation with missing image"""
        with pytest.raises(ValueError, match="Service image is required"):
            ServiceConfiguration(
                name=ServiceType.MCP_SERVER,
                image=""
            )
    
    def test_service_config_validation_scaling(self):
        """Test service config validation for scaling"""
        scaling = ScalingConfig(min_instances=5, max_instances=3)
        
        with pytest.raises(ValueError, match="min_instances cannot be greater than max_instances"):
            ServiceConfiguration(
                name=ServiceType.MCP_SERVER,
                image="test-image",
                scaling=scaling
            )
    
    def test_service_config_validation_resources(self):
        """Test service config validation for resources"""
        resources = ResourceRequirements(cpu_request="invalid")
        
        with pytest.raises(ValueError, match="Invalid CPU request format"):
            ServiceConfiguration(
                name=ServiceType.MCP_SERVER,
                image="test-image",
                resources=resources
            )
    
    def test_service_config_validation_ports(self):
        """Test service config validation for ports"""
        ports = [PortMapping(container_port=0)]  # Invalid port
        
        with pytest.raises(ValueError, match="Invalid container port"):
            ServiceConfiguration(
                name=ServiceType.MCP_SERVER,
                image="test-image",
                ports=ports
            )
    
    def test_service_config_mcp_server_defaults(self):
        """Test MCP server default configuration"""
        service = create_mcp_server_config()
        
        assert service.name == ServiceType.MCP_SERVER
        assert len(service.ports) == 1
        assert service.ports[0].container_port == 8000
        assert service.health_check is not None
        assert service.health_check.endpoint == "/health"
        assert service.resources is not None
        assert service.scaling is not None
    
    def test_service_config_messenger_client_defaults(self):
        """Test messenger client default configuration"""
        service = create_messenger_client_config()
        
        assert service.name == ServiceType.MESSENGER_CLIENT
        assert len(service.ports) == 1
        assert service.ports[0].container_port == 3000
        assert ServiceType.MCP_SERVER in service.dependencies
    
    def test_service_config_api_gateway_defaults(self):
        """Test API gateway default configuration"""
        service = create_api_gateway_config()
        
        assert service.name == ServiceType.API_GATEWAY
        assert len(service.ports) == 2
        assert service.ports[0].container_port == 8080
        assert service.ports[1].container_port == 9091
        assert ServiceType.MCP_SERVER in service.dependencies
    
    def test_service_config_to_dict(self):
        """Test converting ServiceConfiguration to dictionary"""
        service = create_mcp_server_config()
        result = service.to_dict()
        
        assert result["name"] == "mcp-server"
        assert result["image"] == "f1-mcp-server"
        assert result["tag"] == "latest"
        assert "ports" in result
        assert "health_check" in result
        assert "resources" in result
        assert "scaling" in result
    
    def test_service_config_from_dict(self):
        """Test creating ServiceConfiguration from dictionary"""
        data = {
            "name": "mcp-server",
            "image": "f1-mcp-server",
            "tag": "latest",
            "ports": [{"container_port": 8000, "host_port": 8000}],
            "environment_vars": {},
            "health_check": {
                "endpoint": "/health",
                "interval_seconds": 30,
                "timeout_seconds": 10,
                "retry_count": 3,
                "start_period_seconds": 40,
                "expected_status": 200,
                "expected_response": None
            },
            "scaling": {
                "min_instances": 1,
                "max_instances": 5,
                "target_cpu_utilization": 70,
                "target_memory_utilization": 80,
                "scale_up_cooldown": 300,
                "scale_down_cooldown": 600
            },
            "resources": {
                "cpu_request": "200m",
                "memory_request": "256Mi",
                "cpu_limit": "1000m",
                "memory_limit": "1Gi",
                "storage_request": "1Gi"
            },
            "dependencies": [],
            "restart_policy": "unless-stopped",
            "status": "pending",
            "replicas": 1
        }
        
        service = ServiceConfiguration.from_dict(data)
        
        assert service.name == ServiceType.MCP_SERVER
        assert service.image == "f1-mcp-server"
        assert service.tag == "latest"
        assert len(service.ports) == 1
        assert service.ports[0].container_port == 8000
    
    def test_service_config_update_status(self):
        """Test updating service status"""
        service = create_mcp_server_config()
        
        service.update_status(ServiceStatus.RUNNING)
        assert service.status == ServiceStatus.RUNNING
    
    def test_service_config_get_image_with_tag(self):
        """Test getting image with tag"""
        service = ServiceConfiguration(
            name=ServiceType.MCP_SERVER,
            image="f1-mcp-server",
            tag="v1.0.0"
        )
        
        assert service.get_image_with_tag() == "f1-mcp-server:v1.0.0"
    
    def test_service_config_get_port_mapping(self):
        """Test getting port mapping"""
        service = create_mcp_server_config()
        
        mapping = service.get_port_mapping(8000)
        assert mapping is not None
        assert mapping.container_port == 8000
        
        mapping = service.get_port_mapping(9999)
        assert mapping is None
    
    def test_service_config_is_healthy(self):
        """Test checking if service is healthy"""
        service = create_mcp_server_config()
        
        assert not service.is_healthy()  # Default status is PENDING
        
        service.update_status(ServiceStatus.RUNNING)
        assert service.is_healthy()
    
    def test_service_config_can_scale(self):
        """Test checking if service can scale"""
        service = create_mcp_server_config()
        
        # Initially can't scale because status is not RUNNING
        assert not service.can_scale()
        
        service.update_status(ServiceStatus.RUNNING)
        assert service.can_scale()  # Can scale up
        
        # Set replicas to max
        service.replicas = service.scaling.max_instances
        assert not service.can_scale()  # Can't scale up further
    
    def test_service_config_can_scale_down(self):
        """Test checking if service can scale down"""
        service = create_mcp_server_config()
        
        # Initially can't scale down because replicas is at minimum
        assert not service.can_scale_down()
        
        # Increase replicas
        service.replicas = 3
        assert service.can_scale_down()  # Can scale down
        
        # Set replicas to minimum
        service.replicas = service.scaling.min_instances
        assert not service.can_scale_down()  # Can't scale down further
    
    def test_service_config_get_dependency_services(self):
        """Test getting dependency service names"""
        service = create_messenger_client_config()
        
        dependencies = service.get_dependency_services()
        assert "mcp-server" in dependencies


class TestServiceFactoryFunctions:
    """Test factory functions for creating service configurations"""
    
    def test_create_mcp_server_config(self):
        """Test create_mcp_server_config factory function"""
        service = create_mcp_server_config()
        
        assert service.name == ServiceType.MCP_SERVER
        assert service.image == "f1-mcp-server"
        assert service.tag == "latest"
    
    def test_create_messenger_client_config(self):
        """Test create_messenger_client_config factory function"""
        service = create_messenger_client_config()
        
        assert service.name == ServiceType.MESSENGER_CLIENT
        assert service.image == "f1-messenger-client"
        assert service.tag == "latest"
    
    def test_create_mcp_bridge_config(self):
        """Test create_mcp_bridge_config factory function"""
        service = create_mcp_bridge_config()
        
        assert service.name == ServiceType.MCP_BRIDGE
        assert service.image == "f1-mcp-bridge"
        assert service.tag == "latest"
    
    def test_create_nginx_config(self):
        """Test create_nginx_config factory function"""
        service = create_nginx_config()
        
        assert service.name == ServiceType.NGINX
        assert service.image == "nginx"
        assert service.tag == "alpine"
    
    def test_create_api_gateway_config(self):
        """Test create_api_gateway_config factory function"""
        service = create_api_gateway_config()
        
        assert service.name == ServiceType.API_GATEWAY
        assert service.image == "f1-api-gateway"
        assert service.tag == "latest"
    
    def test_create_monitoring_config(self):
        """Test create_monitoring_config factory function"""
        service = create_monitoring_config()
        
        assert service.name == ServiceType.MONITORING
        assert service.image == "f1-monitoring"
        assert service.tag == "latest"
    
    def test_create_all_service_configs(self):
        """Test create_all_service_configs factory function"""
        configs = create_all_service_configs()
        
        assert len(configs) == 6
        assert ServiceType.MCP_SERVER in configs
        assert ServiceType.MESSENGER_CLIENT in configs
        assert ServiceType.MCP_BRIDGE in configs
        assert ServiceType.NGINX in configs
        assert ServiceType.API_GATEWAY in configs
        assert ServiceType.MONITORING in configs
        
        # Verify all services have proper configurations
        for service_type, config in configs.items():
            assert config.name == service_type
            assert config.image is not None
            assert config.tag is not None
