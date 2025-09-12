# Quickstart: Cloud Hosting Infrastructure

**Feature**: 001-cloud-hosting  
**Date**: 2025-01-27

## Prerequisites

- Docker and Docker Compose installed
- Cloud hosting account (VPS, AWS, Google Cloud, etc.)
- Domain name (optional, for production)
- SSL certificate (for HTTPS)

## Quick Deployment

### 1. Clone and Setup
```bash
git clone <repository-url>
cd f1-mcp-server
cp deployment/config/environment.template deployment/config/.env
# Edit .env with your configuration
```

### 2. Configure Environment
Edit `deployment/config/.env`:
```bash
# Service Configuration
MCP_SERVER_PORT=8000
MESSENGER_CLIENT_PORT=3000
MCP_BRIDGE_PORT=8001

# API Gateway
API_GATEWAY_PORT=80
API_GATEWAY_SSL_PORT=443

# Database (if needed)
DATABASE_URL=postgresql://user:pass@localhost:5432/f1mcp

# API Keys
API_KEY_SECRET=your-secret-key-here
```

### 3. Deploy Services
```bash
cd deployment
docker-compose up -d
```

### 4. Verify Deployment
```bash
# Check service health
curl http://localhost/health

# Test API endpoint
curl -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"message": "What is the next F1 race?"}' \
     http://localhost/chat
```

## Testing Scenarios

### Scenario 1: Health Check Validation
**Given** the system is deployed  
**When** I call the health endpoint  
**Then** I should receive a healthy status response

```bash
curl -X GET http://localhost/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "services": {
    "mcp-server": {
      "name": "mcp-server",
      "status": "healthy",
      "response_time_ms": 45
    },
    "messenger-client": {
      "name": "messenger-client", 
      "status": "healthy",
      "response_time_ms": 23
    },
    "mcp-bridge": {
      "name": "mcp-bridge",
      "status": "healthy", 
      "response_time_ms": 12
    }
  }
}
```

### Scenario 2: Chat API Functionality
**Given** I have a valid API key  
**When** I send a message to the chat endpoint  
**Then** I should receive an AI response

```bash
curl -X POST http://localhost/chat \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about the next F1 race"}'
```

**Expected Response**:
```json
{
  "response": "The next F1 race is...",
  "timestamp": "2025-01-27T10:00:00Z",
  "processing_time_ms": 1250
}
```

### Scenario 3: F1 Data API
**Given** I have a valid API key  
**When** I request F1 schedule data  
**Then** I should receive the event schedule

```bash
curl -X GET "http://localhost/f1/schedule?year=2024" \
  -H "X-API-Key: your-api-key"
```

**Expected Response**:
```json
{
  "year": 2024,
  "events": [
    {
      "name": "Bahrain Grand Prix",
      "date": "2024-03-02",
      "location": "Bahrain International Circuit",
      "sessions": [
        {
          "name": "Practice 1",
          "datetime": "2024-03-01T11:30:00Z"
        }
      ]
    }
  ]
}
```

### Scenario 4: Error Handling
**Given** I don't have a valid API key  
**When** I try to access a protected endpoint  
**Then** I should receive an unauthorized error

```bash
curl -X POST http://localhost/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

**Expected Response**:
```json
{
  "error": "unauthorized",
  "message": "API key required",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

### Scenario 5: Rate Limiting
**Given** I have a valid API key  
**When** I make too many requests quickly  
**Then** I should receive a rate limit error

```bash
# Make multiple rapid requests
for i in {1..10}; do
  curl -X POST http://localhost/chat \
    -H "X-API-Key: your-api-key" \
    -H "Content-Type: application/json" \
    -d '{"message": "test '$i'"}'
done
```

**Expected Response** (after rate limit exceeded):
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

## Monitoring and Maintenance

### Health Monitoring
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resource usage
docker stats
```

### Scaling
```bash
# Scale messenger client
docker-compose up -d --scale messenger-client=3

# Update services
docker-compose pull
docker-compose up -d
```

### Backup and Recovery
```bash
# Backup configuration
tar -czf backup-$(date +%Y%m%d).tar.gz deployment/config/

# Restore from backup
tar -xzf backup-20250127.tar.gz
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Services not starting**
   - Check Docker daemon is running
   - Verify port availability
   - Check environment configuration

2. **API key authentication failing**
   - Verify API key is correctly set
   - Check API key format and encoding
   - Ensure API key is not expired

3. **High response times**
   - Monitor resource usage
   - Check network connectivity
   - Review service logs for errors

4. **Health checks failing**
   - Verify service endpoints are accessible
   - Check service dependencies
   - Review health check configuration

### Log Locations
- API Gateway: `/var/log/api-gateway/`
- MCP Server: `/var/log/mcp-server/`
- Messenger Client: `/var/log/messenger-client/`
- MCP Bridge: `/var/log/mcp-bridge/`

---
*Quickstart guide for 001-cloud-hosting feature*
