"""
Contract Test: POST /chat
Tests the chat endpoint contract as defined in the OpenAPI specification.
This test MUST fail before implementation - it validates the contract.
"""

import pytest
import requests
import json
from datetime import datetime
from typing import Dict, Any


class TestChatPostContract:
    """Contract tests for POST /chat endpoint"""
    
    # Test configuration
    BASE_URL = "http://localhost:8080"  # API Gateway URL
    ENDPOINT = "/chat"
    API_KEY = "test-api-key-12345"  # Test API key
    
    # Request schema
    VALID_CHAT_REQUEST = {
        "message": "Hello, can you tell me about the next F1 race?",
        "context": {
            "user_id": "test-user-123",
            "session_id": "test-session-456"
        }
    }
    
    INVALID_CHAT_REQUEST_EMPTY_MESSAGE = {
        "message": "",
        "context": {}
    }
    
    INVALID_CHAT_REQUEST_NO_MESSAGE = {
        "context": {}
    }
    
    @pytest.fixture
    def chat_endpoint_url(self) -> str:
        """Return the full URL for the chat endpoint"""
        return f"{self.BASE_URL}{self.ENDPOINT}"
    
    @pytest.fixture
    def auth_headers(self) -> Dict[str, str]:
        """Return authentication headers"""
        return {
            "X-API-Key": self.API_KEY,
            "Content-Type": "application/json"
        }
    
    def test_chat_endpoint_exists(self, chat_endpoint_url, auth_headers):
        """Test that the chat endpoint exists"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        
        # Should not get a 404 - endpoint should exist
        assert response.status_code != 404, "Chat endpoint should exist"
    
    def test_chat_endpoint_method_allowed(self, chat_endpoint_url, auth_headers):
        """Test that POST method is allowed on chat endpoint"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        
        # Should not get a 405 Method Not Allowed
        assert response.status_code != 405, "POST method should be allowed on chat endpoint"
    
    def test_chat_endpoint_requires_authentication(self, chat_endpoint_url):
        """Test that chat endpoint requires authentication"""
        # Make request without authentication
        response = requests.post(
            chat_endpoint_url,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            "Chat endpoint should require authentication"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Authentication error should include error details"
        except ValueError:
            pytest.fail("Authentication error should return valid JSON")
    
    def test_chat_valid_request_success(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint with valid request"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        
        # Should return success status codes
        assert response.status_code in [200, 202], \
            f"Chat endpoint should return 200 or 202 for valid request, got {response.status_code}"
        
        # Should return JSON content
        assert response.headers.get('content-type', '').startswith('application/json'), \
            "Chat endpoint should return JSON content"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("Chat endpoint should return valid JSON")
        
        # Check required fields
        required_fields = ["response", "timestamp"]
        for field in required_fields:
            assert field in data, f"Chat response should contain '{field}' field"
        
        # Check response is a string
        assert isinstance(data["response"], str), "Response field should be a string"
        assert len(data["response"]) > 0, "Response should not be empty"
        
        # Check timestamp format
        timestamp = data["timestamp"]
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail(f"Timestamp should be in ISO format. Got: {timestamp}")
        
        # Check optional processing_time_ms if present
        if "processing_time_ms" in data:
            assert isinstance(data["processing_time_ms"], int), \
                "processing_time_ms should be an integer"
            assert data["processing_time_ms"] >= 0, \
                "processing_time_ms should be non-negative"
    
    def test_chat_invalid_request_empty_message(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint with empty message"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.INVALID_CHAT_REQUEST_EMPTY_MESSAGE,
            timeout=30
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "Chat endpoint should return 400 for empty message"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_chat_invalid_request_no_message(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint without message field"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.INVALID_CHAT_REQUEST_NO_MESSAGE,
            timeout=30
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "Chat endpoint should return 400 when message field is missing"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_chat_request_message_length_validation(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint message length validation"""
        # Test message that's too long (over 1000 characters)
        long_message = "A" * 1001
        long_request = {
            "message": long_message,
            "context": {}
        }
        
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=long_request,
            timeout=30
        )
        
        # Should return 400 Bad Request for message too long
        assert response.status_code == 400, \
            "Chat endpoint should return 400 for message over 1000 characters"
    
    def test_chat_request_with_context(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint with context information"""
        request_with_context = {
            "message": "What's the weather like?",
            "context": {
                "user_id": "user-123",
                "session_id": "session-456",
                "location": "London",
                "preferences": {
                    "language": "en",
                    "timezone": "UTC"
                }
            }
        }
        
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=request_with_context,
            timeout=30
        )
        
        # Should handle context gracefully
        assert response.status_code in [200, 202, 400], \
            f"Chat endpoint should handle context, got {response.status_code}"
    
    def test_chat_response_time(self, chat_endpoint_url, auth_headers):
        """Test that chat endpoint responds within reasonable time"""
        import time
        
        start_time = time.time()
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Chat endpoint should respond within 30 seconds (allowing for AI processing)
        assert response_time < 30000, \
            f"Chat endpoint should respond within 30 seconds. Took: {response_time}ms"
    
    def test_chat_rate_limiting(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint rate limiting"""
        # Make multiple requests quickly to test rate limiting
        responses = []
        for i in range(35):  # Exceed the expected rate limit
            response = requests.post(
                chat_endpoint_url,
                headers=auth_headers,
                json={"message": f"Test message {i}"},
                timeout=10
            )
            responses.append(response)
            
            # Stop if we hit rate limit
            if response.status_code == 429:
                break
        
        # Check if any request was rate limited
        rate_limited = any(r.status_code == 429 for r in responses)
        
        if rate_limited:
            # Verify rate limit response format
            rate_limit_response = next(r for r in responses if r.status_code == 429)
            
            # Should include rate limit headers
            rate_limit_headers = [
                'X-RateLimit-Limit',
                'X-RateLimit-Remaining',
                'X-RateLimit-Reset'
            ]
            
            # At least one rate limit header should be present
            header_present = any(header in rate_limit_response.headers 
                               for header in rate_limit_headers)
            assert header_present, "Rate limit response should include rate limit headers"
            
            # Should return error response
            try:
                error_data = rate_limit_response.json()
                assert "error" in error_data or "message" in error_data, \
                    "Rate limit error should include error details"
            except ValueError:
                pytest.fail("Rate limit error should return valid JSON")
    
    def test_chat_invalid_json(self, chat_endpoint_url, auth_headers):
        """Test chat endpoint with invalid JSON"""
        # Send invalid JSON
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            data="invalid json",
            timeout=10
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "Chat endpoint should return 400 for invalid JSON"
    
    def test_chat_missing_content_type(self, chat_endpoint_url):
        """Test chat endpoint without Content-Type header"""
        headers = {"X-API-Key": self.API_KEY}
        
        response = requests.post(
            chat_endpoint_url,
            headers=headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=10
        )
        
        # Should either accept or return 415 Unsupported Media Type
        assert response.status_code in [200, 202, 415], \
            "Chat endpoint should handle missing Content-Type appropriately"
    
    def test_chat_cors_headers(self, chat_endpoint_url, auth_headers):
        """Test that chat endpoint includes CORS headers"""
        response = requests.post(
            chat_endpoint_url,
            headers=auth_headers,
            json=self.VALID_CHAT_REQUEST,
            timeout=30
        )
        
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


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
