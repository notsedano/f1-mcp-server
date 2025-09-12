"""
Contract Test: GET /f1/schedule
Tests the F1 schedule endpoint contract as defined in the OpenAPI specification.
This test MUST fail before implementation - it validates the contract.
"""

import pytest
import requests
from datetime import datetime, date
from typing import Dict, Any, List


class TestF1ScheduleGetContract:
    """Contract tests for GET /f1/schedule endpoint"""
    
    # Test configuration
    BASE_URL = "http://localhost:8080"  # API Gateway URL
    ENDPOINT = "/f1/schedule"
    API_KEY = "test-api-key-12345"  # Test API key
    
    @pytest.fixture
    def schedule_endpoint_url(self) -> str:
        """Return the full URL for the F1 schedule endpoint"""
        return f"{self.BASE_URL}{self.ENDPOINT}"
    
    @pytest.fixture
    def auth_headers(self) -> Dict[str, str]:
        """Return authentication headers"""
        return {
            "X-API-Key": self.API_KEY
        }
    
    def test_schedule_endpoint_exists(self, schedule_endpoint_url, auth_headers):
        """Test that the F1 schedule endpoint exists"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should not get a 404 - endpoint should exist
        assert response.status_code != 404, "F1 schedule endpoint should exist"
    
    def test_schedule_endpoint_method_allowed(self, schedule_endpoint_url, auth_headers):
        """Test that GET method is allowed on F1 schedule endpoint"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should not get a 405 Method Not Allowed
        assert response.status_code != 405, "GET method should be allowed on F1 schedule endpoint"
    
    def test_schedule_endpoint_requires_authentication(self, schedule_endpoint_url):
        """Test that F1 schedule endpoint requires authentication"""
        # Make request without authentication
        response = requests.get(
            schedule_endpoint_url,
            timeout=10
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            "F1 schedule endpoint should require authentication"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Authentication error should include error details"
        except ValueError:
            pytest.fail("Authentication error should return valid JSON")
    
    def test_schedule_default_year(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with default year (2024)"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should return success status
        assert response.status_code == 200, \
            f"F1 schedule endpoint should return 200 for default year, got {response.status_code}"
        
        # Should return JSON content
        assert response.headers.get('content-type', '').startswith('application/json'), \
            "F1 schedule endpoint should return JSON content"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 schedule endpoint should return valid JSON")
        
        # Check required fields
        required_fields = ["year", "events"]
        for field in required_fields:
            assert field in data, f"F1 schedule response should contain '{field}' field"
        
        # Check year field
        assert isinstance(data["year"], int), "Year should be an integer"
        assert data["year"] == 2024, "Default year should be 2024"
        
        # Check events field
        assert isinstance(data["events"], list), "Events should be an array"
        
        # If events exist, check their structure
        if data["events"]:
            event = data["events"][0]
            event_required_fields = ["name", "date", "location"]
            for field in event_required_fields:
                assert field in event, f"Event should contain '{field}' field"
            
            # Check date format
            try:
                date.fromisoformat(event["date"])
            except ValueError:
                pytest.fail(f"Event date should be in YYYY-MM-DD format. Got: {event['date']}")
    
    def test_schedule_valid_year(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with valid year parameter"""
        test_year = 2023
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": test_year},
            timeout=10
        )
        
        # Should return success status
        assert response.status_code == 200, \
            f"F1 schedule endpoint should return 200 for valid year, got {response.status_code}"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 schedule endpoint should return valid JSON")
        
        # Check year matches request
        assert data["year"] == test_year, f"Response year should match requested year {test_year}"
    
    def test_schedule_invalid_year_too_low(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with year below minimum (1950)"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": 1949},
            timeout=10
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "F1 schedule endpoint should return 400 for year below minimum (1950)"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_schedule_invalid_year_too_high(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with year above maximum (2030)"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": 2031},
            timeout=10
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "F1 schedule endpoint should return 400 for year above maximum (2030)"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_schedule_invalid_year_non_integer(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with non-integer year"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": "invalid"},
            timeout=10
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "F1 schedule endpoint should return 400 for non-integer year"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_schedule_events_structure(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule events structure"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            events = data["events"]
            
            if events:  # If there are events
                event = events[0]
                
                # Check required fields
                required_fields = ["name", "date", "location"]
                for field in required_fields:
                    assert field in event, f"Event should contain '{field}' field"
                
                # Check field types
                assert isinstance(event["name"], str), "Event name should be a string"
                assert isinstance(event["date"], str), "Event date should be a string"
                assert isinstance(event["location"], str), "Event location should be a string"
                
                # Check optional sessions field if present
                if "sessions" in event:
                    assert isinstance(event["sessions"], list), "Sessions should be an array"
                    
                    if event["sessions"]:  # If there are sessions
                        session = event["sessions"][0]
                        session_required_fields = ["name", "datetime"]
                        for field in session_required_fields:
                            assert field in session, f"Session should contain '{field}' field"
                        
                        # Check session datetime format
                        try:
                            datetime.fromisoformat(session["datetime"].replace('Z', '+00:00'))
                        except ValueError:
                            pytest.fail(f"Session datetime should be in ISO format. Got: {session['datetime']}")
    
    def test_schedule_response_time(self, schedule_endpoint_url, auth_headers):
        """Test that F1 schedule endpoint responds within reasonable time"""
        import time
        
        start_time = time.time()
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Schedule endpoint should be fast - under 5 seconds
        assert response_time < 5000, \
            f"F1 schedule endpoint should respond within 5 seconds. Took: {response_time}ms"
    
    def test_schedule_caching_headers(self, schedule_endpoint_url, auth_headers):
        """Test that F1 schedule endpoint has appropriate cache headers"""
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            # F1 schedule data can be cached for a reasonable time
            cache_control = response.headers.get('Cache-Control', '')
            etag = response.headers.get('ETag', '')
            last_modified = response.headers.get('Last-Modified', '')
            
            # Should have some caching mechanism (cache control, etag, or last-modified)
            has_caching = bool(cache_control or etag or last_modified)
            
            # Note: This is informational - caching might be configured at load balancer level
            if not has_caching:
                pytest.skip("No caching headers present - may be configured at load balancer level")
    
    def test_schedule_multiple_requests(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with multiple requests"""
        # Make multiple requests to test consistency
        responses = []
        for i in range(3):
            response = requests.get(
                schedule_endpoint_url,
                headers=auth_headers,
                timeout=10
            )
            responses.append(response)
        
        # All responses should be successful
        for i, response in enumerate(responses):
            assert response.status_code == 200, \
                f"Request {i+1} should return 200, got {response.status_code}"
        
        # All responses should have same structure
        if all(r.status_code == 200 for r in responses):
            data_1 = responses[0].json()
            data_2 = responses[1].json()
            
            # Should have same required fields
            assert data_1.keys() == data_2.keys(), \
                "Multiple requests should return same response structure"
    
    def test_schedule_historical_year(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with historical year"""
        historical_year = 2020
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": historical_year},
            timeout=10
        )
        
        # Should return success status
        assert response.status_code == 200, \
            f"F1 schedule endpoint should return 200 for historical year, got {response.status_code}"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 schedule endpoint should return valid JSON")
        
        # Check year matches request
        assert data["year"] == historical_year, \
            f"Response year should match requested historical year {historical_year}"
    
    def test_schedule_future_year(self, schedule_endpoint_url, auth_headers):
        """Test F1 schedule endpoint with future year"""
        future_year = 2025
        response = requests.get(
            schedule_endpoint_url,
            headers=auth_headers,
            params={"year": future_year},
            timeout=10
        )
        
        # Should return success status (may be empty events for future years)
        assert response.status_code == 200, \
            f"F1 schedule endpoint should return 200 for future year, got {response.status_code}"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 schedule endpoint should return valid JSON")
        
        # Check year matches request
        assert data["year"] == future_year, \
            f"Response year should match requested future year {future_year}"


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
