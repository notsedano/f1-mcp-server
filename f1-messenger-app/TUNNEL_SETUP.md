# Cloudflare Tunnel Setup for F1 Agent Server

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)
```powershell
# Run the tunnel-only script (server must be running)
.\tunnel-only.ps1
```

### Option 2: Manual Setup
```powershell
# 1. Start your F1 Agent Server
npm run start:agent

# 2. In a new terminal, start the tunnel
cloudflared tunnel --url http://localhost:11435
```

## 📋 What You'll See

When the tunnel starts, you'll see output like:
```
2025-07-29T07:50:00Z INF Starting tunnel tunnelID=abc123
2025-07-29T07:50:00Z INF Version 2025.7.0
2025-07-29T07:50:00Z INF Requesting new quick tunnel on trycloudflare.com...
2025-07-29T07:50:00Z INF +----------------------------+
2025-07-29T07:50:00Z INF |  Your quick tunnel has been created!  |
2025-07-29T07:50:00Z INF |  URL: https://abc123.trycloudflare.com |
2025-07-29T07:50:00Z INF +----------------------------+
```

## 🔧 Update Your Firebase Frontend

Replace `localhost:11435` with your tunnel URL:

```javascript
// Before
const F1_ENDPOINT = "http://localhost:11435/api/chat";

// After
const F1_ENDPOINT = "https://abc123.trycloudflare.com/api/chat";
```

## 🧪 Test the Connection

Test your tunnel URL:
```bash
curl -X POST https://abc123.trycloudflare.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-1.5-flash",
    "messages": [{"role": "user", "content": "Who won the 2023 British GP?"}],
    "stream": false
  }'
```

## ✅ Expected Response
```json
{
  "message": {
    "content": "Max Verstappen won the 2023 British Grand Prix!"
  }
}
```

## 🔄 Troubleshooting

### Tunnel Not Starting
- Make sure cloudflared is installed: `cloudflared --version`
- Check if F1 server is running: `curl http://localhost:11435/health`

### Connection Issues
- Verify the tunnel URL is correct
- Check that your Firebase app is using HTTPS
- Ensure CORS is enabled (already configured in server)

### Server Not Responding
- Restart the F1 Agent Server: `npm run start:agent`
- Check server logs for errors
- Verify port 11435 is not blocked by firewall

## 📱 Firebase Frontend Integration

Update your Firebase app configuration:

```javascript
// Firebase configuration
const F1_CONFIG = {
  endpoint: "https://your-tunnel-url.trycloudflare.com/api/chat",
  headers: {
    "Content-Type": "application/json"
  }
};

// Example API call
async function sendF1Query(message) {
  try {
    const response = await fetch(F1_CONFIG.endpoint, {
      method: 'POST',
      headers: F1_CONFIG.headers,
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        messages: [{ role: "user", content: message }],
        stream: false
      })
    });
    
    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('F1 API Error:', error);
    return 'Sorry, I encountered an error processing your F1 query.';
  }
}
```

## 🎯 Success Indicators

✅ Tunnel URL appears in console  
✅ `curl` test returns F1 data  
✅ Firebase app connects successfully  
✅ No CORS errors in browser console  
✅ Real-time F1 queries work  

## 🔒 Security Notes

- Tunnel URLs are temporary and change on restart
- For production, consider a permanent tunnel with custom domain
- Monitor tunnel logs for unusual activity
- Keep cloudflared updated regularly 