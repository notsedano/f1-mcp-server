"""
Pytest configuration and fixtures for F1 MCP Server tests.
"""

import pytest
import requests
import time
from typing import Dict, Any


@pytest.fixture(scope="session")
def test_config():
    """Test configuration for all tests"""
    return {
        "api_gateway_url": "http://localhost:8080",
        "mcp_server_url": "http://localhost:8000",
        "mcp_bridge_url": "http://localhost:8001",
        "messenger_client_url": "http://localhost:3000",
        "nginx_url": "http://localhost:80",
        "monitoring_url": "http://localhost:3001",
        "metrics_url": "http://localhost:9090",
        "test_api_key": "test-api-key-12345",
        "timeout": 10
    }


@pytest.fixture(scope="session")
def services_ready(test_config):
    """Check if all services are ready before running tests"""
    services = {
        "API Gateway": test_config["api_gateway_url"],
        "MCP Server": test_config["mcp_server_url"],
        "MCP Bridge": test_config["mcp_bridge_url"],
        "Messenger Client": test_config["messenger_client_url"],
        "Nginx": test_config["nginx_url"],
        "Monitoring": test_config["monitoring_url"]
    }
    
    ready_services = []
    failed_services = []
    
    for service_name, url in services.items():
        try:
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 404, 503]:  # 404/503 are ok, means service is running
                ready_services.append(service_name)
            else:
                failed_services.append(f"{service_name} (HTTP {response.status_code})")
        except requests.exceptions.RequestException:
            failed_services.append(f"{service_name} (Connection failed)")
    
    if failed_services:
        pytest.skip(f"Some services not ready: {failed_services}. Ready services: {ready_services}")
    
    return ready_services


@pytest.fixture
def auth_headers(test_config):
    """Authentication headers for API requests"""
    return {
        "X-API-Key": test_config["test_api_key"],
        "Content-Type": "application/json"
    }


@pytest.fixture
def valid_chat_request():
    """Valid chat request payload"""
    return {
        "message": "Hello, can you tell me about the next F1 race?",
        "context": {
            "user_id": "test-user-123",
            "session_id": "test-session-456"
        }
    }


@pytest.fixture
def invalid_chat_request():
    """Invalid chat request payload"""
    return {
        "message": "",  # Empty message should be invalid
        "context": {}
    }


@pytest.fixture
def wait_for_services():
    """Wait for services to be ready before test execution"""
    def _wait_for_service(url, max_wait=30):
        """Wait for a service to be ready"""
        for _ in range(max_wait):
            try:
                response = requests.get(url, timeout=2)
                if response.status_code in [200, 404, 503]:
                    return True
            except requests.exceptions.RequestException:
                pass
            time.sleep(1)
        return False
    
    return _wait_for_service


# Pytest configuration
def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "contract: marks tests as contract tests"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    for item in items:
        # Add slow marker to tests that might take time
        if "integration" in item.nodeid or "deployment" in item.nodeid:
            item.add_marker(pytest.mark.slow)
        
        # Add integration marker
        if "integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        
        # Add contract marker
        if "contract" in item.nodeid:
            item.add_marker(pytest.mark.contract)


# Test session setup and teardown
@pytest.fixture(scope="session", autouse=True)
def test_session_setup():
    """Setup for test session"""
    print("\n" + "="*60)
    print("Starting F1 MCP Server Test Suite")
    print("="*60)
    
    yield
    
    print("\n" + "="*60)
    print("F1 MCP Server Test Suite Completed")
    print("="*60)
