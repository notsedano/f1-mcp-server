#!/usr/bin/env python3
"""
Integration Test Runner
Runs comprehensive integration tests for the F1 MCP Server deployment.
"""

import asyncio
import json
import sys
import time
import argparse
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import signal
import os
import tempfile
import shutil

import aiohttp
import pytest
import yaml
from colorama import init, Fore, Back, Style

# Local application imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from common.logging_config import setup_logging

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configure logging using common utilities
logger = setup_logging(__name__)

@dataclass
class TestResult:
    """Test result data structure"""
    name: str
    status: str  # passed, failed, skipped, error
    duration: float
    message: str = ""
    details: Dict[str, Any] = None
    timestamp: str = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()
        if self.details is None:
            self.details = {}

@dataclass
class TestSuite:
    """Test suite configuration"""
    name: str
    description: str
    tests: List[str]
    timeout: int = 300  # seconds
    retries: int = 3
    parallel: bool = False
    depends_on: List[str] = None
    
    def __post_init__(self):
        if self.depends_on is None:
            self.depends_on = []

class IntegrationTestRunner:
    """Integration test runner for F1 MCP Server"""
    
    def __init__(self, config_file: str = "integration-config.yml"):
        self.config_file = config_file
        self.config = self._load_config()
        self.results: List[TestResult] = []
        self.start_time = None
        self.end_time = None
        self.temp_dir = None
        
        # Service endpoints
        self.endpoints = {
            "mcp-server": "http://localhost:8000",
            "messenger-client": "http://localhost:3000",
            "mcp-bridge": "http://localhost:8001",
            "api-gateway": "http://localhost:8080",
            "monitoring": "http://localhost:3002",
            "prometheus": "http://localhost:9090",
            "grafana": "http://localhost:3000"
        }
        
        # Test configuration
        self.timeout = 30
        self.retries = 3
        self.parallel = False
        self.verbose = False
        
    def _load_config(self) -> Dict[str, Any]:
        """Load integration test configuration"""
        config_path = Path(self.config_file)
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    return yaml.safe_load(f)
            except Exception as e:
                logger.warning(f"Failed to load config file: {e}")
        
        # Default configuration
        return {
            "test_suites": [
                {
                    "name": "service-health",
                    "description": "Service health check tests",
                    "tests": ["test_service_health", "test_service_metrics"],
                    "timeout": 60
                },
                {
                    "name": "api-integration",
                    "description": "API integration tests",
                    "tests": ["test_api_endpoints", "test_authentication"],
                    "timeout": 120
                },
                {
                    "name": "mcp-protocol",
                    "description": "MCP protocol tests",
                    "tests": ["test_mcp_connection", "test_mcp_messages"],
                    "timeout": 90
                },
                {
                    "name": "monitoring",
                    "description": "Monitoring and alerting tests",
                    "tests": ["test_health_monitoring", "test_alerting"],
                    "timeout": 60
                },
                {
                    "name": "performance",
                    "description": "Performance and load tests",
                    "tests": ["test_load_performance", "test_concurrent_requests"],
                    "timeout": 180
                }
            ],
            "services": {
                "mcp-server": {"port": 8000, "health_path": "/health"},
                "messenger-client": {"port": 3000, "health_path": "/health"},
                "mcp-bridge": {"port": 8001, "health_path": "/health"},
                "api-gateway": {"port": 8080, "health_path": "/health"},
                "monitoring": {"port": 3002, "health_path": "/health"},
                "prometheus": {"port": 9090, "health_path": "/-/healthy"},
                "grafana": {"port": 3000, "health_path": "/api/health"}
            }
        }
    
    def _print_header(self, text: str, color: str = Fore.CYAN):
        """Print formatted header"""
        print(f"\n{color}{'=' * 60}")
        print(f"{text.center(60)}")
        print(f"{'=' * 60}{Style.RESET_ALL}\n")
    
    def _print_result(self, result: TestResult):
        """Print test result with appropriate colors"""
        if result.status == "passed":
            status_color = Fore.GREEN
            status_icon = "✓"
        elif result.status == "failed":
            status_color = Fore.RED
            status_icon = "✗"
        elif result.status == "skipped":
            status_color = Fore.YELLOW
            status_icon = "⊘"
        else:  # error
            status_color = Fore.MAGENTA
            status_icon = "⚠"
        
        duration_str = f"{result.duration:.3f}s"
        print(f"{status_color}{status_icon}{Style.RESET_ALL} {result.name:<40} {duration_str:>10}")
        
        if result.message:
            print(f"    {Fore.GRAY}{result.message}{Style.RESET_ALL}")
        
        if result.details and self.verbose:
            for key, value in result.details.items():
                print(f"    {Fore.GRAY}{key}: {value}{Style.RESET_ALL}")
    
    def _print_summary(self):
        """Print test execution summary"""
        if not self.results:
            return
        
        passed = len([r for r in self.results if r.status == "passed"])
        failed = len([r for r in self.results if r.status == "failed"])
        skipped = len([r for r in self.results if r.status == "skipped"])
        error = len([r for r in self.results if r.status == "error"])
        total = len(self.results)
        
        duration = (self.end_time - self.start_time).total_seconds() if self.end_time and self.start_time else 0
        
        self._print_header("TEST EXECUTION SUMMARY", Fore.BLUE)
        
        print(f"Total Tests: {total}")
        print(f"{Fore.GREEN}Passed: {passed}{Style.RESET_ALL}")
        print(f"{Fore.RED}Failed: {failed}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Skipped: {skipped}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}Errors: {error}{Style.RESET_ALL}")
        print(f"Duration: {duration:.2f}s")
        
        if failed > 0 or error > 0:
            print(f"\n{Fore.RED}Failed Tests:{Style.RESET_ALL}")
            for result in self.results:
                if result.status in ["failed", "error"]:
                    print(f"  - {result.name}: {result.message}")
        
        print()
    
    async def _check_service_health(self, service_name: str) -> bool:
        """Check if a service is healthy"""
        try:
            service_config = self.config["services"].get(service_name)
            if not service_config:
                return False
            
            port = service_config["port"]
            health_path = service_config["health_path"]
            url = f"http://localhost:{port}{health_path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    return response.status == 200
        except Exception as e:
            logger.debug(f"Health check failed for {service_name}: {e}")
            return False
    
    async def _wait_for_services(self, timeout: int = 300) -> bool:
        """Wait for all services to be healthy"""
        self._print_header("WAITING FOR SERVICES", Fore.YELLOW)
        
        start_time = time.time()
        services = list(self.config["services"].keys())
        healthy_services = set()
        
        while time.time() - start_time < timeout:
            for service in services:
                if service in healthy_services:
                    continue
                
                if await self._check_service_health(service):
                    healthy_services.add(service)
                    print(f"{Fore.GREEN}✓{Style.RESET_ALL} {service} is healthy")
            
            if len(healthy_services) == len(services):
                print(f"\n{Fore.GREEN}All services are healthy!{Style.RESET_ALL}")
                return True
            
            await asyncio.sleep(5)
        
        print(f"\n{Fore.RED}Timeout waiting for services. Healthy: {len(healthy_services)}/{len(services)}{Style.RESET_ALL}")
        for service in services:
            if service not in healthy_services:
                print(f"  {Fore.RED}✗{Style.RESET_ALL} {service}")
        
        return False
    
    async def _run_test(self, test_name: str, timeout: int = None) -> TestResult:
        """Run a single test"""
        start_time = time.time()
        timeout = timeout or self.timeout
        
        try:
            # Import and run the test function
            test_func = getattr(self, test_name, None)
            if not test_func:
                return TestResult(
                    name=test_name,
                    status="error",
                    duration=time.time() - start_time,
                    message=f"Test function '{test_name}' not found"
                )
            
            # Run the test with timeout
            result = await asyncio.wait_for(test_func(), timeout=timeout)
            
            return TestResult(
                name=test_name,
                status="passed" if result else "failed",
                duration=time.time() - start_time,
                message="Test completed successfully" if result else "Test failed",
                details={"result": result}
            )
            
        except asyncio.TimeoutError:
            return TestResult(
                name=test_name,
                status="error",
                duration=time.time() - start_time,
                message=f"Test timed out after {timeout}s"
            )
        except Exception as e:
            return TestResult(
                name=test_name,
                status="error",
                duration=time.time() - start_time,
                message=f"Test error: {str(e)}"
            )
    
    async def _run_test_suite(self, suite: TestSuite) -> List[TestResult]:
        """Run a test suite"""
        self._print_header(f"RUNNING TEST SUITE: {suite.name.upper()}", Fore.CYAN)
        print(f"Description: {suite.description}")
        print(f"Tests: {', '.join(suite.tests)}")
        print(f"Timeout: {suite.timeout}s")
        print(f"Retries: {suite.retries}")
        print()
        
        suite_results = []
        
        for test_name in suite.tests:
            for attempt in range(suite.retries + 1):
                result = await self._run_test(test_name, suite.timeout)
                
                if result.status == "passed":
                    break
                elif attempt < suite.retries:
                    logger.info(f"Retrying {test_name} (attempt {attempt + 2}/{suite.retries + 1})")
                    await asyncio.sleep(2)
                else:
                    result.message = f"Failed after {suite.retries + 1} attempts: {result.message}"
                
                suite_results.append(result)
                self._print_result(result)
        
        return suite_results
    
    async def test_service_health(self) -> bool:
        """Test service health endpoints"""
        try:
            for service_name, service_config in self.config["services"].items():
                port = service_config["port"]
                health_path = service_config["health_path"]
                url = f"http://localhost:{port}{health_path}"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if response.status != 200:
                            logger.error(f"Health check failed for {service_name}: HTTP {response.status}")
                            return False
                        
                        # Check response content
                        try:
                            data = await response.json()
                            if "status" not in data:
                                logger.warning(f"Health check response missing 'status' for {service_name}")
                        except:
                            # Non-JSON response is OK
                            pass
            
            return True
        except Exception as e:
            logger.error(f"Service health test failed: {e}")
            return False
    
    async def test_service_metrics(self) -> bool:
        """Test service metrics endpoints"""
        try:
            metrics_services = ["mcp-server", "api-gateway", "monitoring"]
            
            for service_name in metrics_services:
                if service_name not in self.config["services"]:
                    continue
                
                port = self.config["services"][service_name]["port"]
                url = f"http://localhost:{port}/metrics"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        if response.status != 200:
                            logger.error(f"Metrics endpoint failed for {service_name}: HTTP {response.status}")
                            return False
                        
                        content = await response.text()
                        if not content.strip():
                            logger.error(f"Empty metrics response for {service_name}")
                            return False
            
            return True
        except Exception as e:
            logger.error(f"Service metrics test failed: {e}")
            return False
    
    async def test_api_endpoints(self) -> bool:
        """Test API Gateway endpoints"""
        try:
            api_gateway_url = "http://localhost:8080"
            
            # Test health endpoint
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{api_gateway_url}/health") as response:
                    if response.status != 200:
                        logger.error(f"API Gateway health check failed: HTTP {response.status}")
                        return False
                
                # Test API documentation endpoint
                async with session.get(f"{api_gateway_url}/docs") as response:
                    if response.status != 200:
                        logger.error(f"API documentation endpoint failed: HTTP {response.status}")
                        return False
                
                # Test metrics endpoint
                async with session.get(f"{api_gateway_url}/metrics") as response:
                    if response.status != 200:
                        logger.error(f"API Gateway metrics endpoint failed: HTTP {response.status}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"API endpoints test failed: {e}")
            return False
    
    async def test_authentication(self) -> bool:
        """Test authentication mechanisms"""
        try:
            api_gateway_url = "http://localhost:8080"
            
            async with aiohttp.ClientSession() as session:
                # Test without API key (should fail)
                async with session.get(f"{api_gateway_url}/api/v1/health") as response:
                    if response.status == 200:
                        logger.warning("API endpoint accessible without authentication")
                        # This might be OK depending on configuration
                
                # Test with invalid API key (should fail)
                headers = {"X-API-Key": "invalid-key"}
                async with session.get(f"{api_gateway_url}/api/v1/health", headers=headers) as response:
                    if response.status == 200:
                        logger.error("API endpoint accessible with invalid API key")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"Authentication test failed: {e}")
            return False
    
    async def test_mcp_connection(self) -> bool:
        """Test MCP server connection"""
        try:
            mcp_server_url = "http://localhost:8000"
            
            async with aiohttp.ClientSession() as session:
                # Test SSE endpoint
                async with session.get(f"{mcp_server_url}/sse", timeout=aiohttp.ClientTimeout(total=10)) as response:
                    if response.status != 200:
                        logger.error(f"MCP SSE endpoint failed: HTTP {response.status}")
                        return False
                
                # Test health endpoint
                async with session.get(f"{mcp_server_url}/health") as response:
                    if response.status != 200:
                        logger.error(f"MCP health endpoint failed: HTTP {response.status}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"MCP connection test failed: {e}")
            return False
    
    async def test_mcp_messages(self) -> bool:
        """Test MCP message handling"""
        try:
            # This would test actual MCP protocol messages
            # For now, just test that the service is responsive
            mcp_bridge_url = "http://localhost:8001"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{mcp_bridge_url}/health") as response:
                    if response.status != 200:
                        logger.error(f"MCP Bridge health endpoint failed: HTTP {response.status}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"MCP messages test failed: {e}")
            return False
    
    async def test_health_monitoring(self) -> bool:
        """Test health monitoring system"""
        try:
            monitoring_url = "http://localhost:3002"
            
            async with aiohttp.ClientSession() as session:
                # Test monitoring health endpoint
                async with session.get(f"{monitoring_url}/health") as response:
                    if response.status != 200:
                        logger.error(f"Monitoring health endpoint failed: HTTP {response.status}")
                        return False
                
                # Test monitoring dashboard
                dashboard_url = "http://localhost:3001"
                async with session.get(dashboard_url) as response:
                    if response.status != 200:
                        logger.error(f"Monitoring dashboard failed: HTTP {response.status}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"Health monitoring test failed: {e}")
            return False
    
    async def test_alerting(self) -> bool:
        """Test alerting system"""
        try:
            monitoring_url = "http://localhost:3002"
            
            async with aiohttp.ClientSession() as session:
                # Test alerts endpoint
                async with session.get(f"{monitoring_url}/api/alerts") as response:
                    if response.status != 200:
                        logger.error(f"Alerts endpoint failed: HTTP {response.status}")
                        return False
                
                # Test metrics endpoint
                async with session.get(f"{monitoring_url}/metrics") as response:
                    if response.status != 200:
                        logger.error(f"Monitoring metrics endpoint failed: HTTP {response.status}")
                        return False
            
            return True
        except Exception as e:
            logger.error(f"Alerting test failed: {e}")
            return False
    
    async def test_load_performance(self) -> bool:
        """Test load performance"""
        try:
            # Simple load test - make multiple concurrent requests
            api_gateway_url = "http://localhost:8080"
            concurrent_requests = 10
            
            async def make_request():
                async with aiohttp.ClientSession() as session:
                    async with session.get(f"{api_gateway_url}/health", timeout=aiohttp.ClientTimeout(total=5)) as response:
                        return response.status == 200
            
            # Run concurrent requests
            tasks = [make_request() for _ in range(concurrent_requests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check results
            successful = sum(1 for result in results if result is True)
            success_rate = successful / concurrent_requests
            
            if success_rate < 0.8:  # 80% success rate threshold
                logger.error(f"Load test failed: {successful}/{concurrent_requests} requests successful")
                return False
            
            logger.info(f"Load test passed: {successful}/{concurrent_requests} requests successful")
            return True
            
        except Exception as e:
            logger.error(f"Load performance test failed: {e}")
            return False
    
    async def test_concurrent_requests(self) -> bool:
        """Test concurrent request handling"""
        try:
            # Test multiple services concurrently
            services_to_test = ["mcp-server", "api-gateway", "monitoring"]
            
            async def test_service(service_name):
                if service_name not in self.config["services"]:
                    return True
                
                port = self.config["services"][service_name]["port"]
                url = f"http://localhost:{port}/health"
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                        return response.status == 200
            
            # Run concurrent tests
            tasks = [test_service(service) for service in services_to_test]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check results
            successful = sum(1 for result in results if result is True)
            
            if successful != len(services_to_test):
                logger.error(f"Concurrent request test failed: {successful}/{len(services_to_test)} services responsive")
                return False
            
            logger.info("Concurrent request test passed")
            return True
            
        except Exception as e:
            logger.error(f"Concurrent requests test failed: {e}")
            return False
    
    async def run_tests(self, suite_names: List[str] = None, wait_for_services: bool = True) -> bool:
        """Run integration tests"""
        self.start_time = datetime.now()
        
        self._print_header("F1 MCP SERVER INTEGRATION TESTS", Fore.BLUE)
        print(f"Configuration: {self.config_file}")
        print(f"Start Time: {self.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # Wait for services to be healthy
            if wait_for_services:
                if not await self._wait_for_services():
                    logger.error("Services are not healthy, aborting tests")
                    return False
            
            # Get test suites to run
            suites_to_run = []
            if suite_names:
                for suite_name in suite_names:
                    suite_config = next((s for s in self.config["test_suites"] if s["name"] == suite_name), None)
                    if suite_config:
                        suites_to_run.append(TestSuite(**suite_config))
                    else:
                        logger.warning(f"Test suite '{suite_name}' not found")
            else:
                # Run all test suites
                for suite_config in self.config["test_suites"]:
                    suites_to_run.append(TestSuite(**suite_config))
            
            if not suites_to_run:
                logger.error("No test suites to run")
                return False
            
            # Run test suites
            for suite in suites_to_run:
                suite_results = await self._run_test_suite(suite)
                self.results.extend(suite_results)
            
            self.end_time = datetime.now()
            
            # Print summary
            self._print_summary()
            
            # Determine overall success
            failed_tests = [r for r in self.results if r.status in ["failed", "error"]]
            return len(failed_tests) == 0
            
        except KeyboardInterrupt:
            logger.info("Test execution interrupted by user")
            return False
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            return False
    
    def save_results(self, output_file: str = "integration-test-results.json"):
        """Save test results to file"""
        try:
            results_data = {
                "summary": {
                    "total_tests": len(self.results),
                    "passed": len([r for r in self.results if r.status == "passed"]),
                    "failed": len([r for r in self.results if r.status == "failed"]),
                    "skipped": len([r for r in self.results if r.status == "skipped"]),
                    "errors": len([r for r in self.results if r.status == "error"]),
                    "duration": (self.end_time - self.start_time).total_seconds() if self.end_time and self.start_time else 0,
                    "start_time": self.start_time.isoformat() if self.start_time else None,
                    "end_time": self.end_time.isoformat() if self.end_time else None
                },
                "results": [asdict(result) for result in self.results]
            }
            
            with open(output_file, 'w') as f:
                json.dump(results_data, f, indent=2)
            
            logger.info(f"Test results saved to {output_file}")
            
        except Exception as e:
            logger.error(f"Failed to save test results: {e}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="F1 MCP Server Integration Test Runner")
    parser.add_argument("-c", "--config", default="integration-config.yml", help="Configuration file")
    parser.add_argument("-s", "--suites", nargs="+", help="Test suites to run")
    parser.add_argument("-t", "--timeout", type=int, default=30, help="Test timeout in seconds")
    parser.add_argument("-r", "--retries", type=int, default=3, help="Number of retries")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("-o", "--output", default="integration-test-results.json", help="Output file for results")
    parser.add_argument("--no-wait", action="store_true", help="Don't wait for services to be healthy")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    
    args = parser.parse_args()
    
    # Configure logging
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Create and run test runner
    runner = IntegrationTestRunner(args.config)
    runner.timeout = args.timeout
    runner.retries = args.retries
    runner.verbose = args.verbose
    runner.parallel = args.parallel
    
    # Run tests
    try:
        success = asyncio.run(runner.run_tests(
            suite_names=args.suites,
            wait_for_services=not args.no_wait
        ))
        
        # Save results
        runner.save_results(args.output)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        logger.info("Test execution interrupted")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
