// F1 Agent Server for Firebase Integration
// Exposes your F1 agent as an HTTP endpoint compatible with Firebase frontend

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import F1 agent services after dotenv is loaded
import { llmService } from '../src/services/llmService';
import { geminiKnowledgeService } from '../src/services/geminiKnowledgeService';
import { callF1ToolsRecursive } from '../src/utils/toolCaller';
import { TemporalReasoning } from '../src/utils/temporalReasoning';

// Re-initialize services after dotenv is loaded
setTimeout(() => {
  llmService.forceReinitialize();
  // Re-initialize Gemini knowledge service
  geminiKnowledgeService.forceReinitialize();
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

    // Short-circuit: handle small talk/basic conversation without tool calls
    const smallTalk = /^(hi|hello|hey|sup|what'?s up|how are you|yo|wassup|wazzup|greetings|good morning|good afternoon|good evening)/i.test(latestUserMessage.content.trim());

    // Character-based queries that should get personality responses, not data
    const characterQueries = /^(whats your name|what's your name|who are you|tell me about yourself|what do you do|what are you|your name|introduce yourself)/i.test(latestUserMessage.content.trim());

    // Additional check for very short queries that aren't F1-related
    const isVeryShortQuery = latestUserMessage.content.trim().length <= 3 && 
      !latestUserMessage.content.toLowerCase().includes('f1') &&
      !latestUserMessage.content.toLowerCase().includes('race') &&
      !latestUserMessage.content.toLowerCase().includes('driver') &&
      !latestUserMessage.content.toLowerCase().includes('car');

    if (smallTalk || isVeryShortQuery || characterQueries) {
      // Use character-based conversational response
      const conversational = llmService.generateBasicConversationalResponse(latestUserMessage.content);
      const response: ChatResponse = { message: { content: conversational } };
      res.json(response);
      return;
    }

    // Use enhanced query routing to determine processing method
    console.log('🔍 Using enhanced query routing...');
    const routedResult = await llmService.parseQueryWithRouting(latestUserMessage.content);
    
    let response: ChatResponse;
    
    // Handle different types of responses
    if (typeof routedResult === 'string') {
      // Direct string response (conversational, web search, or RAG)
      console.log('📝 Returning direct response:', routedResult.substring(0, 100) + '...');
      response = {
        message: {
          content: routedResult
        }
      };
    } else if ('status' in routedResult && 'results' in routedResult) {
      // Web search response - should have been synthesized already
      console.log('🌐 Web search response received');
      response = {
        message: {
          content: 'Web search completed successfully.'
        }
      };
    } else {
      // F1 tools query plan
      const queryPlan = routedResult as any;
      console.log('🏁 F1 tools query plan:', queryPlan);
      
      // Handle cases where no valid tool is selected
      if (!queryPlan.tool || queryPlan.tool === 'null' || queryPlan.tool === 'clarification' || queryPlan.tool === 'conversational') {
        console.log('🎭 Handling character-based conversation or clarification request');
        
        const characterResponse = await llmService.generateConversationalResponse(
          latestUserMessage.content,
          queryPlan
        );
        
        response = {
          message: {
            content: characterResponse
          }
        };
      } else {
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
        
        response = {
          message: {
            content: agentResponse
          }
        };
      }
    }
    
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