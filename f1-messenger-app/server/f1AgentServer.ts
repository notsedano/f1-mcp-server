// F1 Agent Server for Firebase Integration
// Exposes your F1 agent as an HTTP endpoint compatible with Firebase frontend

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import F1 agent services after dotenv is loaded
import { llmService } from '../src/services/llmService';
import { callF1ToolsRecursive } from '../src/utils/toolCaller';
import { TemporalReasoning } from '../src/utils/temporalReasoning';

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

    // Use centralized temporal reasoning to determine query processing
    let queryPlan;
    if (TemporalReasoning.shouldUseIntelligentFallback(latestUserMessage.content)) {
      console.log('🎯 Server: Using intelligent fallback for temporal query');
      queryPlan = await llmService.intelligentFallbackParseQuery(latestUserMessage.content);
    } else {
      // Process with F1 agent using LLM service
      queryPlan = await llmService.parseQueryIntelligently(latestUserMessage.content);
    }
    console.log('Query plan:', queryPlan);
    
    // Handle cases where no valid tool is selected (basic conversation, clarification)
    if (!queryPlan.tool || queryPlan.tool === 'null' || queryPlan.tool === 'clarification') {
      console.log('🎭 Handling basic conversation or clarification request');
      
      // Generate a conversational response using HellRacer personality
      const conversationalResponse = await llmService.generateConversationalResponse(
        latestUserMessage.content,
        queryPlan
      );
      
      const response: ChatResponse = {
        message: {
          content: conversationalResponse
        }
      };
      
      console.log('Sending conversational response to Firebase');
      res.json(response);
      return;
    }
    
    // Call F1 tools (now recursive) - only for valid tool calls
    const toolResult = await callF1ToolsRecursive(queryPlan);
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

// Removed duplicate functions - now using shared utility from ../src/utils/toolCaller

// Start server
app.listen(PORT, () => {
  console.log(`F1 Agent Server running on http://localhost:${PORT}`);
  console.log(`Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`LLM Available: ${llmService.isAvailable() ? 'Yes' : 'No'}`);
  console.log(`CORS enabled for all origins`);
});

export default app; 