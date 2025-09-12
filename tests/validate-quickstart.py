#!/usr/bin/env python3
"""
Quickstart Validation Script
Validates the scenarios described in quickstart.md to ensure the deployment works correctly.
"""

import asyncio
import json
import sys
import time
import argparse
import aiohttp
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Local application imports
sys.path.append(str(Path(__file__).parent.parent / 'src'))
from common.logging_config import setup_logging

# Configure logging
logger = setup_logging(__name__)


@dataclass
class ValidationResult:
    """Result of a validation scenario"""
    scenario: str
    status: str  # passed, failed, skipped
    duration: float
    message: str = ""
    details: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}


class QuickstartValidator:
    """Validates quickstart scenarios"""
    
    def __init__(self, base_url: str = "http://localhost", api_key: str = "f1-mcp-dev-key-2024"):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def validate_scenario_1_health_check(self) -> ValidationResult:
        """Validate Scenario 1: Health Check Validation"""
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                duration = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    required_fields = ["status", "timestamp", "services"]
                    if all(field in data for field in required_fields):
                        if data["status"] == "healthy":
                            return ValidationResult(
                                scenario="Health Check Validation",
                                status="passed",
                                duration=duration,
                                message="Health endpoint returned healthy status",
                                details={"response_time_ms": duration * 1000, "data": data}
                            )
                        else:
                            return ValidationResult(
                                scenario="Health Check Validation",
                                status="failed",
                                duration=duration,
                                message=f"Health status is {data['status']}, expected 'healthy'",
                                details={"data": data}
                            )
                    else:
                        return ValidationResult(
                            scenario="Health Check Validation",
                            status="failed",
                            duration=duration,
                            message=f"Missing required fields: {required_fields}",
                            details={"data": data}
                        )
                else:
                    return ValidationResult(
                        scenario="Health Check Validation",
                        status="failed",
                        duration=duration,
                        message=f"HTTP {response.status}: {await response.text()}",
                        details={"status_code": response.status}
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ValidationResult(
                scenario="Health Check Validation",
                status="failed",
                duration=duration,
                message=f"Exception: {str(e)}",
                details={"exception": str(e)}
            )
    
    async def validate_scenario_2_chat_api(self) -> ValidationResult:
        """Validate Scenario 2: Chat API Functionality"""
        start_time = time.time()
        
        try:
            headers = {
                "X-API-Key": self.api_key,
                "Content-Type": "application/json"
            }
            payload = {"message": "Tell me about the next F1 race"}
            
            async with self.session.post(
                f"{self.base_url}/chat", 
                headers=headers, 
                json=payload
            ) as response:
                duration = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    if "response" in data and isinstance(data["response"], str):
                        if len(data["response"]) > 0:
                            return ValidationResult(
                                scenario="Chat API Functionality",
                                status="passed",
                                duration=duration,
                                message="Chat API returned valid response",
                                details={
                                    "response_length": len(data["response"]),
                                    "processing_time_ms": duration * 1000,
                                    "response_preview": data["response"][:100] + "..." if len(data["response"]) > 100 else data["response"]
                                }
                            )
                        else:
                            return ValidationResult(
                                scenario="Chat API Functionality",
                                status="failed",
                                duration=duration,
                                message="Chat API returned empty response",
                                details={"data": data}
                            )
                    else:
                        return ValidationResult(
                            scenario="Chat API Functionality",
                            status="failed",
                            duration=duration,
                            message="Invalid response structure",
                            details={"data": data}
                        )
                else:
                    error_text = await response.text()
                    return ValidationResult(
                        scenario="Chat API Functionality",
                        status="failed",
                        duration=duration,
                        message=f"HTTP {response.status}: {error_text}",
                        details={"status_code": response.status, "error": error_text}
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ValidationResult(
                scenario="Chat API Functionality",
                status="failed",
                duration=duration,
                message=f"Exception: {str(e)}",
                details={"exception": str(e)}
            )
    
    async def validate_scenario_3_f1_data_api(self) -> ValidationResult:
        """Validate Scenario 3: F1 Data API"""
        start_time = time.time()
        
        try:
            headers = {"X-API-Key": self.api_key}
            params = {"year": 2024}
            
            async with self.session.get(
                f"{self.base_url}/f1/schedule", 
                headers=headers, 
                params=params
            ) as response:
                duration = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate response structure
                    if "year" in data and "events" in data:
                        if data["year"] == 2024 and isinstance(data["events"], list):
                            event_count = len(data["events"])
                            return ValidationResult(
                                scenario="F1 Data API",
                                status="passed",
                                duration=duration,
                                message=f"F1 schedule API returned {event_count} events for 2024",
                                details={
                                    "year": data["year"],
                                    "event_count": event_count,
                                    "response_time_ms": duration * 1000
                                }
                            )
                        else:
                            return ValidationResult(
                                scenario="F1 Data API",
                                status="failed",
                                duration=duration,
                                message="Invalid year or events format",
                                details={"data": data}
                            )
                    else:
                        return ValidationResult(
                            scenario="F1 Data API",
                            status="failed",
                            duration=duration,
                            message="Missing required fields: year, events",
                            details={"data": data}
                        )
                else:
                    error_text = await response.text()
                    return ValidationResult(
                        scenario="F1 Data API",
                        status="failed",
                        duration=duration,
                        message=f"HTTP {response.status}: {error_text}",
                        details={"status_code": response.status, "error": error_text}
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ValidationResult(
                scenario="F1 Data API",
                status="failed",
                duration=duration,
                message=f"Exception: {str(e)}",
                details={"exception": str(e)}
            )
    
    async def validate_scenario_4_error_handling(self) -> ValidationResult:
        """Validate Scenario 4: Error Handling"""
        start_time = time.time()
        
        try:
            headers = {"Content-Type": "application/json"}
            payload = {"message": "test"}
            
            async with self.session.post(
                f"{self.base_url}/chat", 
                headers=headers, 
                json=payload
            ) as response:
                duration = time.time() - start_time
                
                if response.status == 401:
                    data = await response.json()
                    
                    if "error" in data and data["error"] == "unauthorized":
                        return ValidationResult(
                            scenario="Error Handling",
                            status="passed",
                            duration=duration,
                            message="Properly rejected request without API key",
                            details={"status_code": response.status, "data": data}
                        )
                    else:
                        return ValidationResult(
                            scenario="Error Handling",
                            status="failed",
                            duration=duration,
                            message="Wrong error type returned",
                            details={"data": data}
                        )
                else:
                    error_text = await response.text()
                    return ValidationResult(
                        scenario="Error Handling",
                        status="failed",
                        duration=duration,
                        message=f"Expected 401, got {response.status}: {error_text}",
                        details={"status_code": response.status, "error": error_text}
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ValidationResult(
                scenario="Error Handling",
                status="failed",
                duration=duration,
                message=f"Exception: {str(e)}",
                details={"exception": str(e)}
            )
    
    async def validate_scenario_5_rate_limiting(self) -> ValidationResult:
        """Validate Scenario 5: Rate Limiting"""
        start_time = time.time()
        
        try:
            headers = {
                "X-API-Key": self.api_key,
                "Content-Type": "application/json"
            }
            
            # Make multiple rapid requests
            rate_limit_hit = False
            request_count = 0
            
            for i in range(10):
                payload = {"message": f"test {i+1}"}
                
                async with self.session.post(
                    f"{self.base_url}/chat", 
                    headers=headers, 
                    json=payload
                ) as response:
                    request_count += 1
                    
                    if response.status == 429:  # Rate limit exceeded
                        rate_limit_hit = True
                        data = await response.json()
                        
                        if "error" in data and "rate_limit" in data["error"]:
                            duration = time.time() - start_time
                            return ValidationResult(
                                scenario="Rate Limiting",
                                status="passed",
                                duration=duration,
                                message=f"Rate limiting triggered after {request_count} requests",
                                details={
                                    "requests_made": request_count,
                                    "status_code": response.status,
                                    "data": data
                                }
                            )
                        break
                    elif response.status != 200:
                        # If we get an error that's not rate limiting, break
                        break
                
                # Small delay to avoid overwhelming the server
                await asyncio.sleep(0.1)
            
            duration = time.time() - start_time
            
            if not rate_limit_hit:
                return ValidationResult(
                    scenario="Rate Limiting",
                    status="failed",
                    duration=duration,
                    message=f"Rate limiting not triggered after {request_count} requests",
                    details={"requests_made": request_count}
                )
            else:
                return ValidationResult(
                    scenario="Rate Limiting",
                    status="passed",
                    duration=duration,
                    message=f"Rate limiting triggered after {request_count} requests",
                    details={"requests_made": request_count}
                )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ValidationResult(
                scenario="Rate Limiting",
                status="failed",
                duration=duration,
                message=f"Exception: {str(e)}",
                details={"exception": str(e)}
            )
    
    async def run_all_validations(self) -> List[ValidationResult]:
        """Run all validation scenarios"""
        logger.info("Starting quickstart validation scenarios...")
        
        scenarios = [
            self.validate_scenario_1_health_check,
            self.validate_scenario_2_chat_api,
            self.validate_scenario_3_f1_data_api,
            self.validate_scenario_4_error_handling,
            self.validate_scenario_5_rate_limiting,
        ]
        
        results = []
        for scenario_func in scenarios:
            try:
                result = await scenario_func()
                results.append(result)
                
                status_emoji = "✅" if result.status == "passed" else "❌" if result.status == "failed" else "⏭️"
                logger.info(f"{status_emoji} {result.scenario}: {result.status} ({result.duration:.2f}s) - {result.message}")
                
            except Exception as e:
                logger.error(f"❌ Exception in scenario: {e}")
                results.append(ValidationResult(
                    scenario=scenario_func.__name__,
                    status="failed",
                    duration=0,
                    message=f"Exception: {str(e)}",
                    details={"exception": str(e)}
                ))
        
        return results


def print_summary(results: List[ValidationResult]):
    """Print validation summary"""
    print("\n" + "="*80)
    print("QUICKSTART VALIDATION SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in results if r.status == "passed")
    failed = sum(1 for r in results if r.status == "failed")
    skipped = sum(1 for r in results if r.status == "skipped")
    total = len(results)
    
    print(f"Total Scenarios: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⏭️ Skipped: {skipped}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\nFAILED SCENARIOS:")
        print("-" * 40)
        for result in results:
            if result.status == "failed":
                print(f"❌ {result.scenario}")
                print(f"   {result.message}")
                if result.details:
                    print(f"   Details: {result.details}")
                print()
    
    print("="*80)


async def main():
    """Main validation function"""
    parser = argparse.ArgumentParser(description="Validate quickstart scenarios")
    parser.add_argument("--base-url", default="http://localhost", help="Base URL for API (default: http://localhost)")
    parser.add_argument("--api-key", default="f1-mcp-dev-key-2024", help="API key for testing (default: f1-mcp-dev-key-2024)")
    parser.add_argument("--scenario", help="Run specific scenario (1-5)")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    parser.add_argument("--timeout", type=int, default=30, help="Request timeout in seconds (default: 30)")
    
    args = parser.parse_args()
    
    async with QuickstartValidator(args.base_url, args.api_key) as validator:
        if args.scenario:
            # Run specific scenario
            scenario_map = {
                "1": validator.validate_scenario_1_health_check,
                "2": validator.validate_scenario_2_chat_api,
                "3": validator.validate_scenario_3_f1_data_api,
                "4": validator.validate_scenario_4_error_handling,
                "5": validator.validate_scenario_5_rate_limiting,
            }
            
            if args.scenario in scenario_map:
                result = await scenario_map[args.scenario]()
                results = [result]
            else:
                print(f"Invalid scenario: {args.scenario}. Valid options: 1, 2, 3, 4, 5")
                return 1
        else:
            # Run all scenarios
            results = await validator.run_all_validations()
        
        if args.json:
            # Output JSON results
            json_results = []
            for result in results:
                json_results.append({
                    "scenario": result.scenario,
                    "status": result.status,
                    "duration": result.duration,
                    "message": result.message,
                    "details": result.details,
                    "timestamp": datetime.now().isoformat()
                })
            
            print(json.dumps(json_results, indent=2))
        else:
            # Print summary
            print_summary(results)
        
        # Return exit code based on results
        failed_count = sum(1 for r in results if r.status == "failed")
        return 1 if failed_count > 0 else 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nValidation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Validation failed with error: {e}")
        sys.exit(1)
