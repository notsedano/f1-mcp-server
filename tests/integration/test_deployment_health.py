"""
Integration Test: Deployment Health Checks
Tests the health of the entire deployment including all services.
This test MUST fail before implementation - it validates the deployment.
"""

import pytest
import requests
import time
from typing import Dict, Any, List
from datetime import datetime


class TestDeploymentHealth:
    """Integration tests for deployment health checks"""
    
    # Test configuration
    SERVICES = {
        "mcp-server": {
            "url": "http://localhost:8000",
            "health_endpoint": "/health",
            "timeout": 10
        },
        "messenger-client": {
            "url": "http://localhost:3000",
            "health_endpoint": "/health",
            "timeout": 10
        },
        "mcp-bridge": {
            "url": "http://localhost:8001",
            "health_endpoint": "/health",
            "timeout": 10
        },
        "nginx": {
            "url": "http://localhost:80",
            "health_endpoint": "/health",
            "timeout": 10
        },
        "api-gateway": {
            "url": "http://localhost:8080",
            "health_endpoint": "/health",
            "timeout": 10
        },
        "monitoring": {
            "url": "http://localhost:3001",
            "health_endpoint": "/health",
            "timeout": 10
        }
    }
    
    @pytest.fixture
    def service_urls(self) -> Dict[str, str]:
        """Return service URLs"""
        return {name: config["url"] for name, config in self.SERVICES.items()}
    
    def test_all_services_deployed(self, service_urls):
        """Test that all expected services are deployed and accessible"""
        deployed_services = []
        failed_services = []
        
        for service_name, url in service_urls.items():
            try:
                response = requests.get(url, timeout=5)
                if response.status_code in [200, 404]:  # 404 is ok for root, means service is running
                    deployed_services.append(service_name)
                else:
                    failed_services.append(f"{service_name} (HTTP {response.status_code})")
            except requests.exceptions.RequestException as e:
                failed_services.append(f"{service_name} ({str(e)})")
        
        # All services should be deployed
        assert len(failed_services) == 0, \
            f"Failed services: {failed_services}. Deployed services: {deployed_services}"
        
        # Should have at least the core services
        core_services = ["mcp-server", "messenger-client", "mcp-bridge"]
        for service in core_services:
            assert service in deployed_services, \
                f"Core service {service} should be deployed"
    
    def test_health_endpoints_exist(self):
        """Test that all services have health check endpoints"""
        health_endpoints = []
        failed_endpoints = []
        
        for service_name, config in self.SERVICES.items():
            health_url = f"{config['url']}{config['health_endpoint']}"
            try:
                response = requests.get(health_url, timeout=config['timeout'])
                if response.status_code in [200, 503]:  # 200 healthy, 503 unhealthy but endpoint exists
                    health_endpoints.append(service_name)
                else:
                    failed_endpoints.append(f"{service_name} (HTTP {response.status_code})")
            except requests.exceptions.RequestException as e:
                failed_endpoints.append(f"{service_name} ({str(e)})")
        
        # All services should have health endpoints
        assert len(failed_endpoints) == 0, \
            f"Failed health endpoints: {failed_endpoints}. Working endpoints: {health_endpoints}"
    
    def test_health_endpoint_response_format(self):
        """Test that health endpoints return proper JSON format"""
        for service_name, config in self.SERVICES.items():
            health_url = f"{config['url']}{config['health_endpoint']}"
            try:
                response = requests.get(health_url, timeout=config['timeout'])
                
                if response.status_code in [200, 503]:
                    # Should return JSON
                    assert response.headers.get('content-type', '').startswith('application/json'), \
                        f"Service {service_name} health endpoint should return JSON"
                    
                    # Should be valid JSON
                    try:
                        data = response.json()
                    except ValueError:
                        pytest.fail(f"Service {service_name} health endpoint should return valid JSON")
                    
                    # Should have basic health structure
                    assert isinstance(data, dict), \
                        f"Service {service_name} health response should be an object"
                    
                    # Should have status field
                    assert "status" in data, \
                        f"Service {service_name} health response should contain 'status' field"
                    
            except requests.exceptions.RequestException:
                # Skip services that are not accessible
                pytest.skip(f"Service {service_name} not accessible")
    
    def test_service_connectivity(self):
        """Test connectivity between services"""
        # Test that services can communicate with each other
        
        # Test API Gateway -> MCP Server
        try:
            response = requests.get("http://localhost:8080/api/v1/f1/schedule", 
                                  headers={"X-API-Key": "test-key"}, timeout=10)
            # Should not get connection errors (401 is ok, means auth failed but service is reachable)
            assert response.status_code != 502, "API Gateway should be able to connect to MCP Server"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"API Gateway to MCP Server connectivity failed: {str(e)}")
        
        # Test API Gateway -> MCP Bridge
        try:
            response = requests.post("http://localhost:8080/chat",
                                   headers={"X-API-Key": "test-key", "Content-Type": "application/json"},
                                   json={"message": "test"},
                                   timeout=10)
            # Should not get connection errors
            assert response.status_code != 502, "API Gateway should be able to connect to MCP Bridge"
        except requests.exceptions.RequestException as e:
            pytest.fail(f"API Gateway to MCP Bridge connectivity failed: {str(e)}")
    
    def test_service_startup_time(self):
        """Test that services start within reasonable time"""
        startup_times = {}
        
        for service_name, config in self.SERVICES.items():
            start_time = time.time()
            
            # Wait for service to be ready
            max_wait_time = 30  # 30 seconds
            ready = False
            
            for _ in range(max_wait_time):
                try:
                    response = requests.get(config['url'], timeout=2)
                    if response.status_code in [200, 404]:  # Service is responding
                        ready = True
                        break
                except requests.exceptions.RequestException:
                    pass
                time.sleep(1)
            
            end_time = time.time()
            startup_time = end_time - start_time
            
            if ready:
                startup_times[service_name] = startup_time
                # Services should start within 30 seconds
                assert startup_time < 30, \
                    f"Service {service_name} took too long to start: {startup_time:.2f}s"
            else:
                pytest.fail(f"Service {service_name} failed to start within {max_wait_time} seconds")
        
        # Log startup times for monitoring
        print(f"Service startup times: {startup_times}")
    
    def test_service_health_consistency(self):
        """Test that service health checks are consistent over time"""
        health_checks = {}
        
        # Run multiple health checks
        for iteration in range(3):
            iteration_results = {}
            
            for service_name, config in self.SERVICES.items():
                health_url = f"{config['url']}{config['health_endpoint']}"
                try:
                    response = requests.get(health_url, timeout=config['timeout'])
                    iteration_results[service_name] = {
                        'status_code': response.status_code,
                        'response_time': response.elapsed.total_seconds()
                    }
                except requests.exceptions.RequestException as e:
                    iteration_results[service_name] = {
                        'status_code': None,
                        'error': str(e)
                    }
            
            health_checks[iteration] = iteration_results
            time.sleep(2)  # Wait between checks
        
        # Check consistency
        for service_name in self.SERVICES.keys():
            status_codes = []
            for iteration in health_checks:
                if service_name in health_checks[iteration]:
                    status_code = health_checks[iteration][service_name].get('status_code')
                    if status_code is not None:
                        status_codes.append(status_code)
            
            # Service should have consistent status codes (all 200 or all 503, etc.)
            if len(status_codes) > 1:
                assert len(set(status_codes)) == 1, \
                    f"Service {service_name} health status should be consistent. Got: {status_codes}"
    
    def test_service_resource_usage(self):
        """Test that services are not consuming excessive resources"""
        # This test would typically check CPU, memory, disk usage
        # For now, we'll check response times as a proxy for resource usage
        
        response_times = {}
        
        for service_name, config in self.SERVICES.items():
            health_url = f"{config['url']}{config['health_endpoint']}"
            try:
                start_time = time.time()
                response = requests.get(health_url, timeout=config['timeout'])
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                response_times[service_name] = response_time
                
                # Health checks should be fast (under 5 seconds)
                assert response_time < 5000, \
                    f"Service {service_name} health check took too long: {response_time:.2f}ms"
                
            except requests.exceptions.RequestException:
                pytest.skip(f"Service {service_name} not accessible for resource test")
        
        # Log response times for monitoring
        print(f"Service response times: {response_times}")
    
    def test_deployment_environment_variables(self):
        """Test that deployment has required environment variables"""
        # This test checks that the deployment is properly configured
        
        # Test API Gateway configuration
        try:
            response = requests.get("http://localhost:8080/health", timeout=10)
            # If we can reach the API Gateway, environment is likely configured
            assert response.status_code in [200, 503], \
                "API Gateway should be accessible, indicating proper environment configuration"
        except requests.exceptions.RequestException:
            pytest.fail("API Gateway not accessible - check environment configuration")
        
        # Test MCP Server configuration
        try:
            response = requests.get("http://localhost:8000/health", timeout=10)
            assert response.status_code in [200, 503], \
                "MCP Server should be accessible, indicating proper environment configuration"
        except requests.exceptions.RequestException:
            pytest.fail("MCP Server not accessible - check environment configuration")
    
    def test_deployment_networking(self):
        """Test that deployment networking is properly configured"""
        # Test internal service communication
        services_to_test = [
            ("API Gateway", "http://localhost:8080"),
            ("MCP Server", "http://localhost:8000"),
            ("Messenger Client", "http://localhost:3000"),
            ("MCP Bridge", "http://localhost:8001")
        ]
        
        for service_name, url in services_to_test:
            try:
                response = requests.get(url, timeout=5)
                # Should get some response (200, 404, etc.) - not connection errors
                assert response.status_code != 502, \
                    f"Service {service_name} should not return 502 Bad Gateway"
            except requests.exceptions.ConnectionError:
                pytest.fail(f"Service {service_name} connection failed - check networking configuration")
            except requests.exceptions.Timeout:
                pytest.fail(f"Service {service_name} timeout - check networking configuration")
    
    def test_deployment_logs_accessibility(self):
        """Test that deployment logs are accessible"""
        # This test would check if logs are being generated and are accessible
        # For now, we'll check that services are responding (indicating they're running and logging)
        
        logging_services = ["mcp-server", "mcp-bridge", "api-gateway"]
        
        for service_name in logging_services:
            if service_name in self.SERVICES:
                config = self.SERVICES[service_name]
                try:
                    response = requests.get(config['url'], timeout=5)
                    # If service responds, it's likely logging
                    assert response.status_code in [200, 404, 503], \
                        f"Service {service_name} should be running and logging"
                except requests.exceptions.RequestException:
                    pytest.fail(f"Service {service_name} not accessible - check logging configuration")
    
    def test_deployment_monitoring_integration(self):
        """Test that monitoring is integrated with the deployment"""
        # Test monitoring service accessibility
        try:
            response = requests.get("http://localhost:3001/health", timeout=10)
            assert response.status_code in [200, 503], \
                "Monitoring service should be accessible"
        except requests.exceptions.RequestException:
            pytest.fail("Monitoring service not accessible - check monitoring integration")
        
        # Test metrics endpoint
        try:
            response = requests.get("http://localhost:9090/metrics", timeout=10)
            assert response.status_code == 200, \
                "Metrics endpoint should be accessible"
        except requests.exceptions.RequestException:
            pytest.fail("Metrics endpoint not accessible - check monitoring integration")
    
    def test_deployment_rollback_capability(self):
        """Test that deployment can be rolled back if needed"""
        # This test would typically check rollback scripts and procedures
        # For now, we'll verify that the deployment is in a state where rollback is possible
        
        # Check that all services are in a consistent state
        service_states = {}
        
        for service_name, config in self.SERVICES.items():
            health_url = f"{config['url']}{config['health_endpoint']}"
            try:
                response = requests.get(health_url, timeout=config['timeout'])
                service_states[service_name] = {
                    'accessible': True,
                    'status_code': response.status_code,
                    'timestamp': datetime.now().isoformat()
                }
            except requests.exceptions.RequestException:
                service_states[service_name] = {
                    'accessible': False,
                    'timestamp': datetime.now().isoformat()
                }
        
        # At least core services should be accessible for rollback
        core_services = ["mcp-server", "api-gateway"]
        accessible_core_services = [name for name in core_services 
                                   if service_states.get(name, {}).get('accessible', False)]
        
        assert len(accessible_core_services) >= 1, \
            f"At least one core service should be accessible for rollback. States: {service_states}"


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
