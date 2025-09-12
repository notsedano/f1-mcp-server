# Health Check Validation Script (PowerShell)
# Validates the health of all F1 MCP Server services

param(
    [switch]$Verbose,
    [int]$Timeout = 10,
    [int]$Retries = 3,
    [int]$Delay = 5,
    [switch]$FailFast,
    [switch]$Json,
    [switch]$Continuous,
    [int]$Interval = 30,
    [string]$Service,
    [switch]$Help
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$ComposeFile = Join-Path $ProjectRoot "deployment\config\docker-compose.yml"

# Service configuration
$Services = @{
    "mcp-server" = "http://localhost:8000/health"
    "messenger-client" = "http://localhost:3000/health"
    "mcp-bridge" = "http://localhost:8001/health"
    "api-gateway" = "http://localhost:8080/health"
    "monitoring" = "http://localhost:3002/health"
    "redis" = "redis://localhost:6379"
    "prometheus" = "http://localhost:9090/-/healthy"
    "grafana" = "http://localhost:3000/api/health"
}

# Global variables
$HealthResults = @{}
$ResponseTimes = @{}
$ErrorCounts = @{}
$TotalServices = $Services.Count
$HealthyServices = 0
$UnhealthyServices = 0
$DegradedServices = 0
$TotalResponseTime = 0

# Logging functions
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Usage information
function Show-Usage {
    Write-Host @"
Usage: .\validate-health.ps1 [OPTIONS]

Health check validation script for F1 MCP Server services.

OPTIONS:
    -Verbose          Enable verbose output
    -Timeout SECONDS  Request timeout in seconds (default: 10)
    -Retries COUNT    Number of retry attempts (default: 3)
    -Delay SECONDS    Delay between retries (default: 5)
    -FailFast         Exit on first failure
    -Json             Output results in JSON format
    -Continuous       Run continuously with specified interval
    -Interval SECONDS Interval for continuous mode (default: 30)
    -Service NAME     Check specific service only
    -Help             Show this help message

EXAMPLES:
    .\validate-health.ps1                      # Run basic health check
    .\validate-health.ps1 -Verbose             # Run with verbose output
    .\validate-health.ps1 -Json                # Output JSON results
    .\validate-health.ps1 -Continuous -Interval 60  # Run continuously every 60 seconds
    .\validate-health.ps1 -Service mcp-server  # Check only MCP server
    .\validate-health.ps1 -FailFast -Timeout 5 # Fail fast with 5 second timeout

"@
}

# Check if Docker Compose is available
function Test-DockerCompose {
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-LogError "docker-compose is not installed or not in PATH"
        exit 1
    }
    
    if (-not (Test-Path $ComposeFile)) {
        Write-LogError "Docker Compose file not found: $ComposeFile"
        exit 1
    }
}

# Check if services are running
function Test-ServicesRunning {
    Write-LogInfo "Checking if services are running..."
    
    $runningServices = docker-compose -f $ComposeFile ps | Select-String "Up"
    if (-not $runningServices) {
        Write-LogError "No services are running. Please start the services first:"
        Write-LogInfo "docker-compose -f $ComposeFile up -d"
        exit 1
    }
    
    Write-LogSuccess "Services are running"
}

# Perform HTTP health check
function Test-HttpHealth {
    param(
        [string]$ServiceName,
        [string]$Url
    )
    
    $startTime = Get-Date
    
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalSeconds
        
        $ResponseTimes[$ServiceName] = $responseTime
        $script:TotalResponseTime += $responseTime
        
        if ($response.StatusCode -eq 200) {
            $HealthResults[$ServiceName] = "healthy"
            $script:HealthyServices++
            
            if ($Verbose) {
                Write-LogSuccess "$ServiceName is healthy ($([math]::Round($responseTime, 3))s)"
                if ($response.Content) {
                    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
                }
            }
            return $true
        } else {
            $HealthResults[$ServiceName] = "unhealthy"
            $script:UnhealthyServices++
            Write-LogError "$ServiceName returned HTTP $($response.StatusCode)"
            return $false
        }
    } catch {
        $HealthResults[$ServiceName] = "unhealthy"
        $script:UnhealthyServices++
        Write-LogError "$ServiceName is not responding: $($_.Exception.Message)"
        return $false
    }
}

# Perform Redis health check
function Test-RedisHealth {
    param(
        [string]$ServiceName,
        [string]$Url
    )
    
    $startTime = Get-Date
    
    try {
        $result = docker-compose -f $ComposeFile exec -T redis redis-cli ping 2>$null
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalSeconds
        
        if ($result -match "PONG") {
            $ResponseTimes[$ServiceName] = $responseTime
            $script:TotalResponseTime += $responseTime
            
            $HealthResults[$ServiceName] = "healthy"
            $script:HealthyServices++
            
            if ($Verbose) {
                Write-LogSuccess "$ServiceName is healthy ($([math]::Round($responseTime, 3))s)"
            }
            return $true
        } else {
            $HealthResults[$ServiceName] = "unhealthy"
            $script:UnhealthyServices++
            Write-LogError "$ServiceName is not responding"
            return $false
        }
    } catch {
        $HealthResults[$ServiceName] = "unhealthy"
        $script:UnhealthyServices++
        Write-LogError "$ServiceName is not responding: $($_.Exception.Message)"
        return $false
    }
}

# Perform health check with retries
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url
    )
    
    $attempt = 1
    $result = $false
    
    if ($Verbose) {
        Write-LogInfo "Checking $ServiceName at $Url..."
    }
    
    while ($attempt -le $Retries) {
        if ($Verbose -and $attempt -gt 1) {
            Write-LogInfo "Retry attempt $attempt/$Retries for $ServiceName..."
        }
        
        if ($Url -like "redis://*") {
            $result = Test-RedisHealth -ServiceName $ServiceName -Url $Url
        } else {
            $result = Test-HttpHealth -ServiceName $ServiceName -Url $Url
        }
        
        if ($result) {
            break
        }
        
        if ($attempt -lt $Retries) {
            Start-Sleep -Seconds $Delay
        }
        
        $attempt++
    }
    
    if (-not $result) {
        $ErrorCounts[$ServiceName] = ($ErrorCounts[$ServiceName] + 1)
        
        if ($FailFast) {
            Write-LogError "Health check failed for $ServiceName. Exiting."
            exit 1
        }
    }
    
    return $result
}

# Check all services
function Test-AllServices {
    Write-LogInfo "Starting health check validation..."
    Write-LogInfo "Checking $TotalServices services with timeout ${Timeout}s"
    
    # Reset counters
    $script:HealthyServices = 0
    $script:UnhealthyServices = 0
    $script:DegradedServices = 0
    $script:TotalResponseTime = 0
    
    # Clear previous results
    $HealthResults.Clear()
    $ResponseTimes.Clear()
    $ErrorCounts.Clear()
    
    $checkedServices = 0
    
    foreach ($serviceName in $Services.Keys) {
        # Skip if service filter is specified
        if ($Service -and $serviceName -ne $Service) {
            continue
        }
        
        Test-ServiceHealth -ServiceName $serviceName -Url $Services[$serviceName]
        $checkedServices++
    }
    
    # Update total services count if filter was applied
    if ($Service) {
        $script:TotalServices = $checkedServices
    }
}

# Generate JSON output
function Get-JsonOutput {
    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $overallStatus = "healthy"
    
    if ($UnhealthyServices -gt 0) {
        $overallStatus = "unhealthy"
    } elseif ($DegradedServices -gt 0) {
        $overallStatus = "degraded"
    }
    
    $avgResponseTime = if ($TotalServices -gt 0) { 
        [math]::Round($TotalResponseTime / $TotalServices, 3) 
    } else { 
        0 
    }
    
    $json = @{
        timestamp = $timestamp
        overall_status = $overallStatus
        summary = @{
            total_services = $TotalServices
            healthy_services = $HealthyServices
            unhealthy_services = $UnhealthyServices
            degraded_services = $DegradedServices
            average_response_time = $avgResponseTime
        }
        services = @{}
    }
    
    foreach ($serviceName in $HealthResults.Keys) {
        $json.services[$serviceName] = @{
            status = $HealthResults[$serviceName]
            response_time = if ($ResponseTimes[$serviceName]) { $ResponseTimes[$serviceName] } else { 0 }
            error_count = if ($ErrorCounts[$serviceName]) { $ErrorCounts[$serviceName] } else { 0 }
            url = $Services[$serviceName]
        }
    }
    
    return $json | ConvertTo-Json -Depth 10
}

# Generate summary report
function Show-Summary {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $overallStatus = "healthy"
    
    if ($UnhealthyServices -gt 0) {
        $overallStatus = "unhealthy"
    } elseif ($DegradedServices -gt 0) {
        $overallStatus = "degraded"
    }
    
    $avgResponseTime = if ($TotalServices -gt 0) { 
        [math]::Round($TotalResponseTime / $TotalServices, 3) 
    } else { 
        0 
    }
    
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Health Check Summary - $timestamp" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Overall Status: $overallStatus" -ForegroundColor White
    Write-Host "Total Services: $TotalServices" -ForegroundColor White
    Write-Host "Healthy Services: $HealthyServices" -ForegroundColor Green
    Write-Host "Unhealthy Services: $UnhealthyServices" -ForegroundColor Red
    Write-Host "Degraded Services: $DegradedServices" -ForegroundColor Yellow
    Write-Host "Average Response Time: ${avgResponseTime}s" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Cyan
    
    if ($UnhealthyServices -gt 0) {
        Write-Host ""
        Write-Host "Unhealthy Services:" -ForegroundColor Red
        foreach ($serviceName in $HealthResults.Keys) {
            if ($HealthResults[$serviceName] -eq "unhealthy") {
                $responseTime = if ($ResponseTimes[$serviceName]) { [math]::Round($ResponseTimes[$serviceName], 3) } else { 0 }
                Write-Host "  - $serviceName (${responseTime}s)" -ForegroundColor Red
            }
        }
    }
    
    if ($DegradedServices -gt 0) {
        Write-Host ""
        Write-Host "Degraded Services:" -ForegroundColor Yellow
        foreach ($serviceName in $HealthResults.Keys) {
            if ($HealthResults[$serviceName] -eq "degraded") {
                $responseTime = if ($ResponseTimes[$serviceName]) { [math]::Round($ResponseTimes[$serviceName], 3) } else { 0 }
                Write-Host "  - $serviceName (${responseTime}s)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host ""
}

# Continuous monitoring mode
function Start-ContinuousMonitoring {
    Write-LogInfo "Starting continuous health monitoring (interval: ${Interval}s)"
    Write-LogInfo "Press Ctrl+C to stop"
    
    while ($true) {
        Test-AllServices
        
        if ($Json) {
            Get-JsonOutput
        } else {
            Show-Summary
        }
        
        Start-Sleep -Seconds $Interval
    }
}

# Main execution
function Main {
    if ($Help) {
        Show-Usage
        return
    }
    
    # Check prerequisites
    Test-DockerCompose
    Test-ServicesRunning
    
    # Run health checks
    if ($Continuous) {
        Start-ContinuousMonitoring
    } else {
        Test-AllServices
        
        if ($Json) {
            Get-JsonOutput
        } else {
            Show-Summary
        }
        
        # Exit with appropriate code
        if ($UnhealthyServices -gt 0) {
            exit 1
        } elseif ($DegradedServices -gt 0) {
            exit 2
        } else {
            exit 0
        }
    }
}

# Handle script interruption
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Write-LogInfo "Health check validation interrupted"
    exit 130
}

# Run main function
try {
    Main
} catch {
    Write-LogError "An error occurred: $($_.Exception.Message)"
    exit 1
}
