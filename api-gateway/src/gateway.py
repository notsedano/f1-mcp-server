"""
API Gateway Service
Main FastAPI application for the F1 MCP Server API Gateway.
"""

import asyncio
import time
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import yaml

# Local application imports
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
from common.logging_config import setup_logging

from .endpoint import EndpointRegistry, create_all_endpoints
from .auth import AuthenticationService
from .rate_limiting import RateLimitingService

# Configure logging using common utilities
logger = setup_logging(__name__)


class APIGateway:
    """Main API Gateway service"""
    
    def __init__(self, config_path: str = "config.yml"):
        self.config_path = config_path
        self.config = self._load_config()
        self.endpoint_registry = EndpointRegistry()
        self.auth_service = AuthenticationService()
        self.rate_limiting_service = RateLimitingService()
        self.startup_time = time.time()
        
        # Initialize FastAPI app
        self.app = FastAPI(
            title="F1 MCP Server API Gateway",
            description="API Gateway for F1 MCP Server cloud deployment",
            version="1.0.0",
            docs_url="/docs" if self.config.get("development", {}).get("debug", False) else None,
            redoc_url="/redoc" if self.config.get("development", {}).get("debug", False) else None
        )
        
        self._setup_middleware()
        self._register_endpoints()
        self._register_middleware()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "api_gateway": {
                "global": {
                    "host": "0.0.0.0",
                    "port": 8080,
                    "log_level": "INFO"
                },
                "cors": {
                    "enabled": True,
                    "origins": ["*"],
                    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                    "headers": ["*"]
                },
                "security": {
                    "headers": {
                        "enabled": True
                    }
                }
            }
        }
    
    def _setup_middleware(self):
        """Setup middleware"""
        # CORS middleware
        cors_config = self.config.get("api_gateway", {}).get("cors", {})
        if cors_config.get("enabled", True):
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=cors_config.get("origins", ["*"]),
                allow_credentials=cors_config.get("credentials", True),
                allow_methods=cors_config.get("methods", ["*"]),
                allow_headers=cors_config.get("headers", ["*"])
            )
        
        # GZip middleware
        self.app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    def _register_endpoints(self):
        """Register API endpoints"""
        # Add all predefined endpoints
        endpoints = create_all_endpoints()
        self.endpoint_registry.add_endpoints(endpoints)
        
        # Register FastAPI routes
        self._register_fastapi_routes()
    
    def _register_fastapi_routes(self):
        """Register FastAPI routes"""
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            uptime = time.time() - self.startup_time
            
            # Check backend services health
            services_health = await self._check_backend_services()
            
            overall_status = "healthy"
            if any(not service.get("healthy", False) for service in services_health.values()):
                overall_status = "degraded"
            
            return {
                "status": overall_status,
                "timestamp": time.time(),
                "uptime_seconds": uptime,
                "services": services_health
            }
        
        @self.app.get("/metrics")
        async def metrics():
            """Prometheus metrics endpoint"""
            return await self._get_metrics()
        
        @self.app.get("/api/v1/f1/schedule")
        async def get_f1_schedule(
            year: Optional[int] = None,
            request: Request = None
        ):
            """F1 schedule endpoint"""
            return await self._proxy_request(request, "mcp-server", "/f1/schedule")
        
        @self.app.get("/api/v1/f1/drivers")
        async def get_f1_drivers(
            driver_id: Optional[str] = None,
            request: Request = None
        ):
            """F1 drivers endpoint"""
            return await self._proxy_request(request, "mcp-server", "/f1/drivers")
        
        @self.app.post("/api/v1/chat")
        async def chat(
            request: Request,
            response: Response
        ):
            """Chat endpoint"""
            return await self._proxy_request(request, "mcp-bridge", "/chat")
        
        @self.app.get("/{path:path}")
        async def catch_all(request: Request, path: str):
            """Catch-all route for frontend"""
            return await self._proxy_request(request, "messenger-client", f"/{path}")
    
    def _register_middleware(self):
        """Register custom middleware"""
        
        @self.app.middleware("http")
        async def add_security_headers(request: Request, call_next):
            """Add security headers"""
            response = await call_next(request)
            
            security_config = self.config.get("api_gateway", {}).get("security", {})
            if security_config.get("headers", {}).get("enabled", True):
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-XSS-Protection"] = "1; mode=block"
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            
            return response
        
        @self.app.middleware("http")
        async def add_request_id(request: Request, call_next):
            """Add request ID to requests and responses"""
            request_id = request.headers.get("X-Request-ID", f"req_{int(time.time() * 1000)}")
            request.state.request_id = request_id
            
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            
            return response
        
        @self.app.middleware("http")
        async def log_requests(request: Request, call_next):
            """Log all requests"""
            start_time = time.time()
            
            # Log request
            logger.info(f"Request: {request.method} {request.url.path} - {request.client.host}")
            
            response = await call_next(request)
            
            # Log response
            process_time = time.time() - start_time
            logger.info(
                f"Response: {response.status_code} - {process_time:.3f}s - "
                f"{request.method} {request.url.path}"
            )
            
            return response
    
    async def _check_backend_services(self) -> Dict[str, Any]:
        """Check health of backend services"""
        services = {
            "mcp-server": "http://mcp-server:8000/health",
            "messenger-client": "http://messenger-client:3000/health",
            "mcp-bridge": "http://mcp-bridge:8001/health",
            "nginx": "http://nginx:80/health"
        }
        
        health_status = {}
        
        for service_name, health_url in services.items():
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(health_url, timeout=5) as response:
                        if response.status == 200:
                            health_status[service_name] = {
                                "healthy": True,
                                "status": "healthy",
                                "response_time_ms": int(response.headers.get("X-Response-Time", 0))
                            }
                        else:
                            health_status[service_name] = {
                                "healthy": False,
                                "status": "unhealthy",
                                "status_code": response.status
                            }
            except Exception as e:
                health_status[service_name] = {
                    "healthy": False,
                    "status": "unknown",
                    "error": str(e)
                }
        
        return health_status
    
    async def _get_metrics(self) -> Dict[str, Any]:
        """Get Prometheus-style metrics"""
        return {
            "http_requests_total": self.rate_limiting_service.get_total_requests(),
            "http_request_duration_seconds": self.rate_limiting_service.get_avg_response_time(),
            "active_connections": 1,  # This would be tracked in a real implementation
            "rate_limit_violations_total": self.rate_limiting_service.get_rate_limit_violations()
        }
    
    async def _proxy_request(self, request: Request, target_service: str, target_path: str) -> Any:
        """Proxy request to backend service"""
        # Check authentication if required
        endpoint = self.endpoint_registry.find_endpoint(request.url.path, request.method)
        if endpoint and endpoint.should_authenticate():
            auth_result = await self.auth_service.authenticate_request(request)
            if not auth_result:
                raise HTTPException(status_code=401, detail="Authentication required")
        
        # Check rate limiting
        if endpoint and endpoint.should_rate_limit():
            client_ip = request.client.host
            rate_limit_result = await self.rate_limiting_service.check_rate_limit(
                endpoint, client_ip
            )
            if not rate_limit_result:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        # Proxy the request
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                # Prepare request data
                headers = dict(request.headers)
                headers.pop("host", None)  # Remove host header
                
                # Get request body if present
                body = None
                if request.method in ["POST", "PUT", "PATCH"]:
                    body = await request.body()
                
                # Make request to backend service
                target_url = f"http://{target_service}{target_path}"
                if request.query_params:
                    target_url += f"?{request.query_params}"
                
                async with session.request(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    data=body,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_data = await response.text()
                    
                    return JSONResponse(
                        content=response_data if response_data else {},
                        status_code=response.status,
                        headers=dict(response.headers)
                    )
        
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="Gateway timeout")
        except Exception as e:
            logger.error(f"Error proxying request to {target_service}: {e}")
            raise HTTPException(status_code=502, detail="Bad gateway")
    
    def run(self, host: str = "0.0.0.0", port: int = 8080):
        """Run the API gateway"""
        logger.info(f"Starting API Gateway on {host}:{port}")
        
        uvicorn.run(
            self.app,
            host=host,
            port=port,
            log_level=self.config.get("api_gateway", {}).get("global", {}).get("log_level", "info").lower(),
            access_log=True
        )


# Create global instance
gateway = APIGateway()
app = gateway.app


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting API Gateway...")
    yield
    # Shutdown
    logger.info("Shutting down API Gateway...")


# Add lifespan to app
app.router.lifespan_context = lifespan


if __name__ == "__main__":
    gateway.run()
