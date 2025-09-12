"""
Common type definitions and data structures for the F1 MCP Server.

This module provides shared type definitions, response structures, and
common data models used across all components.
"""

from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union


class HealthStatus(Enum):
    """Health status enumeration"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"
    UNKNOWN = "unknown"


@dataclass
class ResponseData:
    """Standard response data structure"""
    success: bool
    data: Any = None
    message: str = ""
    timestamp: str = ""
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class ErrorResponse:
    """Standard error response structure"""
    error: str
    message: str = ""
    code: Optional[str] = None
    timestamp: str = ""
    details: Dict[str, Any] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
        if self.details is None:
            self.details = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class HealthCheckResult:
    """Health check result structure"""
    service: str
    status: HealthStatus
    response_time: float
    last_check: str
    details: Dict[str, Any] = None
    
    def __post_init__(self):
        if not self.last_check:
            self.last_check = datetime.now().isoformat()
        if self.details is None:
            self.details = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result['status'] = self.status.value
        return result


@dataclass
class MetricPoint:
    """Metric data point structure"""
    name: str
    value: Union[int, float]
    timestamp: str
    labels: Dict[str, str] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
        if self.labels is None:
            self.labels = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class AlertContext:
    """Alert context information"""
    alert_id: str
    name: str
    severity: str
    message: str
    timestamp: str
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
