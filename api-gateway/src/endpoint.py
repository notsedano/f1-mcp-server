"""
API Endpoint Model
Defines API gateway routing and configuration for F1 MCP Server endpoints.
"""

import re
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class HTTPMethod(str, Enum):
    """HTTP methods supported by the API gateway"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    OPTIONS = "OPTIONS"
    HEAD = "HEAD"


class AuthenticationType(str, Enum):
    """Authentication types for endpoints"""
    NONE = "none"
    API_KEY = "api_key"
    JWT = "jwt"
    OAUTH2 = "oauth2"


class CacheStrategy(str, Enum):
    """Caching strategies for endpoints"""
    NO_CACHE = "no_cache"
    SHORT_CACHE = "short_cache"  # 5 minutes
    MEDIUM_CACHE = "medium_cache"  # 30 minutes
    LONG_CACHE = "long_cache"  # 1 hour
    VERY_LONG_CACHE = "very_long_cache"  # 24 hours


@dataclass
class RateLimitConfig:
    """Rate limiting configuration for endpoint"""
    requests_per_minute: int = 60
    burst_size: int = 120
    requests_per_hour: Optional[int] = None
    requests_per_day: Optional[int] = None
    per_ip: bool = True
    per_user: bool = False
    per_endpoint: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "requests_per_minute": self.requests_per_minute,
            "burst_size": self.burst_size,
            "requests_per_hour": self.requests_per_hour,
            "requests_per_day": self.requests_per_day,
            "per_ip": self.per_ip,
            "per_user": self.per_user,
            "per_endpoint": self.per_endpoint
        }


@dataclass
class CachingConfig:
    """Caching configuration for endpoint"""
    enabled: bool = False
    strategy: CacheStrategy = CacheStrategy.NO_CACHE
    ttl_seconds: int = 300  # 5 minutes
    cache_key_template: Optional[str] = None
    vary_headers: List[str] = field(default_factory=list)
    cache_control: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "enabled": self.enabled,
            "strategy": self.strategy.value,
            "ttl_seconds": self.ttl_seconds,
            "cache_key_template": self.cache_key_template,
            "vary_headers": self.vary_headers,
            "cache_control": self.cache_control
        }
    
    def get_ttl_seconds(self) -> int:
        """Get TTL seconds based on strategy"""
        if self.strategy == CacheStrategy.NO_CACHE:
            return 0
        elif self.strategy == CacheStrategy.SHORT_CACHE:
            return 300  # 5 minutes
        elif self.strategy == CacheStrategy.MEDIUM_CACHE:
            return 1800  # 30 minutes
        elif self.strategy == CacheStrategy.LONG_CACHE:
            return 3600  # 1 hour
        elif self.strategy == CacheStrategy.VERY_LONG_CACHE:
            return 86400  # 24 hours
        else:
            return self.ttl_seconds


@dataclass
class ValidationConfig:
    """Request validation configuration"""
    required_fields: List[str] = field(default_factory=list)
    max_body_size: int = 1024 * 1024  # 1MB
    allowed_content_types: List[str] = field(default_factory=lambda: [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data"
    ])
    max_string_length: int = 10000
    block_sql_injection: bool = True
    block_xss: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "required_fields": self.required_fields,
            "max_body_size": self.max_body_size,
            "allowed_content_types": self.allowed_content_types,
            "max_string_length": self.max_string_length,
            "block_sql_injection": self.block_sql_injection,
            "block_xss": self.block_xss
        }


@dataclass
class APIEndpoint:
    """API endpoint configuration"""
    path: str
    method: HTTPMethod
    target_service: str
    target_path: Optional[str] = None
    authentication_required: bool = True
    authentication_type: AuthenticationType = AuthenticationType.API_KEY
    rate_limit: Optional[RateLimitConfig] = None
    caching: Optional[CachingConfig] = None
    validation: Optional[ValidationConfig] = None
    timeout_seconds: int = 30
    retry_count: int = 3
    circuit_breaker_enabled: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    description: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate endpoint configuration after initialization"""
        self._validate_config()
        self._set_defaults()
    
    def _validate_config(self):
        """Validate endpoint configuration"""
        # Validate path
        if not self.path:
            raise ValueError("Endpoint path is required")
        
        if not self.path.startswith('/'):
            raise ValueError("Endpoint path must start with '/'")
        
        # Validate method
        if not isinstance(self.method, HTTPMethod):
            raise ValueError(f"Invalid HTTP method: {self.method}")
        
        # Validate target service
        if not self.target_service:
            raise ValueError("Target service is required")
        
        # Validate rate limiting
        if self.rate_limit:
            if self.rate_limit.requests_per_minute <= 0:
                raise ValueError("Rate limit requests_per_minute must be positive")
            
            if self.rate_limit.burst_size <= 0:
                raise ValueError("Rate limit burst_size must be positive")
        
        # Validate caching
        if self.caching and self.caching.enabled:
            if self.caching.ttl_seconds <= 0:
                raise ValueError("Cache TTL must be positive")
        
        # Validate timeout
        if self.timeout_seconds <= 0:
            raise ValueError("Timeout must be positive")
        
        # Validate retry count
        if self.retry_count < 0:
            raise ValueError("Retry count cannot be negative")
    
    def _set_defaults(self):
        """Set default configurations based on endpoint type"""
        if not self.target_path:
            self.target_path = self.path
        
        if not self.rate_limit:
            self.rate_limit = RateLimitConfig()
        
        if not self.caching:
            self.caching = CachingConfig()
        
        if not self.validation:
            self.validation = ValidationConfig()
        
        # Set endpoint-specific defaults
        self._set_endpoint_specific_defaults()
    
    def _set_endpoint_specific_defaults(self):
        """Set defaults based on endpoint path and method"""
        # Health check endpoints
        if self.path == "/health" and self.method == HTTPMethod.GET:
            self.authentication_required = False
            self.caching.enabled = False
            self.rate_limit.requests_per_minute = 1000
            self.timeout_seconds = 10
        
        # F1 data endpoints
        elif self.path.startswith("/api/v1/f1/"):
            self.caching.enabled = True
            self.caching.strategy = CacheStrategy.LONG_CACHE
            self.rate_limit.requests_per_minute = 60
            self.timeout_seconds = 15
        
        # Chat endpoints
        elif self.path.startswith("/api/v1/chat"):
            self.caching.enabled = False
            self.rate_limit.requests_per_minute = 30
            self.timeout_seconds = 30
            self.validation.max_body_size = 10 * 1024 * 1024  # 10MB for chat
        
        # Authentication endpoints
        elif self.path.startswith("/api/v1/auth/"):
            self.caching.enabled = False
            self.rate_limit.requests_per_minute = 10
            self.timeout_seconds = 15
        
        # Static file endpoints
        elif self.path.startswith("/static/"):
            self.authentication_required = False
            self.caching.enabled = True
            self.caching.strategy = CacheStrategy.VERY_LONG_CACHE
            self.rate_limit.requests_per_minute = 1000
        
        # Frontend routes
        elif self.path == "/" or self.path == "/*":
            self.authentication_required = False
            self.caching.enabled = True
            self.caching.strategy = CacheStrategy.MEDIUM_CACHE
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "path": self.path,
            "method": self.method.value,
            "target_service": self.target_service,
            "target_path": self.target_path,
            "authentication_required": self.authentication_required,
            "authentication_type": self.authentication_type.value,
            "rate_limit": self.rate_limit.to_dict() if self.rate_limit else None,
            "caching": self.caching.to_dict() if self.caching else None,
            "validation": self.validation.to_dict() if self.validation else None,
            "timeout_seconds": self.timeout_seconds,
            "retry_count": self.retry_count,
            "circuit_breaker_enabled": self.circuit_breaker_enabled,
            "circuit_breaker_threshold": self.circuit_breaker_threshold,
            "circuit_breaker_timeout": self.circuit_breaker_timeout,
            "description": self.description,
            "tags": self.tags
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'APIEndpoint':
        """Create from dictionary"""
        rate_limit = RateLimitConfig(**data["rate_limit"]) if data.get("rate_limit") else None
        caching = CachingConfig(**data["caching"]) if data.get("caching") else None
        validation = ValidationConfig(**data["validation"]) if data.get("validation") else None
        
        return cls(
            path=data["path"],
            method=HTTPMethod(data["method"]),
            target_service=data["target_service"],
            target_path=data.get("target_path"),
            authentication_required=data.get("authentication_required", True),
            authentication_type=AuthenticationType(data.get("authentication_type", "api_key")),
            rate_limit=rate_limit,
            caching=caching,
            validation=validation,
            timeout_seconds=data.get("timeout_seconds", 30),
            retry_count=data.get("retry_count", 3),
            circuit_breaker_enabled=data.get("circuit_breaker_enabled", True),
            circuit_breaker_threshold=data.get("circuit_breaker_threshold", 5),
            circuit_breaker_timeout=data.get("circuit_breaker_timeout", 60),
            description=data.get("description"),
            tags=data.get("tags", [])
        )
    
    def matches_path(self, request_path: str) -> bool:
        """Check if request path matches this endpoint"""
        # Exact match
        if self.path == request_path:
            return True
        
        # Wildcard match
        if self.path == "/*":
            return True
        
        # Pattern match (simple wildcard support)
        if "*" in self.path:
            pattern = self.path.replace("*", ".*")
            return bool(re.match(pattern, request_path))
        
        return False
    
    def matches_method(self, request_method: str) -> bool:
        """Check if request method matches this endpoint"""
        return self.method.value == request_method.upper()
    
    def should_authenticate(self) -> bool:
        """Check if endpoint requires authentication"""
        return self.authentication_required
    
    def should_cache(self) -> bool:
        """Check if endpoint should be cached"""
        return self.caching and self.caching.enabled
    
    def should_rate_limit(self) -> bool:
        """Check if endpoint should be rate limited"""
        return self.rate_limit is not None
    
    def get_cache_ttl(self) -> int:
        """Get cache TTL in seconds"""
        if self.caching:
            return self.caching.get_ttl_seconds()
        return 0
    
    def get_rate_limit_key(self, ip: str, user_id: Optional[str] = None) -> str:
        """Generate rate limit key"""
        if not self.rate_limit:
            return ""
        
        parts = [self.path, self.method.value.lower()]
        
        if self.rate_limit.per_ip:
            parts.append(ip)
        
        if self.rate_limit.per_user and user_id:
            parts.append(user_id)
        
        return ":".join(parts)
    
    def is_high_traffic(self) -> bool:
        """Check if endpoint is high traffic"""
        return (self.rate_limit and 
                self.rate_limit.requests_per_minute > 100)
    
    def is_critical(self) -> bool:
        """Check if endpoint is critical"""
        critical_paths = ["/health", "/api/v1/auth/login", "/api/v1/f1/schedule"]
        return self.path in critical_paths
    
    def get_priority(self) -> int:
        """Get endpoint priority (higher number = higher priority)"""
        if self.is_critical():
            return 100
        elif self.is_high_traffic():
            return 50
        else:
            return 10


# Factory functions for common endpoints
def create_health_endpoint() -> APIEndpoint:
    """Create health check endpoint"""
    return APIEndpoint(
        path="/health",
        method=HTTPMethod.GET,
        target_service="nginx",
        target_path="/health",
        authentication_required=False,
        description="Health check endpoint"
    )


def create_f1_schedule_endpoint() -> APIEndpoint:
    """Create F1 schedule endpoint"""
    return APIEndpoint(
        path="/api/v1/f1/schedule",
        method=HTTPMethod.GET,
        target_service="mcp-server",
        target_path="/f1/schedule",
        authentication_required=False,
        description="Get F1 event schedule"
    )


def create_f1_drivers_endpoint() -> APIEndpoint:
    """Create F1 drivers endpoint"""
    return APIEndpoint(
        path="/api/v1/f1/drivers",
        method=HTTPMethod.GET,
        target_service="mcp-server",
        target_path="/f1/drivers",
        authentication_required=False,
        description="Get F1 driver information"
    )


def create_chat_endpoint() -> APIEndpoint:
    """Create chat endpoint"""
    return APIEndpoint(
        path="/api/v1/chat",
        method=HTTPMethod.POST,
        target_service="mcp-bridge",
        target_path="/chat",
        authentication_required=True,
        authentication_type=AuthenticationType.API_KEY,
        description="Send message to AI companion"
    )


def create_auth_login_endpoint() -> APIEndpoint:
    """Create authentication login endpoint"""
    return APIEndpoint(
        path="/api/v1/auth/login",
        method=HTTPMethod.POST,
        target_service="mcp-bridge",
        target_path="/auth/login",
        authentication_required=False,
        description="User authentication login"
    )


def create_static_endpoint() -> APIEndpoint:
    """Create static files endpoint"""
    return APIEndpoint(
        path="/static/*",
        method=HTTPMethod.GET,
        target_service="messenger-client",
        target_path="/static/",
        authentication_required=False,
        description="Static file serving"
    )


def create_frontend_endpoint() -> APIEndpoint:
    """Create frontend routes endpoint"""
    return APIEndpoint(
        path="/*",
        method=HTTPMethod.GET,
        target_service="messenger-client",
        target_path="/",
        authentication_required=False,
        description="Frontend application routes"
    )


def create_all_endpoints() -> List[APIEndpoint]:
    """Create all API endpoints"""
    return [
        create_health_endpoint(),
        create_f1_schedule_endpoint(),
        create_f1_drivers_endpoint(),
        create_chat_endpoint(),
        create_auth_login_endpoint(),
        create_static_endpoint(),
        create_frontend_endpoint()
    ]


class EndpointRegistry:
    """Registry for managing API endpoints"""
    
    def __init__(self):
        self.endpoints: List[APIEndpoint] = []
        self._path_index: Dict[str, List[APIEndpoint]] = {}
        self._method_index: Dict[str, List[APIEndpoint]] = {}
    
    def add_endpoint(self, endpoint: APIEndpoint):
        """Add endpoint to registry"""
        self.endpoints.append(endpoint)
        self._update_indexes()
        logger.info(f"Added endpoint: {endpoint.method.value} {endpoint.path}")
    
    def add_endpoints(self, endpoints: List[APIEndpoint]):
        """Add multiple endpoints to registry"""
        self.endpoints.extend(endpoints)
        self._update_indexes()
        logger.info(f"Added {len(endpoints)} endpoints to registry")
    
    def remove_endpoint(self, path: str, method: HTTPMethod):
        """Remove endpoint from registry"""
        self.endpoints = [ep for ep in self.endpoints 
                         if not (ep.path == path and ep.method == method)]
        self._update_indexes()
        logger.info(f"Removed endpoint: {method.value} {path}")
    
    def find_endpoint(self, path: str, method: str) -> Optional[APIEndpoint]:
        """Find endpoint matching path and method"""
        method_upper = method.upper()
        
        for endpoint in self.endpoints:
            if endpoint.matches_path(path) and endpoint.matches_method(method_upper):
                return endpoint
        
        return None
    
    def get_endpoints_by_path(self, path: str) -> List[APIEndpoint]:
        """Get all endpoints for a path"""
        return [ep for ep in self.endpoints if ep.matches_path(path)]
    
    def get_endpoints_by_method(self, method: str) -> List[APIEndpoint]:
        """Get all endpoints for a method"""
        method_upper = method.upper()
        return [ep for ep in self.endpoints if ep.matches_method(method_upper)]
    
    def get_all_endpoints(self) -> List[APIEndpoint]:
        """Get all registered endpoints"""
        return self.endpoints.copy()
    
    def _update_indexes(self):
        """Update internal indexes for faster lookup"""
        self._path_index = {}
        self._method_index = {}
        
        for endpoint in self.endpoints:
            # Path index
            if endpoint.path not in self._path_index:
                self._path_index[endpoint.path] = []
            self._path_index[endpoint.path].append(endpoint)
            
            # Method index
            method_key = endpoint.method.value
            if method_key not in self._method_index:
                self._method_index[method_key] = []
            self._method_index[method_key].append(endpoint)
    
    def clear(self):
        """Clear all endpoints"""
        self.endpoints.clear()
        self._path_index.clear()
        self._method_index.clear()
        logger.info("Cleared all endpoints from registry")
