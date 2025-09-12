"""
Unit tests for API gateway models
Tests for APIEndpoint, APIKey, and related models.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from api_gateway.src.endpoint import (
    APIEndpoint, RateLimitConfig, CachingConfig, ValidationConfig,
    HTTPMethod, AuthenticationType, CacheStrategy, EndpointRegistry,
    create_health_endpoint, create_f1_schedule_endpoint, create_chat_endpoint
)
from api_gateway.src.api_key import (
    APIKey, APIKeyPermissions, APIKeyUsage, APIKeyManager,
    APIKeyStatus, PermissionLevel,
    create_read_only_permissions, create_admin_permissions
)


class TestRateLimitConfig:
    """Test RateLimitConfig model"""
    
    def test_rate_limit_config_creation(self):
        """Test creating RateLimitConfig instance"""
        config = RateLimitConfig(
            requests_per_minute=100,
            burst_size=200,
            per_ip=True
        )
        
        assert config.requests_per_minute == 100
        assert config.burst_size == 200
        assert config.per_ip is True
    
    def test_rate_limit_config_to_dict(self):
        """Test converting RateLimitConfig to dictionary"""
        config = RateLimitConfig(requests_per_minute=60)
        result = config.to_dict()
        
        assert result["requests_per_minute"] == 60
        assert result["burst_size"] == 120
        assert result["per_ip"] is True


class TestCachingConfig:
    """Test CachingConfig model"""
    
    def test_caching_config_creation(self):
        """Test creating CachingConfig instance"""
        config = CachingConfig(
            enabled=True,
            strategy=CacheStrategy.LONG_CACHE,
            ttl_seconds=3600
        )
        
        assert config.enabled is True
        assert config.strategy == CacheStrategy.LONG_CACHE
        assert config.ttl_seconds == 3600
    
    def test_caching_config_get_ttl_seconds(self):
        """Test getting TTL seconds based on strategy"""
        config = CachingConfig(strategy=CacheStrategy.SHORT_CACHE)
        assert config.get_ttl_seconds() == 300
        
        config = CachingConfig(strategy=CacheStrategy.LONG_CACHE)
        assert config.get_ttl_seconds() == 3600
        
        config = CachingConfig(strategy=CacheStrategy.VERY_LONG_CACHE)
        assert config.get_ttl_seconds() == 86400


class TestValidationConfig:
    """Test ValidationConfig model"""
    
    def test_validation_config_creation(self):
        """Test creating ValidationConfig instance"""
        config = ValidationConfig(
            required_fields=["name", "email"],
            max_body_size=2048,
            block_sql_injection=True
        )
        
        assert config.required_fields == ["name", "email"]
        assert config.max_body_size == 2048
        assert config.block_sql_injection is True
    
    def test_validation_config_defaults(self):
        """Test ValidationConfig default values"""
        config = ValidationConfig()
        
        assert config.required_fields == []
        assert config.max_body_size == 1024 * 1024
        assert config.allowed_content_types == [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
        ]


class TestAPIEndpoint:
    """Test APIEndpoint model"""
    
    def test_api_endpoint_creation(self):
        """Test creating APIEndpoint instance"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        
        assert endpoint.path == "/api/v1/test"
        assert endpoint.method == HTTPMethod.GET
        assert endpoint.target_service == "test-service"
        assert endpoint.authentication_required is True
    
    def test_api_endpoint_validation_missing_path(self):
        """Test endpoint validation with missing path"""
        with pytest.raises(ValueError, match="Endpoint path is required"):
            APIEndpoint(
                path="",
                method=HTTPMethod.GET,
                target_service="test-service"
            )
    
    def test_api_endpoint_validation_invalid_path(self):
        """Test endpoint validation with invalid path"""
        with pytest.raises(ValueError, match="Endpoint path must start with"):
            APIEndpoint(
                path="api/v1/test",
                method=HTTPMethod.GET,
                target_service="test-service"
            )
    
    def test_api_endpoint_validation_missing_target_service(self):
        """Test endpoint validation with missing target service"""
        with pytest.raises(ValueError, match="Target service is required"):
            APIEndpoint(
                path="/api/v1/test",
                method=HTTPMethod.GET,
                target_service=""
            )
    
    def test_api_endpoint_validation_invalid_rate_limit(self):
        """Test endpoint validation with invalid rate limit"""
        rate_limit = RateLimitConfig(requests_per_minute=0)
        
        with pytest.raises(ValueError, match="Rate limit requests_per_minute must be positive"):
            APIEndpoint(
                path="/api/v1/test",
                method=HTTPMethod.GET,
                target_service="test-service",
                rate_limit=rate_limit
            )
    
    def test_api_endpoint_health_defaults(self):
        """Test health endpoint specific defaults"""
        endpoint = create_health_endpoint()
        
        assert endpoint.authentication_required is False
        assert endpoint.caching.enabled is False
        assert endpoint.rate_limit.requests_per_minute == 1000
        assert endpoint.timeout_seconds == 10
    
    def test_api_endpoint_f1_defaults(self):
        """Test F1 endpoint specific defaults"""
        endpoint = create_f1_schedule_endpoint()
        
        assert endpoint.caching.enabled is True
        assert endpoint.caching.strategy == CacheStrategy.LONG_CACHE
        assert endpoint.rate_limit.requests_per_minute == 60
        assert endpoint.timeout_seconds == 15
    
    def test_api_endpoint_chat_defaults(self):
        """Test chat endpoint specific defaults"""
        endpoint = create_chat_endpoint()
        
        assert endpoint.caching.enabled is False
        assert endpoint.rate_limit.requests_per_minute == 30
        assert endpoint.timeout_seconds == 30
        assert endpoint.validation.max_body_size == 10 * 1024 * 1024
    
    def test_api_endpoint_matches_path(self):
        """Test path matching functionality"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        
        assert endpoint.matches_path("/api/v1/test")
        assert not endpoint.matches_path("/api/v1/other")
        
        # Test wildcard endpoint
        wildcard_endpoint = APIEndpoint(
            path="/*",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        assert wildcard_endpoint.matches_path("/any/path")
    
    def test_api_endpoint_matches_method(self):
        """Test method matching functionality"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        
        assert endpoint.matches_method("GET")
        assert endpoint.matches_method("get")
        assert not endpoint.matches_method("POST")
    
    def test_api_endpoint_should_authenticate(self):
        """Test authentication requirement check"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service",
            authentication_required=False
        )
        
        assert not endpoint.should_authenticate()
    
    def test_api_endpoint_should_cache(self):
        """Test caching requirement check"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service",
            caching=CachingConfig(enabled=True)
        )
        
        assert endpoint.should_cache()
    
    def test_api_endpoint_get_cache_ttl(self):
        """Test getting cache TTL"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service",
            caching=CachingConfig(enabled=True, strategy=CacheStrategy.LONG_CACHE)
        )
        
        assert endpoint.get_cache_ttl() == 3600
    
    def test_api_endpoint_get_rate_limit_key(self):
        """Test generating rate limit key"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        
        key = endpoint.get_rate_limit_key("192.168.1.1", "user123")
        assert "api/v1/test" in key
        assert "get" in key
        assert "192.168.1.1" in key
        assert "user123" in key
    
    def test_api_endpoint_is_high_traffic(self):
        """Test high traffic detection"""
        endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service",
            rate_limit=RateLimitConfig(requests_per_minute=200)
        )
        
        assert endpoint.is_high_traffic()
    
    def test_api_endpoint_is_critical(self):
        """Test critical endpoint detection"""
        endpoint = create_health_endpoint()
        assert endpoint.is_critical()
    
    def test_api_endpoint_get_priority(self):
        """Test endpoint priority calculation"""
        critical_endpoint = create_health_endpoint()
        assert critical_endpoint.get_priority() == 100
        
        high_traffic_endpoint = APIEndpoint(
            path="/api/v1/test",
            method=HTTPMethod.GET,
            target_service="test-service",
            rate_limit=RateLimitConfig(requests_per_minute=200)
        )
        assert high_traffic_endpoint.get_priority() == 50
        
        normal_endpoint = APIEndpoint(
            path="/api/v1/normal",
            method=HTTPMethod.GET,
            target_service="test-service"
        )
        assert normal_endpoint.get_priority() == 10


class TestEndpointRegistry:
    """Test EndpointRegistry model"""
    
    def test_endpoint_registry_creation(self):
        """Test creating EndpointRegistry instance"""
        registry = EndpointRegistry()
        
        assert registry.endpoints == []
        assert registry._path_index == {}
        assert registry._method_index == {}
    
    def test_endpoint_registry_add_endpoint(self):
        """Test adding endpoint to registry"""
        registry = EndpointRegistry()
        endpoint = create_health_endpoint()
        
        registry.add_endpoint(endpoint)
        
        assert len(registry.endpoints) == 1
        assert endpoint in registry.endpoints
    
    def test_endpoint_registry_add_endpoints(self):
        """Test adding multiple endpoints to registry"""
        registry = EndpointRegistry()
        endpoints = [create_health_endpoint(), create_f1_schedule_endpoint()]
        
        registry.add_endpoints(endpoints)
        
        assert len(registry.endpoints) == 2
    
    def test_endpoint_registry_find_endpoint(self):
        """Test finding endpoint in registry"""
        registry = EndpointRegistry()
        endpoint = create_health_endpoint()
        registry.add_endpoint(endpoint)
        
        found = registry.find_endpoint("/health", "GET")
        assert found == endpoint
        
        not_found = registry.find_endpoint("/nonexistent", "GET")
        assert not_found is None
    
    def test_endpoint_registry_get_endpoints_by_path(self):
        """Test getting endpoints by path"""
        registry = EndpointRegistry()
        health_get = APIEndpoint(
            path="/health",
            method=HTTPMethod.GET,
            target_service="nginx"
        )
        health_post = APIEndpoint(
            path="/health",
            method=HTTPMethod.POST,
            target_service="nginx"
        )
        
        registry.add_endpoint(health_get)
        registry.add_endpoint(health_post)
        
        endpoints = registry.get_endpoints_by_path("/health")
        assert len(endpoints) == 2
    
    def test_endpoint_registry_remove_endpoint(self):
        """Test removing endpoint from registry"""
        registry = EndpointRegistry()
        endpoint = create_health_endpoint()
        registry.add_endpoint(endpoint)
        
        registry.remove_endpoint("/health", HTTPMethod.GET)
        
        assert len(registry.endpoints) == 0
    
    def test_endpoint_registry_clear(self):
        """Test clearing registry"""
        registry = EndpointRegistry()
        registry.add_endpoint(create_health_endpoint())
        
        registry.clear()
        
        assert len(registry.endpoints) == 0


class TestAPIKeyPermissions:
    """Test APIKeyPermissions model"""
    
    def test_api_key_permissions_creation(self):
        """Test creating APIKeyPermissions instance"""
        permissions = APIKeyPermissions(
            endpoints=["/api/v1/test"],
            methods=["GET", "POST"],
            rate_limit_requests_per_minute=100
        )
        
        assert permissions.endpoints == ["/api/v1/test"]
        assert permissions.methods == ["GET", "POST"]
        assert permissions.rate_limit_requests_per_minute == 100
    
    def test_api_key_permissions_has_permission(self):
        """Test permission checking"""
        permissions = APIKeyPermissions(
            endpoints=["/api/v1/test"],
            methods=["GET"]
        )
        
        assert permissions.has_permission("/api/v1/test", "GET")
        assert not permissions.has_permission("/api/v1/other", "GET")
        assert not permissions.has_permission("/api/v1/test", "POST")
    
    def test_api_key_permissions_is_read_only(self):
        """Test read-only permission check"""
        read_only = APIKeyPermissions(methods=["GET", "HEAD"])
        assert read_only.is_read_only()
        
        read_write = APIKeyPermissions(methods=["GET", "POST"])
        assert not read_write.is_read_only()
    
    def test_api_key_permissions_is_admin(self):
        """Test admin permission check"""
        admin_permissions = APIKeyPermissions(permission_level=PermissionLevel.ADMIN)
        assert admin_permissions.is_admin()
        
        read_only_permissions = APIKeyPermissions(permission_level=PermissionLevel.READ_ONLY)
        assert not read_only_permissions.is_admin()


class TestAPIKeyUsage:
    """Test APIKeyUsage model"""
    
    def test_api_key_usage_creation(self):
        """Test creating APIKeyUsage instance"""
        usage = APIKeyUsage()
        
        assert usage.total_requests == 0
        assert usage.successful_requests == 0
        assert usage.failed_requests == 0
    
    def test_api_key_usage_record_request(self):
        """Test recording requests"""
        usage = APIKeyUsage()
        
        usage.record_request(success=True)
        usage.record_request(success=False)
        
        assert usage.total_requests == 2
        assert usage.successful_requests == 1
        assert usage.failed_requests == 1
        assert usage.last_used is not None
    
    def test_api_key_usage_get_success_rate(self):
        """Test getting success rate"""
        usage = APIKeyUsage()
        
        assert usage.get_success_rate() == 0.0
        
        usage.record_request(success=True)
        usage.record_request(success=True)
        usage.record_request(success=False)
        
        assert usage.get_success_rate() == 66.67


class TestAPIKey:
    """Test APIKey model"""
    
    def test_api_key_creation(self):
        """Test creating APIKey instance"""
        permissions = create_read_only_permissions()
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=permissions
        )
        
        assert api_key.key_id == "test-id"
        assert api_key.key_value == "test-key"
        assert api_key.application_name == "test-app"
        assert api_key.status == APIKeyStatus.ACTIVE
    
    def test_api_key_validation_missing_key_id(self):
        """Test API key validation with missing key ID"""
        with pytest.raises(ValueError, match="API key ID is required"):
            APIKey(
                key_id="",
                key_value="test-key",
                application_name="test-app",
                permissions=create_read_only_permissions()
            )
    
    def test_api_key_validation_missing_key_value(self):
        """Test API key validation with missing key value"""
        with pytest.raises(ValueError, match="API key value is required"):
            APIKey(
                key_id="test-id",
                key_value="",
                application_name="test-app",
                permissions=create_read_only_permissions()
            )
    
    def test_api_key_validation_missing_application_name(self):
        """Test API key validation with missing application name"""
        with pytest.raises(ValueError, match="Application name is required"):
            APIKey(
                key_id="test-id",
                key_value="test-key",
                application_name="",
                permissions=create_read_only_permissions()
            )
    
    def test_api_key_is_active(self):
        """Test checking if API key is active"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        assert api_key.is_active()
        
        api_key.status = APIKeyStatus.SUSPENDED
        assert not api_key.is_active()
    
    def test_api_key_is_expired(self):
        """Test checking if API key is expired"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions(),
            expires_at=datetime.now() - timedelta(days=1)
        )
        
        assert api_key.is_expired()
    
    def test_api_key_can_use(self):
        """Test checking if API key can be used"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        assert api_key.can_use()
        
        api_key.status = APIKeyStatus.REVOKED
        assert not api_key.can_use()
    
    def test_api_key_suspend(self):
        """Test suspending API key"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        api_key.suspend("Test suspension")
        
        assert api_key.status == APIKeyStatus.SUSPENDED
        assert api_key.metadata["suspension_reason"] == "Test suspension"
    
    def test_api_key_revoke(self):
        """Test revoking API key"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        api_key.revoke("Test revocation")
        
        assert api_key.status == APIKeyStatus.REVOKED
        assert api_key.metadata["revocation_reason"] == "Test revocation"
    
    def test_api_key_rotate(self):
        """Test rotating API key"""
        api_key = APIKey(
            key_id="test-id",
            key_value="old-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        api_key.rotate("new-key")
        
        assert api_key.key_value == "new-key"
        assert api_key.last_rotated is not None
    
    def test_api_key_has_permission(self):
        """Test checking API key permissions"""
        permissions = APIKeyPermissions(
            endpoints=["/api/v1/test"],
            methods=["GET"]
        )
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=permissions
        )
        
        assert api_key.has_permission("/api/v1/test", "GET")
        assert not api_key.has_permission("/api/v1/other", "GET")
    
    def test_api_key_get_hash(self):
        """Test getting API key hash"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        hash_value = api_key.get_hash()
        assert isinstance(hash_value, str)
        assert len(hash_value) == 64  # SHA256 hex length
    
    def test_api_key_verify_key(self):
        """Test verifying API key"""
        api_key = APIKey(
            key_id="test-id",
            key_value="test-key",
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        assert api_key.verify_key("test-key")
        assert not api_key.verify_key("wrong-key")


class TestAPIKeyManager:
    """Test APIKeyManager model"""
    
    def test_api_key_manager_creation(self):
        """Test creating APIKeyManager instance"""
        manager = APIKeyManager()
        
        assert manager.keys == {}
        assert manager.key_hash_index == {}
    
    def test_api_key_manager_create_api_key(self):
        """Test creating API key"""
        manager = APIKeyManager()
        permissions = create_read_only_permissions()
        
        api_key = manager.create_api_key(
            application_name="test-app",
            permissions=permissions
        )
        
        assert api_key.application_name == "test-app"
        assert api_key.key_id in manager.keys
        assert api_key.get_hash() in manager.key_hash_index
    
    def test_api_key_manager_get_api_key(self):
        """Test getting API key by ID"""
        manager = APIKeyManager()
        api_key = manager.create_api_key(
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        retrieved = manager.get_api_key(api_key.key_id)
        assert retrieved == api_key
        
        not_found = manager.get_api_key("nonexistent")
        assert not_found is None
    
    def test_api_key_manager_authenticate(self):
        """Test authenticating API key"""
        manager = APIKeyManager()
        api_key = manager.create_api_key(
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        # Test successful authentication
        authenticated = manager.authenticate(api_key.key_value)
        assert authenticated == api_key
        
        # Test failed authentication
        not_authenticated = manager.authenticate("wrong-key")
        assert not_authenticated is None
    
    def test_api_key_manager_revoke_api_key(self):
        """Test revoking API key"""
        manager = APIKeyManager()
        api_key = manager.create_api_key(
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        manager.revoke_api_key(api_key.key_id, "Test revocation")
        
        assert api_key.status == APIKeyStatus.REVOKED
        assert api_key.get_hash() not in manager.key_hash_index
    
    def test_api_key_manager_get_active_keys(self):
        """Test getting active API keys"""
        manager = APIKeyManager()
        api_key1 = manager.create_api_key(
            application_name="test-app-1",
            permissions=create_read_only_permissions()
        )
        api_key2 = manager.create_api_key(
            application_name="test-app-2",
            permissions=create_read_only_permissions()
        )
        
        # Suspend one key
        manager.suspend_api_key(api_key2.key_id)
        
        active_keys = manager.get_active_keys()
        assert len(active_keys) == 1
        assert active_keys[0] == api_key1
    
    def test_api_key_manager_get_usage_statistics(self):
        """Test getting usage statistics"""
        manager = APIKeyManager()
        api_key = manager.create_api_key(
            application_name="test-app",
            permissions=create_read_only_permissions()
        )
        
        # Record some usage
        api_key.record_usage(success=True)
        api_key.record_usage(success=False)
        
        stats = manager.get_usage_statistics()
        
        assert stats["total_keys"] == 1
        assert stats["active_keys"] == 1
        assert stats["total_requests"] == 2
        assert stats["successful_requests"] == 1
        assert stats["failed_requests"] == 1


class TestFactoryFunctions:
    """Test factory functions for creating common configurations"""
    
    def test_create_read_only_permissions(self):
        """Test create_read_only_permissions factory function"""
        permissions = create_read_only_permissions()
        
        assert permissions.permission_level == PermissionLevel.READ_ONLY
        assert "GET" in permissions.methods
        assert "POST" not in permissions.methods
        assert permissions.rate_limit_requests_per_minute == 100
    
    def test_create_admin_permissions(self):
        """Test create_admin_permissions factory function"""
        permissions = create_admin_permissions()
        
        assert permissions.permission_level == PermissionLevel.ADMIN
        assert "GET" in permissions.methods
        assert "POST" in permissions.methods
        assert permissions.rate_limit_requests_per_minute == 1000
