# F1 MCP Server Deployment Guide

This guide provides comprehensive instructions for deploying the F1 MCP Server system to a cloud environment using Docker and Docker Compose.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Services](#services)
- [Monitoring](#monitoring)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Production Deployment](#production-deployment)

## Overview

The F1 MCP Server is a comprehensive system that provides Formula 1 data through an MCP (Model Context Protocol) server, with supporting services for messaging, API gateway, monitoring, and more.

### Key Features

- **MCP Server**: Core Formula 1 data service with SSE transport
- **Messenger Client**: Web-based interface for interacting with the MCP server
- **API Gateway**: Centralized API management with authentication and rate limiting
- **Monitoring**: Comprehensive health monitoring and alerting system
- **Caching**: Redis-based caching for improved performance
- **Metrics**: Prometheus and Grafana integration for observability

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │   MCP Server    │
│     (Nginx)     │────│   (FastAPI)     │────│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Messenger      │    │   MCP Bridge    │    │    Monitoring   │
│  Client         │    │   (Python)      │    │   (FastAPI)     │
│  (Node.js)      │    └─────────────────┘    └─────────────────┘
└─────────────────┘              │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Cache)       │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Prometheus    │
                    │   (Metrics)     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Grafana      │
                    │  (Dashboard)    │
                    └─────────────────┘
```

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended) or macOS
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: Minimum 2 cores, Recommended 4 cores+
- **Disk**: Minimum 20GB free space
- **Network**: Internet access for downloading dependencies

### Software Requirements

- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For cloning the repository
- **Make**: For running deployment scripts (optional)

### Cloud Platform Requirements

- **Container Registry**: Docker Hub, AWS ECR, or similar
- **Load Balancer**: For production deployments
- **SSL Certificate**: For HTTPS endpoints
- **Domain Name**: For production access

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/f1-mcp-server.git
cd f1-mcp-server
```

### 2. Setup Environment

```bash
# Make setup script executable
chmod +x deployment/scripts/setup-environment.sh

# Run setup script
./deployment/scripts/setup-environment.sh
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp deployment/config/.env.example deployment/config/.env

# Edit environment variables
nano deployment/config/.env
```

### 4. Start Services

```bash
# Start all services
docker-compose -f deployment/config/docker-compose.yml up -d

# Check service status
docker-compose -f deployment/config/docker-compose.yml ps
```

### 5. Verify Deployment

```bash
# Check health endpoints
curl http://localhost:8080/health
curl http://localhost:3000/health
curl http://localhost:8000/health
curl http://localhost:8001/health

# Access services
# API Gateway: http://localhost:8080
# Messenger Client: http://localhost:3000
# Monitoring Dashboard: http://localhost:3001
# Grafana: http://localhost:3000
```

## Configuration

### Environment Variables

The deployment uses environment variables for configuration. Key variables include:

```bash
# Application settings
APP_VERSION=1.0.0
ENVIRONMENT=production
LOG_LEVEL=INFO

# Service URLs
MCP_SERVER_URL=http://mcp-server:8000
MESSENGER_CLIENT_URL=http://messenger-client:3000
API_GATEWAY_URL=http://api-gateway:8080

# Database and Cache
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000

# Security
JWT_SECRET_KEY=your-secret-key
API_KEY_SECRET=your-api-key-secret
```

### Configuration Files

- **API Gateway**: `api-gateway/config.yml`
- **Monitoring**: `monitoring/config.yml`
- **Nginx**: `deployment/config/nginx.conf`
- **Prometheus**: `deployment/config/prometheus.yml`
- **Grafana**: `deployment/config/grafana/datasources/prometheus.yml`

### Service Configuration

Each service can be configured through environment variables or configuration files:

#### MCP Server
- **Port**: 8000
- **Health Check**: `/health`
- **Metrics**: `/metrics`
- **Cache**: FastF1 cache enabled

#### Messenger Client
- **Port**: 3000
- **Health Check**: `/health`
- **Static Files**: Served from `/dist`

#### API Gateway
- **Port**: 8080
- **Health Check**: `/health`
- **Metrics**: `/metrics`
- **Rate Limiting**: Enabled
- **Authentication**: API Key and JWT

#### Monitoring
- **Port**: 3002
- **Dashboard**: Port 3001
- **Health Checks**: All services
- **Alerting**: Webhook, Email, Slack

## Services

### Core Services

#### MCP Server (`mcp-server`)
- **Purpose**: Core Formula 1 data service
- **Technology**: Python with FastAPI and Starlette
- **Endpoints**: SSE transport, health checks, metrics
- **Dependencies**: FastF1 library, Formula1.com API

#### Messenger Client (`messenger-client`)
- **Purpose**: Web interface for MCP server interaction
- **Technology**: Node.js with Express and TypeScript
- **Features**: Real-time messaging, agent management
- **Dependencies**: F1 MCP Server

#### MCP Bridge (`mcp-bridge`)
- **Purpose**: Bridge between messenger and MCP server
- **Technology**: Python with FastAPI and Uvicorn
- **Features**: Message routing, protocol translation
- **Dependencies**: MCP Server, Messenger Client

### Infrastructure Services

#### API Gateway (`api-gateway`)
- **Purpose**: Centralized API management
- **Technology**: Python with FastAPI
- **Features**: Authentication, rate limiting, caching, routing
- **Dependencies**: Redis, backend services

#### Monitoring (`monitoring`)
- **Purpose**: Health monitoring and alerting
- **Technology**: Python with FastAPI
- **Features**: Health checks, metrics collection, alerting
- **Dependencies**: Redis, Prometheus, Grafana

#### Nginx (`nginx`)
- **Purpose**: Reverse proxy and load balancer
- **Technology**: Nginx
- **Features**: SSL termination, load balancing, static file serving
- **Dependencies**: All services

#### Redis (`redis`)
- **Purpose**: Caching and session storage
- **Technology**: Redis
- **Features**: In-memory data store, pub/sub
- **Dependencies**: None

#### Prometheus (`prometheus`)
- **Purpose**: Metrics collection and storage
- **Technology**: Prometheus
- **Features**: Time-series database, querying, alerting
- **Dependencies**: All services (for scraping)

#### Grafana (`grafana`)
- **Purpose**: Metrics visualization and dashboards
- **Technology**: Grafana
- **Features**: Dashboards, alerts, data source management
- **Dependencies**: Prometheus

## Monitoring

### Health Checks

All services expose health check endpoints:

```bash
# Check individual service health
curl http://localhost:8000/health  # MCP Server
curl http://localhost:3000/health  # Messenger Client
curl http://localhost:8001/health  # MCP Bridge
curl http://localhost:8080/health  # API Gateway
curl http://localhost:3002/health  # Monitoring
```

### Metrics

Services expose Prometheus-compatible metrics:

```bash
# View metrics
curl http://localhost:8000/metrics  # MCP Server
curl http://localhost:8080/metrics  # API Gateway
curl http://localhost:3002/metrics  # Monitoring
```

### Monitoring Dashboard

Access the monitoring dashboard at `http://localhost:3001`:

- **System Overview**: Overall health and status
- **Services Health**: Individual service status
- **Active Alerts**: Current alerts and notifications
- **Metrics Charts**: Performance and usage metrics
- **Error Logs**: Recent errors and exceptions

### Grafana Dashboards

Access Grafana at `http://localhost:3000`:

- **Default Login**: admin/admin
- **Pre-configured Dashboards**: F1 MCP Server metrics
- **Data Sources**: Prometheus integration
- **Alerts**: Notification channels

### Alerting

The system supports multiple alerting channels:

- **Webhook**: HTTP POST to configured endpoints
- **Email**: SMTP-based email notifications
- **Slack**: Slack webhook integration
- **Discord**: Discord webhook integration
- **PagerDuty**: Incident management integration

## Security

### Authentication

#### API Keys
- **Header**: `X-API-Key`
- **Query Parameter**: `api_key`
- **Default Keys**: Provided in configuration
- **Permissions**: Read, Write, Admin, Metrics

#### JWT Tokens
- **Algorithm**: HS256
- **Expiration**: Configurable (default 30 minutes)
- **Refresh Tokens**: Supported
- **Claims**: User ID, permissions, expiration

### Network Security

#### CORS Configuration
- **Allowed Origins**: Configurable
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Configurable
- **Credentials**: Supported

#### Rate Limiting
- **Default Limit**: 1000 requests per hour
- **Burst Limit**: 100 requests
- **Per-Endpoint**: Configurable limits
- **Storage**: Redis-based

#### IP Restrictions
- **Whitelist**: Configurable IP ranges
- **Blacklist**: Blocked IP addresses
- **Geo-blocking**: Optional country restrictions

### Data Security

#### Encryption
- **In Transit**: HTTPS/TLS
- **At Rest**: Application-level encryption
- **Secrets**: Environment variable management

#### Access Control
- **Role-Based**: Admin, User, Read-only
- **Resource-Based**: Per-service permissions
- **Audit Logging**: All access attempts logged

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check service logs
docker-compose -f deployment/config/docker-compose.yml logs [service-name]

# Check service status
docker-compose -f deployment/config/docker-compose.yml ps

# Restart service
docker-compose -f deployment/config/docker-compose.yml restart [service-name]
```

#### Health Check Failures

```bash
# Manual health check
curl -v http://localhost:8000/health

# Check service dependencies
docker-compose -f deployment/config/docker-compose.yml logs [service-name]

# Verify network connectivity
docker-compose -f deployment/config/docker-compose.yml exec [service-name] ping [dependency-service]
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Check service metrics
curl http://localhost:8000/metrics

# Check system resources
docker-compose -f deployment/config/docker-compose.yml exec [service-name] top
```

#### Database Connection Issues

```bash
# Test Redis connection
docker-compose -f deployment/config/docker-compose.yml exec redis redis-cli ping

# Check Redis logs
docker-compose -f deployment/config/docker-compose.yml logs redis

# Verify Redis configuration
docker-compose -f deployment/config/docker-compose.yml exec redis redis-cli config get "*"
```

### Log Analysis

#### Service Logs

```bash
# View all logs
docker-compose -f deployment/config/docker-compose.yml logs

# Follow logs in real-time
docker-compose -f deployment/config/docker-compose.yml logs -f

# Filter logs by service
docker-compose -f deployment/config/docker-compose.yml logs [service-name]

# Filter logs by time
docker-compose -f deployment/config/docker-compose.yml logs --since="2024-01-01T00:00:00"
```

#### Log Files

Service logs are stored in `/app/logs/` within each container:

- **MCP Server**: `/app/logs/f1-mcp-server.log`
- **API Gateway**: `/app/logs/api-gateway.log`
- **Monitoring**: `/app/logs/monitoring.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### Debugging

#### Enable Debug Mode

```bash
# Set debug environment variable
export LOG_LEVEL=DEBUG

# Restart services
docker-compose -f deployment/config/docker-compose.yml restart
```

#### Container Debugging

```bash
# Access container shell
docker-compose -f deployment/config/docker-compose.yml exec [service-name] /bin/bash

# Check container processes
docker-compose -f deployment/config/docker-compose.yml exec [service-name] ps aux

# Check container network
docker-compose -f deployment/config/docker-compose.yml exec [service-name] netstat -tulpn
```

## Maintenance

### Regular Maintenance

#### Daily Tasks

```bash
# Check service health
./deployment/scripts/validate-health.sh

# Check disk usage
df -h

# Check log file sizes
du -sh /var/lib/docker/volumes/f1-*_logs/_data/
```

#### Weekly Tasks

```bash
# Update dependencies
docker-compose -f deployment/config/docker-compose.yml pull

# Restart services
docker-compose -f deployment/config/docker-compose.yml restart

# Clean up old logs
docker system prune -f
```

#### Monthly Tasks

```bash
# Update system packages
apt update && apt upgrade -y

# Backup configuration
tar -czf f1-mcp-backup-$(date +%Y%m%d).tar.gz deployment/config/

# Review security updates
docker-compose -f deployment/config/docker-compose.yml images
```

### Backup and Recovery

#### Configuration Backup

```bash
# Backup all configuration
tar -czf f1-mcp-config-backup-$(date +%Y%m%d).tar.gz \
  deployment/config/ \
  deployment/scripts/ \
  api-gateway/config.yml \
  monitoring/config.yml
```

#### Data Backup

```bash
# Backup Redis data
docker-compose -f deployment/config/docker-compose.yml exec redis redis-cli BGSAVE

# Backup Prometheus data
docker-compose -f deployment/config/docker-compose.yml exec prometheus tar -czf /tmp/prometheus-backup.tar.gz /prometheus/

# Copy backup files
docker cp $(docker-compose -f deployment/config/docker-compose.yml ps -q prometheus):/tmp/prometheus-backup.tar.gz ./
```

#### Recovery Procedures

```bash
# Restore configuration
tar -xzf f1-mcp-config-backup-YYYYMMDD.tar.gz

# Restart services with restored config
docker-compose -f deployment/config/docker-compose.yml restart

# Restore Redis data
docker-compose -f deployment/config/docker-compose.yml exec redis redis-cli FLUSHALL
docker-compose -f deployment/config/docker-compose.yml exec redis redis-cli --rdb /data/dump.rdb
```

### Updates and Upgrades

#### Service Updates

```bash
# Pull latest images
docker-compose -f deployment/config/docker-compose.yml pull

# Update services with zero downtime
docker-compose -f deployment/config/docker-compose.yml up -d --no-deps [service-name]

# Verify update
docker-compose -f deployment/config/docker-compose.yml ps
```

#### Configuration Updates

```bash
# Update configuration files
nano api-gateway/config.yml
nano monitoring/config.yml

# Restart affected services
docker-compose -f deployment/config/docker-compose.yml restart api-gateway monitoring

# Verify configuration
curl http://localhost:8080/health
curl http://localhost:3002/health
```

## Production Deployment

### Cloud Platform Setup

#### AWS Deployment

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create ECR repository
aws ecr create-repository --repository-name f1-mcp-server

# Build and push images
docker build -t f1-mcp-server .
docker tag f1-mcp-server:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/f1-mcp-server:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/f1-mcp-server:latest
```

#### Google Cloud Deployment

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Configure gcloud
gcloud init

# Build and push images
docker build -t gcr.io/your-project/f1-mcp-server .
docker push gcr.io/your-project/f1-mcp-server
```

#### Azure Deployment

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Create container registry
az acr create --resource-group myResourceGroup --name myRegistry --sku Basic

# Build and push images
docker build -t myRegistry.azurecr.io/f1-mcp-server .
docker push myRegistry.azurecr.io/f1-mcp-server
```

### Load Balancer Configuration

#### Nginx Load Balancer

```nginx
upstream f1-mcp-backend {
    server api-gateway-1:8080;
    server api-gateway-2:8080;
    server api-gateway-3:8080;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://f1-mcp-backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### AWS Application Load Balancer

```yaml
# ALB configuration
TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: f1-mcp-targets
    Port: 8080
    Protocol: HTTP
    VpcId: !Ref VPC
    HealthCheckPath: /health
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3

LoadBalancer:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: f1-mcp-alb
    Scheme: internet-facing
    Type: application
    Subnets:
      - !Ref PublicSubnet1
      - !Ref PublicSubnet2
    SecurityGroups:
      - !Ref LoadBalancerSecurityGroup
```

### SSL/TLS Configuration

#### Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Custom SSL Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate signing request
openssl req -new -key private.key -out certificate.csr

# Generate self-signed certificate (for testing)
openssl x509 -req -days 365 -in certificate.csr -signkey private.key -out certificate.crt
```

### Scaling and Performance

#### Horizontal Scaling

```yaml
# docker-compose.yml scaling
services:
  api-gateway:
    deploy:
      replicas: 3
    environment:
      - WORKERS=2
      
  mcp-server:
    deploy:
      replicas: 2
    environment:
      - WORKERS=4
```

#### Resource Limits

```yaml
# Resource constraints
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

#### Database Scaling

```yaml
# Redis cluster configuration
services:
  redis:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000
    deploy:
      replicas: 3
```

### Monitoring and Alerting

#### Production Monitoring

```yaml
# Enhanced monitoring configuration
monitoring:
  health_check:
    check_interval: 15
    timeout: 5
    failure_threshold: 2
  
  alerting:
    channels:
      pagerduty:
        enabled: true
        integration_key: ${PAGERDUTY_INTEGRATION_KEY}
      
      slack:
        enabled: true
        webhook_url: ${SLACK_WEBHOOK_URL}
        channel: "#alerts"
```

#### Log Aggregation

```yaml
# ELK Stack integration
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
  
  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  
  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

### Security Hardening

#### Network Security

```yaml
# Network isolation
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/16
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/16
```

#### Security Policies

```yaml
# Security constraints
services:
  api-gateway:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/tmp
    user: "1000:1000"
```

### Disaster Recovery

#### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/f1-mcp-server"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/config-$DATE.tar.gz deployment/config/

# Backup data volumes
docker run --rm -v f1-redis-data:/data -v $BACKUP_DIR:/backup alpine tar -czf /backup/redis-$DATE.tar.gz /data
docker run --rm -v f1-prometheus-data:/data -v $BACKUP_DIR:/backup alpine tar -czf /backup/prometheus-$DATE.tar.gz /data

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

#### Recovery Procedures

```bash
#!/bin/bash
# restore.sh - Disaster recovery script

BACKUP_DATE=$1
BACKUP_DIR="/backups/f1-mcp-server"

if [ -z "$BACKUP_DATE" ]; then
    echo "Usage: $0 YYYYMMDD"
    exit 1
fi

# Restore configuration
tar -xzf $BACKUP_DIR/config-$BACKUP_DATE.tar.gz

# Restore data volumes
docker run --rm -v f1-redis-data:/data -v $BACKUP_DIR:/backup alpine tar -xzf /backup/redis-$BACKUP_DATE.tar.gz -C /
docker run --rm -v f1-prometheus-data:/data -v $BACKUP_DIR:/backup alpine tar -xzf /backup/prometheus-$BACKUP_DATE.tar.gz -C /

# Restart services
docker-compose -f deployment/config/docker-compose.yml restart
```

## Testing and Validation

### Performance Testing

The deployment includes comprehensive performance and load testing capabilities:

#### API Response Time Tests
```bash
# Run performance tests
python tests/performance/test_api_response_times.py

# Test specific endpoints
python -m pytest tests/performance/test_api_response_times.py::TestAPIPerformance::test_health_endpoint_performance -v
```

**Performance Requirements:**
- Health endpoints: <100ms p95
- F1 data endpoints: <500ms p95
- Chat endpoints: <2000ms p95
- Metrics endpoints: <200ms p95

#### Load Testing
```bash
# Run concurrent user load tests
python tests/load/test_concurrent_users.py

# Test with specific user counts
python -m pytest tests/load/test_concurrent_users.py::TestConcurrentUsers::test_100_concurrent_users -v
```

**Load Test Scenarios:**
- 10 users: Light load test
- 50 users: Medium load test
- 100 users: Heavy load test
- 200 users: Stress test

#### Integration Testing
```bash
# Run integration tests
python tests/run-integration-tests.py

# Run specific test suites
python tests/run-integration-tests.py --suites service-health api-integration
```

### Health Validation

#### Automated Health Checks
```bash
# Run health validation script
./deployment/scripts/validate-health.sh

# Continuous monitoring
./deployment/scripts/validate-health.sh --continuous --interval 60

# JSON output for monitoring
./deployment/scripts/validate-health.sh --json > health-status.json
```

#### Manual Health Checks
```bash
# Check individual services
curl http://localhost:8000/health  # MCP Server
curl http://localhost:3000/health  # Messenger Client
curl http://localhost:8001/health  # MCP Bridge
curl http://localhost:8080/health  # API Gateway
curl http://localhost:3002/health  # Monitoring

# Check metrics
curl http://localhost:8000/metrics  # MCP Server metrics
curl http://localhost:8080/metrics  # API Gateway metrics
```

### Test Results Validation

#### Performance Benchmarks
- **Response Time**: 95th percentile < 500ms for API endpoints
- **Throughput**: > 100 requests/second sustained
- **Error Rate**: < 5% under normal load
- **Availability**: 99.9% uptime target

#### Load Test Results
- **10 Users**: Error rate < 5%, p95 < 1000ms
- **50 Users**: Error rate < 10%, p95 < 2000ms
- **100 Users**: Error rate < 15%, p95 < 3000ms
- **200 Users**: Error rate < 25%, p95 < 5000ms (stress test)

### Continuous Testing

#### Automated Test Pipeline
```bash
# Run full test suite
make test-all

# Run specific test categories
make test-unit
make test-integration
make test-performance
make test-load
```

#### Test Configuration
Tests are configured through environment variables:
```bash
export TEST_BASE_URL="http://localhost:8080"
export TEST_API_KEY="f1-mcp-dev-key-2024"
export TEST_CONCURRENT_USERS=50
export TEST_DURATION_SECONDS=60
```

## Support

### Documentation

- **API Documentation**: http://localhost:8080/docs
- **Monitoring Dashboard**: http://localhost:3001
- **Grafana Dashboards**: http://localhost:3000

### Community

- **GitHub Issues**: https://github.com/your-org/f1-mcp-server/issues
- **Discussions**: https://github.com/your-org/f1-mcp-server/discussions
- **Wiki**: https://github.com/your-org/f1-mcp-server/wiki

### Professional Support

For enterprise support and consulting services, contact:
- **Email**: support@yourdomain.com
- **Phone**: +1-XXX-XXX-XXXX
- **Website**: https://yourdomain.com/support

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-01  
**Maintainer**: F1 MCP Server Team
