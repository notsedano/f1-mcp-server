# Environment Validation Script for F1 MCP Server Cloud Deployment
# PowerShell version for Windows environments

param(
    [string]$EnvFile = ".env"
)

# Function to print colored output
function Write-Status {
    param(
        [string]$Status,
        [string]$Message
    )
    
    switch ($Status) {
        "SUCCESS" { Write-Host "✓ $Message" -ForegroundColor Green }
        "WARNING" { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "ERROR" { Write-Host "✗ $Message" -ForegroundColor Red }
        "INFO" { Write-Host "ℹ $Message" -ForegroundColor Blue }
    }
}

# Function to check if a variable is set
function Test-RequiredVariable {
    param(
        [string]$VariableName,
        [hashtable]$Environment
    )
    
    if ([string]::IsNullOrEmpty($Environment[$VariableName])) {
        Write-Status "ERROR" "$VariableName is not set"
        return $false
    } else {
        Write-Status "SUCCESS" "$VariableName is set"
        return $true
    }
}

# Function to check variable pattern
function Test-VariablePattern {
    param(
        [string]$VariableName,
        [string]$Pattern,
        [hashtable]$Environment
    )
    
    $value = $Environment[$VariableName]
    if ($value -match $Pattern) {
        Write-Status "SUCCESS" "$VariableName format is valid"
        return $true
    } else {
        Write-Status "ERROR" "$VariableName format is invalid (expected: $Pattern)"
        return $false
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "F1 MCP Server Environment Validation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Load environment variables
$envVars = @{}

if (Test-Path $EnvFile) {
    Write-Status "INFO" "Loading environment from $EnvFile file..."
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $envVars[$matches[1]] = $matches[2]
        }
    }
} else {
    Write-Status "WARNING" "$EnvFile file not found, using system environment variables"
    Get-ChildItem Env: | ForEach-Object {
        $envVars[$_.Name] = $_.Value
    }
}

# Track validation results
$validationErrors = 0

Write-Host ""
Write-Status "INFO" "Checking required environment variables..."

# Required variables
$requiredVars = @(
    "ENVIRONMENT",
    "MCP_SERVER_HOST",
    "MCP_SERVER_PORT",
    "NODE_ENV",
    "PORT",
    "BRIDGE_HOST",
    "BRIDGE_PORT",
    "API_SECRET_KEY",
    "JWT_SECRET"
)

foreach ($var in $requiredVars) {
    if (-not (Test-RequiredVariable -VariableName $var -Environment $envVars)) {
        $validationErrors++
    }
}

Write-Host ""
Write-Status "INFO" "Validating variable formats..."

# Validate port numbers
if (-not (Test-VariablePattern -VariableName "MCP_SERVER_PORT" -Pattern "^\d+$" -Environment $envVars)) {
    $validationErrors++
}

if (-not (Test-VariablePattern -VariableName "PORT" -Pattern "^\d+$" -Environment $envVars)) {
    $validationErrors++
}

if (-not (Test-VariablePattern -VariableName "BRIDGE_PORT" -Pattern "^\d+$" -Environment $envVars)) {
    $validationErrors++
}

# Validate environment values
$environment = $envVars["ENVIRONMENT"]
if ($environment -notin @("production", "staging", "development")) {
    Write-Status "ERROR" "ENVIRONMENT must be one of: production, staging, development"
    $validationErrors++
} else {
    Write-Status "SUCCESS" "ENVIRONMENT value is valid"
}

# Validate NODE_ENV
$nodeEnv = $envVars["NODE_ENV"]
if ($nodeEnv -notin @("production", "development")) {
    Write-Status "ERROR" "NODE_ENV must be one of: production, development"
    $validationErrors++
} else {
    Write-Status "SUCCESS" "NODE_ENV value is valid"
}

# Validate secret keys (should be at least 32 characters)
$apiSecret = $envVars["API_SECRET_KEY"]
if ($apiSecret.Length -lt 32) {
    Write-Status "ERROR" "API_SECRET_KEY should be at least 32 characters long"
    $validationErrors++
} else {
    Write-Status "SUCCESS" "API_SECRET_KEY length is sufficient"
}

$jwtSecret = $envVars["JWT_SECRET"]
if ($jwtSecret.Length -lt 32) {
    Write-Status "ERROR" "JWT_SECRET should be at least 32 characters long"
    $validationErrors++
} else {
    Write-Status "SUCCESS" "JWT_SECRET length is sufficient"
}

# Optional but recommended variables
Write-Host ""
Write-Status "INFO" "Checking optional but recommended variables..."

$optionalVars = @("GEMINI_API_KEY", "CORS_ORIGINS", "CLOUD_PROVIDER")

foreach ($var in $optionalVars) {
    if ([string]::IsNullOrEmpty($envVars[$var])) {
        Write-Status "WARNING" "$var is not set (optional but recommended)"
    } else {
        Write-Status "SUCCESS" "$var is set"
    }
}

# Check if running in production mode
Write-Host ""
Write-Status "INFO" "Production readiness check..."
if ($environment -eq "production") {
    $debug = $envVars["DEBUG"]
    if ($debug -eq "true") {
        Write-Status "ERROR" "DEBUG should be false in production"
        $validationErrors++
    } else {
        Write-Status "SUCCESS" "DEBUG is disabled for production"
    }
    
    $devMode = $envVars["DEV_MODE"]
    if ($devMode -eq "true") {
        Write-Status "ERROR" "DEV_MODE should be false in production"
        $validationErrors++
    } else {
        Write-Status "SUCCESS" "DEV_MODE is disabled for production"
    }
}

# Network connectivity test
Write-Host ""
Write-Status "INFO" "Testing network connectivity..."
try {
    $response = Invoke-WebRequest -Uri "http://httpbin.org/get" -TimeoutSec 5 -UseBasicParsing
    Write-Status "SUCCESS" "Internet connectivity is available"
} catch {
    Write-Status "WARNING" "Internet connectivity test failed: $($_.Exception.Message)"
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($validationErrors -eq 0) {
    Write-Status "SUCCESS" "Environment validation passed!"
    Write-Host "Your environment is ready for deployment."
    exit 0
} else {
    Write-Status "ERROR" "Environment validation failed with $validationErrors error(s)"
    Write-Host "Please fix the errors above before proceeding with deployment."
    exit 1
}
