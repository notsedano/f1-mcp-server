#!/bin/bash

# Health Check Validation Script
# Validates the health of all F1 MCP Server services

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
COMPOSE_FILE="$PROJECT_ROOT/deployment/config/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Service configuration
declare -A SERVICES=(
    ["mcp-server"]="http://localhost:8000/health"
    ["messenger-client"]="http://localhost:3000/health"
    ["mcp-bridge"]="http://localhost:8001/health"
    ["api-gateway"]="http://localhost:8080/health"
    ["monitoring"]="http://localhost:3002/health"
    ["redis"]="redis://localhost:6379"
    ["prometheus"]="http://localhost:9090/-/healthy"
    ["grafana"]="http://localhost:3000/api/health"
)

# Health check results
declare -A HEALTH_RESULTS
declare -A RESPONSE_TIMES
declare -A ERROR_COUNTS

# Statistics
TOTAL_SERVICES=${#SERVICES[@]}
HEALTHY_SERVICES=0
UNHEALTHY_SERVICES=0
DEGRADED_SERVICES=0
TOTAL_RESPONSE_TIME=0

# Options
VERBOSE=false
TIMEOUT=10
RETRIES=3
RETRY_DELAY=5
EXIT_ON_FAILURE=false
JSON_OUTPUT=false
CONTINUOUS=false
INTERVAL=30

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Health check validation script for F1 MCP Server services.

OPTIONS:
    -v, --verbose          Enable verbose output
    -t, --timeout SECONDS  Request timeout in seconds (default: 10)
    -r, --retries COUNT    Number of retry attempts (default: 3)
    -d, --delay SECONDS    Delay between retries (default: 5)
    -f, --fail-fast        Exit on first failure
    -j, --json             Output results in JSON format
    -c, --continuous       Run continuously with specified interval
    -i, --interval SECONDS Interval for continuous mode (default: 30)
    -s, --service NAME     Check specific service only
    -h, --help             Show this help message

EXAMPLES:
    $0                      # Run basic health check
    $0 -v                   # Run with verbose output
    $0 -j                   # Output JSON results
    $0 -c -i 60             # Run continuously every 60 seconds
    $0 -s mcp-server        # Check only MCP server
    $0 -f -t 5              # Fail fast with 5 second timeout

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -r|--retries)
                RETRIES="$2"
                shift 2
                ;;
            -d|--delay)
                RETRY_DELAY="$2"
                shift 2
                ;;
            -f|--fail-fast)
                EXIT_ON_FAILURE=true
                shift
                ;;
            -j|--json)
                JSON_OUTPUT=true
                shift
                ;;
            -c|--continuous)
                CONTINUOUS=true
                shift
                ;;
            -i|--interval)
                INTERVAL="$2"
                shift 2
                ;;
            -s|--service)
                SERVICE_FILTER="$2"
                shift 2
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose is not installed or not in PATH"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
}

# Check if services are running
check_services_running() {
    log_info "Checking if services are running..."
    
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_error "No services are running. Please start the services first:"
        log_info "docker-compose -f $COMPOSE_FILE up -d"
        exit 1
    fi
    
    log_success "Services are running"
}

# Perform HTTP health check
check_http_health() {
    local service_name="$1"
    local url="$2"
    local start_time
    local end_time
    local response_time
    local http_code
    local response_body
    
    start_time=$(date +%s.%N)
    
    # Perform HTTP request with timeout
    if response_body=$(curl -s -w "\n%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        end_time=$(date +%s.%N)
        response_time=$(echo "$end_time - $start_time" | bc)
        
        # Extract HTTP status code (last line)
        http_code=$(echo "$response_body" | tail -n1)
        response_body=$(echo "$response_body" | head -n -1)
        
        RESPONSE_TIMES["$service_name"]=$response_time
        TOTAL_RESPONSE_TIME=$(echo "$TOTAL_RESPONSE_TIME + $response_time" | bc)
        
        if [ "$http_code" -eq 200 ]; then
            HEALTH_RESULTS["$service_name"]="healthy"
            ((HEALTHY_SERVICES++))
            
            if [ "$VERBOSE" = true ]; then
                log_success "$service_name is healthy (${response_time}s)"
                if [ -n "$response_body" ]; then
                    echo "Response: $response_body"
                fi
            fi
            return 0
        else
            HEALTH_RESULTS["$service_name"]="unhealthy"
            ((UNHEALTHY_SERVICES++))
            log_error "$service_name returned HTTP $http_code"
            return 1
        fi
    else
        HEALTH_RESULTS["$service_name"]="unhealthy"
        ((UNHEALTHY_SERVICES++))
        log_error "$service_name is not responding"
        return 1
    fi
}

# Perform Redis health check
check_redis_health() {
    local service_name="$1"
    local url="$2"
    local start_time
    local end_time
    local response_time
    
    start_time=$(date +%s.%N)
    
    # Use redis-cli to ping Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        end_time=$(date +%s.%N)
        response_time=$(echo "$end_time - $start_time" | bc)
        
        RESPONSE_TIMES["$service_name"]=$response_time
        TOTAL_RESPONSE_TIME=$(echo "$TOTAL_RESPONSE_TIME + $response_time" | bc)
        
        HEALTH_RESULTS["$service_name"]="healthy"
        ((HEALTHY_SERVICES++))
        
        if [ "$VERBOSE" = true ]; then
            log_success "$service_name is healthy (${response_time}s)"
        fi
        return 0
    else
        HEALTH_RESULTS["$service_name"]="unhealthy"
        ((UNHEALTHY_SERVICES++))
        log_error "$service_name is not responding"
        return 1
    fi
}

# Perform health check with retries
check_service_health() {
    local service_name="$1"
    local url="$2"
    local attempt=1
    local result=1
    
    if [ "$VERBOSE" = true ]; then
        log_info "Checking $service_name at $url..."
    fi
    
    while [ $attempt -le $RETRIES ]; do
        if [ "$VERBOSE" = true ] && [ $attempt -gt 1 ]; then
            log_info "Retry attempt $attempt/$RETRIES for $service_name..."
        fi
        
        if [[ "$url" == redis://* ]]; then
            check_redis_health "$service_name" "$url"
        else
            check_http_health "$service_name" "$url"
        fi
        
        result=$?
        
        if [ $result -eq 0 ]; then
            break
        fi
        
        if [ $attempt -lt $RETRIES ]; then
            sleep $RETRY_DELAY
        fi
        
        ((attempt++))
    done
    
    if [ $result -ne 0 ]; then
        ERROR_COUNTS["$service_name"]=$((ERROR_COUNTS["$service_name"] + 1))
        
        if [ "$EXIT_ON_FAILURE" = true ]; then
            log_error "Health check failed for $service_name. Exiting."
            exit 1
        fi
    fi
    
    return $result
}

# Check all services
check_all_services() {
    log_info "Starting health check validation..."
    log_info "Checking $TOTAL_SERVICES services with timeout ${TIMEOUT}s"
    
    # Reset counters
    HEALTHY_SERVICES=0
    UNHEALTHY_SERVICES=0
    DEGRADED_SERVICES=0
    TOTAL_RESPONSE_TIME=0
    
    # Clear previous results
    HEALTH_RESULTS=()
    RESPONSE_TIMES=()
    ERROR_COUNTS=()
    
    local checked_services=0
    
    for service_name in "${!SERVICES[@]}"; do
        # Skip if service filter is specified
        if [ -n "${SERVICE_FILTER:-}" ] && [ "$service_name" != "$SERVICE_FILTER" ]; then
            continue
        fi
        
        check_service_health "$service_name" "${SERVICES[$service_name]}"
        ((checked_services++))
    done
    
    # Update total services count if filter was applied
    if [ -n "${SERVICE_FILTER:-}" ]; then
        TOTAL_SERVICES=$checked_services
    fi
}

# Generate JSON output
generate_json_output() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local overall_status="healthy"
    
    if [ $UNHEALTHY_SERVICES -gt 0 ]; then
        overall_status="unhealthy"
    elif [ $DEGRADED_SERVICES -gt 0 ]; then
        overall_status="degraded"
    fi
    
    cat << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$overall_status",
  "summary": {
    "total_services": $TOTAL_SERVICES,
    "healthy_services": $HEALTHY_SERVICES,
    "unhealthy_services": $UNHEALTHY_SERVICES,
    "degraded_services": $DEGRADED_SERVICES,
    "average_response_time": $(echo "scale=3; $TOTAL_RESPONSE_TIME / $TOTAL_SERVICES" | bc -l)
  },
  "services": {
EOF
    
    local first=true
    for service_name in "${!HEALTH_RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        
        cat << EOF
    "$service_name": {
      "status": "${HEALTH_RESULTS[$service_name]}",
      "response_time": ${RESPONSE_TIMES[$service_name]:-0},
      "error_count": ${ERROR_COUNTS[$service_name]:-0},
      "url": "${SERVICES[$service_name]}"
    }
EOF
    done
    
    echo "  }"
    echo "}"
}

# Generate summary report
generate_summary() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local overall_status="healthy"
    
    if [ $UNHEALTHY_SERVICES -gt 0 ]; then
        overall_status="unhealthy"
    elif [ $DEGRADED_SERVICES -gt 0 ]; then
        overall_status="degraded"
    fi
    
    local avg_response_time=0
    if [ $TOTAL_SERVICES -gt 0 ]; then
        avg_response_time=$(echo "scale=3; $TOTAL_RESPONSE_TIME / $TOTAL_SERVICES" | bc -l)
    fi
    
    echo
    echo "=========================================="
    echo "Health Check Summary - $timestamp"
    echo "=========================================="
    echo "Overall Status: $overall_status"
    echo "Total Services: $TOTAL_SERVICES"
    echo "Healthy Services: $HEALTHY_SERVICES"
    echo "Unhealthy Services: $UNHEALTHY_SERVICES"
    echo "Degraded Services: $DEGRADED_SERVICES"
    echo "Average Response Time: ${avg_response_time}s"
    echo "=========================================="
    
    if [ $UNHEALTHY_SERVICES -gt 0 ]; then
        echo
        echo "Unhealthy Services:"
        for service_name in "${!HEALTH_RESULTS[@]}"; do
            if [ "${HEALTH_RESULTS[$service_name]}" = "unhealthy" ]; then
                echo "  - $service_name (${RESPONSE_TIMES[$service_name]:-0}s)"
            fi
        done
    fi
    
    if [ $DEGRADED_SERVICES -gt 0 ]; then
        echo
        echo "Degraded Services:"
        for service_name in "${!HEALTH_RESULTS[@]}"; do
            if [ "${HEALTH_RESULTS[$service_name]}" = "degraded" ]; then
                echo "  - $service_name (${RESPONSE_TIMES[$service_name]:-0}s)"
            fi
        done
    fi
    
    echo
}

# Continuous monitoring mode
run_continuous() {
    log_info "Starting continuous health monitoring (interval: ${INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    
    while true; do
        check_all_services
        
        if [ "$JSON_OUTPUT" = true ]; then
            generate_json_output
        else
            generate_summary
        fi
        
        sleep $INTERVAL
    done
}

# Main execution
main() {
    # Check dependencies
    if ! command -v bc &> /dev/null; then
        log_error "bc (basic calculator) is required but not installed"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    # Parse arguments
    parse_args "$@"
    
    # Check prerequisites
    check_docker_compose
    check_services_running
    
    # Run health checks
    if [ "$CONTINUOUS" = true ]; then
        run_continuous
    else
        check_all_services
        
        if [ "$JSON_OUTPUT" = true ]; then
            generate_json_output
        else
            generate_summary
        fi
        
        # Exit with appropriate code
        if [ $UNHEALTHY_SERVICES -gt 0 ]; then
            exit 1
        elif [ $DEGRADED_SERVICES -gt 0 ]; then
            exit 2
        else
            exit 0
        fi
    fi
}

# Handle script interruption
trap 'log_info "Health check validation interrupted"; exit 130' INT TERM

# Run main function
main "$@"
