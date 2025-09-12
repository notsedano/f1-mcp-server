# Monitoring System

The F1 MCP Server monitoring system provides comprehensive observability, health monitoring, metrics collection, and alerting capabilities for the entire cloud hosting infrastructure.

## Overview

The monitoring system consists of several interconnected components:

- **Health Monitor**: Real-time health checks for all services
- **Metrics Collector**: System and application metrics collection
- **Alerting System**: Configurable alerts and notifications
- **Dashboard**: Web-based monitoring interface
- **Prometheus Integration**: Metrics storage and querying
- **Grafana Integration**: Advanced visualization and dashboards

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Health        │    │   Metrics       │    │   Alerting      │
│   Monitor       │◄──►│   Collector     │◄──►│   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │   Prometheus    │    │   Notifications │
│   (Web UI)      │    │   (Storage)     │    │   (Email/Slack) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Start the Monitoring System

```bash
# Start all monitoring services
docker-compose up -d monitoring prometheus grafana

# Check service status
docker-compose ps monitoring prometheus grafana
```

### 2. Access the Dashboard

- **Monitoring Dashboard**: http://localhost:3002
- **Grafana Dashboards**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090

### 3. Verify Health Checks

```bash
# Check monitoring service health
curl http://localhost:3002/health

# Check individual service health
curl http://localhost:3002/api/health/mcp-server
curl http://localhost:3002/api/health/messenger-client
curl http://localhost:3002/api/health/mcp-bridge
curl http://localhost:3002/api/health/api-gateway
```

## Configuration

### Main Configuration File

The monitoring system is configured via `monitoring/config.yml`:

```yaml
# Health monitoring settings
health_monitoring:
  check_interval: 30
  timeout: 10
  retry_count: 3
  
  # Service endpoints to monitor
  services:
    mcp-server:
      url: "http://mcp-server:8000/health"
      critical: true
    messenger-client:
      url: "http://messenger-client:3000/health"
      critical: true
    mcp-bridge:
      url: "http://mcp-bridge:8001/health"
      critical: true
    api-gateway:
      url: "http://api-gateway:8080/health"
      critical: true

# Metrics collection settings
metrics:
  collection_interval: 15
  retention_days: 30
  
  # System metrics
  system_metrics:
    cpu: true
    memory: true
    disk: true
    network: true
    
  # Application metrics
  application_metrics:
    response_times: true
    error_rates: true
    throughput: true
    active_connections: true

# Alerting configuration
alerting:
  enabled: true
  
  # Alert rules
  rules:
    - name: "High CPU Usage"
      condition: "cpu_usage > 80"
      duration: "5m"
      severity: "warning"
      
    - name: "Service Down"
      condition: "health_status == 'down'"
      duration: "1m"
      severity: "critical"
      
    - name: "High Error Rate"
      condition: "error_rate > 10"
      duration: "3m"
      severity: "warning"

  # Notification channels
  channels:
    email:
      enabled: true
      smtp_server: "smtp.gmail.com"
      smtp_port: 587
      username: "your-email@gmail.com"
      password: "your-app-password"
      recipients: ["admin@yourdomain.com"]
      
    slack:
      enabled: false
      webhook_url: "https://hooks.slack.com/services/..."
      channel: "#alerts"
```

### Environment Variables

```bash
# Monitoring service configuration
MONITORING_PORT=3002
MONITORING_HOST=0.0.0.0

# Prometheus configuration
PROMETHEUS_PORT=9090
PROMETHEUS_RETENTION=30d

# Grafana configuration
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# Alerting configuration
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_ENABLED=false
```

## Features

### Health Monitoring

The health monitoring system continuously checks the status of all services:

#### Supported Health Checks

- **HTTP Health Checks**: Standard HTTP endpoint monitoring
- **TCP Health Checks**: Port connectivity testing
- **Database Health Checks**: Database connectivity and query testing
- **Custom Health Checks**: Application-specific health validation

#### Health Check Types

```python
class CheckType(Enum):
    HTTP = "http"           # HTTP endpoint check
    TCP = "tcp"             # TCP port check
    DATABASE = "database"   # Database connectivity
    CUSTOM = "custom"       # Custom application check
```

#### Health Status Levels

```python
class HealthStatus(Enum):
    HEALTHY = "healthy"     # Service is operating normally
    WARNING = "warning"     # Service has minor issues
    CRITICAL = "critical"   # Service has major issues
    DOWN = "down"          # Service is unavailable
```

### Metrics Collection

The metrics collector gathers comprehensive system and application metrics:

#### System Metrics

- **CPU Usage**: Per-core and overall CPU utilization
- **Memory Usage**: RAM usage, swap usage, memory pressure
- **Disk Usage**: Disk space, I/O operations, read/write speeds
- **Network Usage**: Bandwidth, packet rates, connection counts

#### Application Metrics

- **Response Times**: API endpoint response times (p50, p95, p99)
- **Error Rates**: HTTP error rates, exception counts
- **Throughput**: Requests per second, transactions per minute
- **Active Connections**: Current connection counts, connection pools

#### Custom Metrics

- **Business Metrics**: User activity, data processing rates
- **Performance Metrics**: Cache hit rates, database query times
- **Security Metrics**: Authentication failures, rate limit hits

### Alerting System

The alerting system provides real-time notifications for critical events:

#### Alert Types

```python
class AlertType(Enum):
    SYSTEM = "system"           # System-level alerts
    APPLICATION = "application" # Application-level alerts
    SECURITY = "security"       # Security-related alerts
    PERFORMANCE = "performance" # Performance degradation
    AVAILABILITY = "availability" # Service availability
```

#### Alert Severity Levels

```python
class AlertSeverity(Enum):
    INFO = "info"           # Informational alerts
    WARNING = "warning"     # Warning-level alerts
    CRITICAL = "critical"   # Critical alerts requiring immediate attention
    EMERGENCY = "emergency" # Emergency alerts for system failures
```

#### Alert Channels

- **Email Notifications**: SMTP-based email alerts
- **Slack Integration**: Slack webhook notifications
- **Webhook Alerts**: Custom HTTP endpoint notifications
- **SMS Notifications**: SMS alerts via third-party services

## API Reference

### Health Monitoring API

#### Get Overall Health Status

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "mcp-server": {
      "status": "healthy",
      "response_time": 45,
      "last_check": "2024-01-01T12:00:00Z"
    },
    "messenger-client": {
      "status": "healthy",
      "response_time": 23,
      "last_check": "2024-01-01T12:00:00Z"
    }
  }
}
```

#### Get Service Health

```http
GET /api/health/{service_name}
```

**Parameters:**
- `service_name`: Name of the service to check

**Response:**
```json
{
  "service": "mcp-server",
  "status": "healthy",
  "response_time": 45,
  "last_check": "2024-01-01T12:00:00Z",
  "details": {
    "version": "1.0.0",
    "uptime": 3600,
    "memory_usage": 45.2
  }
}
```

### Metrics API

#### Get Current Metrics

```http
GET /api/metrics
```

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "system": {
    "cpu_usage": 25.5,
    "memory_usage": 67.8,
    "disk_usage": 45.2,
    "network_in": 1024,
    "network_out": 2048
  },
  "application": {
    "response_time_p95": 245,
    "error_rate": 2.1,
    "throughput": 150,
    "active_connections": 25
  }
}
```

#### Get Historical Metrics

```http
GET /api/metrics/history?duration=1h&interval=1m
```

**Parameters:**
- `duration`: Time range (1h, 6h, 24h, 7d)
- `interval`: Data point interval (1m, 5m, 15m, 1h)

### Alerts API

#### Get Active Alerts

```http
GET /api/alerts
```

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "name": "High CPU Usage",
      "severity": "warning",
      "status": "active",
      "created_at": "2024-01-01T11:55:00Z",
      "message": "CPU usage is above 80% for 5 minutes"
    }
  ]
}
```

#### Get Alert History

```http
GET /api/alerts/history?limit=50
```

**Parameters:**
- `limit`: Number of alerts to return (default: 50)

## Dashboard

### Web-Based Monitoring Dashboard

The monitoring dashboard provides a real-time view of system health and performance:

#### Features

- **Real-time Updates**: WebSocket-based live updates
- **Service Overview**: Health status of all services
- **Metrics Charts**: Interactive charts for system and application metrics
- **Active Alerts**: Current alerts with severity indicators
- **Error Logs**: Recent error logs and stack traces
- **Historical Data**: Trend analysis and historical comparisons

#### Dashboard Sections

1. **System Overview**
   - Overall health status
   - Service availability
   - Key performance indicators

2. **Service Health**
   - Individual service status
   - Response times
   - Error rates
   - Uptime statistics

3. **System Metrics**
   - CPU, memory, disk usage
   - Network statistics
   - Resource utilization trends

4. **Application Metrics**
   - API response times
   - Throughput metrics
   - Error rates and patterns
   - Performance trends

5. **Alerts**
   - Active alerts
   - Alert history
   - Alert statistics
   - Notification status

6. **Logs**
   - Error logs
   - System logs
   - Application logs
   - Log filtering and search

### Grafana Integration

The monitoring system integrates with Grafana for advanced visualization:

#### Pre-configured Dashboards

- **F1 MCP Server Overview**: High-level system overview
- **Service Health Dashboard**: Detailed service monitoring
- **Performance Dashboard**: Response times and throughput
- **Infrastructure Dashboard**: System resource monitoring
- **Alerting Dashboard**: Alert management and history

#### Custom Dashboards

You can create custom Grafana dashboards using the available metrics:

```json
{
  "dashboard": {
    "title": "Custom F1 MCP Dashboard",
    "panels": [
      {
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "f1_mcp_response_time_p95",
            "legendFormat": "95th Percentile"
          }
        ]
      }
    ]
  }
}
```

## Prometheus Integration

### Metrics Export

The monitoring system exports metrics in Prometheus format:

#### Available Metrics

```prometheus
# System metrics
f1_mcp_system_cpu_usage_percent
f1_mcp_system_memory_usage_percent
f1_mcp_system_disk_usage_percent
f1_mcp_system_network_bytes_total

# Application metrics
f1_mcp_http_requests_total
f1_mcp_http_request_duration_seconds
f1_mcp_http_errors_total
f1_mcp_active_connections

# Health metrics
f1_mcp_service_health_status
f1_mcp_service_response_time_seconds
f1_mcp_service_uptime_seconds
```

### Prometheus Queries

#### Useful Queries

```prometheus
# Average response time over 5 minutes
avg_over_time(f1_mcp_http_request_duration_seconds[5m])

# Error rate percentage
rate(f1_mcp_http_errors_total[5m]) / rate(f1_mcp_http_requests_total[5m]) * 100

# Service availability
avg_over_time(f1_mcp_service_health_status[1h])

# Top slowest endpoints
topk(10, f1_mcp_http_request_duration_seconds)
```

## Troubleshooting

### Common Issues

#### Health Checks Failing

**Symptoms:**
- Services showing as "down" in dashboard
- Health check timeouts
- Inconsistent health status

**Solutions:**
```bash
# Check service connectivity
curl -v http://localhost:8000/health

# Verify network connectivity
docker network ls
docker network inspect f1-mcp-network

# Check service logs
docker logs f1-mcp-server
docker logs f1-mcp-monitoring
```

#### Metrics Not Appearing

**Symptoms:**
- Empty metrics in dashboard
- Missing data in Prometheus
- No historical data

**Solutions:**
```bash
# Check metrics endpoint
curl http://localhost:8000/metrics

# Verify Prometheus configuration
curl http://localhost:9090/api/v1/targets

# Check metrics collection
docker logs f1-mcp-monitoring
```

#### Alerts Not Triggering

**Symptoms:**
- No alerts for known issues
- Missing notifications
- Alert rules not working

**Solutions:**
```bash
# Check alert configuration
curl http://localhost:3002/api/alerts/rules

# Test alert conditions
curl http://localhost:3002/api/metrics

# Verify notification channels
docker logs f1-mcp-monitoring
```

### Performance Optimization

#### High CPU Usage

**Symptoms:**
- Monitoring service using excessive CPU
- Slow dashboard responses
- High system load

**Solutions:**
```yaml
# Reduce check frequency
health_monitoring:
  check_interval: 60  # Increase from 30 to 60 seconds
  
# Optimize metrics collection
metrics:
  collection_interval: 30  # Increase from 15 to 30 seconds
  
# Limit historical data
metrics:
  retention_days: 7  # Reduce from 30 to 7 days
```

#### Memory Issues

**Symptoms:**
- High memory usage
- Out of memory errors
- Slow performance

**Solutions:**
```yaml
# Limit metrics retention
metrics:
  retention_days: 3
  
# Reduce alert history
alerting:
  history_limit: 100  # Limit alert history
  
# Optimize dashboard updates
dashboard:
  update_interval: 10  # Increase from 5 to 10 seconds
```

## Security Considerations

### Authentication

The monitoring system supports multiple authentication methods:

```yaml
# API authentication
api:
  auth:
    enabled: true
    method: "api_key"  # or "jwt"
    api_key: "monitoring-api-key"
    
# Dashboard authentication
dashboard:
  auth:
    enabled: true
    method: "basic"
    username: "admin"
    password: "secure-password"
```

### Network Security

```yaml
# HTTPS configuration
ssl:
  enabled: true
  cert_file: "/etc/ssl/certs/monitoring.crt"
  key_file: "/etc/ssl/private/monitoring.key"
  
# CORS configuration
cors:
  enabled: true
  allowed_origins: ["https://yourdomain.com"]
  allowed_methods: ["GET", "POST"]
  allowed_headers: ["Authorization", "Content-Type"]
```

### Data Privacy

- **Metrics Data**: Stored locally, not transmitted to external services
- **Health Data**: Contains only service status, no sensitive information
- **Alert Data**: May contain service names and error messages
- **Log Data**: May contain application logs and stack traces

## Backup and Recovery

### Data Backup

```bash
# Backup Prometheus data
docker exec f1-mcp-prometheus tar -czf /backup/prometheus-$(date +%Y%m%d).tar.gz /prometheus

# Backup Grafana data
docker exec f1-mcp-grafana tar -czf /backup/grafana-$(date +%Y%m%d).tar.gz /var/lib/grafana

# Backup monitoring configuration
cp monitoring/config.yml backup/monitoring-config-$(date +%Y%m%d).yml
```

### Data Recovery

```bash
# Restore Prometheus data
docker exec f1-mcp-prometheus tar -xzf /backup/prometheus-20240101.tar.gz -C /

# Restore Grafana data
docker exec f1-mcp-grafana tar -xzf /backup/grafana-20240101.tar.gz -C /

# Restore monitoring configuration
cp backup/monitoring-config-20240101.yml monitoring/config.yml
```

## Monitoring Best Practices

### Alert Configuration

1. **Set Appropriate Thresholds**: Avoid alert fatigue with reasonable thresholds
2. **Use Multiple Severity Levels**: Distinguish between warnings and critical issues
3. **Implement Alert Grouping**: Group related alerts to reduce noise
4. **Set Alert Dependencies**: Prevent cascading alerts for dependent services

### Metrics Collection

1. **Collect Relevant Metrics**: Focus on business-critical metrics
2. **Set Appropriate Intervals**: Balance detail with performance
3. **Implement Data Retention**: Set reasonable retention periods
4. **Monitor Collection Performance**: Ensure metrics collection doesn't impact services

### Dashboard Design

1. **Keep Dashboards Focused**: Create specific dashboards for different audiences
2. **Use Consistent Visualizations**: Standardize chart types and colors
3. **Include Context**: Add annotations and explanations
4. **Optimize for Mobile**: Ensure dashboards work on mobile devices

## Support

### Documentation

- **API Documentation**: http://localhost:3002/docs
- **Prometheus Documentation**: http://localhost:9090/graph
- **Grafana Documentation**: http://localhost:3000

### Community

- **GitHub Issues**: https://github.com/your-org/f1-mcp-server/issues
- **Discussions**: https://github.com/your-org/f1-mcp-server/discussions

### Professional Support

For enterprise support and consulting services, contact:
- **Email**: support@yourdomain.com
- **Phone**: +1-XXX-XXX-XXXX
- **Website**: https://yourdomain.com/support

---

**Version**: 1.0.0
**Last Updated**: 2024-01-01
**Maintainer**: F1 MCP Server Team