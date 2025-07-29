# Start Cloudflare Tunnel for F1 Agent Server
Write-Host "Starting Cloudflare Tunnel for F1 Agent Server..." -ForegroundColor Green
Write-Host "Make sure your F1 Agent Server is running on localhost:11435" -ForegroundColor Yellow
Write-Host ""

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11435/health" -TimeoutSec 5
    Write-Host "✅ F1 Agent Server is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ F1 Agent Server is not running on localhost:11435" -ForegroundColor Red
    Write-Host "Please start the server first with: npm run start:agent" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "The tunnel URL will appear below. Copy it and update your Firebase frontend." -ForegroundColor Cyan
Write-Host ""

# Start the tunnel
cloudflared tunnel --url http://localhost:11435 