#!/bin/bash

# Environment Setup Script for F1 MCP Server Cloud Deployment
# This script helps set up the environment for deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to generate a secure random string
generate_secret() {
    local length=${1:-32}
    if command -v openssl &> /dev/null; then
        openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
    elif command -v python3 &> /dev/null; then
        python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range($length)))"
    else
        # Fallback to /dev/urandom
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
    fi
}

echo "=========================================="
echo "F1 MCP Server Environment Setup"
echo "=========================================="

# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing .env file"
        exit 0
    fi
fi

print_info "Creating environment configuration..."

# Copy template to .env
if [ -f "deployment/config/environment.template" ]; then
    cp deployment/config/environment.template .env
    print_success "Created .env from template"
else
    print_error "Environment template not found at deployment/config/environment.template"
    exit 1
fi

# Generate secure secrets
print_info "Generating secure secrets..."

API_SECRET=$(generate_secret 64)
JWT_SECRET=$(generate_secret 64)

# Update .env with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/your-secret-key-here/$API_SECRET/" .env
    sed -i '' "s/your-jwt-secret-here/$JWT_SECRET/" .env
else
    # Linux
    sed -i "s/your-secret-key-here/$API_SECRET/" .env
    sed -i "s/your-jwt-secret-here/$JWT_SECRET/" .env
fi

print_success "Generated and set API_SECRET_KEY and JWT_SECRET"

# Interactive configuration
echo ""
print_info "Interactive configuration setup..."
echo ""

# Environment selection
echo "Select deployment environment:"
echo "1) Production"
echo "2) Staging"
echo "3) Development"
read -p "Enter choice (1-3) [1]: " env_choice
env_choice=${env_choice:-1}

case $env_choice in
    1)
        ENVIRONMENT="production"
        DEBUG="false"
        DEV_MODE="false"
        ;;
    2)
        ENVIRONMENT="staging"
        DEBUG="false"
        DEV_MODE="false"
        ;;
    3)
        ENVIRONMENT="development"
        DEBUG="true"
        DEV_MODE="true"
        ;;
esac

# Update environment settings
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/ENVIRONMENT=.*/ENVIRONMENT=$ENVIRONMENT/" .env
    sed -i '' "s/DEBUG=.*/DEBUG=$DEBUG/" .env
    sed -i '' "s/DEV_MODE=.*/DEV_MODE=$DEV_MODE/" .env
else
    sed -i "s/ENVIRONMENT=.*/ENVIRONMENT=$ENVIRONMENT/" .env
    sed -i "s/DEBUG=.*/DEBUG=$DEBUG/" .env
    sed -i "s/DEV_MODE=.*/DEV_MODE=$DEV_MODE/" .env
fi

print_success "Set environment to: $ENVIRONMENT"

# Cloud provider selection
echo ""
echo "Select cloud provider:"
echo "1) DigitalOcean"
echo "2) AWS"
echo "3) Google Cloud Platform"
echo "4) Azure"
echo "5) Other"
read -p "Enter choice (1-5) [1]: " cloud_choice
cloud_choice=${cloud_choice:-1}

case $cloud_choice in
    1)
        CLOUD_PROVIDER="digitalocean"
        ;;
    2)
        CLOUD_PROVIDER="aws"
        ;;
    3)
        CLOUD_PROVIDER="gcp"
        ;;
    4)
        CLOUD_PROVIDER="azure"
        ;;
    5)
        read -p "Enter cloud provider name: " CLOUD_PROVIDER
        ;;
esac

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/CLOUD_PROVIDER=.*/CLOUD_PROVIDER=$CLOUD_PROVIDER/" .env
else
    sed -i "s/CLOUD_PROVIDER=.*/CLOUD_PROVIDER=$CLOUD_PROVIDER/" .env
fi

print_success "Set cloud provider to: $CLOUD_PROVIDER"

# Domain configuration
echo ""
read -p "Enter your domain name (optional): " domain
if [ ! -z "$domain" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$domain,https://www.$domain|" .env
    else
        sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://$domain,https://www.$domain|" .env
    fi
    print_success "Set CORS origins for domain: $domain"
fi

# API keys
echo ""
read -p "Enter Gemini API key (optional, press Enter to skip): " gemini_key
if [ ! -z "$gemini_key" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-gemini-api-key-here/$gemini_key/" .env
    else
        sed -i "s/your-gemini-api-key-here/$gemini_key/" .env
    fi
    print_success "Set Gemini API key"
fi

# Set proper permissions
chmod 600 .env
print_success "Set secure permissions on .env file"

# Create necessary directories
print_info "Creating deployment directories..."
mkdir -p deployment/config/ssl
mkdir -p deployment/config/grafana/dashboards
mkdir -p deployment/config/grafana/datasources
mkdir -p deployment/logs
mkdir -p deployment/data/redis
mkdir -p deployment/data/prometheus
mkdir -p deployment/data/grafana
print_success "Created deployment directories"

# Setup SSL certificates (self-signed for development)
if [ ! -f "deployment/config/ssl/server.crt" ] || [ ! -f "deployment/config/ssl/server.key" ]; then
    print_info "Generating self-signed SSL certificate..."
    if command -v openssl &> /dev/null; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout deployment/config/ssl/server.key \
            -out deployment/config/ssl/server.crt \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null || true
        print_success "Generated SSL certificate"
    else
        print_warning "OpenSSL not found, skipping SSL certificate generation"
    fi
else
    print_info "SSL certificate already exists"
fi

# Setup configuration files
print_info "Setting up configuration files..."

# API Gateway config
if [ ! -f "api-gateway/config.yml" ]; then
    cat > api-gateway/config.yml << 'EOF'
api_gateway:
  global:
    host: "0.0.0.0"
    port: 8080
    log_level: "INFO"
  
  cors:
    enabled: true
    origins: ["*"]
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    headers: ["*"]
  
  security:
    headers:
      enabled: true
  
  rate_limiting:
    enabled: true
    default_requests_per_minute: 60
    default_burst_size: 120
  
  caching:
    enabled: true
    default_ttl_seconds: 300

endpoints:
  - path: "/health"
    method: "GET"
    target_service: "nginx"
    target_path: "/health"
    authentication_required: false
    caching:
      enabled: false
    rate_limit:
      requests_per_minute: 1000
  
  - path: "/api/v1/f1/schedule"
    method: "GET"
    target_service: "mcp-server"
    target_path: "/f1/schedule"
    authentication_required: false
    caching:
      enabled: true
      strategy: "long_cache"
    rate_limit:
      requests_per_minute: 60
  
  - path: "/api/v1/f1/drivers"
    method: "GET"
    target_service: "mcp-server"
    target_path: "/f1/drivers"
    authentication_required: false
    caching:
      enabled: true
      strategy: "long_cache"
    rate_limit:
      requests_per_minute: 60
  
  - path: "/api/v1/chat"
    method: "POST"
    target_service: "mcp-bridge"
    target_path: "/chat"
    authentication_required: true
    authentication_type: "api_key"
    caching:
      enabled: false
    rate_limit:
      requests_per_minute: 30
EOF
    print_success "Created API Gateway configuration"
fi

# Monitoring config
if [ ! -f "monitoring/config.yml" ]; then
    cat > monitoring/config.yml << 'EOF'
monitoring:
  check_interval: 30
  timeout: 10
  retry_count: 3
  alert_thresholds:
    cpu_usage: 80.0
    memory_usage: 85.0
    disk_usage: 90.0
    response_time_ms: 5000

services:
  mcp-server:
    url: "http://mcp-server:8000"
    health_endpoint: "/health"
  
  messenger-client:
    url: "http://messenger-client:3000"
    health_endpoint: "/health"
  
  mcp-bridge:
    url: "http://mcp-bridge:8001"
    health_endpoint: "/health"
  
  nginx:
    url: "http://nginx:80"
    health_endpoint: "/health"
  
  api-gateway:
    url: "http://api-gateway:8080"
    health_endpoint: "/health"

alerting:
  enabled: true
  notification_channels:
    email:
      enabled: false
      smtp_server: "localhost"
      smtp_port: 587
      username: "alerts@f1mcp.com"
      password: "password"
      from_email: "alerts@f1mcp.com"
      to_emails: ["admin@f1mcp.com"]
    
    slack:
      enabled: false
      webhook_url: "https://hooks.slack.com/services/..."
      channel: "#alerts"
    
    webhook:
      enabled: false
      url: "https://api.example.com/alerts"
      headers:
        Authorization: "Bearer token"
  
  escalation_policies:
    default:
      enabled: true
      rules:
        - delay_minutes: 15
          channels: ["email"]
          severity: ["critical", "high"]
        - delay_minutes: 60
          channels: ["slack", "webhook"]
          severity: ["critical"]
EOF
    print_success "Created monitoring configuration"
fi

# Nginx configuration
if [ ! -f "deployment/config/nginx.conf" ]; then
    cat > deployment/config/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api_gateway {
        server api-gateway:8080;
    }
    
    upstream messenger_client {
        server messenger-client:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # API routes
        location /api/ {
            proxy_pass http://api_gateway;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Frontend routes
        location / {
            proxy_pass http://messenger_client;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
    print_success "Created Nginx configuration"
fi

# Prometheus configuration
if [ ! -f "deployment/config/prometheus.yml" ]; then
    cat > deployment/config/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'f1-mcp-server'
    static_configs:
      - targets: ['mcp-server:8000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9091']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'monitoring'
    static_configs:
      - targets: ['monitoring:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s
EOF
    print_success "Created Prometheus configuration"
fi

# Grafana datasources
if [ ! -f "deployment/config/grafana/datasources/prometheus.yml" ]; then
    cat > deployment/config/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    print_success "Created Grafana datasource configuration"
fi

echo ""
echo "=========================================="
print_success "Environment setup completed!"
echo ""
print_info "Next steps:"
echo "1. Review the .env file and make any additional changes"
echo "2. Run: ./deployment/scripts/validate-environment.sh"
echo "3. Run: docker-compose up -d"
echo "4. Access the application at http://localhost"
echo "5. Access Grafana at http://localhost:3000 (admin/admin)"
echo "6. Access Prometheus at http://localhost:9090"
echo ""
print_warning "Important: Keep your .env file secure and never commit it to version control!"
