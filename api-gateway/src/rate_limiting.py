"""
Rate Limiting Service
Handles rate limiting and throttling for the API Gateway.
"""

import time
import asyncio
from typing import Dict, Any, Optional, Tuple
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging

from .endpoint import APIEndpoint

logger = logging.getLogger(__name__)


@dataclass
class RateLimitBucket:
    """Token bucket for rate limiting"""
    capacity: int
    tokens: float
    last_refill: float
    refill_rate: float  # tokens per second
    
    def __post_init__(self):
        if not hasattr(self, 'last_refill'):
            self.last_refill = time.time()
    
    def refill(self, current_time: Optional[float] = None):
        """Refill tokens based on time elapsed"""
        if current_time is None:
            current_time = time.time()
        
        time_elapsed = current_time - self.last_refill
        tokens_to_add = time_elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_refill = current_time
    
    def consume(self, tokens: int = 1) -> bool:
        """Try to consume tokens from bucket"""
        self.refill()
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def get_available_tokens(self) -> int:
        """Get number of available tokens"""
        self.refill()
        return int(self.tokens)


@dataclass
class RateLimitInfo:
    """Rate limit information for a request"""
    allowed: bool
    limit: int
    remaining: int
    reset_time: float
    retry_after: Optional[int] = None
    
    def to_headers(self) -> Dict[str, str]:
        """Convert to HTTP headers"""
        headers = {
            "X-RateLimit-Limit": str(self.limit),
            "X-RateLimit-Remaining": str(self.remaining),
            "X-RateLimit-Reset": str(int(self.reset_time))
        }
        
        if self.retry_after:
            headers["Retry-After"] = str(self.retry_after)
        
        return headers


class RateLimitingService:
    """Rate limiting service for API Gateway"""
    
    def __init__(self):
        # Rate limit buckets for different scopes
        self.ip_buckets: Dict[str, RateLimitBucket] = {}
        self.user_buckets: Dict[str, RateLimitBucket] = {}
        self.endpoint_buckets: Dict[str, RateLimitBucket] = {}
        
        # Request counters for statistics
        self.request_counts: Dict[str, int] = defaultdict(int)
        self.rate_limit_violations: Dict[str, int] = defaultdict(int)
        self.response_times: deque = deque(maxlen=1000)
        
        # Cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start cleanup task for old buckets"""
        async def cleanup_old_buckets():
            while True:
                try:
                    await asyncio.sleep(3600)  # Run every hour
                    self._cleanup_old_buckets()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in cleanup task: {e}")
        
        self._cleanup_task = asyncio.create_task(cleanup_old_buckets())
    
    def _cleanup_old_buckets(self):
        """Clean up old, unused buckets"""
        current_time = time.time()
        cleanup_threshold = 3600  # 1 hour
        
        # Clean up IP buckets
        old_ips = [
            ip for ip, bucket in self.ip_buckets.items()
            if current_time - bucket.last_refill > cleanup_threshold
        ]
        for ip in old_ips:
            del self.ip_buckets[ip]
        
        # Clean up user buckets
        old_users = [
            user_id for user_id, bucket in self.user_buckets.items()
            if current_time - bucket.last_refill > cleanup_threshold
        ]
        for user_id in old_users:
            del self.user_buckets[user_id]
        
        # Clean up endpoint buckets
        old_endpoints = [
            endpoint for endpoint, bucket in self.endpoint_buckets.items()
            if current_time - bucket.last_refill > cleanup_threshold
        ]
        for endpoint in old_endpoints:
            del self.endpoint_buckets[endpoint]
        
        if old_ips or old_users or old_endpoints:
            logger.info(f"Cleaned up {len(old_ips)} IP, {len(old_users)} user, {len(old_endpoints)} endpoint buckets")
    
    async def check_rate_limit(
        self,
        endpoint: APIEndpoint,
        client_ip: str,
        user_id: Optional[str] = None
    ) -> RateLimitInfo:
        """Check rate limit for a request"""
        current_time = time.time()
        rate_limit_config = endpoint.rate_limit
        
        if not rate_limit_config:
            # No rate limiting configured
            return RateLimitInfo(
                allowed=True,
                limit=0,
                remaining=0,
                reset_time=current_time
            )
        
        # Check global rate limit
        global_allowed = await self._check_global_rate_limit(rate_limit_config)
        if not global_allowed:
            self.rate_limit_violations["global"] += 1
            return RateLimitInfo(
                allowed=False,
                limit=rate_limit_config.requests_per_minute,
                remaining=0,
                reset_time=current_time + 60,
                retry_after=60
            )
        
        # Check per-IP rate limit
        if rate_limit_config.per_ip:
            ip_allowed = await self._check_ip_rate_limit(client_ip, rate_limit_config)
            if not ip_allowed:
                self.rate_limit_violations[f"ip_{client_ip}"] += 1
                return RateLimitInfo(
                    allowed=False,
                    limit=rate_limit_config.requests_per_minute,
                    remaining=0,
                    reset_time=current_time + 60,
                    retry_after=60
                )
        
        # Check per-user rate limit
        if rate_limit_config.per_user and user_id:
            user_allowed = await self._check_user_rate_limit(user_id, rate_limit_config)
            if not user_allowed:
                self.rate_limit_violations[f"user_{user_id}"] += 1
                return RateLimitInfo(
                    allowed=False,
                    limit=rate_limit_config.requests_per_minute,
                    remaining=0,
                    reset_time=current_time + 60,
                    retry_after=60
                )
        
        # Check per-endpoint rate limit
        if rate_limit_config.per_endpoint:
            endpoint_allowed = await self._check_endpoint_rate_limit(endpoint, rate_limit_config)
            if not endpoint_allowed:
                self.rate_limit_violations[f"endpoint_{endpoint.path}"] += 1
                return RateLimitInfo(
                    allowed=False,
                    limit=rate_limit_config.requests_per_minute,
                    remaining=0,
                    reset_time=current_time + 60,
                    retry_after=60
                )
        
        # All checks passed
        return RateLimitInfo(
            allowed=True,
            limit=rate_limit_config.requests_per_minute,
            remaining=rate_limit_config.requests_per_minute - 1,  # Approximate
            reset_time=current_time + 60
        )
    
    async def _check_global_rate_limit(self, rate_limit_config) -> bool:
        """Check global rate limit"""
        # For simplicity, we'll use a simple counter approach
        # In production, you'd want to use a more sophisticated algorithm
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        # This is a simplified implementation
        # In production, use Redis or similar for distributed rate limiting
        return True  # Allow for now
    
    async def _check_ip_rate_limit(self, client_ip: str, rate_limit_config) -> bool:
        """Check per-IP rate limit"""
        bucket_key = f"ip_{client_ip}"
        
        if bucket_key not in self.ip_buckets:
            self.ip_buckets[bucket_key] = RateLimitBucket(
                capacity=rate_limit_config.burst_size,
                tokens=rate_limit_config.burst_size,
                refill_rate=rate_limit_config.requests_per_minute / 60.0
            )
        
        bucket = self.ip_buckets[bucket_key]
        return bucket.consume(1)
    
    async def _check_user_rate_limit(self, user_id: str, rate_limit_config) -> bool:
        """Check per-user rate limit"""
        bucket_key = f"user_{user_id}"
        
        if bucket_key not in self.user_buckets:
            self.user_buckets[bucket_key] = RateLimitBucket(
                capacity=rate_limit_config.burst_size,
                tokens=rate_limit_config.burst_size,
                refill_rate=rate_limit_config.requests_per_minute / 60.0
            )
        
        bucket = self.user_buckets[bucket_key]
        return bucket.consume(1)
    
    async def _check_endpoint_rate_limit(self, endpoint: APIEndpoint, rate_limit_config) -> bool:
        """Check per-endpoint rate limit"""
        bucket_key = f"endpoint_{endpoint.path}_{endpoint.method.value}"
        
        if bucket_key not in self.endpoint_buckets:
            self.endpoint_buckets[bucket_key] = RateLimitBucket(
                capacity=rate_limit_config.burst_size,
                tokens=rate_limit_config.burst_size,
                refill_rate=rate_limit_config.requests_per_minute / 60.0
            )
        
        bucket = self.endpoint_buckets[bucket_key]
        return bucket.consume(1)
    
    def record_request(self, endpoint: str, method: str, response_time_ms: float):
        """Record a request for statistics"""
        key = f"{method}:{endpoint}"
        self.request_counts[key] += 1
        self.response_times.append(response_time_ms)
    
    def record_rate_limit_violation(self, scope: str, identifier: str):
        """Record a rate limit violation"""
        key = f"{scope}:{identifier}"
        self.rate_limit_violations[key] += 1
    
    def get_rate_limit_status(self, client_ip: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get current rate limit status for a client"""
        status = {
            "ip_rate_limit": {},
            "user_rate_limit": {},
            "global_rate_limit": {}
        }
        
        # Get IP rate limit status
        ip_bucket_key = f"ip_{client_ip}"
        if ip_bucket_key in self.ip_buckets:
            bucket = self.ip_buckets[ip_bucket_key]
            bucket.refill()
            status["ip_rate_limit"] = {
                "tokens": int(bucket.tokens),
                "capacity": bucket.capacity,
                "refill_rate": bucket.refill_rate
            }
        
        # Get user rate limit status
        if user_id:
            user_bucket_key = f"user_{user_id}"
            if user_bucket_key in self.user_buckets:
                bucket = self.user_buckets[user_bucket_key]
                bucket.refill()
                status["user_rate_limit"] = {
                    "tokens": int(bucket.tokens),
                    "capacity": bucket.capacity,
                    "refill_rate": bucket.refill_rate
                }
        
        return status
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get rate limiting statistics"""
        total_requests = sum(self.request_counts.values())
        total_violations = sum(self.rate_limit_violations.values())
        
        avg_response_time = 0
        if self.response_times:
            avg_response_time = sum(self.response_times) / len(self.response_times)
        
        return {
            "total_requests": total_requests,
            "total_rate_limit_violations": total_violations,
            "violation_rate": (total_violations / total_requests * 100) if total_requests > 0 else 0,
            "average_response_time_ms": avg_response_time,
            "active_ip_buckets": len(self.ip_buckets),
            "active_user_buckets": len(self.user_buckets),
            "active_endpoint_buckets": len(self.endpoint_buckets),
            "top_endpoints": dict(sorted(self.request_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        }
    
    def get_total_requests(self) -> int:
        """Get total number of requests"""
        return sum(self.request_counts.values())
    
    def get_rate_limit_violations(self) -> int:
        """Get total number of rate limit violations"""
        return sum(self.rate_limit_violations.values())
    
    def get_avg_response_time(self) -> float:
        """Get average response time"""
        if self.response_times:
            return sum(self.response_times) / len(self.response_times)
        return 0.0
    
    def reset_statistics(self):
        """Reset all statistics"""
        self.request_counts.clear()
        self.rate_limit_violations.clear()
        self.response_times.clear()
        logger.info("Rate limiting statistics reset")
    
    def configure_rate_limit(
        self,
        scope: str,
        identifier: str,
        requests_per_minute: int,
        burst_size: int
    ):
        """Configure custom rate limit for a scope"""
        bucket_key = f"{scope}_{identifier}"
        
        bucket = RateLimitBucket(
            capacity=burst_size,
            tokens=burst_size,
            refill_rate=requests_per_minute / 60.0
        )
        
        if scope == "ip":
            self.ip_buckets[bucket_key] = bucket
        elif scope == "user":
            self.user_buckets[bucket_key] = bucket
        elif scope == "endpoint":
            self.endpoint_buckets[bucket_key] = bucket
        
        logger.info(f"Configured rate limit for {scope}:{identifier} - {requests_per_minute}/min, burst: {burst_size}")
    
    def remove_rate_limit(self, scope: str, identifier: str):
        """Remove custom rate limit for a scope"""
        bucket_key = f"{scope}_{identifier}"
        
        if scope == "ip" and bucket_key in self.ip_buckets:
            del self.ip_buckets[bucket_key]
        elif scope == "user" and bucket_key in self.user_buckets:
            del self.user_buckets[bucket_key]
        elif scope == "endpoint" and bucket_key in self.endpoint_buckets:
            del self.endpoint_buckets[bucket_key]
        
        logger.info(f"Removed rate limit for {scope}:{identifier}")
    
    def is_client_blocked(self, client_ip: str, user_id: Optional[str] = None) -> bool:
        """Check if client is blocked due to excessive violations"""
        # Simple blocking logic - block if more than 100 violations in last hour
        violation_key = f"ip_{client_ip}"
        if self.rate_limit_violations.get(violation_key, 0) > 100:
            return True
        
        if user_id:
            user_violation_key = f"user_{user_id}"
            if self.rate_limit_violations.get(user_violation_key, 0) > 100:
                return True
        
        return False
    
    def unblock_client(self, client_ip: str, user_id: Optional[str] = None):
        """Unblock a client by resetting violation count"""
        violation_key = f"ip_{client_ip}"
        if violation_key in self.rate_limit_violations:
            del self.rate_limit_violations[violation_key]
        
        if user_id:
            user_violation_key = f"user_{user_id}"
            if user_violation_key in self.rate_limit_violations:
                del self.rate_limit_violations[user_violation_key]
        
        logger.info(f"Unblocked client {client_ip} (user: {user_id})")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Rate limiting service cleaned up")


# Global rate limiting service instance
rate_limiting_service = RateLimitingService()
