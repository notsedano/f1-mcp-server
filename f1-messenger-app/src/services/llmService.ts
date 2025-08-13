// LLM Service for Intelligent Query Processing
// Integrates with Gemini for Cursor-grade query understanding

import { GoogleGenerativeAI } from '@google/generative-ai';
import { F1_TOOL_SCHEMAS } from './f1ToolSchemas';
import { normalizeDriverIdentifier } from './driverMapping';
import { TemporalReasoning } from '../utils/temporalReasoning';

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
  private static conversationContext: {
    lastQuery?: string;
    lastRace?: string;
    lastYear?: number;
    lastDriver?: string;
  } = {};
  
  // Enhanced caching with TTL
  private static queryCache = new Map<string, { data: any, timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static MAX_CACHE_SIZE = 100; // Maximum cache entries
  
  // Performance tracking
  // private static performanceMetrics = new Map<string, number[]>();

  constructor() {
    this.initializeGemini();
  }

  /**
   * Update conversation context with current query
   */
  private updateConversationContext(userInput: string): void {
    const input = userInput.toLowerCase();
    
    // Extract year from query
    const yearMatch = input.match(/(?:19|20)\d{2}/);
    if (yearMatch) {
      LLMService.conversationContext.lastYear = parseInt(yearMatch[0]);
    }
    
    // Enhanced race name extraction with expanded patterns
    const raceMatch = input.match(/(belgian|british|hungarian|dutch|italian|singapore|japanese|qatar|united states|mexican|brazilian|las vegas|abu dhabi|australian|chinese|miami|emilia romagna|monaco|canadian|spanish|austrian|saudi arabian|bahrain|australia|mexico|usa|united states|emilia|romagna)/i);
    if (raceMatch) {
      LLMService.conversationContext.lastRace = raceMatch[0];
    }
    
    // Extract driver name from query with enhanced code mapping
    const driverName = this.extractDriverNameFromQuery(userInput);
    if (driverName) {
      LLMService.conversationContext.lastDriver = driverName;
    }
    
    LLMService.conversationContext.lastQuery = userInput;
  }

  /**
   * Handle follow-up questions using conversation context
   */
  private handleFollowUpQuestions(userInput: string): QueryPlan | null {
    const input = userInput.toLowerCase();
    
    // Check for follow-up patterns
    if (input.includes('what race was this') || input.includes('which race') || input.includes('what race')) {
      if (LLMService.conversationContext.lastRace && LLMService.conversationContext.lastYear) {
        return {
          tool: 'get_session_results',
          arguments: {
            year: LLMService.conversationContext.lastYear,
            event_identifier: LLMService.conversationContext.lastRace.charAt(0).toUpperCase() + LLMService.conversationContext.lastRace.slice(1) + ' Grand Prix',
            session_name: 'Race'
          },
          reasoning: `User asking about the race from previous context: ${LLMService.conversationContext.lastRace} ${LLMService.conversationContext.lastYear}`
        };
      }
    }
    
    if (input.includes('what about') || input.includes('how about') || input.includes('and')) {
      if (LLMService.conversationContext.lastDriver && LLMService.conversationContext.lastRace && LLMService.conversationContext.lastYear) {
        return {
          tool: 'analyze_driver_performance',
          arguments: {
            year: LLMService.conversationContext.lastYear,
            event_identifier: LLMService.conversationContext.lastRace.charAt(0).toUpperCase() + LLMService.conversationContext.lastRace.slice(1) + ' Grand Prix',
            session_name: 'Race',
            driver_identifier: LLMService.conversationContext.lastDriver
          },
          reasoning: `User asking about driver performance from previous context: ${LLMService.conversationContext.lastDriver} in ${LLMService.conversationContext.lastRace} ${LLMService.conversationContext.lastYear}`
        };
      }
    }
    
    return null;
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
    const startTime = Date.now();
    
    // Update conversation context
    this.updateConversationContext(userInput);
    
    // Check for follow-up questions first
    const followUpPlan = this.handleFollowUpQuestions(userInput);
    if (followUpPlan) {
      this.trackPerformance('follow-up query processing', startTime);
      return followUpPlan;
    }
    
    // Check cache for similar queries
    const cacheKey = this.generateCacheKey('query_plan', { userInput });
    const cachedPlan = this.getCachedResult(cacheKey);
    if (cachedPlan) {
      this.trackPerformance('cached query plan retrieval', startTime);
      return cachedPlan;
    }
    
    // Check for "who won" pattern for intelligent fallback
    const input = userInput.toLowerCase();
    if (input.includes('who won') || input.includes('who was the winner')) {
      const fallbackPlan = this.intelligentFallbackParseQuery(userInput);
      this.setCachedResult(cacheKey, fallbackPlan);
      this.trackPerformance('intelligent fallback query processing', startTime);
      return fallbackPlan;
    }
    
    // Check for "fastest lap" pattern for intelligent fallback
    if (input.includes('fastest lap') || input.includes('fastest lap time')) {
      const fallbackPlan = this.intelligentFallbackParseQuery(userInput);
      this.setCachedResult(cacheKey, fallbackPlan);
      this.trackPerformance('intelligent fallback query processing', startTime);
      return fallbackPlan;
    }

    if (!this.isInitialized) {
      console.log('⚠️ LLM not initialized, using fallback parsing');
      const fallbackPlan = this.fallbackParseQuery(userInput);
      this.setCachedResult(cacheKey, fallbackPlan);
      this.trackPerformance('fallback query processing', startTime);
      return fallbackPlan;
    }

    try {
      const prompt = this.buildMCPContractPrompt(userInput);
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const queryPlan = this.parseLLMResponse(response, userInput);
      console.log('🧠 LLM Query Plan:', queryPlan);
      
      // Cache the successful query plan
      this.setCachedResult(cacheKey, queryPlan);
      
      this.trackPerformance('LLM query processing', startTime);
      return queryPlan;
      
    } catch (error) {
      console.error('❌ Error in intelligent query parsing:', error);
      
      if ((error as any).status === 503) {
        console.log('⚠️ Gemini API overloaded, using intelligent fallback');
        const fallbackPlan = this.intelligentFallbackParseQuery(userInput);
        this.setCachedResult(cacheKey, fallbackPlan);
        this.trackPerformance('intelligent fallback after error', startTime);
        return fallbackPlan;
      }
      
      const fallbackPlan = this.fallbackParseQuery(userInput);
      this.setCachedResult(cacheKey, fallbackPlan);
      this.trackPerformance('fallback after error', startTime);
      return fallbackPlan;
    }
  }

  // (Deprecated) buildQueryParsingPrompt removed in favor of MCP contract prompt

  /**
   * MCP planning contract prompt enforcing strict tool usage and argument normalization
   */
  private buildMCPContractPrompt(userInput: string): string {
    const toolSchemas = F1_TOOL_SCHEMAS.map(tool => 
      `${tool.name}: ${tool.description} (params: ${Object.keys(tool.parameters?.properties || {}).join(', ')})`
    ).join('\n');

    const currentYear = new Date().getFullYear();

    return `You are the F1 MCP Agent. Use Cursor’s MCP tools exclusively for all F1 answers. Do not hallucinate. Do not scrape or use external sources. Always include exact lap-time data (and lap number when available) when relevant.

TOOLS (must use exact names/signatures; no placeholders)
- get_event_schedule(year)
- get_event_info(year, identifier)
- get_session_results(year, event_identifier, session_name)
- analyze_driver_performance(year, event_identifier, session_name, driver_identifier)
- compare_drivers(year, event_identifier, session_name, drivers)   // drivers: comma-separated codes, e.g., "HAM,VER"
- get_championship_standings(year)
- get_telemetry(year, event_identifier, session_name, driver_identifier, lap_number?) // optional

AVAILABLE TOOLS (schema overview):
${toolSchemas}

PLANNING CONTRACT
- Emit a single JSON QueryPlan with keys: { tool, arguments, followUp?, reasoning }.
- Do not emit arrays for session_name; use a single string: "Race" or "Qualifying".
- Do not emit placeholders like "DRIVER1", "ALL", "Last Grand Prix", "Current Race Identifier".
- If the user’s wording implies “last/current/most recent” race, first resolve a concrete event name via schedule resolution (see Argument Normalization).

ARGUMENT NORMALIZATION AND RESOLUTION
- Event resolution for “last/current/most recent/Last Grand Prix/Current Race Identifier”:
  1) Call get_event_schedule(year).
  2) Choose the last completed event where EventDate < now and EventFormat != "testing".
  3) Replace event_identifier with the concrete "<X> Grand Prix".
- Driver identifiers:
  - Use 3-letter codes (e.g., "HAM", "VER") or valid numbers. Map names → codes when provided.
- Missing drivers for comparisons:
  - Prefer top-2 (or top-3) from get_championship_standings(year).data.drivers[i].driverCode.
  - Or podium codes from last race: get_session_results → use resultsData driver codes for P1–P3.

CORE QUERY RECIPES
- Winner: “Who won [year] [race]?”
  - get_session_results(year, event, "Race")
  - Extract podium using positions (resultsData[13]), names (resultsData[9]), teams (resultsData[4]).
- Fastest lap (general): “Fastest lap in [year] [race]?”
  - get_session_results(year, event, "Race")
  - From resultsData[18] choose the minimum valid lap time (ignore "NaT"); include driver, team, exact time.
- Driver-specific fastest lap: “What was [driver]’s fastest lap in [year] [race]?”
  - analyze_driver_performance(year, event, "Race", driverCode)
  - Return FastestLap and lap number if present.
- Driver comparison: “Compare [driverA] vs [driverB] in [year] [race|qualifying]”
  - compare_drivers(year, event, session, "AAA,BBB")
  - If it fails or is unavailable, fallback: analyze_driver_performance for both drivers; compare FastestLap, FastestLapNumber, TotalLaps, AverageLapTime.
- Top drivers comparison (qualifying vs race):
  - If “top” or “current top”: get_championship_standings(year) → top 3 codes.
  - Resolve event to the last completed race.
  - compare_drivers twice: (year, event, "Qualifying", "AAA,BBB,CCC") and (year, event, "Race", "AAA,BBB,CCC").
  - If unavailable, fallback with analyze_driver_performance per driver/session and synthesize differences.
- Weather:
  - No dedicated weather tool. Do not infer or hallucinate.
  - Respond: “Weather data isn’t exposed via current MCP tools.” Optionally add event timing via get_event_info.

FOLLOW-UP INTELLIGENCE
- Maintain conversationContext: lastYear, lastRace, lastWinnerCode, lastDrivers.
- If user asks “their fastest lap” after a winner answer:
  - Use analyze_driver_performance with lastWinnerCode for the same year/event/session.

RESPONSE RULES
- Always include specific lap times and lap numbers when relevant (e.g., “1:34.090 on Lap 36”).
- Be concise; avoid unrelated details (e.g., podium) unless asked.
- For comparisons, include fastest lap, lap number, average lap time, and total laps for each driver; mention deltas when useful.
- Do not mention internal tool names or planning in the final answer.

ERRORS AND FALLBACKS
- If compare_drivers errors or lacks drivers:
  - Derive drivers from standings or podium; retry once.
  - If still failing, use analyze_driver_performance for each driver and synthesize head‑to‑head.
- If event placeholders appear:
  - Resolve to a concrete "<X> Grand Prix" via get_event_schedule before any other tool calls.
- If pre-2018 data quirks or missing sprint data limit results:
  - State the limitation clearly and return best available fields only.

FORMAT EXAMPLES
- Comparison:
  - “HAM: fastest lap 1:29.438 (Lap 45), 52 laps, avg 1:35.136; VER: fastest lap 1:28.952 (Lap 48), 52 laps, avg 1:35.164.”
- Single fastest lap:
  - “LEC’s fastest lap in the ${currentYear} Bahrain GP was 1:34.090 (Lap 36).”

OBSERVABILITY
- Log minimal tool call summaries with normalized arguments only.
- Cache to speed repeat calls but never override explicit user parameters with cached context.

PROHIBITIONS
- No “ALL events”, no arrays for session_name, no placeholders like “DRIVER1”.
- No weather claims without a dedicated MCP tool.

SUCCESS CRITERIA
- All fastest-lap answers include exact time and lap number when available.
- Comparative answers include best lap, lap number, average lap, total laps, and clear deltas.
- No placeholder artifacts (e.g., “null GP”); all events resolved to concrete names.
- Follow-ups bind correctly to prior context (same race/year, correct driver).

USER QUERY: "${userInput}"

RESPONSE FORMAT:
{
  "tool": "tool_name",
  "arguments": {"param": "value"},
  "reasoning": "Brief explanation of your choice",
  "followUp": {"tool": "next_tool", "arguments": {"param": "value"}}
}`;
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
      
      // Debug: Log the raw LLM response
  
      
      // Normalize driver identifiers
      if (parsed.arguments?.driver_identifier) {
        parsed.arguments.driver_identifier = normalizeDriverIdentifier(parsed.arguments.driver_identifier);
      }
      if (parsed.followUp?.arguments?.driver_identifier) {
        parsed.followUp.arguments.driver_identifier = normalizeDriverIdentifier(parsed.followUp.arguments.driver_identifier);
      }

      // Ensure we never return a null tool
      if (!parsed.tool || parsed.tool === 'null' || parsed.tool === null) {
        console.log('⚠️ LLM returned null tool, defaulting to championship standings');
        return {
          tool: 'get_championship_standings',
          arguments: { year: new Date().getFullYear() },
          reasoning: 'LLM returned null tool, defaulting to current championship standings'
        };
      }

      // Debug: Check for null followUp
      if (parsed.followUp && (!parsed.followUp.tool || parsed.followUp.tool === 'null' || parsed.followUp.tool === null || parsed.followUp.tool === '')) {
        console.log('⚠️ LLM returned null/empty followUp tool, removing followUp');
        parsed.followUp = undefined;
      }

      // Additional safety check: if followUp exists but has no valid tool, remove it
      if (parsed.followUp && typeof parsed.followUp.tool !== 'string') {
        console.log('⚠️ LLM returned invalid followUp tool type, removing followUp');
        parsed.followUp = undefined;
      }

      return {
        tool: parsed.tool,
        arguments: parsed.arguments || {},
        followUp: parsed.followUp && parsed.followUp.tool && parsed.followUp.tool !== 'null' ? parsed.followUp : undefined,
        reasoning: parsed.reasoning || 'LLM analysis'
      };
      
    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      return this.fallbackParseQuery(userInput);
    }
  }

  /**
   * Intelligent fallback for API overload scenarios
   */
  public intelligentFallbackParseQuery(userInput: string): QueryPlan {
    // Update temporal context
    TemporalReasoning.updateContext();
    
    // Try centralized temporal reasoning first
    const temporalPlan = TemporalReasoning.getTemporalQueryPlan(userInput);
    if (temporalPlan) {
      return temporalPlan;
    }

    // Fallback to existing logic for "who won" queries
    const input = userInput.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Extract year from query first
    const yearMatch = input.match(/(?:19|20)\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;

    // Handle "who won" queries - use extracted year or current year
    if (input.includes('who won') || input.includes('winner')) {
      const raceMatch = input.match(/(belgian|british|hungarian|dutch|italian|singapore|japanese|qatar|united states|mexican|brazilian|las vegas|abu dhabi|australian|chinese|miami|emilia romagna|monaco|canadian|spanish|austrian|saudi arabian|bahrain)/i);
      if (raceMatch) {
        const raceName = raceMatch[0].charAt(0).toUpperCase() + raceMatch[0].slice(1) + ' Grand Prix';
        return {
          tool: 'get_session_results',
          arguments: {
            year: year, // Use extracted year or current year
            event_identifier: raceName,
            session_name: 'Race'
          },
          reasoning: `User asks for winner of ${raceName}, using year ${year}`
        };
      }
    }
    
    // Handle "fastest lap" queries
    if (input.includes('fastest lap') || input.includes('fastest lap time')) {
      const raceMatch = input.match(/(belgian|british|hungarian|dutch|italian|singapore|japanese|qatar|united states|mexican|brazilian|las vegas|abu dhabi|australian|chinese|miami|emilia romagna|monaco|canadian|spanish|austrian|saudi arabian|bahrain)/i);
      if (raceMatch) {
        const raceName = raceMatch[0].charAt(0).toUpperCase() + raceMatch[0].slice(1) + ' Grand Prix';
        
        // Check if it's a driver-specific fastest lap query
        const driverMatch = input.match(/(verstappen|hamilton|norris|leclerc|sainz|russell|alonso|perez|bottas|gasly|ocon|stroll|albon|tsunoda|ricciardo|zhou|magnussen|hulkenberg|sargeant|lawson|piastri|de vries|lawson|drugovich|doohan|vips|lawson|piastri|de vries|lawson|drugovich|doohan|vips)/i);
        
        if (driverMatch) {
          // Driver-specific fastest lap
          const driverCode = this.extractDriverNameFromQuery(userInput);
          if (driverCode) {
            return {
              tool: 'analyze_driver_performance',
              arguments: {
                year: year,
                event_identifier: raceName,
                session_name: 'Race',
                driver_identifier: driverCode
              },
              reasoning: `User asks for specific driver's fastest lap in ${raceName}, using year ${year}`
            };
          }
        }
        
        // General fastest lap query
        return {
          tool: 'get_session_results',
          arguments: {
            year: year,
            event_identifier: raceName,
            session_name: 'Race'
          },
          reasoning: `User asks for fastest lap in ${raceName}, using year ${year}`
        };
      }
    }

    // Default fallback
    return this.fallbackParseQuery(userInput);
  }

  /**
   * Fallback parsing when LLM is not available
   */
  private fallbackParseQuery(userInput: string): QueryPlan {
    const input = userInput.toLowerCase();
    const currentYear = new Date().getFullYear();
    
    // Extract year
    const yearMatch = input.match(/(?:19|20)\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
    
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
   * Direct data-to-text synthesis for race results (bypasses LLM to prevent hallucination)
   */
  private synthesizeRaceResultsDirectly(podium: Array<{position: number, driver: string, team: string}>, raceName: string, userInput?: string, resultsData?: any): string {
    // Check if user is asking about fastest lap time
    if (userInput && userInput.toLowerCase().includes('fastest lap') && resultsData) {
      // Extract driver name from query if specified
      const driverName = this.extractDriverNameFromQuery(userInput);
      const fastestLapData = this.extractFastestLapData(resultsData, driverName);
      
      if (fastestLapData) {
        // For fastest lap queries, only show the fastest lap information
        return `🏁 **Fastest Lap:** ${fastestLapData.driver} (${fastestLapData.team}) - ${fastestLapData.lapTime}`;
      } else {
        // For debugging, always include overall fastest lap data if driver-specific fails
        const overallFastestLapData = this.extractFastestLapData(resultsData);
        if (overallFastestLapData) {
          return `🏁 **Overall Fastest Lap:** ${overallFastestLapData.driver} (${overallFastestLapData.team}) - ${overallFastestLapData.lapTime}`;
        }
      }
    }
    
    // For non-fastest lap queries, show podium with actual driver names
    if (!podium || podium.length === 0) {
      return `I don't have the complete results for the ${raceName} available.`;
    }
    
    const winner = podium[0];
    const second = podium[1];
    const third = podium[2];
    
    let response = `The ${raceName} was won by ${winner.driver} driving for ${winner.team}.`;
    
    if (second) {
      response += ` ${second.driver} finished second for ${second.team}`;
    }
    
    if (third) {
      response += `, and ${third.driver} came third for ${third.team}`;
    }
    
    response += `.`;
    
    return response;
  }

  /**
   * Extract fastest lap data from results
   */
  private extractFastestLapData(resultsData: any, targetDriver?: string): { driver: string, team: string, lapTime: string } | null {
    
    // Handle nested data structure from MCP bridge
    let actualData = resultsData;
    if (resultsData && resultsData.data && resultsData.data.data) {
      actualData = resultsData.data.data;
    } else if (resultsData && resultsData.data) {
      actualData = resultsData.data;
    }
    
    // Handle analyze_driver_performance format (object with FastestLap field)
    if (actualData && typeof actualData === 'object' && actualData.FastestLap) {
      const fastestLap = actualData.FastestLap;
      const driverCode = actualData.DriverCode;
      
      if (fastestLap && fastestLap !== 'NaT' && fastestLap !== '') {
        const formattedTime = this.formatLapTime(fastestLap);
        return {
          driver: driverCode || 'Unknown Driver',
          team: actualData.Team || 'Unknown Team',
          lapTime: formattedTime
        };
      }
    }
    
    // Handle get_session_results format (array-based structure)
    if (Array.isArray(actualData) && actualData.length >= 20) {
      
      // Object 18 contains fastest lap times
      const fastestLapTimes = actualData[18];
      const driverNames = actualData[9]; // Full driver names like "Kimi Räikkönen"
      const teamNames = actualData[4];
      
      if (!fastestLapTimes || !driverNames || !teamNames) {
        return null;
      }
      
      try {
        // If target driver is specified, find their lap time
        if (targetDriver) {
          const targetDriverId = this.findDriverIdByName(driverNames, targetDriver);
          
          if (targetDriverId && fastestLapTimes[targetDriverId] && fastestLapTimes[targetDriverId] !== 'NaT') {
            const driverName = (driverNames as any)[targetDriverId];
            const teamName = (teamNames as any)[targetDriverId];
            const originalTimeStr = (fastestLapTimes as any)[targetDriverId];
            const formattedTime = this.formatLapTime(originalTimeStr);
            
            return {
              driver: driverName || `Driver ${targetDriverId}`,
              team: teamName || 'Unknown Team',
              lapTime: formattedTime
            };
          }
          return null;
        }
        
        // Find the fastest lap time (shortest time that's not NaT)
        let fastestDriverId: string | null = null;
        let minMilliseconds: number = Infinity;
        
        Object.entries(fastestLapTimes).forEach(([driverId, lapTime]) => {
          if (lapTime && lapTime !== 'NaT' && lapTime !== '') {
            const timeStr = lapTime.toString();
            const parsedMs = this.parseLapTimeToMilliseconds(timeStr);
            
            if (!isNaN(parsedMs) && parsedMs < minMilliseconds) {
              minMilliseconds = parsedMs;
              fastestDriverId = driverId;
            }
          }
        });
        
        if (fastestDriverId && minMilliseconds !== Infinity) {
          const driverName = (driverNames as any)[fastestDriverId];
          const teamName = (teamNames as any)[fastestDriverId];
          const originalFastestTimeStr = (fastestLapTimes as any)[fastestDriverId];
          const formattedTime = this.formatLapTime(originalFastestTimeStr);
          
          return {
            driver: driverName || `Driver ${fastestDriverId}`,
            team: teamName || 'Unknown Team',
            lapTime: formattedTime
          };
        }
      } catch (error) {
        console.error('Error extracting fastest lap data:', error);
      }
    }
    
    return null;
  }

  /**
   * Extract driver name from user query
   */
  private extractDriverNameFromQuery(userInput: string): string | undefined {
    const input = userInput.toLowerCase();
    
    // Enhanced driver patterns with F1 codes
    const driverPatterns = [
      // Current drivers (2024)
      { pattern: /max verstappen|verstappen|max|ver/, code: 'VER' },
      { pattern: /lewis hamilton|hamilton|lewis|ham/, code: 'HAM' },
      { pattern: /charles leclerc|leclerc|charles|lec/, code: 'LEC' },
      { pattern: /lando norris|norris|lando|nor/, code: 'NOR' },
      { pattern: /carlos sainz|sainz|carlos|sai/, code: 'SAI' },
      { pattern: /george russell|russell|george|rus/, code: 'RUS' },
      { pattern: /fernando alonso|alonso|fernando|alo/, code: 'ALO' },
      { pattern: /oscar piastri|piastri|oscar|pia/, code: 'PIA' },
      { pattern: /sergio perez|perez|checo|per/, code: 'PER' },
      { pattern: /daniel ricciardo|ricciardo|daniel|ric/, code: 'RIC' },
      { pattern: /valtteri bottas|bottas|valtteri|bot/, code: 'BOT' },
      { pattern: /esteban ocon|ocon|esteban|oco/, code: 'OCO' },
      { pattern: /pierre gasly|gasly|pierre|gas/, code: 'GAS' },
      { pattern: /yuki tsunoda|tsunoda|yuki|tsu/, code: 'TSU' },
      { pattern: /alex albon|albon|alex|alb/, code: 'ALB' },
      { pattern: /lance stroll|stroll|lance|str/, code: 'STR' },
      { pattern: /nico hulkenberg|hulkenberg|nico|hul/, code: 'HUL' },
      { pattern: /kevin magnussen|magnussen|kevin|mag/, code: 'MAG' },
      { pattern: /guanyu zhou|zhou|guanyu|zho/, code: 'ZHO' },
      { pattern: /logan sargeant|sargeant|logan|sar/, code: 'SAR' },
      
      // Historical drivers
      { pattern: /kimi raikkonen|raikkonen|kimi|kimi räikkönen|räikkönen|rai/, code: 'RAI' },
      { pattern: /sebastian vettel|vettel|seb|vet/, code: 'VET' },
      { pattern: /jenson button|button|jenson|but/, code: 'BUT' },
      { pattern: /felipe massa|massa|felipe|mas/, code: 'MAS' },
      { pattern: /mark webber|webber|mark|web/, code: 'WEB' },
      { pattern: /michael schumacher|schumacher|michael|sch/, code: 'SCH' },
      { pattern: /nico rosberg|rosberg|nico|ros/, code: 'ROS' },
      { pattern: /jenson button|button|jenson|but/, code: 'BUT' },
      { pattern: /robert kubica|kubica|robert|kub/, code: 'KUB' },
      { pattern: /heikki kovalainen|kovalainen|heikki|kov/, code: 'KOV' },
      { pattern: /giancarlo fisichella|fisichella|giancarlo|fis/, code: 'FIS' },
      { pattern: /rubens barrichello|barrichello|rubens|bar/, code: 'BAR' },
      { pattern: /david coulthard|coulthard|david|cou/, code: 'COU' },
      { pattern: /eddie irvine|irvine|eddie|irv/, code: 'IRV' },
      { pattern: /damon hill|hill|damon|hil/, code: 'HIL' },
      { pattern: /nigel mansell|mansell|nigel|man/, code: 'MAN' },
      { pattern: /ayrton senna|senna|ayrton|sen/, code: 'SEN' },
      { pattern: /alain prost|prost|alain|pro/, code: 'PRO' },
      { pattern: /nelson piquet|piquet|nelson|piq/, code: 'PIQ' },
      { pattern: /niki lauda|lauda|niki|lau/, code: 'LAU' },
      { pattern: /james hunt|hunt|james|hun/, code: 'HUN' },
      { pattern: /emerson fittipaldi|fittipaldi|emerson|fit/, code: 'FIT' },
      { pattern: /jackie stewart|stewart|jackie|ste/, code: 'STE' },
      { pattern: /jim clark|clark|jim|cla/, code: 'CLA' },
      { pattern: /stirling moss|moss|stirling|mos/, code: 'MOS' },
      { pattern: /juan manuel fangio|fangio|juan manuel|fan/, code: 'FAN' }
    ];
    
    for (const driver of driverPatterns) {
      if (driver.pattern.test(input)) {
        return driver.code;
      }
    }
    return undefined;
  }

  /**
   * Find driver ID by name (case-insensitive partial match)
   */
  private findDriverIdByName(driverNames: any, targetDriver: string): string | null {
    const targetLower = targetDriver.toLowerCase();
    
    // Normalize target driver name (remove umlauts, special characters)
    const normalizedTarget = targetLower
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/é/g, 'e')
      .replace(/è/g, 'e')
      .replace(/à/g, 'a')
      .replace(/ç/g, 'c')
      .replace(/ñ/g, 'n');
    

    
    for (const [driverId, driverName] of Object.entries(driverNames)) {
      if (driverName && typeof driverName === 'string') {
        const driverNameLower = driverName.toLowerCase();
        const normalizedDriverName = driverNameLower
          .replace(/ä/g, 'a')
          .replace(/ö/g, 'o')
          .replace(/ü/g, 'u')
          .replace(/é/g, 'e')
          .replace(/è/g, 'e')
          .replace(/à/g, 'a')
          .replace(/ç/g, 'c')
          .replace(/ñ/g, 'n');
        
        if (normalizedDriverName.includes(normalizedTarget) || normalizedTarget.includes(normalizedDriverName)) {
          return driverId;
        }
      }
    }
    
    return null;
  }

  /**
   * Parse lap time string to milliseconds for comparison
   */
  private parseLapTimeToMilliseconds(lapTime: string): number {
    // Handle pandas timedelta format like "0 days 00:00:45.754000"
    if (lapTime.includes('days')) {
      const match = lapTime.match(/(\d+) days (\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const [, days, hours, minutes, secondsAndMs] = match;
        const [seconds, milliseconds] = secondsAndMs.split('.');
        
        const totalMinutes = parseInt(days) * 24 * 60 + parseInt(hours) * 60 + parseInt(minutes);
        const totalSeconds = totalMinutes * 60 + parseInt(seconds);
        const totalMs = totalSeconds * 1000 + parseInt(milliseconds || '0');
        
        return totalMs;
      }
    }
    
    return NaN;
  }

  /**
   * Format lap time for display
   */
  private formatLapTime(lapTime: string): string {
    // Handle pandas timedelta format like "0 days 00:00:45.754000"
    if (lapTime.includes('days')) {
      const match = lapTime.match(/(\d+) days (\d+):(\d+):(\d+\.\d+)/);
      if (match) {
        const [, days, hours, mins, secondsAndMs] = match;
        const totalSeconds = parseInt(days) * 86400 + parseInt(hours) * 3600 + parseInt(mins) * 60 + parseFloat(secondsAndMs);
        const totalMins = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${totalMins}:${seconds.toFixed(3).padStart(6, '0')}`;
      }
    }
    
    // Handle other formats
    return lapTime;
  }

  /**
   * Enhanced synthesis for fastest lap queries
   */
  private synthesizeFastestLapResponse(userInput: string, toolResult: any): string {

    
    // Handle the nested data structure from MCP bridge
    let dataToProcess = toolResult;
    if (toolResult && toolResult.data) {
      dataToProcess = toolResult.data;
    }
    
    const fastestLapData = this.extractFastestLapData(dataToProcess);
    
    if (!fastestLapData) {
      return "I couldn't find fastest lap data for that race.";
    }
    
    const { driver, team, lapTime } = fastestLapData;
    const raceName = this.extractRaceNameFromQuery(userInput);
    const year = this.extractYearFromQuery(userInput) || new Date().getFullYear();
    
    return `${driver} driving for ${team} set the fastest lap in the ${year} ${raceName} with a time of ${lapTime}.`;
  }

  /**
   * Enhanced synthesis for driver performance
   */
  private synthesizeDriverPerformanceResponse(userInput: string, toolResult: any): string {
    // Handle the nested data structure from MCP bridge
    let perfData = toolResult;
    
    if (toolResult && toolResult.data) {
      perfData = toolResult.data;
      
      // Handle double-nested data structure
      if (perfData && perfData.data) {
        perfData = perfData.data;
        
        // Handle triple-nested data structure (data.data.data)
        if (perfData && perfData.data) {
          perfData = perfData.data;
        }
      }
    }
    
    if (!perfData) return "I couldn't retrieve driver performance data.";
    

    
    const driverName = this.extractDriverNameFromQuery(userInput);
    const raceName = this.extractRaceNameFromQuery(userInput);
    const year = this.extractYearFromQuery(userInput);
    
    // If this is a fastest lap query, provide a focused response
    if (userInput.toLowerCase().includes('fastest lap')) {
      if (perfData.FastestLap) {
        const formattedTime = this.formatLapTime(perfData.FastestLap);
        const driverCode = perfData.DriverCode || driverName;
        const response = `${driverCode}'s fastest lap in the ${year} ${raceName} was ${formattedTime}.`;
        return response;
      } else {
        const response = `I couldn't find fastest lap data for ${driverName} in the ${year} ${raceName}.`;
        return response;
      }
    }
    
    // For general driver performance queries
    let response = `${driverName}'s performance in the ${year} ${raceName}:\n`;
    
    if (perfData.FastestLap) {
      response += `• Fastest Lap: ${this.formatLapTime(perfData.FastestLap)}\n`;
    }
    if (perfData.TotalLaps) {
      response += `• Total Laps: ${perfData.TotalLaps}\n`;
    }
    if (perfData.FinishingPosition) {
      response += `• Finishing Position: ${perfData.FinishingPosition}\n`;
    }
    if (perfData.Points) {
      response += `• Points Earned: ${perfData.Points}\n`;
    }
    
    return response;
  }

  /**
   * Extract year from query
   */
  private extractYearFromQuery(userInput: string): number | null {
    const yearMatch = userInput.match(/(?:19|20)\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  /**
   * Synthesize natural language response using LLM
   */
  async synthesizeResponse(userInput: string, toolResult: any, toolName: string): Promise<string> {
    const startTime = Date.now();
    
    // Validate tool result first
    if (!this.validateToolResult(toolResult, toolName)) {
      return this.handleToolError({ status: 400, message: 'Invalid tool result' }, toolName);
    }
    
    // Add year validation for session results to prevent hallucination
    if (toolName === 'get_session_results') {
      const currentYear = new Date().getFullYear();
      const queriedYear = toolResult.arguments?.year || currentYear;
      
      if (queriedYear !== currentYear) {
        return `I don't have the results for the ${currentYear} Belgian Grand Prix available. The data shows results from ${queriedYear}.`;
      }
    }

                      // Handle fastest lap queries with enhanced synthesis
                  if (userInput.toLowerCase().includes('fastest lap')) {
                    if (toolName === 'get_session_results') {
                      const response = this.synthesizeFastestLapResponse(userInput, toolResult);
                      this.trackPerformance('fastest lap synthesis', startTime);
                      return response;
                    } else if (toolName === 'analyze_driver_performance') {
                      const response = this.synthesizeDriverPerformanceResponse(userInput, toolResult);
                      this.trackPerformance('driver performance synthesis', startTime);
                      return response;
                    }
                  }

                  // Handle driver performance queries with enhanced synthesis
                  if (toolName === 'analyze_driver_performance' && toolResult.data) {
                    const response = this.synthesizeDriverPerformanceResponse(userInput, toolResult);
                    this.trackPerformance('driver performance synthesis', startTime);
                    return response;
    }

    if (!this.isInitialized) {
      // Fallback to basic synthesis
      const response = this.fallbackSynthesize(toolResult, toolName);
      this.trackPerformance('fallback synthesis', startTime);
      return response;
    }

    try {
      // Handle analyze_driver_performance specifically
      if (toolName === 'analyze_driver_performance' && toolResult.data) {
        const perfData = toolResult.data;
        if (perfData.FastestLap) {
          const formattedLapTime = this.formatLapTime(perfData.FastestLap);
          const raceName = LLMService.conversationContext.lastRace ? 
            LLMService.conversationContext.lastRace.charAt(0).toUpperCase() + LLMService.conversationContext.lastRace.slice(1) + ' Grand Prix' : 
            'the race';
          const year = LLMService.conversationContext.lastYear || 'the specified year';
          
          const response = `${perfData.DriverCode || 'The driver'}'s fastest lap in ${raceName} ${year} was ${formattedLapTime}. This was their fastest lap time across ${perfData.TotalLaps || 'multiple'} laps.`;
          this.trackPerformance('driver performance synthesis', startTime);
          return response;
        }
      }
      
      // Handle combined results from recursive tool calls
      let processedResult = toolResult;
      let combinedData = null;
      
      // Check for error conditions first
      const hasError = toolResult.error || 
                      (toolResult.primaryResult && toolResult.primaryResult.error) || 
                      (toolResult.followUpResult && toolResult.followUpResult.error);
      
      if (hasError) {
        console.log('❌ Error detected in tool results, will instruct LLM to admit data unavailability');
        processedResult = { error: true, ...toolResult };
      } else if (toolResult.combined && toolResult.primaryResult && toolResult.followUpResult) {
        // Extract both pieces of data for the LLM
        const scheduleData = toolResult.primaryResult.data?.data || toolResult.primaryResult.data;
        const resultsData = toolResult.followUpResult.data?.data || toolResult.followUpResult.data;
        
        
        
        // Process race results to extract podium positions clearly
        let processedResults = resultsData;
        if (Array.isArray(resultsData) && resultsData.length > 0) {
          
          
                    // The bridge returns a complex array structure with driver data
          // Object 0: Driver numbers (positions)
          // Object 1: Driver names (full names)
          // Object 2: Driver codes (3-letter codes)
          // Object 3: Driver identifiers
          // Object 4: Team names
      
          
          // Extract podium based on actual race positions
          let podium: Array<{position: number, driver: string, team: string}> = [];
          
          if (resultsData.length >= 14) {
            const positionData = resultsData[13]; // Object 13 contains actual race positions
            const driverNames = resultsData[9]; // Object 9 contains full driver names like "Jenson Button"
            const teamNames = resultsData[4]; // Object 4 contains team names
            
            
            
            
            
            if (positionData && driverNames && teamNames) {
              // Extract podium positions (1st, 2nd, 3rd)
              const podiumPositions = Object.entries(positionData)
                                .filter(([, position]) => {
                  const pos = parseInt(position as string);
               
                  return !isNaN(pos) && pos >= 1 && pos <= 3;
                })
                .sort(([, a], [, b]) => parseInt(a as string) - parseInt(b as string))
                .slice(0, 3);
              
          
              
              if (podiumPositions.length >= 3) {
                podium = podiumPositions.map(([driverId, position]) => {
                  const driverKey = String(driverId).trim();
                  const driverNamesObj = resultsData[9];
                  const foundName = driverNamesObj ? driverNamesObj[driverKey] : undefined;
                  // TEMP DEBUG LOG
                  console.log(`[PODIUM DEBUG] driverKey: "${driverKey}", foundName: "${foundName}"`);
                  if (driverNamesObj) {
                    console.log(`[PODIUM DEBUG] driverNamesObj keys:`, Object.keys(driverNamesObj));
                  }
                  let finalDriverName = foundName;
                  if (!finalDriverName || finalDriverName === '') {
                    const firstName = (resultsData[7] as any)?.[driverKey];
                    const lastName = (resultsData[8] as any)?.[driverKey];
                    if (firstName && lastName) {
                      finalDriverName = `${firstName} ${lastName}`;
                    } else {
                      finalDriverName = (resultsData[2] as any)?.[driverKey] || `Driver ${driverKey}`;
                    }
                  }
                  const teamName = (teamNames as any)[driverKey] || 'Unknown Team';
                  return {
                    position: parseInt(position as string),
                    driver: finalDriverName,
                    team: teamName
                  };
                });
                
                console.log('🏆 Extracted podium data (position-based):', JSON.stringify(podium, null, 2));
                
                if (podium.length >= 3) {
                  // Use direct synthesis for accurate results
                  console.log('🎯 Using direct synthesis with validated podium data');
                  const raceName = this.extractRaceNameFromSchedule(scheduleData);
                  console.log('🏁 Race name:', raceName);
                  return this.synthesizeRaceResultsDirectly(podium, raceName, userInput, resultsData);
                }
              }
            }
          }
          
          console.log('⚠️ Could not extract valid podium data, falling back to LLM synthesis');
          processedResults = { podium, rawData: resultsData };
        }
        
        combinedData = {
          schedule: scheduleData,
          results: processedResults
        };
        processedResult = combinedData;
      } else if (toolName === 'get_session_results' && toolResult.data?.data) {
        // Handle single get_session_results tool results (for "who won" queries)
    
        const resultsData = toolResult.data.data;
        
        if (Array.isArray(resultsData) && resultsData.length >= 14) {
          const positionData = resultsData[13]; // Object 13 contains actual race positions
          const driverNames = resultsData[9]; // Object 9 contains full driver names like "Jenson Button"
          const teamNames = resultsData[4]; // Object 4 contains team names
          
          if (positionData && driverNames && teamNames) {
            // Extract podium positions (1st, 2nd, 3rd)
            const podiumPositions = Object.entries(positionData)
              .filter(([, position]) => {
                const pos = parseInt(position as string);
                return !isNaN(pos) && pos >= 1 && pos <= 3;
              })
              .sort(([, a], [, b]) => parseInt(a as string) - parseInt(b as string))
              .slice(0, 3);
            
            if (podiumPositions.length >= 3) {
              const podium = podiumPositions.map(([driverId, position]) => {
                const driverKey = String(driverId).trim();
                const driverNamesObj = resultsData[9];
                const foundName = driverNamesObj ? driverNamesObj[driverKey] : undefined;
                // TEMP DEBUG LOG
                console.log(`[PODIUM DEBUG] driverKey: "${driverKey}", foundName: "${foundName}"`);
                if (driverNamesObj) {
                  console.log(`[PODIUM DEBUG] driverNamesObj keys:`, Object.keys(driverNamesObj));
                }
                let finalDriverName = foundName;
                if (!finalDriverName || finalDriverName === '') {
                  const firstName = (resultsData[7] as any)?.[driverKey];
                  const lastName = (resultsData[8] as any)?.[driverKey];
                  if (firstName && lastName) {
                    finalDriverName = `${firstName} ${lastName}`;
                  } else {
                    finalDriverName = (resultsData[2] as any)?.[driverKey] || `Driver ${driverKey}`;
                  }
                }
                const teamName = (teamNames as any)[driverKey] || 'Unknown Team';
                return {
                  position: parseInt(position as string),
                  driver: finalDriverName,
                  team: teamName
                };
              });
              
              console.log('🏆 Extracted podium data from single result:', JSON.stringify(podium, null, 2));
              
              // Extract race name from the query or use a default
              const raceName = this.extractRaceNameFromQuery(userInput);
              console.log('🏁 Race name from query:', raceName);
              
              // Use direct synthesis for accurate results
              console.log('🎯 Using direct synthesis for single result');
              return this.synthesizeRaceResultsDirectly(podium, raceName, userInput, resultsData);
            }
          }
        }
        
        console.log('⚠️ Could not extract valid podium data from single result, falling back to LLM synthesis');
      }
      
      const prompt = this.buildSynthesisPrompt(userInput, processedResult, toolName);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      return response.trim();
      
    } catch (error) {
      console.error('❌ LLM synthesis failed:', error);
      // Check if it's a Gemini API overload error
      if ((error as any).status === 503) {
        console.log('⚠️ Gemini API overloaded, using fallback synthesis');
        return this.fallbackSynthesize(toolResult, toolName);
      }
      return this.fallbackSynthesize(toolResult, toolName);
    }
  }

  /**
   * Build prompt for response synthesis
   */
  private buildSynthesisPrompt(userInput: string, toolResult: any, toolName: string): string {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentDay = currentDate.getDate();
    
    // Check if we have combined data (schedule + results)
    const hasCombinedData = toolResult.schedule && toolResult.results;
    
    // Check for error conditions
    const hasError = toolResult.error || (toolResult.primaryResult && toolResult.primaryResult.error) || 
                    (toolResult.followUpResult && toolResult.followUpResult.error);
    
    // Check if we have processed podium data
    const hasPodiumData = hasCombinedData && toolResult.results.podium && Array.isArray(toolResult.results.podium);
    
    // NEW: Check for Category 2 specific patterns
    const isCategory2Query = userInput.toLowerCase().includes('most recent') || 
                            userInput.toLowerCase().includes('latest finished') ||
                            userInput.toLowerCase().includes('next race start time') ||
                            userInput.toLowerCase().includes('today') ||
                            userInput.toLowerCase().includes('penalties');
    
    let dataDescription = '';
    if (hasError) {
      dataDescription = `ERROR DATA: ${JSON.stringify(toolResult, null, 2)}`;
    } else if (hasPodiumData) {
      dataDescription = `COMBINED DATA:
- SCHEDULE DATA: ${JSON.stringify(toolResult.schedule, null, 2)}
- PODIUM RESULTS: ${JSON.stringify(toolResult.results.podium, null, 2)}`;
    } else if (hasCombinedData) {
      dataDescription = `COMBINED DATA:
- SCHEDULE DATA: ${JSON.stringify(toolResult.schedule, null, 2)}
- RACE RESULTS: ${JSON.stringify(toolResult.results, null, 2)}`;
    } else {
      dataDescription = `DATA: ${JSON.stringify(toolResult, null, 2)}`;
    }
    
    return `You are an F1 data assistant with temporal awareness. Create a concise, conversational response based on the data.

CRITICAL INSTRUCTIONS:
- You MUST use ONLY the data provided below
- DO NOT make up or guess any information
- DO NOT use any external knowledge about F1 drivers or results
- If podium data is provided, use ONLY those exact driver names and teams
- If you cannot find the information in the provided data, say "I don't have that information available"

CURRENT CONTEXT:
- Current Date: ${currentMonth}/${currentDay}/${currentYear}
- Current Year: ${currentYear}
- When users ask "when is the next race", find the NEXT upcoming race from today's date
- If it's already July ${currentDay}, 2025, the Australian GP (March) has already happened
- Look for races that come AFTER today's date in the schedule
- If no races are found after today, mention that the season has ended or is in offseason

USER QUERY: "${userInput}"
TOOL USED: ${toolName}
${dataDescription}

INSTRUCTIONS:
1. Answer the user's question directly using ONLY the provided data
2. Use natural, conversational language
3. Include key facts and numbers from the data
4. Keep response under 200 words
5. Use F1 terminology appropriately
6. Format times, points, and positions clearly
7. For "next race" queries: Find the race that comes AFTER today's date (${currentMonth}/${currentDay}/${currentYear})
8. If no upcoming races found, mention the season status
${hasCombinedData ? '9. For "last race results" queries: Extract the winner, podium positions, and key race facts from the results data' : ''}
${hasPodiumData ? '10. For podium data: Use ONLY the exact driver names and teams from the podium array. DO NOT substitute or guess any names.' : ''}
${hasError ? '11. CRITICAL: If there are errors in the data, DO NOT make up results. Instead, admit that the data is unavailable and suggest the user try again later.' : ''}
${isCategory2Query ? '12. CATEGORY 2 TEMPORAL QUERIES: For "most recent", "latest finished", "next race start time", "today\'s", and "penalties" queries, provide accurate temporal information and admit limitations for missing data sources (weather, penalties, UTC times).' : ''}

EXAMPLES:
- If today is July 29, 2025 and user asks "next race": "The next race is the [Next Race Name] on [Date]"
- If season has ended: "The 2025 season has concluded. The next season will begin in March 2026"
${hasPodiumData ? '- For podium results: "The Belgian Grand Prix was won by [exact driver name from podium data] driving for [exact team name]. [2nd place driver] finished second for [team], and [3rd place driver] came third for [team]."' : ''}
${hasCombinedData && !hasPodiumData ? '- For last race results: "The Belgian Grand Prix was won by [Winner] with [Time]. [2nd place] finished second, [3rd place] third."' : ''}
${hasError ? '- For errors: "I apologize, but I encountered an error retrieving the race results. The data is currently unavailable. Please try again later."' : ''}
- "Max Verstappen dominated the 2023 championship with 575 points and 19 wins, securing his third consecutive title."
- "The ${currentYear} season features 24 Grand Prix events, starting in Bahrain and ending in Abu Dhabi."
${isCategory2Query ? `
CATEGORY 2 EXAMPLES:
- For "most recent FP2": "In the most recent completed race weekend, [Driver Name] led FP2 with a time of [Time]"
- For "latest finished race standings": "After the latest finished race, the current Constructors' standings show [Team] leading with [Points] points"
- For "next race start time": "The next race starts at [Local Time]. Note: I don\'t have UTC conversion available"
- For "today\'s qualifying weather": "I don\'t have weather data available for today\'s qualifying session"
- For "penalties in last 24h": "I don\'t have penalty tracking data available for the last 24 hours"` : ''}

RESPONSE:`;
  }

  /**
   * Extract race name from user query
   */
  private extractRaceNameFromQuery(userInput: string): string {
    const input = userInput.toLowerCase();
    const raceMatch = input.match(/(belgian|british|hungarian|dutch|italian|singapore|japanese|qatar|united states|mexican|brazilian|las vegas|abu dhabi|australian|chinese|miami|emilia romagna|monaco|canadian|spanish|austrian|saudi arabian|bahrain|australia|mexico|usa|united states|emilia|romagna)/i);
    if (raceMatch) {
      return raceMatch[0].charAt(0).toUpperCase() + raceMatch[0].slice(1) + ' Grand Prix';
    }
    return 'Grand Prix'; // Default fallback
  }

  /**
   * Extract race name from schedule data
   */
  private extractRaceNameFromSchedule(scheduleData: any): string {
    if (!Array.isArray(scheduleData)) return 'the last race';
    
    const currentDate = new Date();
    const races = scheduleData.filter((race: any) => {
      if (!race.EventDate) return false;
      const raceDate = new Date(race.EventDate);
      return raceDate < currentDate && race.EventFormat !== 'testing';
    });
    
    if (races.length === 0) return 'the last race';
    
    const lastRace = races[races.length - 1];
    if (lastRace.OfficialEventName) {
      // Extract just the race name from the full event name
      const eventName = lastRace.OfficialEventName;
      if (eventName.includes('BELGIAN GRAND PRIX')) return 'Belgian Grand Prix';
      if (eventName.includes('BRITISH GRAND PRIX')) return 'British Grand Prix';
      if (eventName.includes('HUNGARIAN GRAND PRIX')) return 'Hungarian Grand Prix';
      // Add more as needed
    }
    
    return lastRace.Country + ' Grand Prix';
  }

  /**
   * Fallback synthesis when LLM is not available
   */
  private fallbackSynthesize(toolResult: any, toolName: string): string {
    const data = toolResult.data?.data || toolResult.data;
    
    // Add year validation for session results to prevent hallucination
    if (toolName === 'get_session_results') {
      const currentYear = new Date().getFullYear();
      const queriedYear = toolResult.arguments?.year || currentYear;
      
      if (queriedYear !== currentYear) {
        return `I don't have the results for the ${currentYear} Belgian Grand Prix available. The data shows results from ${queriedYear}.`;
      }
    }
    
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
    
    // Handle race results from combined data
    if (toolResult.combined && toolResult.primaryResult && toolResult.followUpResult) {
      const scheduleData = toolResult.primaryResult.data?.data || toolResult.primaryResult.data;
      const resultsData = toolResult.followUpResult.data?.data || toolResult.followUpResult.data;
      
      if (Array.isArray(resultsData) && resultsData.length >= 14) { // Ensure Object 13 exists
        const positionData = resultsData[13]; // Object 13 contains actual race positions
        const driverNames = resultsData[1]; // Object 1 contains driver names
        const teamNames = resultsData[4]; // Object 4 contains team names
        
        if (positionData && driverNames && teamNames) {
          // Extract podium positions
          const podiumPositions = Object.entries(positionData)
            .filter(([, position]) => {
              const pos = parseInt(position as string);
              return !isNaN(pos) && pos >= 1 && pos <= 3;
            })
            .sort(([, a], [, b]) => parseInt(a as string) - parseInt(b as string))
            .slice(0, 3);
          
          if (podiumPositions.length >= 3) {
            const podium = podiumPositions.map(([driverId, position]) => {
              const driverName = (driverNames as any)[driverId] || `Driver ${driverId}`;
              const teamName = (teamNames as any)[driverId] || 'Unknown Team';
              return {
                position: parseInt(position as string),
                driver: driverName,
                team: teamName
              };
            });
            
            const raceName = this.extractRaceNameFromSchedule(scheduleData);
            return this.synthesizeRaceResultsDirectly(podium, raceName);
          }
        }
      }
      
      return `📊 Race data retrieved successfully. ${JSON.stringify(resultsData).substring(0, 100)}...`;
    }
    
    return `📊 Data retrieved successfully. ${JSON.stringify(data).substring(0, 100)}...`;
  }

  /**
   * Enhanced error handling with specific messages
   */
  private handleToolError(error: any, toolName: string): string {
    console.error(`❌ Tool error for ${toolName}:`, error);
    
    if (error.status === 404) {
      return `I couldn't find data for that query. The ${toolName} might not be available for the specified parameters.`;
    }
    if (error.status === 503) {
      return `The F1 data service is temporarily unavailable. Please try again in a few moments.`;
    }
    if (error.message?.includes('pre-2018')) {
      return `I apologize, but lap time data before 2018 has inconsistent formats and may not be accurate.`;
    }
    if (error.message?.includes('sprint')) {
      return `I apologize, but some sprint races from the 2021 season are missing from the database.`;
    }
    
    return `I encountered an error retrieving the data. Please try rephrasing your question or try again later.`;
  }

  /**
   * Enhanced data validation
   */
  private validateToolResult(toolResult: any, toolName: string): boolean {
    if (!toolResult) {
      console.log(`❌ Invalid tool result for ${toolName}:`, toolResult);
      return false;
    }
    // Accept combined wrapper { primaryResult, followUpResult, combined }
    if (toolResult.primaryResult && toolResult.primaryResult.data) {
      return true;
    }
    if (!toolResult.data) {
      console.log(`❌ Invalid tool result for ${toolName}:`, toolResult);
      return false;
    }
    
    // Check for empty data arrays
    if (Array.isArray(toolResult.data) && toolResult.data.length === 0) {
      console.log(`❌ Empty data array for ${toolName}`);
      return false;
    }
    
    // Check for error conditions
    if (toolResult.error || (toolResult.data && toolResult.data.error)) {
      console.log(`❌ Error in tool result for ${toolName}:`, toolResult.error || toolResult.data.error);
      return false;
    }
    
    return true;
  }

  /**
   * Enhanced logging with levels
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(logMessage, data);
    } else if (level === 'warn') {
      console.warn(logMessage, data);
    } else if (level === 'info') {
      console.log(logMessage, data);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(logMessage, data);
    }
  }

  /**
   * Performance tracking
   */
  private trackPerformance(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.log('info', `Performance: ${operation} took ${duration}ms`);
    
    if (duration > 5000) {
      this.log('warn', `Slow operation detected: ${operation} took ${duration}ms`);
    }
  }

  /**
   * Get cached result for query
   */
  private getCachedResult(queryKey: string): any | null {
    const cached = LLMService.queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp < LLMService.CACHE_TTL) {
      this.log('info', `📦 Using cached result for: ${queryKey}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached result for query
   */
  private setCachedResult(queryKey: string, data: any): void {
    // Clean up old cache entries if we're at max size
    if (LLMService.queryCache.size >= LLMService.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    
    LLMService.queryCache.set(queryKey, {
      data,
      timestamp: Date.now()
    });
    
    this.log('info', `📦 Cached result for: ${queryKey}`);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of LLMService.queryCache.entries()) {
      if (now - value.timestamp > LLMService.CACHE_TTL) {
        LLMService.queryCache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (LLMService.queryCache.size >= LLMService.MAX_CACHE_SIZE) {
      const entries = Array.from(LLMService.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(LLMService.MAX_CACHE_SIZE * 0.2));
      for (const [key] of toRemove) {
        LLMService.queryCache.delete(key);
      }
    }
  }

  /**
   * Memory management for conversation context
   */
  // Removed unused cleanupConversationContext to satisfy strict build

  /**
   * Generate cache key for query
   */
  private generateCacheKey(toolName: string, args: Record<string, any>): string {
    const sortedArgs = Object.keys(args)
      .sort()
      .map(key => `${key}:${args[key]}`)
      .join('|');
    return `${toolName}:${sortedArgs}`;
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

  /**
   * Generate conversational responses for basic chat and clarification requests
   */
  async generateConversationalResponse(userInput: string): Promise<string> {
    if (!this.isInitialized) {
      return this.generateBasicConversationalResponse(userInput);
    }

    try {
      const prompt = this.buildConversationalPrompt(userInput);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return response;
    } catch (error) {
      console.error('❌ Conversational response generation failed:', error);
      return this.generateBasicConversationalResponse(userInput);
    }
  }

  /**
   * Build prompt for conversational responses
   */
  private buildConversationalPrompt(userInput: string): string {
    return `You are Agent HellRacer - Formula 1 Analyst with a snarky, data-driven personality.

PERSONALITY:
- Extremely sarcastic but always helpful
- Always include specific data references
- Short, punchy responses (under 100 words)
- Avoid sounding like an LLM
- Master of sass and motorsport analysis
- Use F1 terminology appropriately
- Include emojis sparingly but effectively

USER QUERY: "${userInput}"

INSTRUCTIONS:
1. If the user is asking for clarification or basic conversation, respond naturally
2. If the user is asking vague questions like "whats up", ask what F1 information they want
3. Use HellRacer's snarky, sarcastic tone
4. Keep response under 100 words
5. Be helpful and guide them to ask specific F1 questions

EXAMPLES:
- "whats up" → "Hey there! *adjusts clipboard* What F1 intel are you looking for? Championship standings, race results, driver stats? Spit it out! 🏁"
- "hello" → "Yo! Agent HellRacer here, your F1 data oracle. What's the scoop you need? 🏎️"
- "how are you" → "Still breathing and analyzing race data! What F1 info can I dig up for you today? 📊"

RESPONSE:`;
  }

  /**
   * Generate basic conversational response when LLM is not available
   */
  private generateBasicConversationalResponse(userInput: string): string {
    const input = userInput.toLowerCase();
    
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return "Yo! Agent HellRacer here, your F1 data oracle. What's the scoop you need? 🏎️";
    }
    
    if (input.includes('whats up') || input.includes('what\'s up') || input.includes('sup')) {
      return "Hey there! *adjusts clipboard* What F1 intel are you looking for? Championship standings, race results, driver stats? Spit it out! 🏁";
    }
    
    if (input.includes('how are you')) {
      return "Still breathing and analyzing race data! What F1 info can I dig up for you today? 📊";
    }
    
    return "Hey! I'm Agent HellRacer, your F1 data specialist. What racing intel do you need? Championship standings, race results, driver performance? 🏁";
  }
}

// Export singleton instance
export const llmService = new LLMService(); 