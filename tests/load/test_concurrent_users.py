"""
Load tests for concurrent users
Tests system performance under concurrent user load (100+ users).
"""

import asyncio
import aiohttp
import time
import statistics
import random
from typing import List, Dict, Any, Tuple
import pytest
from dataclasses import dataclass, field
import json
from datetime import datetime, timedelta


@dataclass
class UserSession:
    """Simulates a user session"""
    user_id: str
    session_id: str
    start_time: datetime
    requests_made: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: List[float] = field(default_factory=list)
    endpoints_accessed: List[str] = field(default_factory=list)
    
    def add_request(self, endpoint: str, response_time: float, success: bool):
        """Add a request to the session"""
        self.requests_made += 1
        self.response_times.append(response_time)
        self.endpoints_accessed.append(endpoint)
        
        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
    
    def get_success_rate(self) -> float:
        """Get success rate for this session"""
        if self.requests_made == 0:
            return 0.0
        return (self.successful_requests / self.requests_made) * 100
    
    def get_avg_response_time(self) -> float:
        """Get average response time for this session"""
        if not self.response_times:
            return 0.0
        return statistics.mean(self.response_times)


@dataclass
class LoadTestResult:
    """Result of a load test"""
    test_name: str
    concurrent_users: int
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    p95_response_time: float
    p99_response_time: float
    max_response_time: float
    min_response_time: float
    requests_per_second: float
    error_rate: float
    user_sessions: List[UserSession] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "test_name": self.test_name,
            "concurrent_users": self.concurrent_users,
            "duration_seconds": self.duration_seconds,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (self.successful_requests / self.total_requests) * 100 if self.total_requests > 0 else 0,
            "avg_response_time": self.avg_response_time,
            "p95_response_time": self.p95_response_time,
            "p99_response_time": self.p99_response_time,
            "max_response_time": self.max_response_time,
            "min_response_time": self.min_response_time,
            "requests_per_second": self.requests_per_second,
            "error_rate": self.error_rate
        }


class ConcurrentUserSimulator:
    """Simulates concurrent users making requests"""
    
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
    
    async def simulate_user_session(
        self,
        user_session: UserSession,
        duration_seconds: int = 60,
        request_interval: Tuple[float, float] = (1.0, 5.0)
    ):
        """Simulate a user session"""
        end_time = time.time() + duration_seconds
        
        while time.time() < end_time:
            # Choose a random endpoint to access
            endpoint = self._choose_endpoint()
            
            # Make request
            start_time = time.time()
            try:
                if endpoint == "/api/v1/chat":
                    # Chat endpoint requires POST with data
                    chat_data = {
                        "message": f"Hello from user {user_session.user_id}",
                        "user_id": user_session.user_id
                    }
                    async with self.session.post(
                        f"{self.base_url}{endpoint}",
                        json=chat_data,
                        headers={"X-API-Key": "f1-mcp-dev-key-2024"}
                    ) as response:
                        await response.text()
                elif endpoint.startswith("/api/v1/"):
                    # API endpoints with authentication
                    async with self.session.get(
                        f"{self.base_url}{endpoint}",
                        headers={"X-API-Key": "f1-mcp-dev-key-2024"}
                    ) as response:
                        await response.text()
                else:
                    # Public endpoints
                    async with self.session.get(f"{self.base_url}{endpoint}") as response:
                        await response.text()
                
                response_time = (time.time() - start_time) * 1000
                user_session.add_request(endpoint, response_time, True)
                
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                user_session.add_request(endpoint, response_time, False)
                print(f"Request failed for user {user_session.user_id}: {e}")
            
            # Wait before next request
            wait_time = random.uniform(*request_interval)
            await asyncio.sleep(wait_time)
    
    def _choose_endpoint(self) -> str:
        """Choose a random endpoint based on usage patterns"""
        # Weighted random selection based on typical user behavior
        endpoints = [
            ("/health", 0.05),  # 5% - health checks
            ("/api/v1/f1/schedule", 0.25),  # 25% - F1 schedule
            ("/api/v1/f1/drivers", 0.20),  # 20% - F1 drivers
            ("/api/v1/f1/events", 0.15),  # 15% - F1 events
            ("/api/v1/chat", 0.20),  # 20% - chat
            ("/metrics", 0.05),  # 5% - metrics
            ("/", 0.10),  # 10% - frontend
        ]
        
        rand = random.random()
        cumulative = 0.0
        
        for endpoint, weight in endpoints:
            cumulative += weight
            if rand <= cumulative:
                return endpoint
        
        return "/health"  # Fallback
    
    async def run_load_test(
        self,
        concurrent_users: int,
        duration_seconds: int = 60,
        request_interval: Tuple[float, float] = (1.0, 5.0)
    ) -> LoadTestResult:
        """Run a load test with concurrent users"""
        print(f"Starting load test with {concurrent_users} concurrent users for {duration_seconds} seconds...")
        
        # Create user sessions
        user_sessions = []
        for i in range(concurrent_users):
            session = UserSession(
                user_id=f"user_{i:03d}",
                session_id=f"session_{i:03d}_{int(time.time())}",
                start_time=datetime.now()
            )
            user_sessions.append(session)
        
        # Start all user sessions concurrently
        start_time = time.time()
        tasks = [
            self.simulate_user_session(session, duration_seconds, request_interval)
            for session in user_sessions
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        # Collect results
        all_response_times = []
        total_requests = 0
        successful_requests = 0
        failed_requests = 0
        
        for session in user_sessions:
            all_response_times.extend(session.response_times)
            total_requests += session.requests_made
            successful_requests += session.successful_requests
            failed_requests += session.failed_requests
        
        # Calculate statistics
        if all_response_times:
            all_response_times.sort()
            avg_response_time = statistics.mean(all_response_times)
            p95_index = int(len(all_response_times) * 0.95)
            p99_index = int(len(all_response_times) * 0.99)
            p95_response_time = all_response_times[p95_index] if p95_index < len(all_response_times) else all_response_times[-1]
            p99_response_time = all_response_times[p99_index] if p99_index < len(all_response_times) else all_response_times[-1]
            max_response_time = max(all_response_times)
            min_response_time = min(all_response_times)
        else:
            avg_response_time = p95_response_time = p99_response_time = 0
            max_response_time = min_response_time = 0
        
        duration = end_time - start_time
        requests_per_second = total_requests / duration if duration > 0 else 0
        error_rate = (failed_requests / total_requests) * 100 if total_requests > 0 else 0
        
        return LoadTestResult(
            test_name=f"Load Test - {concurrent_users} Users",
            concurrent_users=concurrent_users,
            duration_seconds=duration,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            max_response_time=max_response_time,
            min_response_time=min_response_time,
            requests_per_second=requests_per_second,
            error_rate=error_rate,
            user_sessions=user_sessions
        )
    
    def print_load_test_results(self, results: List[LoadTestResult]):
        """Print load test results"""
        print("\n" + "="*80)
        print("CONCURRENT USER LOAD TEST RESULTS")
        print("="*80)
        
        for result in results:
            print(f"\n{result.test_name}")
            print(f"  Duration: {result.duration_seconds:.2f} seconds")
            print(f"  Total Requests: {result.total_requests}")
            print(f"  Successful Requests: {result.successful_requests}")
            print(f"  Failed Requests: {result.failed_requests}")
            print(f"  Success Rate: {(result.successful_requests / result.total_requests) * 100:.1f}%" if result.total_requests > 0 else "  Success Rate: 0.0%")
            print(f"  Requests/Second: {result.requests_per_second:.2f}")
            print(f"  Error Rate: {result.error_rate:.1f}%")
            print(f"  Average Response Time: {result.avg_response_time:.2f}ms")
            print(f"  95th Percentile: {result.p95_response_time:.2f}ms")
            print(f"  99th Percentile: {result.p99_response_time:.2f}ms")
            print(f"  Min Response Time: {result.min_response_time:.2f}ms")
            print(f"  Max Response Time: {result.max_response_time:.2f}ms")
            
            # Performance assessment
            if result.error_rate <= 5 and result.p95_response_time <= 1000:
                print(f"  ✅ Load Test: PASSED")
            elif result.error_rate <= 10 and result.p95_response_time <= 2000:
                print(f"  ⚠️  Load Test: MARGINAL")
            else:
                print(f"  ❌ Load Test: FAILED")


class TestConcurrentUsers:
    """Concurrent user load tests"""
    
    @pytest.mark.asyncio
    async def test_10_concurrent_users(self):
        """Test with 10 concurrent users"""
        async with ConcurrentUserSimulator() as simulator:
            result = await simulator.run_load_test(
                concurrent_users=10,
                duration_seconds=30,
                request_interval=(1.0, 3.0)
            )
            
            # With 10 users, system should handle load well
            assert result.error_rate <= 5, f"Error rate too high with 10 users: {result.error_rate}%"
            assert result.p95_response_time <= 1000, f"Response time too slow with 10 users: {result.p95_response_time}ms"
            assert result.successful_requests >= result.total_requests * 0.95, "Success rate too low with 10 users"
    
    @pytest.mark.asyncio
    async def test_50_concurrent_users(self):
        """Test with 50 concurrent users"""
        async with ConcurrentUserSimulator() as simulator:
            result = await simulator.run_load_test(
                concurrent_users=50,
                duration_seconds=60,
                request_interval=(1.0, 4.0)
            )
            
            # With 50 users, system should still handle load reasonably
            assert result.error_rate <= 10, f"Error rate too high with 50 users: {result.error_rate}%"
            assert result.p95_response_time <= 2000, f"Response time too slow with 50 users: {result.p95_response_time}ms"
            assert result.successful_requests >= result.total_requests * 0.90, "Success rate too low with 50 users"
    
    @pytest.mark.asyncio
    async def test_100_concurrent_users(self):
        """Test with 100 concurrent users"""
        async with ConcurrentUserSimulator() as simulator:
            result = await simulator.run_load_test(
                concurrent_users=100,
                duration_seconds=120,
                request_interval=(2.0, 6.0)
            )
            
            # With 100 users, system may show some degradation but should remain functional
            assert result.error_rate <= 15, f"Error rate too high with 100 users: {result.error_rate}%"
            assert result.p95_response_time <= 3000, f"Response time too slow with 100 users: {result.p95_response_time}ms"
            assert result.successful_requests >= result.total_requests * 0.85, "Success rate too low with 100 users"
    
    @pytest.mark.asyncio
    async def test_200_concurrent_users_stress(self):
        """Stress test with 200 concurrent users"""
        async with ConcurrentUserSimulator() as simulator:
            result = await simulator.run_load_test(
                concurrent_users=200,
                duration_seconds=180,
                request_interval=(3.0, 8.0)
            )
            
            # Stress test - system may degrade but should not completely fail
            assert result.error_rate <= 25, f"Error rate too high with 200 users: {result.error_rate}%"
            assert result.p95_response_time <= 5000, f"Response time too slow with 200 users: {result.p95_response_time}ms"
            assert result.successful_requests >= result.total_requests * 0.75, "Success rate too low with 200 users"
    
    @pytest.mark.asyncio
    async def test_concurrent_user_scaling(self):
        """Test scaling with different user loads"""
        user_counts = [10, 25, 50, 75, 100]
        results = []
        
        async with ConcurrentUserSimulator() as simulator:
            for user_count in user_counts:
                print(f"Testing with {user_count} concurrent users...")
                result = await simulator.run_load_test(
                    concurrent_users=user_count,
                    duration_seconds=60,
                    request_interval=(1.5, 4.0)
                )
                results.append(result)
                
                # Wait between tests to let system recover
                await asyncio.sleep(10)
        
        # Print scaling results
        simulator.print_load_test_results(results)
        
        # Verify scaling characteristics
        for i, result in enumerate(results):
            user_count = user_counts[i]
            
            # Error rate should not increase dramatically with user count
            max_acceptable_error_rate = 5 + (user_count / 10)  # Allow higher error rate with more users
            assert result.error_rate <= max_acceptable_error_rate, \
                f"Error rate {result.error_rate}% too high for {user_count} users (max: {max_acceptable_error_rate}%)"
            
            # Response time should not degrade too much
            max_acceptable_response_time = 500 + (user_count * 10)  # Allow higher response time with more users
            assert result.p95_response_time <= max_acceptable_response_time, \
                f"Response time {result.p95_response_time}ms too slow for {user_count} users (max: {max_acceptable_response_time}ms)"
    
    @pytest.mark.asyncio
    async def test_burst_load(self):
        """Test system response to burst load"""
        async with ConcurrentUserSimulator() as simulator:
            # Start with normal load
            print("Starting with 10 users...")
            normal_result = await simulator.run_load_test(
                concurrent_users=10,
                duration_seconds=30,
                request_interval=(2.0, 4.0)
            )
            
            # Wait for system to stabilize
            await asyncio.sleep(5)
            
            # Sudden burst to 100 users
            print("Bursting to 100 users...")
            burst_result = await simulator.run_load_test(
                concurrent_users=100,
                duration_seconds=60,
                request_interval=(0.5, 2.0)  # Faster requests during burst
            )
            
            # System should handle burst reasonably
            assert burst_result.error_rate <= 20, f"Burst load error rate too high: {burst_result.error_rate}%"
            assert burst_result.p95_response_time <= 4000, f"Burst load response time too slow: {burst_result.p95_response_time}ms"
            
            print(f"Normal load (10 users): {normal_result.avg_response_time:.2f}ms avg, {normal_result.p95_response_time:.2f}ms p95")
            print(f"Burst load (100 users): {burst_result.avg_response_time:.2f}ms avg, {burst_result.p95_response_time:.2f}ms p95")
    
    @pytest.mark.asyncio
    async def test_sustained_high_load(self):
        """Test system under sustained high load"""
        async with ConcurrentUserSimulator() as simulator:
            result = await simulator.run_load_test(
                concurrent_users=75,
                duration_seconds=300,  # 5 minutes
                request_interval=(1.0, 3.0)
            )
            
            # System should maintain performance under sustained load
            assert result.error_rate <= 15, f"Sustained load error rate too high: {result.error_rate}%"
            assert result.p95_response_time <= 2500, f"Sustained load response time too slow: {result.p95_response_time}ms"
            assert result.requests_per_second >= 10, f"Throughput too low: {result.requests_per_second} req/s"
    
    @pytest.mark.asyncio
    async def test_mixed_workload_patterns(self):
        """Test with mixed workload patterns"""
        async with ConcurrentUserSimulator() as simulator:
            # Simulate different user types with different request patterns
            results = []
            
            # Light users (few requests)
            light_users = await simulator.run_load_test(
                concurrent_users=30,
                duration_seconds=60,
                request_interval=(5.0, 10.0)
            )
            results.append(light_users)
            
            # Medium users (normal requests)
            medium_users = await simulator.run_load_test(
                concurrent_users=40,
                duration_seconds=60,
                request_interval=(2.0, 5.0)
            )
            results.append(medium_users)
            
            # Heavy users (many requests)
            heavy_users = await simulator.run_load_test(
                concurrent_users=30,
                duration_seconds=60,
                request_interval=(0.5, 2.0)
            )
            results.append(heavy_users)
            
            # Combined results
            total_requests = sum(r.total_requests for r in results)
            total_successful = sum(r.successful_requests for r in results)
            combined_error_rate = ((total_requests - total_successful) / total_requests) * 100 if total_requests > 0 else 0
            
            # System should handle mixed workloads
            assert combined_error_rate <= 15, f"Mixed workload error rate too high: {combined_error_rate}%"
            
            for result in results:
                assert result.p95_response_time <= 3000, f"Response time too slow in mixed workload: {result.p95_response_time}ms"


if __name__ == "__main__":
    # Run load tests directly
    async def run_load_tests():
        """Run load tests"""
        async with ConcurrentUserSimulator() as simulator:
            # Test different user loads
            test_configs = [
                (10, 30, "Light Load Test"),
                (50, 60, "Medium Load Test"),
                (100, 120, "Heavy Load Test"),
            ]
            
            results = []
            for users, duration, test_name in test_configs:
                print(f"\nRunning {test_name} with {users} users for {duration} seconds...")
                result = await simulator.run_load_test(
                    concurrent_users=users,
                    duration_seconds=duration,
                    request_interval=(1.0, 4.0)
                )
                results.append(result)
                
                # Wait between tests
                await asyncio.sleep(10)
            
            # Print summary
            simulator.print_load_test_results(results)
            
            # Check overall results
            all_passed = all(
                r.error_rate <= 15 and r.p95_response_time <= 3000 
                for r in results
            )
            
            if all_passed:
                print("\n✅ All load tests passed!")
                return 0
            else:
                print("\n❌ Some load tests failed!")
                return 1
    
    # Run the tests
    exit_code = asyncio.run(run_load_tests())
    exit(exit_code)
