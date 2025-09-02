// Gemini Knowledge Service for General Knowledge Queries
// Uses Gemini's built-in knowledge base to answer questions

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface KnowledgeResponse {
  status: 'success' | 'error';
  answer: string;
  query: string;
  error?: string;
}

export class GeminiKnowledgeService {
  private geminiModel: any;
  private isInitialized = false;
  
  // Cache for knowledge responses
  private static knowledgeCache = new Map<string, { data: KnowledgeResponse, timestamp: number }>();
  private static CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static MAX_CACHE_SIZE = 50;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    let apiKey: string | undefined;
    
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.VITE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.REACT_APP_GEMINI_API_KEY;
    } else if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY;
    }
    
    if (!apiKey) {
      console.warn('No Gemini API key found. Knowledge service will be disabled.');
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      });
      this.isInitialized = true;
      console.log('✅ Gemini Knowledge Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini Knowledge Service:', error);
    }
  }

  /**
   * Get knowledge-based answer using Gemini's built-in knowledge
   */
  async getKnowledgeAnswer(query: string): Promise<KnowledgeResponse> {
    // Check cache first
    const cacheKey = `knowledge_${query.toLowerCase().replace(/\s+/g, '_')}`;
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    if (!this.isInitialized) {
      const errorResult: KnowledgeResponse = {
        status: 'error',
        answer: `I couldn't find specific information for "${query}". Please try rephrasing your question or ask something else.`,
        query,
        error: 'Gemini service not initialized'
      };
      return errorResult;
    }

    try {
      console.log('🧠 Getting knowledge answer for:', query);
      
      const prompt = `You are a helpful assistant with access to current knowledge. Please provide accurate and up-to-date information about: "${query}"

Please provide a comprehensive answer with relevant facts, statistics, and information. Include specific details and be factual.

Format your response as a detailed, factual answer that directly addresses the query. Be conversational and natural in your response.`;

      const result = await this.geminiModel.generateContent(prompt);
      const answer = result.response.text();
      
      console.log('✅ Knowledge answer generated, length:', answer.length);
      
      const knowledgeResponse: KnowledgeResponse = {
        status: 'success',
        answer,
        query
      };

      this.setCachedResult(cacheKey, knowledgeResponse);
      return knowledgeResponse;

    } catch (error) {
      console.error('❌ Error getting knowledge answer:', error);
      
      const errorResult: KnowledgeResponse = {
        status: 'error',
        answer: `I couldn't find specific information for "${query}". Please try rephrasing your question or ask something else.`,
        query,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      return errorResult;
    }
  }

  // Cache management methods
  private getCachedResult(key: string): KnowledgeResponse | null {
    const cached = GeminiKnowledgeService.knowledgeCache.get(key);
    if (cached && Date.now() - cached.timestamp < GeminiKnowledgeService.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      GeminiKnowledgeService.knowledgeCache.delete(key);
    }
    return null;
  }

  private setCachedResult(key: string, data: KnowledgeResponse): void {
    // Clean up old entries if cache is full
    if (GeminiKnowledgeService.knowledgeCache.size >= GeminiKnowledgeService.MAX_CACHE_SIZE) {
      const iterator = GeminiKnowledgeService.knowledgeCache.keys();
      const result = iterator.next();
      if (!result.done) {
        const oldestKey: string = result.value as string;
        GeminiKnowledgeService.knowledgeCache.delete(oldestKey);
      }
    }
    
    GeminiKnowledgeService.knowledgeCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the knowledge cache
   */
  clearCache(): void {
    GeminiKnowledgeService.knowledgeCache.clear();
  }

  /**
   * Force re-initialization of the service
   */
  forceReinitialize(): void {
    console.log('🔄 Re-initializing Gemini Knowledge Service...');
    this.isInitialized = false;
    this.initializeGemini();
  }
}

// Export singleton instance
export const geminiKnowledgeService = new GeminiKnowledgeService();
