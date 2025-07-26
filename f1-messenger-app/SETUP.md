# Quick Setup Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start the F1-MCP-Server
Open a terminal in the parent directory and run:
```bash
cd ../
python -m f1_mcp_server --transport sse --port 8000
```

### Step 2: Start the React App
Open another terminal in this directory and run:
```bash
npm run dev
```

### Step 3: Open Your Browser
Navigate to: http://localhost:5173

### Step 4: Test the Connection
You should see a green "Connected" status in the top right corner.

### Step 5: Try It Out!
Ask questions like:
- "Show me the 2023 championship standings"
- "Tell me about Lewis Hamilton's performance"
- "What's the 2024 F1 calendar?"

## 🔧 Configuration

Create a `.env` file in this directory with:
```
VITE_MCP_SERVER_URL=http://localhost:8000
```

## 🐛 Troubleshooting

**Connection Failed?**
- Ensure the F1-MCP-Server is running on port 8000
- Check that both services are running on the same machine

**No Data Returned?**
- Verify the F1-MCP-Server has access to Formula 1 data
- Check the browser console for error messages

**Build Errors?**
- Run `npm install` to ensure all dependencies are installed
- Run `npm run type-check` to check for TypeScript errors

## 🏎️ Ready to Race!
Your F1 Data Assistant is now ready to provide Formula 1 insights! 