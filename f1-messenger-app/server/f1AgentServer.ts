// F1 Agent Server for Firebase Integration
// Exposes your F1 agent as an HTTP endpoint compatible with Firebase frontend

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import F1 agent services after dotenv is loaded
import { llmService } from '../src/services/llmService';

// Re-initialize LLM service after dotenv is loaded
setTimeout(() => {
  llmService.forceReinitialize();
}, 100);

// Types for Firebase compatibility
interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
}

interface ChatResponse {
  message: {
    content: string;  // Remove 'role' field to match frontend expectations
  };
}

// Initialize Express app
const app = express();
const PORT = process.env.F1_AGENT_PORT || 11435;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'f1-agent',
    timestamp: new Date().toISOString(),
    port: PORT,
    llm_available: llmService.isAvailable()
  });
});

// Chat endpoint (matches Firebase's expected format)
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received chat request:', {
      model: req.body.model,
      messagesCount: req.body.messages?.length,
      stream: req.body.stream
    });
    
    const request: ChatRequest = req.body;
    
    // Validate request
    if (!request.messages || !Array.isArray(request.messages)) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'Messages array is required'
      });
    }
    
    // Extract the latest user message
    const userMessages = request.messages.filter(msg => msg.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];
    
    if (!latestUserMessage) {
      return res.status(400).json({
        error: 'No user message found',
        message: 'At least one user message is required'
      });
    }

    console.log('F1 Agent processing:', latestUserMessage.content);

    // Process with F1 agent using LLM service
    const queryPlan = await llmService.parseQueryIntelligently(latestUserMessage.content);
    console.log('Query plan:', queryPlan);
    
    // Call F1 tools
    const toolResult = await callF1Tools(queryPlan);
    console.log('F1 tools result received');
    
    // Synthesize response using LLM
    const agentResponse = await llmService.synthesizeResponse(
      latestUserMessage.content, 
      toolResult, 
      queryPlan.tool
    );

    console.log('F1 Agent response synthesized');

    // Return response in Firebase-compatible format
    const response: ChatResponse = {
      message: {
        content: agentResponse  // Only include 'content' field
      }
    };
    
    console.log('Sending response to Firebase');
    res.json(response);
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    
    // Return error in Firebase-compatible format
    res.status(500).json({
      message: {
        content: 'Sorry, I encountered an error processing your F1 query. Please try again.'
      }
    });
  }
});

/**
 * Call F1 tools based on query plan
 */
async function callF1Tools(queryPlan: any): Promise<any> {
  try {
    console.log('Calling F1 tool:', queryPlan.tool, 'with args:', queryPlan.arguments);
    
    const response = await fetch('http://localhost:3001/mcp/tool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: queryPlan.tool,
        arguments: queryPlan.arguments
      })
    });

    if (!response.ok) {
      throw new Error(`Bridge request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('F1 tool response received');
    
    return result;

  } catch (error) {
    console.error('F1 tools call failed:', error);
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`F1 Agent Server running on http://localhost:${PORT}`);
  console.log(`Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`LLM Available: ${llmService.isAvailable() ? 'Yes' : 'No'}`);
  console.log(`CORS enabled for all origins`);
});

export default app; 