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
      console.log('🔍 Synthesizing response for:', userInput);
      console.log('📊 Tool result structure:', Object.keys(toolResult));
      
      const prompt = this.buildSynthesisPrompt(userInput, toolResult, toolName);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      console.log('✅ Synthesis completed');
      return response.trim();
      
    } catch (error) {
      console.error('❌ LLM synthesis failed:', error);
      return this.fallbackSynthesize(toolResult, toolName);
    }
  }

  /**
   * Extract structured F1 data from tool results
   */
  private extractF1Data(toolResult: any, toolName: string): any {
    if (toolName === 'get_session_results') {
      return this.extractRaceResults(toolResult);
    } else if (toolName === 'get_championship_standings') {
      return this.extractChampionshipStandings(toolResult);
    }
    return toolResult;
  }

  /**
   * Extract race results in a structured format
   */
  private extractRaceResults(toolResult: any): any {
    try {
      console.log('🔍 Extracting race results from:', Object.keys(toolResult));
      
      // Handle nested data structure from bridge
      let data = toolResult.data;
      if (data && data.data) {
        data = data.data; // Bridge returns {status: "success", data: {status: "success", data: [...]}}
      }
      
      console.log('📊 Data type:', typeof data);
      console.log('📊 Data is array:', Array.isArray(data));
      console.log('📊 Data length:', Array.isArray(data) ? data.length : 'N/A');
      
      if (!Array.isArray(data) || data.length < 10) {
        console.log('❌ Invalid data format');
        return { error: 'Invalid race data format' };
      }

      // Extract key data arrays - based on actual data structure from logs
      const driverNumbers = data[0] || {};
      const driverNames = data[1] || {};
      const driverCodes = data[2] || {};
      const positions = data[13] || {}; // Position data
      const finishStatus = data[18] || {}; // Finish status (Finished, Retired, etc.)
      const points = data[19] || {}; // Points earned
      const laps = data[20] || {}; // Laps completed
      const times = data[17] || {}; // Race times

      console.log('🏁 Positions found:', Object.keys(positions).length);
      console.log('🏁 Position data:', positions);
      console.log('🏁 Finish status:', finishStatus);
      console.log('🏁 Points data:', points);

      // Find the winner (position 1)
      let winner = null;
      let podium = [];

      for (const [driverNum, position] of Object.entries(positions)) {
        const pos = parseFloat(position as string);
        console.log(`Driver ${driverNum}: position ${pos}`);
        
        // Skip invalid positions (NaN, retired drivers, etc.)
        if (isNaN(pos) || pos <= 0) {
          console.log(`Skipping driver ${driverNum} - invalid position: ${position}`);
          continue;
        }
        
        if (pos === 1) {
          winner = {
            number: driverNum,
            name: driverNames[driverNum] || 'Unknown',
            code: driverCodes[driverNum] || 'UNK',
            position: pos,
            points: parseFloat(points[driverNum] || '0') || 0,
            status: finishStatus[driverNum] || 'Unknown',
            laps: parseFloat(laps[driverNum] || '0') || 0,
            time: times[driverNum] || 'Unknown'
          };
          console.log('🏆 Winner found:', winner);
        } else if (pos <= 3) {
          podium.push({
            number: driverNum,
            name: driverNames[driverNum] || 'Unknown',
            code: driverCodes[driverNum] || 'UNK',
            position: pos,
            points: parseFloat(points[driverNum] || '0') || 0,
            status: finishStatus[driverNum] || 'Unknown',
            laps: parseFloat(laps[driverNum] || '0') || 0,
            time: times[driverNum] || 'Unknown'
          });
        }
      }

      // Sort podium by position
      podium.sort((a, b) => a.position - b.position);

      // Validate we have a winner
      if (!winner) {
        console.log('❌ No winner found in race data');
        return { error: 'No winner found in race data' };
      }

      const result = {
        winner,
        podium: [winner, ...podium].filter(Boolean),
        totalDrivers: Object.keys(driverNumbers).length,
        raceData: {
          driverNumbers,
          driverNames,
          driverCodes,
          positions,
          finishStatus,
          points,
          laps,
          times
        }
      };
      
      console.log('✅ Race results extracted successfully');
      return result;
    } catch (error) {
      console.error('❌ Error extracting race results:', error);
      return { error: 'Failed to extract race data' };
    }
  }

  /**
   * Extract championship standings in a structured format
   */
  private extractChampionshipStandings(toolResult: any): any {
    try {
      const data = toolResult.data?.data || toolResult.data || toolResult;
      
      if (data.drivers && Array.isArray(data.drivers)) {
        return {
          drivers: data.drivers.slice(0, 10), // Top 10
          constructors: data.constructors || [],
          season: data.season || '2025'
        };
      }
      
      return { error: 'Invalid championship data format' };
    } catch (error) {
      console.error('Error extracting championship standings:', error);
      return { error: 'Failed to extract championship data' };
    }
  }

  /**
   * Build prompt for response synthesis
   */
  private buildSynthesisPrompt(userInput: string, toolResult: any, toolName: string): string {
    // Extract structured data first
    const structuredData = this.extractF1Data(toolResult, toolName);
    
    // Check for extraction errors
    if (structuredData.error) {
      return `You are an F1 data assistant. The user asked a question but there was an error retrieving the data.

USER QUERY: "${userInput}"
ERROR: ${structuredData.error}

INSTRUCTIONS:
1. Apologize for the data retrieval error
2. Explain that you cannot provide accurate information due to the error
3. Suggest the user try again later or rephrase their question
4. DO NOT make up or guess any information
5. Be honest about the limitation

RESPONSE:`;
    }
    
    return `You are an F1 data assistant. Create a concise, conversational response based on the structured data.

USER QUERY: "${userInput}"
TOOL USED: ${toolName}
STRUCTURED DATA: ${JSON.stringify(structuredData, null, 2)}

INSTRUCTIONS:
1. Answer the user's question directly using the structured data
2. Use natural, conversational language
3. Include key facts and numbers
4. Keep response under 200 words
5. Use F1 terminology appropriately
6. Format times, points, and positions clearly
7. If asking about race winners, clearly state who won and their position
8. If the data shows an error or is incomplete, admit it and don't guess

EXAMPLES:
- "Lando Norris won the 2025 British Grand Prix, finishing 1st with 25 points."
- "Max Verstappen dominated the 2023 championship with 575 points and 19 wins."
- "The 2023 season featured 22 Grand Prix events, starting in Bahrain and ending in Abu Dhabi."

RESPONSE:`;
  }

  /**
   * Fallback synthesis when LLM is not available
   */
  private fallbackSynthesize(toolResult: any, toolName: string): string {
    const structuredData = this.extractF1Data(toolResult, toolName);
    
    // Handle extraction errors
    if (structuredData.error) {
      return `I apologize, but I encountered an error while retrieving the F1 data for your question. The data source returned: "${structuredData.error}". I cannot provide accurate information at this time. Please try again later or rephrase your question.`;
    }
    
    if (toolName === 'get_session_results' && structuredData.winner) {
      const winner = structuredData.winner;
      const podium = structuredData.podium;
      
      let response = `🏆 Race Results:\n`;
      response += `Winner: ${winner.name} (${winner.code}) - Position ${winner.position} with ${winner.points} points\n`;
      
      if (podium.length > 1) {
        response += `Podium:\n`;
        podium.forEach((driver: any, index: number) => {
          if (index === 0) return; // Skip winner as already mentioned
          const ordinal = ['1st', '2nd', '3rd'][driver.position - 1];
          response += `${ordinal}: ${driver.name} (${driver.code}) - ${driver.points} points\n`;
        });
      }
      
      return response;
    }
    
    if (toolName === 'get_championship_standings' && structuredData.drivers) {
      const top3 = structuredData.drivers.slice(0, 3);
      const constructors = structuredData.constructors?.[0];
      
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
    
    return `I apologize, but I'm unable to process the F1 data in the expected format. The data structure is not recognized. Please try again later.`;
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