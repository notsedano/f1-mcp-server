"""
Contract Test: GET /f1/drivers
Tests the F1 drivers endpoint contract as defined in the OpenAPI specification.
This test MUST fail before implementation - it validates the contract.
"""

import pytest
import requests
from typing import Dict, Any, List


class TestF1DriversGetContract:
    """Contract tests for GET /f1/drivers endpoint"""
    
    # Test configuration
    BASE_URL = "http://localhost:8080"  # API Gateway URL
    ENDPOINT = "/f1/drivers"
    API_KEY = "test-api-key-12345"  # Test API key
    
    @pytest.fixture
    def drivers_endpoint_url(self) -> str:
        """Return the full URL for the F1 drivers endpoint"""
        return f"{self.BASE_URL}{self.ENDPOINT}"
    
    @pytest.fixture
    def auth_headers(self) -> Dict[str, str]:
        """Return authentication headers"""
        return {
            "X-API-Key": self.API_KEY
        }
    
    def test_drivers_endpoint_exists(self, drivers_endpoint_url, auth_headers):
        """Test that the F1 drivers endpoint exists"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should not get a 404 - endpoint should exist
        assert response.status_code != 404, "F1 drivers endpoint should exist"
    
    def test_drivers_endpoint_method_allowed(self, drivers_endpoint_url, auth_headers):
        """Test that GET method is allowed on F1 drivers endpoint"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should not get a 405 Method Not Allowed
        assert response.status_code != 405, "GET method should be allowed on F1 drivers endpoint"
    
    def test_drivers_endpoint_requires_authentication(self, drivers_endpoint_url):
        """Test that F1 drivers endpoint requires authentication"""
        # Make request without authentication
        response = requests.get(
            drivers_endpoint_url,
            timeout=10
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, \
            "F1 drivers endpoint should require authentication"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Authentication error should include error details"
        except ValueError:
            pytest.fail("Authentication error should return valid JSON")
    
    def test_drivers_default_request(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint without driver_id parameter"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        # Should return success status
        assert response.status_code == 200, \
            f"F1 drivers endpoint should return 200 for default request, got {response.status_code}"
        
        # Should return JSON content
        assert response.headers.get('content-type', '').startswith('application/json'), \
            "F1 drivers endpoint should return JSON content"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 drivers endpoint should return valid JSON")
        
        # Check required fields
        required_fields = ["drivers"]
        for field in required_fields:
            assert field in data, f"F1 drivers response should contain '{field}' field"
        
        # Check drivers field
        assert isinstance(data["drivers"], list), "Drivers should be an array"
        
        # If drivers exist, check their structure
        if data["drivers"]:
            driver = data["drivers"][0]
            driver_required_fields = ["id", "name", "team"]
            for field in driver_required_fields:
                assert field in driver, f"Driver should contain '{field}' field"
            
            # Check field types
            assert isinstance(driver["id"], str), "Driver ID should be a string"
            assert isinstance(driver["name"], str), "Driver name should be a string"
            assert isinstance(driver["team"], str), "Driver team should be a string"
    
    def test_drivers_specific_driver(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with specific driver_id"""
        test_driver_id = "HAM"  # Lewis Hamilton
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            params={"driver_id": test_driver_id},
            timeout=10
        )
        
        # Should return success status
        assert response.status_code == 200, \
            f"F1 drivers endpoint should return 200 for specific driver, got {response.status_code}"
        
        # Parse response
        try:
            data = response.json()
        except ValueError:
            pytest.fail("F1 drivers endpoint should return valid JSON")
        
        # Check response structure
        assert "drivers" in data, "Response should contain 'drivers' field"
        assert isinstance(data["drivers"], list), "Drivers should be an array"
        
        # If driver found, check structure
        if data["drivers"]:
            driver = data["drivers"][0]
            driver_required_fields = ["id", "name", "team"]
            for field in driver_required_fields:
                assert field in driver, f"Driver should contain '{field}' field"
            
            # Check that returned driver matches requested ID
            assert driver["id"] == test_driver_id, \
                f"Returned driver ID should match requested ID {test_driver_id}"
    
    def test_drivers_invalid_driver_id(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with invalid driver_id"""
        invalid_driver_id = "INVALID_DRIVER_123"
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            params={"driver_id": invalid_driver_id},
            timeout=10
        )
        
        # Should return 400 Bad Request or empty results
        assert response.status_code in [200, 400], \
            f"F1 drivers endpoint should return 200 or 400 for invalid driver ID, got {response.status_code}"
        
        if response.status_code == 200:
            # If 200, should return empty drivers array
            try:
                data = response.json()
                assert data["drivers"] == [], \
                    "Invalid driver ID should return empty drivers array"
            except ValueError:
                pytest.fail("Response should be valid JSON")
        else:
            # If 400, should return error response
            try:
                error_data = response.json()
                assert "error" in error_data or "message" in error_data, \
                    "Error response should include error details"
            except ValueError:
                pytest.fail("Error response should return valid JSON")
    
    def test_drivers_empty_driver_id(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with empty driver_id"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            params={"driver_id": ""},
            timeout=10
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400, \
            "F1 drivers endpoint should return 400 for empty driver ID"
        
        # Should return error response
        try:
            error_data = response.json()
            assert "error" in error_data or "message" in error_data, \
                "Error response should include error details"
        except ValueError:
            pytest.fail("Error response should return valid JSON")
    
    def test_drivers_structure_validation(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers response structure validation"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            drivers = data["drivers"]
            
            if drivers:  # If there are drivers
                driver = drivers[0]
                
                # Check required fields
                required_fields = ["id", "name", "team"]
                for field in required_fields:
                    assert field in driver, f"Driver should contain '{field}' field"
                
                # Check field types
                assert isinstance(driver["id"], str), "Driver ID should be a string"
                assert isinstance(driver["name"], str), "Driver name should be a string"
                assert isinstance(driver["team"], str), "Driver team should be a string"
                
                # Check optional fields if present
                if "number" in driver:
                    assert isinstance(driver["number"], int), "Driver number should be an integer"
                    assert driver["number"] > 0, "Driver number should be positive"
                
                if "nationality" in driver:
                    assert isinstance(driver["nationality"], str), "Driver nationality should be a string"
                
                # Check that required fields are not empty
                assert len(driver["id"]) > 0, "Driver ID should not be empty"
                assert len(driver["name"]) > 0, "Driver name should not be empty"
                assert len(driver["team"]) > 0, "Driver team should not be empty"
    
    def test_drivers_response_time(self, drivers_endpoint_url, auth_headers):
        """Test that F1 drivers endpoint responds within reasonable time"""
        import time
        
        start_time = time.time()
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        # Drivers endpoint should be fast - under 5 seconds
        assert response_time < 5000, \
            f"F1 drivers endpoint should respond within 5 seconds. Took: {response_time}ms"
    
    def test_drivers_caching_headers(self, drivers_endpoint_url, auth_headers):
        """Test that F1 drivers endpoint has appropriate cache headers"""
        response = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            timeout=10
        )
        
        if response.status_code == 200:
            # Driver data can be cached for a reasonable time
            cache_control = response.headers.get('Cache-Control', '')
            etag = response.headers.get('ETag', '')
            last_modified = response.headers.get('Last-Modified', '')
            
            # Should have some caching mechanism (cache control, etag, or last-modified)
            has_caching = bool(cache_control or etag or last_modified)
            
            # Note: This is informational - caching might be configured at load balancer level
            if not has_caching:
                pytest.skip("No caching headers present - may be configured at load balancer level")
    
    def test_drivers_multiple_requests(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with multiple requests"""
        # Make multiple requests to test consistency
        responses = []
        for i in range(3):
            response = requests.get(
                drivers_endpoint_url,
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
    
    def test_drivers_known_driver_ids(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with known driver IDs"""
        known_driver_ids = ["HAM", "VER", "LEC", "RUS", "NOR"]
        
        for driver_id in known_driver_ids:
            response = requests.get(
                drivers_endpoint_url,
                headers=auth_headers,
                params={"driver_id": driver_id},
                timeout=10
            )
            
            # Should return success status
            assert response.status_code == 200, \
                f"F1 drivers endpoint should return 200 for known driver ID {driver_id}, got {response.status_code}"
            
            # Parse response
            try:
                data = response.json()
            except ValueError:
                pytest.fail(f"F1 drivers endpoint should return valid JSON for driver ID {driver_id}")
            
            # Check response structure
            assert "drivers" in data, f"Response should contain 'drivers' field for driver ID {driver_id}"
            assert isinstance(data["drivers"], list), f"Drivers should be an array for driver ID {driver_id}"
            
            # If driver found, check it matches requested ID
            if data["drivers"]:
                driver = data["drivers"][0]
                assert driver["id"] == driver_id, \
                    f"Returned driver ID should match requested ID {driver_id}"
    
    def test_drivers_case_sensitivity(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint case sensitivity for driver IDs"""
        # Test with lowercase driver ID
        response_lower = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            params={"driver_id": "ham"},
            timeout=10
        )
        
        # Test with uppercase driver ID
        response_upper = requests.get(
            drivers_endpoint_url,
            headers=auth_headers,
            params={"driver_id": "HAM"},
            timeout=10
        )
        
        # Both should return success or both should return same result
        assert response_lower.status_code == response_upper.status_code, \
            "Driver ID case sensitivity should be consistent"
        
        # If both successful, results should be equivalent
        if response_lower.status_code == 200 and response_upper.status_code == 200:
            data_lower = response_lower.json()
            data_upper = response_upper.json()
            
            # Results should be equivalent (same driver or empty)
            assert len(data_lower["drivers"]) == len(data_upper["drivers"]), \
                "Case sensitivity should not affect result count"
    
    def test_drivers_special_characters(self, drivers_endpoint_url, auth_headers):
        """Test F1 drivers endpoint with special characters in driver ID"""
        special_driver_ids = ["HAM-1", "VER_2", "LEC@3", "RUS#4", "NOR$5"]
        
        for driver_id in special_driver_ids:
            response = requests.get(
                drivers_endpoint_url,
                headers=auth_headers,
                params={"driver_id": driver_id},
                timeout=10
            )
            
            # Should return 400 Bad Request or empty results
            assert response.status_code in [200, 400], \
                f"F1 drivers endpoint should return 200 or 400 for special character driver ID {driver_id}, got {response.status_code}"
            
            # If 400, should return error response
            if response.status_code == 400:
                try:
                    error_data = response.json()
                    assert "error" in error_data or "message" in error_data, \
                        "Error response should include error details"
                except ValueError:
                    pytest.fail("Error response should return valid JSON")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
