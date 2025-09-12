"""
Common utility functions for the F1 MCP Server.

This module provides shared utility functions used across all components
to eliminate code duplication and ensure consistent behavior.
"""

import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from functools import wraps


def json_serial(obj: Any) -> Union[str, int, float, None]:
    """
    JSON serializer for objects not serializable by default json code.
    
    Args:
        obj: Object to serialize
        
    Returns:
        Serialized object or None if not serializable
    """
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    elif isinstance(obj, (timedelta,)):
        return obj.total_seconds()
    elif hasattr(obj, 'isoformat'):
        return obj.isoformat()
    elif hasattr(obj, '__dict__'):
        return obj.__dict__
    return None


def safe_json_dumps(data: Any, **kwargs) -> str:
    """
    Safely serialize data to JSON with proper error handling.
    
    Args:
        data: Data to serialize
        **kwargs: Additional arguments for json.dumps
        
    Returns:
        JSON string
        
    Raises:
        ValueError: If data cannot be serialized
    """
    try:
        return json.dumps(data, default=json_serial, **kwargs)
    except (TypeError, ValueError) as e:
        raise ValueError(f"Failed to serialize data to JSON: {e}")


def validate_port(port: int, min_port: int = 1024, max_port: int = 65535) -> int:
    """
    Validate port number.
    
    Args:
        port: Port number to validate
        min_port: Minimum valid port number
        max_port: Maximum valid port number
        
    Returns:
        Validated port number
        
    Raises:
        ValueError: If port is invalid
    """
    if not isinstance(port, int):
        raise ValueError(f"Port must be an integer, got {type(port)}")
    
    if not (min_port <= port <= max_port):
        raise ValueError(f"Port must be between {min_port} and {max_port}, got {port}")
    
    return port


def validate_year(year: int, min_year: int = 1950, max_year: int = None) -> int:
    """
    Validate year for F1 data queries.
    
    Args:
        year: Year to validate
        min_year: Minimum valid year (default: 1950 - first F1 season)
        max_year: Maximum valid year (default: current year + 1)
        
    Returns:
        Validated year
        
    Raises:
        ValueError: If year is invalid
    """
    if not isinstance(year, int):
        raise ValueError(f"Year must be an integer, got {type(year)}")
    
    if max_year is None:
        max_year = datetime.now().year + 1
    
    if not (min_year <= year <= max_year):
        raise ValueError(f"Year must be between {min_year} and {max_year}, got {year}")
    
    return year


def normalize_driver_identifier(identifier: str) -> str:
    """
    Normalize driver identifier for consistent lookups.
    
    Args:
        identifier: Driver identifier (number, code, or name)
        
    Returns:
        Normalized identifier
    """
    if not identifier:
        raise ValueError("Driver identifier cannot be empty")
    
    # Convert to string and strip whitespace
    identifier = str(identifier).strip()
    
    # Convert to lowercase for case-insensitive matching
    return identifier.lower()


def rate_limit_decorator(max_requests: int = 60, window_seconds: int = 60):
    """
    Decorator for rate limiting function calls.
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
        
    Returns:
        Decorated function
    """
    request_timestamps: List[float] = []
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_time = time.time()
            
            # Remove old timestamps
            global request_timestamps
            request_timestamps = [
                ts for ts in request_timestamps 
                if current_time - ts < window_seconds
            ]
            
            # Check rate limit
            if len(request_timestamps) >= max_requests:
                raise ValueError(f"Rate limit exceeded: {max_requests} requests per {window_seconds} seconds")
            
            # Add current timestamp
            request_timestamps.append(current_time)
            
            # Call function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def retry_on_exception(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator for retrying functions on exception.
    
    Args:
        max_retries: Maximum number of retries
        delay: Initial delay between retries
        backoff_factor: Backoff factor for exponential delay
        exceptions: Tuple of exceptions to catch
        
    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_retries:
                        raise e
                    
                    # Calculate delay with exponential backoff
                    current_delay = delay * (backoff_factor ** attempt)
                    time.sleep(current_delay)
            
            # This should never be reached
            raise last_exception
        
        return wrapper
    return decorator


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe file system usage.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename
    """
    import re
    
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip('. ')
    
    # Ensure filename is not empty
    if not sanitized:
        sanitized = 'unnamed'
    
    # Limit length
    if len(sanitized) > 255:
        sanitized = sanitized[:255]
    
    return sanitized


def format_bytes(bytes_value: int) -> str:
    """
    Format bytes value in human-readable format.
    
    Args:
        bytes_value: Number of bytes
        
    Returns:
        Formatted string (e.g., "1.5 MB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} PB"


def format_duration(seconds: float) -> str:
    """
    Format duration in human-readable format.
    
    Args:
        seconds: Duration in seconds
        
    Returns:
        Formatted string (e.g., "1h 30m 45s")
    """
    if seconds < 60:
        return f"{seconds:.1f}s"
    
    minutes = int(seconds // 60)
    seconds = seconds % 60
    
    if minutes < 60:
        return f"{minutes}m {seconds:.1f}s"
    
    hours = int(minutes // 60)
    minutes = minutes % 60
    
    if hours < 24:
        return f"{hours}h {minutes}m {seconds:.1f}s"
    
    days = int(hours // 24)
    hours = hours % 24
    
    return f"{days}d {hours}h {minutes}m {seconds:.1f}s"
