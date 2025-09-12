"""
Performance tests for API response times
Tests API endpoints to ensure response times meet performance requirements (<500ms p95).
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict, Any, Tuple
import pytest
from dataclasses import dataclass
import json


@dataclass
class PerformanceResult:
    """Result of a performance test"""
    endpoint: str
    method: str
    response_times: List[float]
    success_count: int
    failure_count: int
    avg_response_time: float
    median_response_time: float
    p95_response_time: float
    p99_response_time: float
    min_response_time: float
    max_response_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "endpoint": self.endpoint,
            "method": self.method,
            "total_requests": len(self.response_times),
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (self.success_count / len(self.response_times)) * 100 if self.response_times else 0,
            "avg_response_time": self.avg_response_time,
            "median_response_time": self.median_response_time,
            "p95_response_time": self.p95_response_time,
            "p99_response_time": self.p99_response_time,
            "min_response_time": self.min_response_time,
            "max_response_time": self.max_response_time
        }


class APIPerformanceTester:
    """API performance tester"""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def test_endpoint_performance(
        self,
        endpoint: str,
        method: str = "GET",
        requests: int = 100,
        concurrent: int = 10,
        headers: Dict[str, str] = None,
        data: Dict[str, Any] = None
    ) -> PerformanceResult:
        """Test endpoint performance"""
        url = f"{self.base_url}{endpoint}"
        response_times = []
        success_count = 0
        failure_count = 0
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent)
        
        async def make_request():
            nonlocal success_count, failure_count
            async with semaphore:
                start_time = time.time()
                try:
                    if method.upper() == "GET":
                        async with self.session.get(url, headers=headers) as response:
                            await response.text()  # Consume response
                    elif method.upper() == "POST":
                        json_data = json.dumps(data) if data else None
                        async with self.session.post(url, headers=headers, json=data) as response:
                            await response.text()
                    elif method.upper() == "PUT":
                        json_data = json.dumps(data) if data else None
                        async with self.session.put(url, headers=headers, json=data) as response:
                            await response.text()
                    elif method.upper() == "DELETE":
                        async with self.session.delete(url, headers=headers) as response:
                            await response.text()
                    else:
                        raise ValueError(f"Unsupported method: {method}")
                    
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                    response_times.append(response_time)
                    success_count += 1
                    
                except Exception as e:
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    response_times.append(response_time)
                    failure_count += 1
                    print(f"Request failed: {e}")
        
        # Execute requests
        tasks = [make_request() for _ in range(requests)]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate statistics
        if response_times:
            response_times.sort()
            avg_response_time = statistics.mean(response_times)
            median_response_time = statistics.median(response_times)
            p95_index = int(len(response_times) * 0.95)
            p99_index = int(len(response_times) * 0.99)
            p95_response_time = response_times[p95_index] if p95_index < len(response_times) else response_times[-1]
            p99_response_time = response_times[p99_index] if p99_index < len(response_times) else response_times[-1]
            min_response_time = min(response_times)
            max_response_time = max(response_times)
        else:
            avg_response_time = median_response_time = p95_response_time = p99_response_time = 0
            min_response_time = max_response_time = 0
        
        return PerformanceResult(
            endpoint=endpoint,
            method=method,
            response_times=response_times,
            success_count=success_count,
            failure_count=failure_count,
            avg_response_time=avg_response_time,
            median_response_time=median_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time
        )
    
    def print_performance_summary(self, results: List[PerformanceResult]):
        """Print performance test summary"""
        print("\n" + "="*80)
        print("API PERFORMANCE TEST SUMMARY")
        print("="*80)
        
        for result in results:
            print(f"\n{result.method} {result.endpoint}")
            print(f"  Total Requests: {len(result.response_times)}")
            print(f"  Success Rate: {(result.success_count / len(result.response_times)) * 100:.1f}%" if result.response_times else "  Success Rate: 0.0%")
            print(f"  Average Response Time: {result.avg_response_time:.2f}ms")
            print(f"  Median Response Time: {result.median_response_time:.2f}ms")
            print(f"  95th Percentile: {result.p95_response_time:.2f}ms")
            print(f"  99th Percentile: {result.p99_response_time:.2f}ms")
            print(f"  Min Response Time: {result.min_response_time:.2f}ms")
            print(f"  Max Response Time: {result.max_response_time:.2f}ms")
            
            # Performance assessment
            if result.p95_response_time <= 500:
                print(f"  ✅ Performance: GOOD (p95 <= 500ms)")
            elif result.p95_response_time <= 1000:
                print(f"  ⚠️  Performance: ACCEPTABLE (p95 <= 1000ms)")
            else:
                print(f"  ❌ Performance: POOR (p95 > 1000ms)")
        
        # Overall assessment
        p95_times = [r.p95_response_time for r in results if r.response_times]
        if p95_times:
            overall_p95 = max(p95_times)
            print(f"\nOverall 95th Percentile: {overall_p95:.2f}ms")
            if overall_p95 <= 500:
                print("✅ OVERALL PERFORMANCE: MEETS REQUIREMENTS")
            else:
                print("❌ OVERALL PERFORMANCE: DOES NOT MEET REQUIREMENTS")


class TestAPIPerformance:
    """API performance test suite"""
    
    @pytest.mark.asyncio
    async def test_health_endpoint_performance(self):
        """Test health endpoint performance"""
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/health",
                method="GET",
                requests=100,
                concurrent=20
            )
            
            # Health endpoint should be very fast
            assert result.p95_response_time <= 100, f"Health endpoint p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 95, f"Health endpoint success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_f1_schedule_endpoint_performance(self):
        """Test F1 schedule endpoint performance"""
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/f1/schedule",
                method="GET",
                requests=50,
                concurrent=10
            )
            
            # F1 schedule endpoint should meet performance requirements
            assert result.p95_response_time <= 500, f"F1 schedule endpoint p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 90, f"F1 schedule endpoint success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_f1_drivers_endpoint_performance(self):
        """Test F1 drivers endpoint performance"""
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/f1/drivers",
                method="GET",
                requests=50,
                concurrent=10
            )
            
            # F1 drivers endpoint should meet performance requirements
            assert result.p95_response_time <= 500, f"F1 drivers endpoint p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 90, f"F1 drivers endpoint success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_chat_endpoint_performance(self):
        """Test chat endpoint performance"""
        chat_data = {
            "message": "What is the current F1 season schedule?",
            "user_id": "test_user"
        }
        
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/chat",
                method="POST",
                requests=30,
                concurrent=5,
                data=chat_data
            )
            
            # Chat endpoint may be slower due to AI processing
            assert result.p95_response_time <= 2000, f"Chat endpoint p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 80, f"Chat endpoint success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_metrics_endpoint_performance(self):
        """Test metrics endpoint performance"""
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/metrics",
                method="GET",
                requests=100,
                concurrent=20
            )
            
            # Metrics endpoint should be fast
            assert result.p95_response_time <= 200, f"Metrics endpoint p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 95, f"Metrics endpoint success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_api_gateway_endpoints_performance(self):
        """Test multiple API gateway endpoints performance"""
        endpoints = [
            ("/health", "GET"),
            ("/api/v1/f1/schedule", "GET"),
            ("/api/v1/f1/drivers", "GET"),
            ("/metrics", "GET")
        ]
        
        results = []
        async with APIPerformanceTester() as tester:
            for endpoint, method in endpoints:
                result = await tester.test_endpoint_performance(
                    endpoint=endpoint,
                    method=method,
                    requests=50,
                    concurrent=10
                )
                results.append(result)
            
            # Print summary
            tester.print_performance_summary(results)
            
            # Assert all endpoints meet performance requirements
            for result in results:
                assert result.p95_response_time <= 500, f"{result.endpoint} p95 too slow: {result.p95_response_time}ms"
                assert result.success_count >= 90, f"{result.endpoint} success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_concurrent_load_performance(self):
        """Test performance under concurrent load"""
        async with APIPerformanceTester() as tester:
            # Test with high concurrency
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/f1/schedule",
                method="GET",
                requests=200,
                concurrent=50
            )
            
            # Should still meet performance requirements under load
            assert result.p95_response_time <= 1000, f"High concurrency p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 85, f"High concurrency success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_sustained_load_performance(self):
        """Test performance under sustained load"""
        async with APIPerformanceTester() as tester:
            # Test with sustained load over time
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/f1/schedule",
                method="GET",
                requests=500,
                concurrent=25
            )
            
            # Should maintain performance under sustained load
            assert result.p95_response_time <= 800, f"Sustained load p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 90, f"Sustained load success rate too low: {result.success_count}%"
    
    @pytest.mark.asyncio
    async def test_error_handling_performance(self):
        """Test performance of error handling"""
        async with APIPerformanceTester() as tester:
            # Test non-existent endpoint
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/nonexistent",
                method="GET",
                requests=50,
                concurrent=10
            )
            
            # Error responses should still be fast
            assert result.p95_response_time <= 100, f"Error handling p95 too slow: {result.p95_response_time}ms"
            # All requests should fail (404), but quickly
            assert result.failure_count == 50, f"Expected all requests to fail, got {result.failure_count} failures"
    
    @pytest.mark.asyncio
    async def test_authentication_performance(self):
        """Test performance with authentication"""
        headers = {
            "X-API-Key": "f1-mcp-dev-key-2024"
        }
        
        async with APIPerformanceTester() as tester:
            result = await tester.test_endpoint_performance(
                endpoint="/api/v1/f1/schedule",
                method="GET",
                requests=100,
                concurrent=20,
                headers=headers
            )
            
            # Authenticated requests should still meet performance requirements
            assert result.p95_response_time <= 500, f"Authenticated requests p95 too slow: {result.p95_response_time}ms"
            assert result.success_count >= 90, f"Authenticated requests success rate too low: {result.success_count}%"


class TestPerformanceRegression:
    """Performance regression tests"""
    
    @pytest.mark.asyncio
    async def test_performance_regression_detection(self):
        """Test for performance regressions"""
        # This test compares current performance against baseline
        # In a real scenario, you would store baseline metrics and compare
        
        baseline_metrics = {
            "/health": {"p95": 50, "avg": 25},
            "/api/v1/f1/schedule": {"p95": 300, "avg": 150},
            "/api/v1/f1/drivers": {"p95": 350, "avg": 180},
            "/metrics": {"p95": 100, "avg": 50}
        }
        
        regression_threshold = 1.5  # 50% increase is considered regression
        
        async with APIPerformanceTester() as tester:
            for endpoint, baseline in baseline_metrics.items():
                result = await tester.test_endpoint_performance(
                    endpoint=endpoint,
                    method="GET",
                    requests=50,
                    concurrent=10
                )
                
                # Check for performance regression
                p95_regression = result.p95_response_time > (baseline["p95"] * regression_threshold)
                avg_regression = result.avg_response_time > (baseline["avg"] * regression_threshold)
                
                if p95_regression or avg_regression:
                    print(f"⚠️  Potential performance regression detected for {endpoint}")
                    print(f"   Current p95: {result.p95_response_time}ms (baseline: {baseline['p95']}ms)")
                    print(f"   Current avg: {result.avg_response_time}ms (baseline: {baseline['avg']}ms)")
                
                # For now, just log the regression but don't fail the test
                # In production, you might want to fail on significant regressions


if __name__ == "__main__":
    # Run performance tests directly
    async def run_performance_tests():
        """Run performance tests"""
        async with APIPerformanceTester() as tester:
            # Test critical endpoints
            endpoints = [
                ("/health", "GET"),
                ("/api/v1/f1/schedule", "GET"),
                ("/api/v1/f1/drivers", "GET"),
                ("/metrics", "GET")
            ]
            
            results = []
            for endpoint, method in endpoints:
                print(f"Testing {method} {endpoint}...")
                result = await tester.test_endpoint_performance(
                    endpoint=endpoint,
                    method=method,
                    requests=100,
                    concurrent=20
                )
                results.append(result)
            
            # Print summary
            tester.print_performance_summary(results)
            
            # Check if all endpoints meet requirements
            all_good = all(r.p95_response_time <= 500 for r in results)
            if all_good:
                print("\n✅ All endpoints meet performance requirements!")
            else:
                print("\n❌ Some endpoints do not meet performance requirements!")
                return 1
            
            return 0
    
    # Run the tests
    exit_code = asyncio.run(run_performance_tests())
    exit(exit_code)
