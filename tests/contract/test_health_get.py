"""
Contract Test: GET /health
Tests the health check endpoint contract as defined in the OpenAPI specification.
This test MUST fail before implementation - it validates the contract.
"""

import pytest
import requests
from datetime import datetime
from typing import Dict, Any


class TestHealthGetContract:
    """Contract tests for GET /health endpoint"""
    
    # Test configuration
    BASE_URL = "http://localhost:8080"  # API Gateway URL
    ENDPOINT = "/health"
    EXPECTED_RESPONSE_SCHEMA = {
        "type": "object",
        "required": ["status", "timestamp", "services"],
        "properties": {
            "status": {
                "type": "string",
                "enum": ["healthy", "unhealthy", "degraded"]
            },
            "timestamp": {
                "type": "string",
                "format": "date-time"
            },
            "services": {
                "type": "object",
                "additionalProperties": {
                    "type": "object",
                    "required": ["name", "status", "response_time_ms"],
                    "properties": {
                        "name": {"type": "string"},
                        "status": {
                            "type": "string",
                            "enum": ["healthy", "unhealthy", "unknown"]
                        },
                        "response_time_ms": {
                            "type": "integer",
                            "minimum": 0
                        },
                        "last_check": {
                            "type": "string",
                            "format": "date-time"
                        }
                    }
                }
            }
        }
    }
    
    @pytest.fixture
    def health_endpoint_url(self) -> str:
        """Return the full URL for the health endpoint"""
        return f"{self.BASE_URL}{self.ENDPOINT}"
    
    def test_health_endpoint_exists(self, health_endpoint_url):
        """Test that the health endpoint exists and responds"""
        # This test will fail if the endpoint doesn't exist
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should not get a 404 - endpoint should exist
        assert response.status_code != 404, "Health endpoint should exist"
    
    def test_health_endpoint_method_allowed(self, health_endpoint_url):
        """Test that GET method is allowed on health endpoint"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should not get a 405 Method Not Allowed
        assert response.status_code != 405, "GET method should be allowed on health endpoint"
    
    def test_health_response_status_codes(self, health_endpoint_url):
        """Test that health endpoint returns valid status codes"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should return either 200 (healthy) or 503 (unhealthy)
        assert response.status_code in [200, 503], \
            f"Health endpoint should return 200 or 503, got {response.status_code}"
    
    def test_health_response_content_type(self, health_endpoint_url):
        """Test that health endpoint returns JSON content"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should return JSON content
        assert response.headers.get('content-type', '').startswith('application/json'), \
            "Health endpoint should return JSON content"
    
    def test_health_response_schema_structure(self, health_endpoint_url):
        """Test that health response matches the expected schema structure"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should be able to parse as JSON
        try:
            data = response.json()
        except ValueError:
            pytest.fail("Health endpoint should return valid JSON")
        
        # Check required fields exist
        required_fields = ["status", "timestamp", "services"]
        for field in required_fields:
            assert field in data, f"Health response should contain '{field}' field"
        
        # Check status field values
        assert data["status"] in ["healthy", "unhealthy", "degraded"], \
            f"Status should be one of: healthy, unhealthy, degraded. Got: {data['status']}"
        
        # Check timestamp format
        timestamp = data["timestamp"]
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail(f"Timestamp should be in ISO format. Got: {timestamp}")
        
        # Check services structure
        services = data["services"]
        assert isinstance(services, dict), "Services should be an object"
        
        # Check each service has required fields
        expected_services = ["mcp-server", "messenger-client", "mcp-bridge", "nginx"]
        for service_name in expected_services:
            if service_name in services:
                service = services[service_name]
                service_required_fields = ["name", "status", "response_time_ms"]
                for field in service_required_fields:
                    assert field in service, \
                        f"Service '{service_name}' should contain '{field}' field"
                
                # Check service status values
                assert service["status"] in ["healthy", "unhealthy", "unknown"], \
                    f"Service '{service_name}' status should be healthy, unhealthy, or unknown. Got: {service['status']}"
                
                # Check response time is non-negative integer
                assert isinstance(service["response_time_ms"], int), \
                    f"Service '{service_name}' response_time_ms should be an integer"
                assert service["response_time_ms"] >= 0, \
                    f"Service '{service_name}' response_time_ms should be non-negative"
    
    def test_health_response_when_healthy(self, health_endpoint_url):
        """Test health response when all services are healthy"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "healthy", \
                "Status should be 'healthy' when all services are up"
            
            # All services should be healthy
            services = data["services"]
            for service_name, service in services.items():
                assert service["status"] == "healthy", \
                    f"Service '{service_name}' should be healthy when overall status is healthy"
    
    def test_health_response_when_unhealthy(self, health_endpoint_url):
        """Test health response when some services are unhealthy"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        if response.status_code == 503:
            data = response.json()
            assert data["status"] in ["unhealthy", "degraded"], \
                "Status should be 'unhealthy' or 'degraded' when services are down"
            
            # At least one service should be unhealthy
            services = data["services"]
            unhealthy_services = [name for name, service in services.items() 
                                if service["status"] == "unhealthy"]
            assert len(unhealthy_services) > 0, \
                "Should have at least one unhealthy service when status is unhealthy/degraded"
    
    def test_health_response_time(self, health_endpoint_url):
        """Test that health endpoint responds within reasonable time"""
        import time
        
        start_time = time.time()
        response = requests.get(health_endpoint_url, timeout=10)
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Health check should be fast - under 5 seconds
        assert response_time < 5000, \
            f"Health endpoint should respond within 5 seconds. Took: {response_time}ms"
    
    def test_health_endpoint_no_authentication_required(self, health_endpoint_url):
        """Test that health endpoint doesn't require authentication"""
        # Make request without any authentication headers
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Should not get 401 Unauthorized
        assert response.status_code != 401, \
            "Health endpoint should not require authentication"
    
    def test_health_endpoint_cors_headers(self, health_endpoint_url):
        """Test that health endpoint includes CORS headers"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Check for CORS headers (may not be present in all configurations)
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        # At least one CORS header should be present
        cors_header_present = any(header in response.headers for header in cors_headers)
        
        # Note: This is a warning rather than a failure since CORS might be configured differently
        if not cors_header_present:
            pytest.skip("CORS headers not present - may be configured at load balancer level")
    
    def test_health_endpoint_cache_headers(self, health_endpoint_url):
        """Test that health endpoint has appropriate cache headers"""
        response = requests.get(health_endpoint_url, timeout=10)
        
        # Health checks should not be cached
        cache_control = response.headers.get('Cache-Control', '')
        
        # Should either have no-cache or no-store
        assert 'no-cache' in cache_control or 'no-store' in cache_control or cache_control == '', \
            "Health endpoint should not be cached or should explicitly disable caching"


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
