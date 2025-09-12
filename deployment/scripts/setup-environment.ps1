# Environment Setup Script for F1 MCP Server Cloud Deployment
# PowerShell version for Windows environments

param(
    [string]$EnvFile = ".env",
    [switch]$Force
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

# Function to generate a secure random string
function New-SecureSecret {
    param(
        [int]$Length = 32
    )
    
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $secret = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $secret += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $secret
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "F1 MCP Server Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if .env already exists
if (Test-Path $EnvFile) {
    if (-not $Force) {
        Write-Status "WARNING" "$EnvFile file already exists"
        $response = Read-Host "Do you want to overwrite it? (y/N)"
        if ($response -notmatch '^[Yy]$') {
            Write-Status "INFO" "Keeping existing $EnvFile file"
            exit 0
        }
    }
}

Write-Status "INFO" "Creating environment configuration..."

# Copy template to .env
$templatePath = "deployment/config/environment.template"
if (Test-Path $templatePath) {
    Copy-Item $templatePath $EnvFile
    Write-Status "SUCCESS" "Created $EnvFile from template"
} else {
    Write-Status "ERROR" "Environment template not found at $templatePath"
    exit 1
}

# Generate secure secrets
Write-Status "INFO" "Generating secure secrets..."

$apiSecret = New-SecureSecret -Length 64
$jwtSecret = New-SecureSecret -Length 64

# Update .env with generated secrets
$content = Get-Content $EnvFile
$content = $content -replace "your-secret-key-here", $apiSecret
$content = $content -replace "your-jwt-secret-here", $jwtSecret
$content | Set-Content $EnvFile

Write-Status "SUCCESS" "Generated and set API_SECRET_KEY and JWT_SECRET"

# Interactive configuration
Write-Host ""
Write-Status "INFO" "Interactive configuration setup..."
Write-Host ""

# Environment selection
Write-Host "Select deployment environment:"
Write-Host "1) Production"
Write-Host "2) Staging"
Write-Host "3) Development"
$envChoice = Read-Host "Enter choice (1-3) [1]"
if ([string]::IsNullOrEmpty($envChoice)) { $envChoice = "1" }

switch ($envChoice) {
    "1" {
        $environment = "production"
        $debug = "false"
        $devMode = "false"
    }
    "2" {
        $environment = "staging"
        $debug = "false"
        $devMode = "false"
    }
    "3" {
        $environment = "development"
        $debug = "true"
        $devMode = "true"
    }
}

# Update environment settings
$content = Get-Content $EnvFile
$content = $content -replace "ENVIRONMENT=.*", "ENVIRONMENT=$environment"
$content = $content -replace "DEBUG=.*", "DEBUG=$debug"
$content = $content -replace "DEV_MODE=.*", "DEV_MODE=$devMode"
$content | Set-Content $EnvFile

Write-Status "SUCCESS" "Set environment to: $environment"

# Cloud provider selection
Write-Host ""
Write-Host "Select cloud provider:"
Write-Host "1) DigitalOcean"
Write-Host "2) AWS"
Write-Host "3) Google Cloud Platform"
Write-Host "4) Azure"
Write-Host "5) Other"
$cloudChoice = Read-Host "Enter choice (1-5) [1]"
if ([string]::IsNullOrEmpty($cloudChoice)) { $cloudChoice = "1" }

switch ($cloudChoice) {
    "1" { $cloudProvider = "digitalocean" }
    "2" { $cloudProvider = "aws" }
    "3" { $cloudProvider = "gcp" }
    "4" { $cloudProvider = "azure" }
    "5" { $cloudProvider = Read-Host "Enter cloud provider name" }
}

$content = Get-Content $EnvFile
$content = $content -replace "CLOUD_PROVIDER=.*", "CLOUD_PROVIDER=$cloudProvider"
$content | Set-Content $EnvFile

Write-Status "SUCCESS" "Set cloud provider to: $cloudProvider"

# Domain configuration
Write-Host ""
$domain = Read-Host "Enter your domain name (optional)"
if (-not [string]::IsNullOrEmpty($domain)) {
    $content = Get-Content $EnvFile
    $content = $content -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=https://$domain,https://www.$domain"
    $content | Set-Content $EnvFile
    Write-Status "SUCCESS" "Set CORS origins for domain: $domain"
}

# API keys
Write-Host ""
$geminiKey = Read-Host "Enter Gemini API key (optional, press Enter to skip)"
if (-not [string]::IsNullOrEmpty($geminiKey)) {
    $content = Get-Content $EnvFile
    $content = $content -replace "your-gemini-api-key-here", $geminiKey
    $content | Set-Content $EnvFile
    Write-Status "SUCCESS" "Set Gemini API key"
}

# Set proper permissions (Windows equivalent)
$acl = Get-Acl $EnvFile
$acl.SetAccessRuleProtection($true, $false)
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("$env:USERNAME", "FullControl", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl -Path $EnvFile -AclObject $acl

Write-Status "SUCCESS" "Set secure permissions on $EnvFile file"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Status "SUCCESS" "Environment setup completed!"
Write-Host ""
Write-Status "INFO" "Next steps:"
Write-Host "1. Review the $EnvFile file and make any additional changes"
Write-Host "2. Run: .\deployment\scripts\validate-environment.ps1"
Write-Host "3. Run: .\deployment\scripts\deploy.ps1"
Write-Host ""
Write-Status "WARNING" "Important: Keep your $EnvFile file secure and never commit it to version control!"
