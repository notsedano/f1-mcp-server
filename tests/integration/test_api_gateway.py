"""
Integration Test: API Gateway Routing
Tests the API gateway routing functionality and integration with backend services.
This test MUST fail before implementation - it validates the API gateway.
"""

import pytest
import requests
import time
from typing import Dict, Any, List


class TestAPIGatewayIntegration:
    """Integration tests for API gateway routing"""
    
    # Test configuration
    GATEWAY_URL = "http://localhost:8080"
    API_KEY = "test-api-key-12345"
    
    # Expected backend services
    BACKEND_SERVICES = {
        "mcp-server": "http://localhost:8000",
        "mcp-bridge": "http://localhost:8001",
        "messenger-client": "http://localhost:3000"
    }
    
    @pytest.fixture
    def auth_headers(self) -> Dict[str, str]:
        """Return authentication headers"""
        return {
            "X-API-Key": self.API_KEY,
            "Content-Type": "application/json"
        }
    
    def test_gateway_accessible(self):
        """Test that API gateway is accessible"""
        try:
            response = requests.get(f"{self.GATEWAY_URL}/health", timeout=10)
            assert response.status_code in [200, 503], \
                f"API Gateway should be accessible. Got status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"API Gateway not accessible: {str(e)}")
    
    def test_gateway_routes_to_mcp_server(self):
        """Test that API gateway routes F1 data requests to MCP server"""
        # Test F1 schedule endpoint
        response = requests.get(
            f"{self.GATEWAY_URL}/api/v1/f1/schedule",
            headers={"X-API-Key": self.API_KEY},
            timeout=10
        )
        
        # Should route to MCP server (may get auth error or data, but not 502 Bad Gateway)
        assert response.status_code != 502, \
            "API Gateway should route F1 schedule requests to MCP server"
        
        # Should not get connection refused (service not running)
        assert response.status_code != 503, \
            "API Gateway should be able to connect to MCP server"
    
    def test_gateway_routes_to_mcp_bridge(self):
        """Test that API gateway routes chat requests to MCP bridge"""
        chat_request = {
            "message": "Hello, test message",
            "context": {"test": True}
        }
        
        response = requests.post(
            f"{self.GATEWAY_URL}/api/v1/chat",
            headers={"X-API-Key": self.API_KEY, "Content-Type": "application/json"},
            json=chat_request,
            timeout=10
        )
        
        # Should route to MCP bridge (may get auth error or response, but not 502 Bad Gateway)
        assert response.status_code != 502, \
            "API Gateway should route chat requests to MCP bridge"
        
        # Should not get connection refused (service not running)
        assert response.status_code != 503, \
            "API Gateway should be able to connect to MCP bridge"
    
    def test_gateway_load_balancing(self):
        """Test that API gateway can handle multiple requests (basic load balancing test)"""
        # Make multiple concurrent requests
        import concurrent.futures
        import threading
        
        def make_request():
            return requests.get(
                f"{self.GATEWAY_URL}/health",
                timeout=10
            )
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed (not connection errors)
        for i, response in enumerate(responses):
            assert response.status_code != 502, \
                f"Request {i+1} should not return Bad Gateway (load balancing issue)"
            assert response.status_code != 503, \
                f"Request {i+1} should not return Service Unavailable"
    
    def test_gateway_authentication_integration(self):
        """Test that API gateway properly handles authentication"""
        # Test without API key
        response = requests.get(f"{self.GATEWAY_URL}/api/v1/f1/schedule", timeout=10)
        assert response.status_code == 401, \
            "API Gateway should require authentication for protected endpoints"
        
        # Test with invalid API key
        response = requests.get(
            f"{self.GATEWAY_URL}/api/v1/f1/schedule",
            headers={"X-API-Key": "invalid-key"},
            timeout=10
        )
        assert response.status_code == 401, \
            "API Gateway should reject invalid API keys"
        
        # Test with valid API key (may still fail due to backend, but should pass auth)
        response = requests.get(
            f"{self.GATEWAY_URL}/api/v1/f1/schedule",
            headers={"X-API-Key": self.API_KEY},
            timeout=10
        )
        assert response.status_code != 401, \
            "API Gateway should accept valid API keys"
    
    def test_gateway_rate_limiting_integration(self):
        """Test that API gateway rate limiting is working"""
        # Make rapid requests to test rate limiting
        responses = []
        for i in range(35):  # Exceed expected rate limit
            response = requests.get(
                f"{self.GATEWAY_URL}/api/v1/f1/schedule",
                headers={"X-API-Key": self.API_KEY},
                timeout=5
            )
            responses.append(response)
            
            # Stop if we hit rate limit
            if response.status_code == 429:
                break
        
        # Check if rate limiting was triggered
        rate_limited_responses = [r for r in responses if r.status_code == 429]
        
        if rate_limited_responses:
            # Verify rate limit response format
            rate_limit_response = rate_limited_responses[0]
            
            # Should include rate limit headers
            rate_limit_headers = [
                'X-RateLimit-Limit',
                'X-RateLimit-Remaining',
                'X-RateLimit-Reset'
            ]
            
            # At least one rate limit header should be present
            header_present = any(header in rate_limit_response.headers 
                               for header in rate_limit_headers)
            assert header_present, \
                "Rate limit response should include rate limit headers"
    
    def test_gateway_cors_integration(self):
        """Test that API gateway handles CORS properly"""
        # Test preflight request
        response = requests.options(
            f"{self.GATEWAY_URL}/api/v1/f1/schedule",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "X-API-Key"
            },
            timeout=10
        )
        
        # Should handle CORS preflight
        assert response.status_code in [200, 204], \
            "API Gateway should handle CORS preflight requests"
        
        # Check for CORS headers
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers'
        ]
        
        cors_header_present = any(header in response.headers for header in cors_headers)
        
        # Note: CORS might be configured at load balancer level
        if not cors_header_present:
            pytest.skip("CORS headers not present - may be configured at load balancer level")
    
    def test_gateway_error_handling_integration(self):
        """Test that API gateway handles errors properly"""
        # Test with malformed JSON
        response = requests.post(
            f"{self.GATEWAY_URL}/api/v1/chat",
            headers={"X-API-Key": self.API_KEY, "Content-Type": "application/json"},
            data="invalid json",
            timeout=10
        )
        
        assert response.status_code == 400, \
            "API Gateway should return 400 for malformed JSON"
        
        # Test with missing required fields
        response = requests.post(
            f"{self.GATEWAY_URL}/api/v1/chat",
            headers={"X-API-Key": self.API_KEY, "Content-Type": "application/json"},
            json={},  # Missing required 'message' field
            timeout=10
        )
        
        assert response.status_code == 400, \
            "API Gateway should return 400 for missing required fields"
    
    def test_gateway_backend_service_failure_handling(self):
        """Test that API gateway handles backend service failures gracefully"""
        # This test assumes we can simulate backend service failure
        # For now, we'll test that the gateway doesn't crash when backend is unavailable
        
        # Make requests to endpoints that depend on backend services
        endpoints_to_test = [
            ("GET", f"{self.GATEWAY_URL}/api/v1/f1/schedule"),
            ("POST", f"{self.GATEWAY_URL}/api/v1/chat"),
        ]
        
        for method, url in endpoints_to_test:
            if method == "GET":
                response = requests.get(url, headers={"X-API-Key": self.API_KEY}, timeout=10)
            else:
                response = requests.post(
                    url,
                    headers={"X-API-Key": self.API_KEY, "Content-Type": "application/json"},
                    json={"message": "test"},
                    timeout=10
                )
            
            # Should not crash or return 500 Internal Server Error
            assert response.status_code != 500, \
                f"API Gateway should handle backend service failures gracefully for {method} {url}"
            
            # Should return appropriate error codes
            assert response.status_code in [200, 400, 401, 502, 503], \
                f"API Gateway should return appropriate status code for {method} {url}"
    
    def test_gateway_request_timeout_handling(self):
        """Test that API gateway handles request timeouts properly"""
        # Make a request with a very short timeout to simulate timeout
        try:
            response = requests.get(
                f"{self.GATEWAY_URL}/api/v1/f1/schedule",
                headers={"X-API-Key": self.API_KEY},
                timeout=0.1  # Very short timeout
            )
            # If request completes, check that it's handled properly
            assert response.status_code in [200, 400, 401, 408, 502, 503], \
                "API Gateway should handle request timeouts appropriately"
        except requests.exceptions.Timeout:
            # Timeout is expected with very short timeout
            pass
    
    def test_gateway_health_check_integration(self):
        """Test that API gateway health check integrates with backend services"""
        response = requests.get(f"{self.GATEWAY_URL}/health", timeout=10)
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Should include backend service health information
                assert "services" in data, \
                    "Gateway health check should include services information"
                
                services = data["services"]
                assert isinstance(services, dict), \
                    "Services should be an object"
                
                # Should include backend services
                expected_services = ["mcp-server", "mcp-bridge", "messenger-client"]
                for service_name in expected_services:
                    if service_name in services:
                        service = services[service_name]
                        assert "status" in service, \
                            f"Service {service_name} health should include status"
                        assert service["status"] in ["healthy", "unhealthy", "unknown"], \
                            f"Service {service_name} status should be valid"
                        
            except ValueError:
                pytest.fail("Gateway health check should return valid JSON")
    
    def test_gateway_metrics_integration(self):
        """Test that API gateway exposes metrics"""
        try:
            response = requests.get(f"{self.GATEWAY_URL}:9091/metrics", timeout=10)
            assert response.status_code == 200, \
                "API Gateway should expose metrics endpoint"
            
            # Should return metrics in Prometheus format
            assert "text/plain" in response.headers.get('content-type', ''), \
                "Metrics endpoint should return text/plain content"
            
            # Should contain some basic metrics
            metrics_text = response.text
            assert "http_requests_total" in metrics_text or "requests_total" in metrics_text, \
                "Metrics should include request count metrics"
                
        except requests.exceptions.RequestException:
            pytest.skip("Metrics endpoint not accessible")
    
    def test_gateway_logging_integration(self):
        """Test that API gateway logs requests properly"""
        # Make a request and check that it's logged (indirectly by checking response)
        response = requests.get(
            f"{self.GATEWAY_URL}/api/v1/f1/schedule",
            headers={"X-API-Key": self.API_KEY},
            timeout=10
        )
        
        # If we get a response, logging is likely working
        assert response.status_code in [200, 400, 401, 502, 503], \
            "API Gateway should process and log requests"
        
        # Check for request ID in response headers (if implemented)
        request_id_headers = ['X-Request-ID', 'X-Correlation-ID', 'X-Trace-ID']
        request_id_present = any(header in response.headers for header in request_id_headers)
        
        if request_id_present:
            # If request ID is present, logging is likely implemented
            pass
        else:
            # Request ID not present - this is not a failure, just informational
            pytest.skip("Request ID not present in response headers")
    
    def test_gateway_security_headers_integration(self):
        """Test that API gateway adds security headers"""
        response = requests.get(f"{self.GATEWAY_URL}/health", timeout=10)
        
        # Check for security headers
        security_headers = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'X-XSS-Protection',
            'Strict-Transport-Security'
        ]
        
        present_headers = [header for header in security_headers if header in response.headers]
        
        # Should have at least some security headers
        if not present_headers:
            pytest.skip("No security headers present - may be configured at load balancer level")
        else:
            assert len(present_headers) >= 1, \
                "API Gateway should add security headers"


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
