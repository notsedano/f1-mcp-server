"""
API Key Model
Manages authentication for third-party applications using API keys.
"""

import hashlib
import secrets
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class APIKeyStatus(str, Enum):
    """API key status"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    EXPIRED = "expired"


class PermissionLevel(str, Enum):
    """Permission levels for API keys"""
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    ADMIN = "admin"
    CUSTOM = "custom"


@dataclass
class APIKeyPermissions:
    """API key permissions"""
    endpoints: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=lambda: ["GET"])
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst_size: int = 120
    permission_level: PermissionLevel = PermissionLevel.READ_ONLY
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "endpoints": self.endpoints,
            "methods": self.methods,
            "rate_limit_requests_per_minute": self.rate_limit_requests_per_minute,
            "rate_limit_burst_size": self.rate_limit_burst_size,
            "permission_level": self.permission_level.value
        }
    
    def has_permission(self, endpoint: str, method: str) -> bool:
        """Check if API key has permission for endpoint and method"""
        # Check if endpoint is allowed
        if self.endpoints and endpoint not in self.endpoints:
            return False
        
        # Check if method is allowed
        if self.methods and method.upper() not in [m.upper() for m in self.methods]:
            return False
        
        return True
    
    def is_read_only(self) -> bool:
        """Check if permissions are read-only"""
        read_only_methods = ["GET", "HEAD", "OPTIONS"]
        return all(method.upper() in read_only_methods for method in self.methods)
    
    def is_admin(self) -> bool:
        """Check if permissions are admin level"""
        return self.permission_level == PermissionLevel.ADMIN


@dataclass
class APIKeyUsage:
    """API key usage statistics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_used: Optional[datetime] = None
    daily_requests: Dict[str, int] = field(default_factory=dict)
    hourly_requests: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "daily_requests": self.daily_requests,
            "hourly_requests": self.hourly_requests
        }
    
    def record_request(self, success: bool = True):
        """Record a request"""
        self.total_requests += 1
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
        
        self.last_used = datetime.now()
        
        # Record daily usage
        today = datetime.now().strftime("%Y-%m-%d")
        self.daily_requests[today] = self.daily_requests.get(today, 0) + 1
        
        # Record hourly usage
        hour = datetime.now().strftime("%Y-%m-%d-%H")
        self.hourly_requests[hour] = self.hourly_requests.get(hour, 0) + 1
    
    def get_success_rate(self) -> float:
        """Get success rate percentage"""
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100
    
    def get_daily_usage(self, days: int = 7) -> Dict[str, int]:
        """Get daily usage for last N days"""
        cutoff_date = datetime.now() - timedelta(days=days)
        filtered_usage = {}
        
        for date_str, count in self.daily_requests.items():
            try:
                date = datetime.strptime(date_str, "%Y-%m-%d")
                if date >= cutoff_date:
                    filtered_usage[date_str] = count
            except ValueError:
                continue
        
        return filtered_usage
    
    def get_hourly_usage(self, hours: int = 24) -> Dict[str, int]:
        """Get hourly usage for last N hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        filtered_usage = {}
        
        for hour_str, count in self.hourly_requests.items():
            try:
                hour = datetime.strptime(hour_str, "%Y-%m-%d-%H")
                if hour >= cutoff_time:
                    filtered_usage[hour_str] = count
            except ValueError:
                continue
        
        return filtered_usage


@dataclass
class APIKey:
    """API key model"""
    key_id: str
    key_value: str  # This will be hashed
    application_name: str
    permissions: APIKeyPermissions
    status: APIKeyStatus = APIKeyStatus.ACTIVE
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    last_rotated: Optional[datetime] = None
    usage: APIKeyUsage = field(default_factory=APIKeyUsage)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate API key after initialization"""
        self._validate_key()
    
    def _validate_key(self):
        """Validate API key data"""
        if not self.key_id:
            raise ValueError("API key ID is required")
        
        if not self.key_value:
            raise ValueError("API key value is required")
        
        if not self.application_name:
            raise ValueError("Application name is required")
        
        if not isinstance(self.permissions, APIKeyPermissions):
            raise ValueError("Permissions must be APIKeyPermissions instance")
        
        if not isinstance(self.status, APIKeyStatus):
            raise ValueError(f"Invalid status: {self.status}")
        
        # Check expiration
        if self.expires_at and self.expires_at <= datetime.now():
            self.status = APIKeyStatus.EXPIRED
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (excludes sensitive key value)"""
        return {
            "key_id": self.key_id,
            "application_name": self.application_name,
            "permissions": self.permissions.to_dict(),
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_rotated": self.last_rotated.isoformat() if self.last_rotated else None,
            "usage": self.usage.to_dict(),
            "metadata": self.metadata
        }
    
    def to_dict_with_key(self) -> Dict[str, Any]:
        """Convert to dictionary including key value (for creation only)"""
        data = self.to_dict()
        data["key_value"] = self.key_value
        return data
    
    def is_active(self) -> bool:
        """Check if API key is active"""
        return self.status == APIKeyStatus.ACTIVE
    
    def is_expired(self) -> bool:
        """Check if API key is expired"""
        return (self.expires_at and 
                self.expires_at <= datetime.now()) or \
               self.status == APIKeyStatus.EXPIRED
    
    def is_suspended(self) -> bool:
        """Check if API key is suspended"""
        return self.status == APIKeyStatus.SUSPENDED
    
    def is_revoked(self) -> bool:
        """Check if API key is revoked"""
        return self.status == APIKeyStatus.REVOKED
    
    def can_use(self) -> bool:
        """Check if API key can be used"""
        return self.is_active() and not self.is_expired()
    
    def suspend(self, reason: Optional[str] = None):
        """Suspend the API key"""
        if self.status == APIKeyStatus.ACTIVE:
            self.status = APIKeyStatus.SUSPENDED
            if reason:
                self.metadata["suspension_reason"] = reason
            logger.info(f"API key {self.key_id} suspended: {reason or 'No reason provided'}")
    
    def unsuspend(self):
        """Unsuspend the API key"""
        if self.status == APIKeyStatus.SUSPENDED:
            self.status = APIKeyStatus.ACTIVE
            if "suspension_reason" in self.metadata:
                del self.metadata["suspension_reason"]
            logger.info(f"API key {self.key_id} unsuspended")
    
    def revoke(self, reason: Optional[str] = None):
        """Revoke the API key"""
        self.status = APIKeyStatus.REVOKED
        if reason:
            self.metadata["revocation_reason"] = reason
        logger.info(f"API key {self.key_id} revoked: {reason or 'No reason provided'}")
    
    def rotate(self, new_key_value: str):
        """Rotate the API key"""
        if not self.can_use():
            raise ValueError("Cannot rotate inactive or expired API key")
        
        self.key_value = new_key_value
        self.last_rotated = datetime.now()
        logger.info(f"API key {self.key_id} rotated")
    
    def extend_expiration(self, days: int):
        """Extend API key expiration"""
        if self.expires_at:
            self.expires_at += timedelta(days=days)
        else:
            self.expires_at = datetime.now() + timedelta(days=days)
        logger.info(f"API key {self.key_id} expiration extended by {days} days")
    
    def has_permission(self, endpoint: str, method: str) -> bool:
        """Check if API key has permission for endpoint and method"""
        if not self.can_use():
            return False
        
        return self.permissions.has_permission(endpoint, method)
    
    def record_usage(self, success: bool = True):
        """Record API key usage"""
        self.usage.record_request(success)
    
    def get_hash(self) -> str:
        """Get hash of the API key value"""
        return hashlib.sha256(self.key_value.encode()).hexdigest()
    
    def verify_key(self, provided_key: str) -> bool:
        """Verify provided key against stored key"""
        return self.key_value == provided_key
    
    def get_age(self) -> timedelta:
        """Get age of the API key"""
        return datetime.now() - self.created_at
    
    def get_time_to_expiry(self) -> Optional[timedelta]:
        """Get time until expiration"""
        if self.expires_at:
            return self.expires_at - datetime.now()
        return None
    
    def is_near_expiry(self, days: int = 30) -> bool:
        """Check if API key is near expiration"""
        if not self.expires_at:
            return False
        
        return self.get_time_to_expiry() <= timedelta(days=days)


class APIKeyManager:
    """Manager for API keys"""
    
    def __init__(self):
        self.keys: Dict[str, APIKey] = {}
        self.key_hash_index: Dict[str, str] = {}  # hash -> key_id mapping
    
    def create_api_key(
        self,
        application_name: str,
        permissions: APIKeyPermissions,
        expires_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> APIKey:
        """Create a new API key"""
        key_id = str(uuid.uuid4())
        key_value = self._generate_key_value()
        
        # Calculate expiration
        expires_at = None
        if expires_days:
            expires_at = datetime.now() + timedelta(days=expires_days)
        
        api_key = APIKey(
            key_id=key_id,
            key_value=key_value,
            application_name=application_name,
            permissions=permissions,
            expires_at=expires_at,
            metadata=metadata or {}
        )
        
        # Store API key
        self.keys[key_id] = api_key
        self.key_hash_index[api_key.get_hash()] = key_id
        
        logger.info(f"Created API key {key_id} for application {application_name}")
        return api_key
    
    def _generate_key_value(self) -> str:
        """Generate a secure API key value"""
        # Generate a secure random key
        prefix = "f1mcp_"
        random_part = secrets.token_urlsafe(32)
        return f"{prefix}{random_part}"
    
    def get_api_key(self, key_id: str) -> Optional[APIKey]:
        """Get API key by ID"""
        return self.keys.get(key_id)
    
    def find_api_key_by_hash(self, key_hash: str) -> Optional[APIKey]:
        """Find API key by hash"""
        key_id = self.key_hash_index.get(key_hash)
        if key_id:
            return self.keys.get(key_id)
        return None
    
    def authenticate(self, provided_key: str) -> Optional[APIKey]:
        """Authenticate API key"""
        # Hash the provided key and look it up
        key_hash = hashlib.sha256(provided_key.encode()).hexdigest()
        api_key = self.find_api_key_by_hash(key_hash)
        
        if api_key and api_key.can_use():
            # Verify the actual key value
            if api_key.verify_key(provided_key):
                api_key.record_usage(success=True)
                return api_key
            else:
                api_key.record_usage(success=False)
        
        return None
    
    def revoke_api_key(self, key_id: str, reason: Optional[str] = None):
        """Revoke an API key"""
        api_key = self.get_api_key(key_id)
        if api_key:
            api_key.revoke(reason)
            # Remove from hash index
            key_hash = api_key.get_hash()
            if key_hash in self.key_hash_index:
                del self.key_hash_index[key_hash]
    
    def suspend_api_key(self, key_id: str, reason: Optional[str] = None):
        """Suspend an API key"""
        api_key = self.get_api_key(key_id)
        if api_key:
            api_key.suspend(reason)
    
    def unsuspend_api_key(self, key_id: str):
        """Unsuspend an API key"""
        api_key = self.get_api_key(key_id)
        if api_key:
            api_key.unsuspend()
    
    def rotate_api_key(self, key_id: str) -> Optional[str]:
        """Rotate an API key and return new key value"""
        api_key = self.get_api_key(key_id)
        if api_key:
            # Remove old hash from index
            old_hash = api_key.get_hash()
            if old_hash in self.key_hash_index:
                del self.key_hash_index[old_hash]
            
            # Generate new key
            new_key_value = self._generate_key_value()
            api_key.rotate(new_key_value)
            
            # Add new hash to index
            self.key_hash_index[api_key.get_hash()] = key_id
            
            return new_key_value
        return None
    
    def get_active_keys(self) -> List[APIKey]:
        """Get all active API keys"""
        return [key for key in self.keys.values() if key.is_active()]
    
    def get_expired_keys(self) -> List[APIKey]:
        """Get all expired API keys"""
        return [key for key in self.keys.values() if key.is_expired()]
    
    def get_keys_near_expiry(self, days: int = 30) -> List[APIKey]:
        """Get API keys near expiration"""
        return [key for key in self.keys.values() if key.is_near_expiry(days)]
    
    def get_keys_by_application(self, application_name: str) -> List[APIKey]:
        """Get API keys for an application"""
        return [
            key for key in self.keys.values() 
            if key.application_name == application_name
        ]
    
    def cleanup_expired_keys(self):
        """Clean up expired API keys"""
        expired_keys = self.get_expired_keys()
        
        for api_key in expired_keys:
            # Remove from hash index
            key_hash = api_key.get_hash()
            if key_hash in self.key_hash_index:
                del self.key_hash_index[key_hash]
            
            # Remove from keys
            if api_key.key_id in self.keys:
                del self.keys[api_key.key_id]
            
            logger.info(f"Cleaned up expired API key {api_key.key_id}")
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """Get usage statistics"""
        total_keys = len(self.keys)
        active_keys = len(self.get_active_keys())
        expired_keys = len(self.get_expired_keys())
        suspended_keys = len([k for k in self.keys.values() if k.is_suspended()])
        revoked_keys = len([k for k in self.keys.values() if k.is_revoked()])
        
        # Calculate total usage
        total_requests = sum(key.usage.total_requests for key in self.keys.values())
        total_successful = sum(key.usage.successful_requests for key in self.keys.values())
        total_failed = sum(key.usage.failed_requests for key in self.keys.values())
        
        success_rate = (total_successful / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "total_keys": total_keys,
            "active_keys": active_keys,
            "expired_keys": expired_keys,
            "suspended_keys": suspended_keys,
            "revoked_keys": revoked_keys,
            "total_requests": total_requests,
            "successful_requests": total_successful,
            "failed_requests": total_failed,
            "success_rate": success_rate
        }


# Factory functions for common API key configurations
def create_read_only_permissions() -> APIKeyPermissions:
    """Create read-only permissions"""
    return APIKeyPermissions(
        methods=["GET", "HEAD", "OPTIONS"],
        rate_limit_requests_per_minute=100,
        permission_level=PermissionLevel.READ_ONLY
    )


def create_read_write_permissions() -> APIKeyPermissions:
    """Create read-write permissions"""
    return APIKeyPermissions(
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        rate_limit_requests_per_minute=60,
        permission_level=PermissionLevel.READ_WRITE
    )


def create_admin_permissions() -> APIKeyPermissions:
    """Create admin permissions"""
    return APIKeyPermissions(
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        rate_limit_requests_per_minute=1000,
        permission_level=PermissionLevel.ADMIN
    )


def create_custom_permissions(
    endpoints: List[str],
    methods: List[str],
    rate_limit: int = 60
) -> APIKeyPermissions:
    """Create custom permissions"""
    return APIKeyPermissions(
        endpoints=endpoints,
        methods=methods,
        rate_limit_requests_per_minute=rate_limit,
        permission_level=PermissionLevel.CUSTOM
    )


def create_f1_data_permissions() -> APIKeyPermissions:
    """Create permissions for F1 data access"""
    return APIKeyPermissions(
        endpoints=[
            "/api/v1/f1/schedule",
            "/api/v1/f1/drivers",
            "/api/v1/f1/events",
            "/health"
        ],
        methods=["GET", "HEAD", "OPTIONS"],
        rate_limit_requests_per_minute=120,
        permission_level=PermissionLevel.READ_ONLY
    )


def create_chat_permissions() -> APIKeyPermissions:
    """Create permissions for chat access"""
    return APIKeyPermissions(
        endpoints=[
            "/api/v1/chat",
            "/api/v1/f1/schedule",
            "/api/v1/f1/drivers",
            "/health"
        ],
        methods=["GET", "POST", "HEAD", "OPTIONS"],
        rate_limit_requests_per_minute=60,
        permission_level=PermissionLevel.READ_WRITE
    )
