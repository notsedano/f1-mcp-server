# Start F1 Agent Server and Cloudflare Tunnel
Write-Host "Starting F1 Agent Server..." -ForegroundColor Green
cd $PSScriptRoot
npm run start:agent

Write-Host "Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep 5

Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Green
Write-Host "The tunnel URL will appear below. Copy it and update your Firebase frontend." -ForegroundColor Cyan
Write-Host ""

# Start the tunnel
cloudflared tunnel --url http://localhost:11435

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 