"""
Common utilities and shared functionality for the F1 MCP Server.

This module provides shared utilities, logging configuration, and common
data structures used across all components of the F1 MCP Server.
"""

from .logging_config import setup_logging, get_logger
from .types import ResponseData, ErrorResponse, HealthStatus, HealthCheckResult, MetricPoint, AlertContext
from .exceptions import F1MCPServerError, ValidationError, RateLimitError, AuthenticationError, AuthorizationError
from .utils import (
    json_serial, safe_json_dumps, validate_port, validate_year, 
    normalize_driver_identifier, rate_limit_decorator, retry_on_exception,
    sanitize_filename, format_bytes, format_duration
)
from .config import (
    BaseConfig, load_yaml_config, save_yaml_config, merge_configs,
    validate_config, get_config_with_env_overrides
)

__all__ = [
    # Logging
    'setup_logging',
    'get_logger',
    
    # Types
    'ResponseData',
    'ErrorResponse', 
    'HealthStatus',
    'HealthCheckResult',
    'MetricPoint',
    'AlertContext',
    
    # Exceptions
    'F1MCPServerError',
    'ValidationError',
    'RateLimitError',
    'AuthenticationError',
    'AuthorizationError',
    
    # Utils
    'json_serial',
    'safe_json_dumps',
    'validate_port',
    'validate_year',
    'normalize_driver_identifier',
    'rate_limit_decorator',
    'retry_on_exception',
    'sanitize_filename',
    'format_bytes',
    'format_duration',
    
    # Configuration
    'BaseConfig',
    'load_yaml_config',
    'save_yaml_config',
    'merge_configs',
    'validate_config',
    'get_config_with_env_overrides'
]
