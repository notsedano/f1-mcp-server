"""
Common exception classes for the F1 MCP Server.

This module provides shared exception classes used across all components
for consistent error handling and reporting.
"""

from typing import Any, Dict, Optional


class F1MCPServerError(Exception):
    """Base exception class for F1 MCP Server errors"""
    
    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}


class ValidationError(F1MCPServerError):
    """Raised when input validation fails"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Any = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "VALIDATION_ERROR", details)
        self.field = field
        self.value = value


class RateLimitError(F1MCPServerError):
    """Raised when rate limit is exceeded"""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        limit: Optional[int] = None,
        window: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "RATE_LIMIT_ERROR", details)
        self.limit = limit
        self.window = window


class AuthenticationError(F1MCPServerError):
    """Raised when authentication fails"""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "AUTHENTICATION_ERROR", details)


class AuthorizationError(F1MCPServerError):
    """Raised when authorization fails"""
    
    def __init__(
        self,
        message: str = "Authorization failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class ServiceUnavailableError(F1MCPServerError):
    """Raised when a service is unavailable"""
    
    def __init__(
        self,
        message: str = "Service unavailable",
        service: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "SERVICE_UNAVAILABLE", details)
        self.service = service


class ConfigurationError(F1MCPServerError):
    """Raised when configuration is invalid"""
    
    def __init__(
        self,
        message: str = "Configuration error",
        config_key: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message, "CONFIGURATION_ERROR", details)
        self.config_key = config_key
