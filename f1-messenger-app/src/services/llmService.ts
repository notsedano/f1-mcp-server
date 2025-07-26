// LLM Service for Intelligent Query Processing
// Integrates with Gemini for Cursor-grade query understanding

import { GoogleGenerativeAI } from '@google/generative-ai';
import { F1_TOOL_SCHEMAS } from './f1ToolSchemas';
import { normalizeDriverIdentifier } from './driverMapping';

export interface QueryPlan {
  tool: string;
  arguments: Record<string, any>;
  followUp?: {
    tool: string;
    arguments: Record<string, any>;
  };
  reasoning: string;
}

export interface LLMResponse {
  text?: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
}

class LLMService {
  private model: any;
  private isInitialized = false;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    // Support both Node.js and browser environments
    let apiKey: string | undefined;
    
    if (typeof process !== 'undefined' && process.env) {
      // Node.js environment - check multiple possible env var names
      apiKey = process.env.VITE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.REACT_APP_GEMINI_API_KEY;
      
      console.log('Debug - Environment variables:');
      console.log('VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY ? 'SET' : 'NOT SET');
      console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET');
      console.log('REACT_APP_GEMINI_API_KEY:', process.env.REACT_APP_GEMINI_API_KEY ? 'SET' : 'NOT SET');
      console.log('Final API Key:', apiKey ? 'FOUND' : 'NOT FOUND');
    } else if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Vite/React environment
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY;
    }
    
    if (!apiKey) {
      console.warn('No Gemini API key found. LLM features will be disabled.');
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        }
      });
      this.isInitialized = true;
      console.log('✅ Gemini LLM initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
    }
  }

  /**
   * Intelligent query parsing using LLM
   * Replaces basic keyword matching with actual LLM understanding
   */
  async parseQueryIntelligently(userInput: string): Promise<QueryPlan> {
    if (!this.isInitialized) {
      // Fallback to basic parsing if LLM is not available
      return this.fallbackParseQuery(userInput);
    }

    try {
      const prompt = this.buildQueryParsingPrompt(userInput);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse the LLM response
      const queryPlan = this.parseLLMResponse(response, userInput);
      console.log('🧠 LLM Query Plan:', queryPlan);
      return queryPlan;
      
    } catch (error) {
      console.error('❌ LLM query parsing failed:', error);
      return this.fallbackParseQuery(userInput);
    }
  }

  /**
   * Build prompt for intelligent query parsing
   */
  private buildQueryParsingPrompt(userInput: string): string {
    const toolSchemas = F1_TOOL_SCHEMAS.map(tool => 
      `${tool.name}: ${tool.description} (params: ${Object.keys(tool.parameters?.properties || {}).join(', ')})`
    ).join('\n');

    return `You are an F1 data assistant. Analyze this user query and determine the best tool to call.

AVAILABLE TOOLS:
${toolSchemas}

USER QUERY: "${userInput}"

INSTRUCTIONS:
1. Understand the user's intent (championship, schedule, driver stats, performance, comparison)
2. Extract relevant parameters (year, driver names, event names, session types)
3. Choose the most appropriate tool
4. If multiple tools are needed, plan a follow-up

RESPONSE FORMAT:
{
  "tool": "tool_name",
  "arguments": {"param": "value"},
  "reasoning": "Brief explanation of your choice",
  "followUp": {"tool": "next_tool", "arguments": {"param": "value"}} // if needed
}

EXAMPLES:
Q: "tell me about 2023 championships" → {"tool": "get_championship_standings", "arguments": {"year": 2023}, "reasoning": "User wants championship standings for 2023"}
Q: "Hamilton 2022 performance" → {"tool": "get_championship_standings", "arguments": {"year": 2022}, "reasoning": "Get standings first to find Hamilton's position", "followUp": {"tool": "analyze_driver_performance", "arguments": {"year": 2022, "driver_identifier": "HAM"}}}
Q: "compare Verstappen and Norris" → {"tool": "get_championship_standings", "arguments": {"year": 2023}, "reasoning": "Get current standings to compare drivers"}

RESPONSE:`;
  }

  /**
   * Parse LLM response into structured query plan
   */
  private parseLLMResponse(response: string, userInput: string): QueryPlan {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Normalize driver identifiers
      if (parsed.arguments?.driver_identifier) {
        parsed.arguments.driver_identifier = normalizeDriverIdentifier(parsed.arguments.driver_identifier);
      }
      if (parsed.followUp?.arguments?.driver_identifier) {
        parsed.followUp.arguments.driver_identifier = normalizeDriverIdentifier(parsed.followUp.arguments.driver_identifier);
      }

      return {
        tool: parsed.tool,
        arguments: parsed.arguments || {},
        followUp: parsed.followUp,
        reasoning: parsed.reasoning || 'LLM analysis'
      };
      
    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      return this.fallbackParseQuery(userInput);
    }
  }

  /**
   * Fallback parsing when LLM is not available
   */
  private fallbackParseQuery(userInput: string): QueryPlan {
    const input = userInput.toLowerCase();
    
    // Extract year
    const yearMatch = input.match(/(?:19|20)\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 2023;
    
    // Extract driver names
    const driverNames = ['norris', 'hamilton', 'verstappen', 'leclerc', 'sainz', 'russell', 'alonso', 'perez'];
    const foundDrivers = driverNames.filter(driver => input.includes(driver));
    
    // Basic intent detection
    if (input.includes('championship') || input.includes('standings') || input.includes('points')) {
      return {
        tool: 'get_championship_standings',
        arguments: { year },
        reasoning: 'Basic keyword matching: championship/standings detected'
      };
    }
    
    if (input.includes('schedule') || input.includes('calendar') || input.includes('races')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year },
        reasoning: 'Basic keyword matching: schedule/calendar detected'
      };
    }
    
    if (foundDrivers.length > 0 && (input.includes('stats') || input.includes('performance'))) {
      return {
        tool: 'get_championship_standings',
        arguments: { year },
        followUp: {
          tool: 'analyze_driver_performance',
          arguments: { year, driver_identifier: foundDrivers[0].toUpperCase() }
        },
        reasoning: 'Basic keyword matching: driver performance detected'
      };
    }
    
    // Default
    return {
      tool: 'get_championship_standings',
      arguments: { year },
      reasoning: 'Default fallback: championship standings'
    };
  }

  /**
   * Synthesize natural language response using LLM
   */
  async synthesizeResponse(userInput: string, toolResult: any, toolName: string): Promise<string> {
    if (!this.isInitialized) {
      // Fallback to basic synthesis
      return this.fallbackSynthesize(toolResult, toolName);
    }

    try {
      const prompt = this.buildSynthesisPrompt(userInput, toolResult, toolName);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return response.trim();
      
    } catch (error) {
      console.error('❌ LLM synthesis failed:', error);
      return this.fallbackSynthesize(toolResult, toolName);
    }
  }

  /**
   * Build prompt for response synthesis
   */
  private buildSynthesisPrompt(userInput: string, toolResult: any, toolName: string): string {
    return `You are an F1 data assistant. Create a concise, conversational response based on the data.

USER QUERY: "${userInput}"
TOOL USED: ${toolName}
DATA: ${JSON.stringify(toolResult, null, 2)}

INSTRUCTIONS:
1. Answer the user's question directly
2. Use natural, conversational language
3. Include key facts and numbers
4. Keep response under 200 words
5. Use F1 terminology appropriately
6. Format times, points, and positions clearly

EXAMPLES:
- "Max Verstappen dominated the 2023 championship with 575 points and 19 wins, securing his third consecutive title."
- "The 2023 season featured 22 Grand Prix events, starting in Bahrain and ending in Abu Dhabi."
- "Lewis Hamilton finished 3rd in the championship with 234 points, his best result since 2021."

RESPONSE:`;
  }

  /**
   * Fallback synthesis when LLM is not available
   */
  private fallbackSynthesize(toolResult: any, toolName: string): string {
    const data = toolResult.data?.data || toolResult.data;
    
    if (toolName === 'get_championship_standings' && data.drivers) {
      const top3 = data.drivers.slice(0, 3);
      const constructors = data.constructors?.[0];
      
      let response = `📊 Championship Standings:\n`;
      top3.forEach((driver: any, index: number) => {
        const ordinal = ['1st', '2nd', '3rd'][index];
        response += `${ordinal} place: ${driver.givenName} ${driver.familyName} (${driver.driverCode}) with ${driver.points} points and ${driver.wins} wins.\n`;
      });
      
      if (constructors) {
        response += `\n🏆 Constructors champion: ${constructors.constructorName} with ${constructors.points} points.`;
      }
      
      return response;
    }
    
    return `📊 Data retrieved successfully. ${JSON.stringify(data).substring(0, 100)}...`;
  }

  /**
   * Check if LLM is available
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Re-initialize the LLM service (useful after environment variables are loaded)
   */
  reinitialize(): void {
    this.isInitialized = false;
    this.model = null;
    this.initializeGemini();
  }

  /**
   * Force re-initialization with current environment variables
   */
  forceReinitialize(): void {
    // Clear any cached state
    this.isInitialized = false;
    this.model = null;
    
    // Try to initialize again
    this.initializeGemini();
    
    console.log('LLM Service force reinitialized. Available:', this.isInitialized);
  }
}

// Export singleton instance
export const llmService = new LLMService(); 