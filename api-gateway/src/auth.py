"""
Authentication Service
Handles authentication and authorization for the API Gateway.
"""

import jwt
import time
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import logging

from .api_key import APIKeyManager, APIKey, create_read_only_permissions, create_read_write_permissions

logger = logging.getLogger(__name__)


class AuthenticationService:
    """Authentication service for API Gateway"""
    
    def __init__(self):
        self.api_key_manager = APIKeyManager()
        self.jwt_secret = "your-jwt-secret-key-32-chars-long"  # Should be from config
        self.jwt_algorithm = "HS256"
        self.jwt_expiration_hours = 24
        self.security_scheme = HTTPBearer(auto_error=False)
        
        # Initialize with some default API keys for testing
        self._initialize_default_keys()
    
    def _initialize_default_keys(self):
        """Initialize with default API keys for testing"""
        try:
            # Create test API key for F1 data access
            f1_permissions = create_read_only_permissions()
            f1_key = self.api_key_manager.create_api_key(
                application_name="f1-data-client",
                permissions=f1_permissions,
                expires_days=365
            )
            logger.info(f"Created test F1 data API key: {f1_key.key_id}")
            
            # Create test API key for chat access
            chat_permissions = create_read_write_permissions()
            chat_key = self.api_key_manager.create_api_key(
                application_name="chat-client",
                permissions=chat_permissions,
                expires_days=365
            )
            logger.info(f"Created test chat API key: {chat_key.key_id}")
            
        except Exception as e:
            logger.error(f"Error initializing default API keys: {e}")
    
    async def authenticate_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate a request and return user info"""
        # Try API key authentication first
        api_key_result = await self._authenticate_api_key(request)
        if api_key_result:
            return api_key_result
        
        # Try JWT authentication
        jwt_result = await self._authenticate_jwt(request)
        if jwt_result:
            return jwt_result
        
        return None
    
    async def _authenticate_api_key(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate using API key"""
        # Check for API key in headers
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            # Check for API key in query parameters
            api_key = request.query_params.get("api_key")
        
        if not api_key:
            return None
        
        # Authenticate the API key
        api_key_obj = self.api_key_manager.authenticate(api_key)
        if not api_key_obj:
            return None
        
        # Record usage
        api_key_obj.record_usage(success=True)
        
        return {
            "user_id": api_key_obj.key_id,
            "user_type": "api_key",
            "application_name": api_key_obj.application_name,
            "permissions": api_key_obj.permissions,
            "api_key": api_key_obj
        }
    
    async def _authenticate_jwt(self, request: Request) -> Optional[Dict[str, Any]]:
        """Authenticate using JWT token"""
        # Get authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        # Extract token
        token = auth_header.split(" ")[1]
        
        try:
            # Decode JWT
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            # Check expiration
            if payload.get("exp", 0) < time.time():
                return None
            
            return {
                "user_id": payload.get("user_id"),
                "user_type": "jwt",
                "permissions": payload.get("permissions", {}),
                "payload": payload
            }
            
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token")
            return None
        except Exception as e:
            logger.error(f"Error validating JWT: {e}")
            return None
    
    def create_jwt_token(
        self,
        user_id: str,
        permissions: Optional[Dict[str, Any]] = None,
        expires_hours: Optional[int] = None
    ) -> str:
        """Create a JWT token"""
        expiration = expires_hours or self.jwt_expiration_hours
        
        payload = {
            "user_id": user_id,
            "exp": time.time() + (expiration * 3600),
            "iat": time.time(),
            "permissions": permissions or {}
        }
        
        token = jwt.encode(
            payload,
            self.jwt_secret,
            algorithm=self.jwt_algorithm
        )
        
        return token
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify a JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        except Exception as e:
            logger.error(f"Error verifying JWT: {e}")
            return None
    
    def check_permissions(
        self,
        user_info: Dict[str, Any],
        endpoint: str,
        method: str
    ) -> bool:
        """Check if user has permissions for endpoint and method"""
        if not user_info:
            return False
        
        user_type = user_info.get("user_type")
        
        if user_type == "api_key":
            api_key = user_info.get("api_key")
            if api_key:
                return api_key.has_permission(endpoint, method)
        
        elif user_type == "jwt":
            permissions = user_info.get("permissions", {})
            # JWT permissions would be checked here
            # For now, allow all authenticated JWT users
            return True
        
        return False
    
    def get_user_from_request(self, request: Request) -> Optional[Dict[str, Any]]:
        """Get user information from request (sync version)"""
        # This is a simplified sync version for middleware
        api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
        
        if api_key:
            api_key_obj = self.api_key_manager.authenticate(api_key)
            if api_key_obj:
                return {
                    "user_id": api_key_obj.key_id,
                    "user_type": "api_key",
                    "application_name": api_key_obj.application_name,
                    "permissions": api_key_obj.permissions
                }
        
        return None
    
    def create_api_key(
        self,
        application_name: str,
        permissions_type: str = "read_only",
        expires_days: Optional[int] = None
    ) -> Optional[APIKey]:
        """Create a new API key"""
        try:
            if permissions_type == "read_only":
                permissions = create_read_only_permissions()
            elif permissions_type == "read_write":
                permissions = create_read_write_permissions()
            else:
                permissions = create_read_only_permissions()
            
            api_key = self.api_key_manager.create_api_key(
                application_name=application_name,
                permissions=permissions,
                expires_days=expires_days
            )
            
            logger.info(f"Created API key for application: {application_name}")
            return api_key
            
        except Exception as e:
            logger.error(f"Error creating API key: {e}")
            return None
    
    def revoke_api_key(self, key_id: str, reason: Optional[str] = None):
        """Revoke an API key"""
        self.api_key_manager.revoke_api_key(key_id, reason)
        logger.info(f"Revoked API key: {key_id}")
    
    def suspend_api_key(self, key_id: str, reason: Optional[str] = None):
        """Suspend an API key"""
        self.api_key_manager.suspend_api_key(key_id, reason)
        logger.info(f"Suspended API key: {key_id}")
    
    def unsuspend_api_key(self, key_id: str):
        """Unsuspend an API key"""
        self.api_key_manager.unsuspend_api_key(key_id)
        logger.info(f"Unsuspended API key: {key_id}")
    
    def rotate_api_key(self, key_id: str) -> Optional[str]:
        """Rotate an API key"""
        new_key = self.api_key_manager.rotate_api_key(key_id)
        if new_key:
            logger.info(f"Rotated API key: {key_id}")
        return new_key
    
    def get_api_key_usage_stats(self) -> Dict[str, Any]:
        """Get API key usage statistics"""
        return self.api_key_manager.get_usage_statistics()
    
    def get_active_api_keys(self) -> list:
        """Get list of active API keys"""
        return self.api_key_manager.get_active_keys()
    
    def validate_password_strength(self, password: str) -> Tuple[bool, str]:
        """Validate password strength"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            return False, "Password must contain at least one special character"
        
        return True, "Password is strong"
    
    def hash_password(self, password: str) -> str:
        """Hash a password"""
        salt = "f1mcp_salt"  # In production, use a random salt per password
        return hashlib.sha256((password + salt).encode()).hexdigest()
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.hash_password(password) == hashed_password
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a secure random token"""
        import secrets
        import string
        
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def check_rate_limit_for_user(self, user_id: str, endpoint: str) -> bool:
        """Check if user has exceeded rate limit for endpoint"""
        # This would integrate with the rate limiting service
        # For now, return True (no rate limit exceeded)
        return True
    
    def log_authentication_event(
        self,
        event_type: str,
        user_id: str,
        success: bool,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log authentication events"""
        log_data = {
            "event_type": event_type,
            "user_id": user_id,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        
        if success:
            logger.info(f"Authentication success: {log_data}")
        else:
            logger.warning(f"Authentication failure: {log_data}")


# Dependency functions for FastAPI
async def get_current_user(request: Request) -> Optional[Dict[str, Any]]:
    """FastAPI dependency to get current authenticated user"""
    auth_service = AuthenticationService()
    return await auth_service.authenticate_request(request)


async def require_authentication(request: Request) -> Dict[str, Any]:
    """FastAPI dependency that requires authentication"""
    auth_service = AuthenticationService()
    user_info = await auth_service.authenticate_request(request)
    
    if not user_info:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_info


async def require_api_key(request: Request) -> Dict[str, Any]:
    """FastAPI dependency that requires API key authentication"""
    auth_service = AuthenticationService()
    api_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
    
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required",
            headers={"X-API-Key": "Required"}
        )
    
    api_key_obj = auth_service.api_key_manager.authenticate(api_key)
    if not api_key_obj:
        raise HTTPException(
            status_code=401,
            detail="Invalid API key"
        )
    
    return {
        "user_id": api_key_obj.key_id,
        "user_type": "api_key",
        "application_name": api_key_obj.application_name,
        "permissions": api_key_obj.permissions,
        "api_key": api_key_obj
    }


async def require_permissions(endpoint: str, method: str):
    """FastAPI dependency that requires specific permissions"""
    def permission_checker(user_info: Dict[str, Any] = Depends(require_authentication)):
        auth_service = AuthenticationService()
        if not auth_service.check_permissions(user_info, endpoint, method):
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions for {method} {endpoint}"
            )
        return user_info
    
    return permission_checker
