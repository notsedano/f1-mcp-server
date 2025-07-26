# F1 Data Assistant - React Messenger App

A React-based messenger webapp that integrates with your F1-MCP-Server to provide natural language access to Formula 1 data. Users can ask questions about F1 statistics, race results, driver information, and more using conversational queries.

![F1 Data Assistant](https://img.shields.io/badge/F1-Data%20Assistant-red?style=for-the-badge&logo=formula1)

## Features

🏎️ **Natural Language Queries**: Ask about F1 data in plain English  
📊 **Real-time Data**: Connected to your F1-MCP-Server for live data access  
💬 **Chat Interface**: Intuitive messenger-style conversation  
🏆 **Comprehensive Data**: Championship standings, race results, driver stats, schedules  
🎨 **F1-themed UI**: Racing-inspired design with F1 color scheme  
📱 **Responsive Design**: Works on desktop and mobile devices  

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │────│   MCP Client    │────│  F1-MCP-Server  │
│  (Frontend UI)  │    │ (use-mcp hook)  │    │  (Your Server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Service   │    │  Tool Discovery │    │    FastF1 API   │
│ (Query Process) │    │ & Invocation    │    │   (F1 Data)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

1. **F1-MCP-Server**: Your F1 MCP server must be running
2. **Node.js**: Version 18 or higher
3. **npm/yarn**: For package management
4. **Gemini API Key**: Get from https://makersuite.google.com/app/apikey

## Installation & Setup

1. **Clone or navigate to the project**:
   ```bash
   cd f1-messenger-app
   ```

2. **Install dependencies** (already done):
   ```bash
   npm install
   ```

3. **Set up Gemini API Key**:
   Create a `.env` file in the project root:
   ```bash
   # .env
   REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the F1-MCP-Server**:
   ```bash
   # In the parent directory
   cd ../
   python -m f1_mcp_server --transport sse --port 8000
   ```

5. **Start the React app**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to `http://localhost:5173`

## Usage Examples

Try asking these types of questions:

### Championship Standings
- "Show me the 2023 championship standings"
- "Who won the 2024 drivers championship?"

### Driver Information
- "Tell me about Lewis Hamilton's 2023 performance"
- "How did Verstappen perform in the British GP?"

### Race Results
- "Who won the Monaco Grand Prix in 2023?"
- "Show me the results from the last race"

### Race Schedule
- "What's the 2024 F1 calendar?"
- "When is the next race?"

### Performance Analysis
- "Compare Hamilton and Verstappen's lap times"
- "Analyze Leclerc's performance in qualifying"

## Project Structure

```
f1-messenger-app/
├── src/
│   ├── components/          # React components
│   │   ├── ChatThread.tsx   # Message display component
│   │   ├── InputArea.tsx    # User input component
│   │   ├── MessageBubble.tsx # Individual message component
│   │   ├── TypingIndicator.tsx # Loading indicator
│   │   └── ConnectionStatus.tsx # MCP connection status
│   ├── services/
│   │   └── llmService.ts    # LLM integration service
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
└── package.json            # Dependencies and scripts
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MCP_SERVER_URL` | URL of your F1-MCP-Server | `http://localhost:8000` |
| `VITE_OPENAI_API_KEY` | OpenAI API key (if using) | - |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key (if using) | - |

### MCP Server Configuration

The app expects your F1-MCP-Server to be running with these tools available:
- `get_event_schedule`
- `get_event_info`
- `get_session_results`
- `get_driver_info`
- `analyze_driver_performance`
- `compare_drivers`
- `get_telemetry`
- `get_championship_standings`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Tool Integration**: Update `llmService.ts` to handle new MCP tools
2. **UI Components**: Add new components in the `components/` directory
3. **Styling**: Update CSS files with F1-themed colors and animations

### LLM Integration Options

The current implementation uses a rule-based system for demo purposes. You can integrate with:

1. **OpenAI**: Uncomment OpenAI code in `llmService.ts`
2. **Anthropic Claude**: Add Claude integration
3. **Local LLM**: Use Ollama or similar local models
4. **Custom LLM**: Implement your own LLM service

## Troubleshooting

### Common Issues

1. **Connection Failed**: 
   - Ensure F1-MCP-Server is running on the correct port
   - Check CORS settings on your MCP server

2. **No Tools Available**:
   - Verify your F1-MCP-Server exposes the expected tools
   - Check the server logs for errors

3. **Build Errors**:
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript errors: `npm run lint`

### Development Tips

- Use browser dev tools to monitor WebSocket/HTTP connections
- Check the Network tab for MCP server communication
- Monitor console logs for detailed error information

## Production Deployment

### Building for Production

```bash
npm run build
```

### Deployment Options

1. **Static Hosting**: Vercel, Netlify, GitHub Pages
2. **CDN**: Deploy built files to any CDN
3. **Docker**: Containerize the application

### Environment Configuration

For production, ensure:
- `VITE_MCP_SERVER_URL` points to your production MCP server
- Configure CORS on your MCP server for the frontend domain
- Set up proper SSL/TLS certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your F1-MCP-Server
5. Submit a pull request

## License

This project is part of the F1-MCP-Server ecosystem and follows the same licensing terms.

## Related Projects

- [F1-MCP-Server](../): The MCP server providing F1 data
- [FastF1](https://github.com/theOehrly/Fast-F1): Python package for F1 data
- [Model Context Protocol](https://modelcontextprotocol.io/): The open protocol for AI integration
