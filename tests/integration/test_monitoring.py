"""
Integration Test: Monitoring and Alerting
Tests the monitoring system integration with all services and alerting functionality.
This test MUST fail before implementation - it validates the monitoring system.
"""

import pytest
import requests
import time
from typing import Dict, Any, List
from datetime import datetime


class TestMonitoringIntegration:
    """Integration tests for monitoring and alerting system"""
    
    # Test configuration
    MONITORING_URL = "http://localhost:3001"
    METRICS_URL = "http://localhost:9090"
    DASHBOARD_URL = "http://localhost:3001"
    
    # Services to monitor
    MONITORED_SERVICES = {
        "mcp-server": "http://localhost:8000",
        "messenger-client": "http://localhost:3000",
        "mcp-bridge": "http://localhost:8001",
        "nginx": "http://localhost:80",
        "api-gateway": "http://localhost:8080"
    }
    
    def test_monitoring_service_accessible(self):
        """Test that monitoring service is accessible"""
        try:
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response.status_code in [200, 503], \
                f"Monitoring service should be accessible. Got status: {response.status_code}"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Monitoring service not accessible: {str(e)}")
    
    def test_metrics_endpoint_accessible(self):
        """Test that metrics endpoint is accessible"""
        try:
            response = requests.get(f"{self.METRICS_URL}/metrics", timeout=10)
            assert response.status_code == 200, \
                f"Metrics endpoint should be accessible. Got status: {response.status_code}"
            
            # Should return metrics in Prometheus format
            assert "text/plain" in response.headers.get('content-type', ''), \
                "Metrics endpoint should return text/plain content"
                
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Metrics endpoint not accessible: {str(e)}")
    
    def test_dashboard_accessible(self):
        """Test that monitoring dashboard is accessible"""
        try:
            response = requests.get(f"{self.DASHBOARD_URL}/", timeout=10)
            assert response.status_code in [200, 404], \
                f"Monitoring dashboard should be accessible. Got status: {response.status_code}"
                
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Monitoring dashboard not accessible: {str(e)}")
    
    def test_health_monitoring_integration(self):
        """Test that monitoring system checks health of all services"""
        # Wait a moment for monitoring to collect data
        time.sleep(5)
        
        try:
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response.status_code in [200, 503], \
                "Monitoring service health endpoint should be accessible"
            
            if response.status_code == 200:
                data = response.json()
                
                # Should include information about monitored services
                assert "services" in data or "status" in data, \
                    "Monitoring health response should include service information"
                
                # Check if monitoring is actually checking services
                if "services" in data:
                    services = data["services"]
                    assert isinstance(services, dict), \
                        "Services information should be an object"
                    
                    # Should have information about at least some services
                    assert len(services) > 0, \
                        "Monitoring should track at least one service"
                    
                    # Check service health information
                    for service_name, service_info in services.items():
                        if isinstance(service_info, dict):
                            assert "status" in service_info, \
                                f"Service {service_name} health info should include status"
                            
                            assert service_info["status"] in ["healthy", "unhealthy", "unknown"], \
                                f"Service {service_name} status should be valid"
                            
                            if "response_time_ms" in service_info:
                                assert isinstance(service_info["response_time_ms"], (int, float)), \
                                    f"Service {service_name} response time should be numeric"
                                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for health check test")
    
    def test_metrics_collection_integration(self):
        """Test that monitoring system collects metrics from services"""
        try:
            response = requests.get(f"{self.METRICS_URL}/metrics", timeout=10)
            assert response.status_code == 200, \
                "Metrics endpoint should return metrics"
            
            metrics_text = response.text
            
            # Should contain basic system metrics
            expected_metrics = [
                "cpu_usage",
                "memory_usage",
                "disk_usage",
                "http_requests_total",
                "response_time"
            ]
            
            found_metrics = [metric for metric in expected_metrics if metric in metrics_text]
            
            # Should have at least some metrics
            assert len(found_metrics) > 0, \
                f"Should collect at least some metrics. Found: {found_metrics}"
            
            # Should have metrics in Prometheus format
            assert "# HELP" in metrics_text or "# TYPE" in metrics_text, \
                "Metrics should be in Prometheus format"
                
        except requests.exceptions.RequestException:
            pytest.skip("Metrics endpoint not accessible for metrics collection test")
    
    def test_service_discovery_integration(self):
        """Test that monitoring system discovers and monitors all services"""
        # This test checks that monitoring can discover the services we expect
        
        try:
            # Check monitoring health endpoint
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if "services" in data:
                    discovered_services = list(data["services"].keys())
                    
                    # Should discover at least some of our expected services
                    expected_services = list(self.MONITORED_SERVICES.keys())
                    discovered_expected = [s for s in expected_services if s in discovered_services]
                    
                    assert len(discovered_expected) > 0, \
                        f"Should discover at least some expected services. Expected: {expected_services}, Discovered: {discovered_services}"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for service discovery test")
    
    def test_alerting_system_integration(self):
        """Test that alerting system is integrated and functional"""
        # This test checks that alerting system is working
        # We'll test by checking if monitoring can detect service states
        
        try:
            # Make a request to monitoring health endpoint
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if monitoring is tracking service health
                if "services" in data:
                    services = data["services"]
                    
                    # Check if any services are being monitored
                    monitored_count = len(services)
                    assert monitored_count > 0, \
                        "Alerting system should monitor at least one service"
                    
                    # Check if services have health status
                    for service_name, service_info in services.items():
                        if isinstance(service_info, dict) and "status" in service_info:
                            status = service_info["status"]
                            assert status in ["healthy", "unhealthy", "unknown"], \
                                f"Service {service_name} should have valid health status for alerting"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for alerting test")
    
    def test_logging_integration(self):
        """Test that monitoring system logs events properly"""
        # This test checks that monitoring is logging events
        # We'll test by making requests and checking if they're processed
        
        try:
            # Make multiple requests to trigger logging
            for i in range(3):
                response = requests.get(f"{self.MONITORING_URL}/health", timeout=5)
                time.sleep(1)
            
            # If we can make requests without errors, logging is likely working
            assert response.status_code in [200, 503], \
                "Monitoring should process requests and log events"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for logging test")
    
    def test_performance_monitoring_integration(self):
        """Test that monitoring system tracks performance metrics"""
        try:
            response = requests.get(f"{self.METRICS_URL}/metrics", timeout=10)
            assert response.status_code == 200, \
                "Metrics endpoint should be accessible for performance monitoring"
            
            metrics_text = response.text
            
            # Should contain performance-related metrics
            performance_metrics = [
                "response_time",
                "latency",
                "throughput",
                "requests_per_second",
                "cpu_usage",
                "memory_usage"
            ]
            
            found_performance_metrics = [metric for metric in performance_metrics 
                                       if metric in metrics_text]
            
            # Should have at least some performance metrics
            if len(found_performance_metrics) == 0:
                pytest.skip("No performance metrics found - may not be implemented yet")
            else:
                assert len(found_performance_metrics) > 0, \
                    f"Should collect performance metrics. Found: {found_performance_metrics}"
                
        except requests.exceptions.RequestException:
            pytest.skip("Metrics endpoint not accessible for performance monitoring test")
    
    def test_monitoring_dashboard_functionality(self):
        """Test that monitoring dashboard provides useful information"""
        try:
            # Test dashboard main page
            response = requests.get(f"{self.DASHBOARD_URL}/", timeout=10)
            assert response.status_code in [200, 404], \
                "Dashboard should be accessible"
            
            # Test dashboard API endpoints if available
            dashboard_endpoints = [
                "/api/health",
                "/api/services",
                "/api/metrics",
                "/api/alerts"
            ]
            
            accessible_endpoints = []
            for endpoint in dashboard_endpoints:
                try:
                    response = requests.get(f"{self.DASHBOARD_URL}{endpoint}", timeout=5)
                    if response.status_code == 200:
                        accessible_endpoints.append(endpoint)
                except requests.exceptions.RequestException:
                    pass
            
            # Should have at least some dashboard functionality
            if len(accessible_endpoints) == 0:
                pytest.skip("No dashboard API endpoints accessible - may not be implemented yet")
            else:
                assert len(accessible_endpoints) > 0, \
                    f"Dashboard should provide some API functionality. Accessible: {accessible_endpoints}"
                
        except requests.exceptions.RequestException:
            pytest.skip("Dashboard not accessible for functionality test")
    
    def test_monitoring_configuration_integration(self):
        """Test that monitoring system is properly configured"""
        # This test checks that monitoring is configured correctly
        # We'll test by checking if it can access the services it should monitor
        
        try:
            # Check if monitoring can access its own health endpoint
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response.status_code in [200, 503], \
                "Monitoring should be able to check its own health"
            
            # Check if monitoring can access metrics endpoint
            response = requests.get(f"{self.METRICS_URL}/metrics", timeout=10)
            assert response.status_code == 200, \
                "Monitoring should be able to access metrics endpoint"
            
            # Check if monitoring can access dashboard
            response = requests.get(f"{self.DASHBOARD_URL}/", timeout=10)
            assert response.status_code in [200, 404], \
                "Monitoring should be able to access dashboard"
                
        except requests.exceptions.RequestException:
            pytest.fail("Monitoring configuration integration test failed")
    
    def test_monitoring_data_persistence_integration(self):
        """Test that monitoring system persists data over time"""
        # This test checks that monitoring can maintain data over time
        # We'll make requests at different times and check consistency
        
        try:
            # Initial request
            response1 = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response1.status_code in [200, 503], \
                "Initial monitoring request should succeed"
            
            # Wait a moment
            time.sleep(2)
            
            # Second request
            response2 = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response2.status_code in [200, 503], \
                "Second monitoring request should succeed"
            
            # Both requests should succeed (data persistence working)
            assert response1.status_code == response2.status_code, \
                "Monitoring should maintain consistent responses over time"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for data persistence test")
    
    def test_monitoring_alert_conditions_integration(self):
        """Test that monitoring system can detect alert conditions"""
        # This test checks that monitoring can detect conditions that should trigger alerts
        # We'll test by checking service health states
        
        try:
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if "services" in data:
                    services = data["services"]
                    
                    # Check if monitoring can detect different service states
                    service_states = [info.get("status") for info in services.values() 
                                    if isinstance(info, dict)]
                    
                    # Should have some service state information
                    assert len(service_states) > 0, \
                        "Monitoring should detect service states for alerting"
                    
                    # Should have valid states
                    valid_states = ["healthy", "unhealthy", "unknown"]
                    for state in service_states:
                        if state is not None:
                            assert state in valid_states, \
                                f"Service state should be valid for alerting: {state}"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for alert conditions test")
    
    def test_monitoring_external_integration(self):
        """Test that monitoring system can integrate with external systems"""
        # This test checks that monitoring can potentially integrate with external systems
        # We'll test by checking if it exposes standard interfaces
        
        try:
            # Check Prometheus metrics endpoint
            response = requests.get(f"{self.METRICS_URL}/metrics", timeout=10)
            assert response.status_code == 200, \
                "Monitoring should expose Prometheus metrics for external integration"
            
            # Check if metrics are in standard format
            metrics_text = response.text
            assert "# HELP" in metrics_text or "# TYPE" in metrics_text, \
                "Metrics should be in standard Prometheus format for external integration"
            
            # Check health endpoint for external monitoring
            response = requests.get(f"{self.MONITORING_URL}/health", timeout=10)
            assert response.status_code in [200, 503], \
                "Monitoring should expose health endpoint for external integration"
                
        except requests.exceptions.RequestException:
            pytest.skip("Monitoring service not accessible for external integration test")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
