#!/bin/bash

# Environment Validation Script for F1 MCP Server Cloud Deployment
# This script validates that all required environment variables are set correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
    esac
}

# Function to check if a variable is set
check_required_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        print_status "ERROR" "$var_name is not set"
        return 1
    else
        print_status "SUCCESS" "$var_name is set"
        return 0
    fi
}

# Function to check if a variable matches expected pattern
check_var_pattern() {
    local var_name=$1
    local pattern=$2
    local var_value=${!var_name}
    
    if [[ $var_value =~ $pattern ]]; then
        print_status "SUCCESS" "$var_name format is valid"
        return 0
    else
        print_status "ERROR" "$var_name format is invalid (expected: $pattern)"
        return 1
    fi
}

echo "=========================================="
echo "F1 MCP Server Environment Validation"
echo "=========================================="

# Load environment file if it exists
if [ -f ".env" ]; then
    echo "Loading environment from .env file..."
    set -a
    source .env
    set +a
else
    print_status "WARNING" ".env file not found, using system environment variables"
fi

# Track validation results
validation_errors=0

echo ""
echo "Checking required environment variables..."

# Required variables
required_vars=(
    "ENVIRONMENT"
    "MCP_SERVER_HOST"
    "MCP_SERVER_PORT"
    "NODE_ENV"
    "PORT"
    "BRIDGE_HOST"
    "BRIDGE_PORT"
    "API_SECRET_KEY"
    "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
    if ! check_required_var "$var"; then
        ((validation_errors++))
    fi
done

echo ""
echo "Validating variable formats..."

# Validate port numbers
if ! check_var_pattern "MCP_SERVER_PORT" "^[0-9]+$"; then
    ((validation_errors++))
fi

if ! check_var_pattern "PORT" "^[0-9]+$"; then
    ((validation_errors++))
fi

if ! check_var_pattern "BRIDGE_PORT" "^[0-9]+$"; then
    ((validation_errors++))
fi

# Validate environment values
if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "development" ]; then
    print_status "ERROR" "ENVIRONMENT must be one of: production, staging, development"
    ((validation_errors++))
else
    print_status "SUCCESS" "ENVIRONMENT value is valid"
fi

# Validate NODE_ENV
if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "development" ]; then
    print_status "ERROR" "NODE_ENV must be one of: production, development"
    ((validation_errors++))
else
    print_status "SUCCESS" "NODE_ENV value is valid"
fi

# Validate secret keys (should be at least 32 characters)
if [ ${#API_SECRET_KEY} -lt 32 ]; then
    print_status "ERROR" "API_SECRET_KEY should be at least 32 characters long"
    ((validation_errors++))
else
    print_status "SUCCESS" "API_SECRET_KEY length is sufficient"
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    print_status "ERROR" "JWT_SECRET should be at least 32 characters long"
    ((validation_errors++))
else
    print_status "SUCCESS" "JWT_SECRET length is sufficient"
fi

# Optional but recommended variables
echo ""
echo "Checking optional but recommended variables..."

optional_vars=(
    "GEMINI_API_KEY"
    "CORS_ORIGINS"
    "CLOUD_PROVIDER"
)

for var in "${optional_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_status "WARNING" "$var is not set (optional but recommended)"
    else
        print_status "SUCCESS" "$var is set"
    fi
done

# Check if running in production mode
echo ""
echo "Production readiness check..."
if [ "$ENVIRONMENT" = "production" ]; then
    if [ "$DEBUG" = "true" ]; then
        print_status "ERROR" "DEBUG should be false in production"
        ((validation_errors++))
    else
        print_status "SUCCESS" "DEBUG is disabled for production"
    fi
    
    if [ "$DEV_MODE" = "true" ]; then
        print_status "ERROR" "DEV_MODE should be false in production"
        ((validation_errors++))
    else
        print_status "SUCCESS" "DEV_MODE is disabled for production"
    fi
fi

# Network connectivity test (if possible)
echo ""
echo "Testing network connectivity..."
if command -v curl &> /dev/null; then
    if curl -s --max-time 5 http://httpbin.org/get > /dev/null; then
        print_status "SUCCESS" "Internet connectivity is available"
    else
        print_status "WARNING" "Internet connectivity test failed"
    fi
else
    print_status "WARNING" "curl not available, skipping connectivity test"
fi

# Summary
echo ""
echo "=========================================="
if [ $validation_errors -eq 0 ]; then
    print_status "SUCCESS" "Environment validation passed!"
    echo "Your environment is ready for deployment."
    exit 0
else
    print_status "ERROR" "Environment validation failed with $validation_errors error(s)"
    echo "Please fix the errors above before proceeding with deployment."
    exit 1
fi
