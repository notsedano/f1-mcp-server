@echo off
echo Starting F1 Agent Server...
cd /d "%~dp0"
npm run start:agent

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Cloudflare Tunnel...
echo The tunnel URL will appear below. Copy it and update your Firebase frontend.
echo.
cloudflared tunnel --url http://localhost:11435

pause 