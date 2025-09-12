# F1 MCP Server API Gateway

The API Gateway provides centralized API management, authentication, rate limiting, and routing for the F1 MCP Server system.

## Overview

The API Gateway acts as the single entry point for all API requests, providing:

- **Authentication & Authorization**: API key and JWT-based authentication
- **Rate Limiting**: Per-endpoint and per-user rate limiting
- **Request Routing**: Intelligent routing to backend services
- **Caching**: Response caching for improved performance
- **Security**: CORS, security headers, and request validation
- **Monitoring**: Request metrics and health checks
- **Circuit Breakers**: Fault tolerance for backend services

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │────│   API Gateway   │────│   MCP Server    │
│   (Browser/App) │    │   (FastAPI)     │    │   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ├───► MCP Bridge
                              ├───► Messenger Client
                              └───► Monitoring Service
```

## Quick Start

### Prerequisites

- Python 3.11+
- Docker and Docker Compose
- Redis (for caching and rate limiting)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/f1-mcp-server.git
cd f1-mcp-server/api-gateway

# Install dependencies
pip install -r requirements.txt

# Copy configuration template
cp config.yml.example config.yml

# Edit configuration
nano config.yml
```

### Running the API Gateway

```bash
# Development mode
python -m uvicorn src.gateway:app --host 0.0.0.0 --port 8080 --reload

# Production mode
python -m uvicorn src.gateway:app --host 0.0.0.0 --port 8080 --workers 4
```

### Docker Deployment

```bash
# Build image
docker build -t f1-api-gateway .

# Run container
docker run -d \
  --name api-gateway \
  -p 8080:8080 \
  -v $(pwd)/config.yml:/app/config.yml \
  f1-api-gateway
```

## Configuration

### Configuration File (`config.yml`)

The API Gateway is configured through a YAML file:

```yaml
# Server configuration
server:
  host: "0.0.0.0"
  port: 8080
  workers: 2
  log_level: "INFO"

# CORS configuration
cors:
  enabled: true
  allow_origins:
    - "http://localhost:3000"
    - "https://yourdomain.com"
  allow_credentials: true
  allow_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

# Rate limiting
rate_limiting:
  enabled: true
  default_limit: 1000  # requests per window
  default_window: 3600  # seconds
  endpoints:
    "/api/v1/health":
      limit: 300
      window: 60
    "/api/v1/chat":
      limit: 30
      window: 60

# Authentication
auth:
  enabled: true
  api_keys:
    enabled: true
    header_name: "X-API-Key"
    default_keys:
      - key: "your-api-key"
        name: "Default Key"
        permissions: ["read", "write"]
  
  jwt:
    enabled: false
    secret_key: "your-jwt-secret"
    algorithm: "HS256"

# Caching
caching:
  enabled: true
  backend: "redis"
  default_ttl: 300  # seconds
  endpoints:
    "/api/v1/f1/schedule":
      ttl: 3600
    "/api/v1/f1/drivers":
      ttl: 1800

# Security
security:
  max_request_size: 10485760  # 10MB
  security_headers:
    enabled: true
    headers:
      "X-Content-Type-Options": "nosniff"
      "X-Frame-Options": "DENY"
      "Strict-Transport-Security": "max-age=31536000"
```

### Environment Variables

Key configuration can be overridden with environment variables:

```bash
export API_GATEWAY_HOST="0.0.0.0"
export API_GATEWAY_PORT="8080"
export API_GATEWAY_LOG_LEVEL="INFO"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET_KEY="your-secret-key"
export API_SECRET_KEY="your-api-secret"
```

## API Endpoints

### Public Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime_seconds": 3600,
  "services": {
    "mcp-server": "healthy",
    "mcp-bridge": "healthy",
    "messenger-client": "healthy"
  }
}
```

#### Metrics
```http
GET /metrics
```

Returns Prometheus-compatible metrics.

### Authenticated Endpoints

All API endpoints require authentication via API key or JWT token.

#### F1 Data Endpoints

##### Get F1 Schedule
```http
GET /api/v1/f1/schedule
X-API-Key: your-api-key
```

**Response:**
```json
{
  "events": [
    {
      "name": "Bahrain Grand Prix",
      "date": "2024-03-02",
      "circuit": "Bahrain International Circuit",
      "country": "Bahrain"
    }
  ]
}
```

##### Get F1 Drivers
```http
GET /api/v1/f1/drivers
X-API-Key: your-api-key
```

**Response:**
```json
{
  "drivers": [
    {
      "name": "Lewis Hamilton",
      "team": "Mercedes",
      "number": 44,
      "country": "United Kingdom"
    }
  ]
}
```

##### Get F1 Events
```http
GET /api/v1/f1/events
X-API-Key: your-api-key
```

#### Chat Endpoints

##### Send Message
```http
POST /api/v1/chat
X-API-Key: your-api-key
Content-Type: application/json

{
  "message": "What is the current F1 season schedule?",
  "user_id": "user123"
}
```

**Response:**
```json
{
  "response": "The current F1 season includes races at...",
  "timestamp": "2024-01-01T12:00:00Z",
  "message_id": "msg_123"
}
```

### API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc
- **OpenAPI Spec**: http://localhost:8080/openapi.json

## Authentication

### API Key Authentication

#### Using API Keys

Include the API key in the request header:

```http
X-API-Key: your-api-key
```

#### Managing API Keys

API keys can be managed through the API Gateway configuration or via the management API:

```http
POST /api/v1/auth/keys
Content-Type: application/json

{
  "name": "My Application",
  "permissions": ["read", "write"],
  "expires_days": 365
}
```

#### API Key Permissions

- **read**: Read-only access to F1 data endpoints
- **write**: Write access to chat endpoints
- **admin**: Full administrative access
- **custom**: Custom permission set

### JWT Authentication (Optional)

When enabled, JWT tokens can be used for authentication:

```http
Authorization: Bearer your-jwt-token
```

## Rate Limiting

Rate limiting is applied per endpoint and per API key:

### Default Limits
- **General API**: 1000 requests/hour
- **Health endpoint**: 300 requests/minute
- **Chat endpoint**: 30 requests/minute

### Custom Limits

Rate limits can be customized per endpoint in the configuration:

```yaml
rate_limiting:
  endpoints:
    "/api/v1/f1/schedule":
      limit: 120  # requests per window
      window: 60  # seconds
      burst: 20   # burst requests
```

### Rate Limit Headers

The API Gateway includes rate limit information in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

## Caching

### Cache Configuration

Caching is configured per endpoint:

```yaml
caching:
  endpoints:
    "/api/v1/f1/schedule":
      ttl: 3600  # 1 hour
      strategy: "long_cache"
    "/api/v1/f1/drivers":
      ttl: 1800  # 30 minutes
      strategy: "medium_cache"
```

### Cache Strategies

- **no_cache**: No caching
- **short_cache**: 5 minutes
- **medium_cache**: 30 minutes
- **long_cache**: 1 hour
- **very_long_cache**: 24 hours

### Cache Headers

Cached responses include cache information:

```http
Cache-Control: max-age=3600
X-Cache: HIT
X-Cache-TTL: 3600
```

## Security

### Security Headers

The API Gateway automatically adds security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### Request Validation

All requests are validated for:

- **Request size**: Maximum 10MB
- **Content type**: Allowed content types only
- **SQL injection**: Automatic detection and blocking
- **XSS**: Cross-site scripting protection

### IP Restrictions

IP whitelisting and blacklisting can be configured:

```yaml
security:
  ip_whitelist:
    enabled: true
    allowed_ips:
      - "192.168.1.0/24"
      - "10.0.0.0/8"
  
  ip_blacklist:
    enabled: true
    blocked_ips:
      - "192.168.1.100"
```

## Monitoring

### Health Checks

The API Gateway provides comprehensive health checks:

```bash
# Basic health check
curl http://localhost:8080/health

# Detailed health check
curl http://localhost:8080/health/detailed
```

### Metrics

Prometheus-compatible metrics are available at `/metrics`:

```bash
curl http://localhost:8080/metrics
```

Key metrics include:
- Request count and duration
- Rate limit violations
- Cache hit/miss ratios
- Error rates
- Active connections

### Logging

Structured logging is configured with different levels:

```yaml
logging:
  level: "INFO"
  format: "json"
  file: "/app/logs/api-gateway.log"
  
  request_logging:
    enabled: true
    log_body: false
    log_headers: false
```

## Circuit Breakers

Circuit breakers provide fault tolerance for backend services:

### Configuration

```yaml
circuit_breaker:
  enabled: true
  failure_threshold: 5
  recovery_timeout: 60
  half_open_max_calls: 3
  
  services:
    mcp-server:
      failure_threshold: 3
      recovery_timeout: 30
```

### Circuit Breaker States

- **CLOSED**: Normal operation
- **OPEN**: Circuit is open, requests fail fast
- **HALF_OPEN**: Testing if service has recovered

## Development

### Project Structure

```
api-gateway/
├── src/
│   ├── gateway.py          # Main FastAPI application
│   ├── auth.py            # Authentication service
│   ├── rate_limiting.py   # Rate limiting service
│   ├── endpoint.py        # Endpoint models
│   └── api_key.py         # API key management
├── config/
│   └── config.yml         # Configuration file
├── tests/
│   └── test_*.py          # Test files
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
└── README.md             # This file
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/performance/

# Run with coverage
pytest --cov=src --cov-report=html
```

### Code Quality

```bash
# Linting
flake8 src/
black src/
isort src/

# Type checking
mypy src/
```

## Deployment

### Docker Compose

The API Gateway is included in the main Docker Compose stack:

```yaml
api-gateway:
  build: ./api-gateway
  ports:
    - "8080:8080"
  environment:
    - REDIS_URL=redis://redis:6379
  depends_on:
    - redis
    - mcp-server
    - mcp-bridge
```

### Production Deployment

For production deployment:

1. **Configure SSL/TLS**: Use a reverse proxy (Nginx) with SSL certificates
2. **Set up Redis**: Configure Redis for caching and rate limiting
3. **Configure monitoring**: Set up Prometheus and Grafana
4. **Set up logging**: Configure centralized logging
5. **Configure secrets**: Use secure secret management

### Scaling

The API Gateway can be scaled horizontally:

```bash
# Scale API Gateway
docker-compose up --scale api-gateway=3
```

Load balancing is handled by the reverse proxy (Nginx).

## Troubleshooting

### Common Issues

#### API Gateway Not Starting
```bash
# Check logs
docker logs api-gateway

# Check configuration
docker exec api-gateway cat /app/config.yml
```

#### Authentication Failures
```bash
# Verify API key format
curl -H "X-API-Key: your-key" http://localhost:8080/health

# Check API key in configuration
grep -A 5 "default_keys" config.yml
```

#### Rate Limiting Issues
```bash
# Check rate limit headers
curl -I http://localhost:8080/api/v1/f1/schedule

# Reset rate limits (Redis)
redis-cli FLUSHDB
```

#### Cache Issues
```bash
# Check cache status
curl -H "X-Cache-Status: true" http://localhost:8080/api/v1/f1/schedule

# Clear cache
redis-cli FLUSHDB
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
export API_GATEWAY_LOG_LEVEL="DEBUG"
python -m uvicorn src.gateway:app --reload
```

### Performance Issues

#### High Response Times
1. Check backend service health
2. Verify Redis connectivity
3. Review rate limiting configuration
4. Check for circuit breaker trips

#### Memory Usage
1. Monitor memory usage: `docker stats api-gateway`
2. Check for memory leaks in logs
3. Adjust worker count if needed

## Support

### Documentation
- **API Documentation**: http://localhost:8080/docs
- **Configuration Reference**: See `config.yml.example`

### Community
- **GitHub Issues**: https://github.com/your-org/f1-mcp-server/issues
- **Discussions**: https://github.com/your-org/f1-mcp-server/discussions

### Professional Support
- **Email**: support@yourdomain.com
- **Documentation**: https://docs.yourdomain.com/api-gateway

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Maintainer**: F1 MCP Server Team