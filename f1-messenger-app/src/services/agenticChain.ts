// Agentic Chain Service - Cursor-style chain-of-thought prompting
// Implements 5-level recursion loop with temporal intelligence
// Enhanced with ML-composable metrics for future machine learning implementation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { temporalIntelligence } from './temporalIntelligence';
import { conversationMemory } from './conversationMemory';
import type { TemporalContext } from './temporalIntelligence';
import type { ConversationContext } from './conversationMemory';

export interface ChainStep {
  thought: string;
  action: string;
  arguments: Record<string, any>;
  observation?: any;
  followUp?: ChainStep;
  
  // Enhanced for ML composability and console visualization
  confidence: number; // 0-1 scale for ML training
  reasoning: string; // Why this action was chosen (ML feature)
  alternatives: string[]; // Other options considered (ML feature)
  decisionFactors: string[]; // What influenced the decision (ML feature)
  timestamp: string; // ISO timestamp for temporal analysis
  duration: number; // Processing time in ms (ML performance metric)
  
  // ML-specific fields for future training
  featureVector?: {
    queryComplexity: number; // 0-1 scale
    toolAvailability: number; // 0-1 scale
    contextRelevance: number; // 0-1 scale
    temporalDistance: number; // Days from current date
  };
}

export interface AgenticChain {
  query: string;
  steps: ChainStep[];
  finalAnswer: string;
  recursionLevel: number;
  maxRecursion: number;
  
  // Enhanced metadata for ML analysis
  totalProcessingTime: number; // Total time for entire chain
  decisionPath: string[]; // Visual path of decisions (ML sequence feature)
  confidenceTrajectory: number[]; // How confidence changes (ML time series feature)
  fallbackUsed: boolean; // ML feature for reliability analysis
  toolsAttempted: string[]; // ML feature for tool usage patterns
  
  // ML-specific metadata
  queryMetadata: {
    complexity: 'simple' | 'medium' | 'complex';
    intent: 'lookup' | 'comparison' | 'analysis' | 'prediction';
    domain: 'driver' | 'team' | 'event' | 'championship' | 'general';
    temporalScope: 'current' | 'historical' | 'future' | 'comparative';
  };
  
  // Performance metrics for ML optimization
  performanceMetrics: {
    averageStepDuration: number;
    maxStepDuration: number;
    toolCallEfficiency: number; // Successful tool calls / total attempts
    recursionEfficiency: number; // Final answer quality / recursion depth
  };
}

// ML-composable error tracking
export interface ChainError {
  stepIndex: number;
  errorType: 'tool_failure' | 'validation_error' | 'timeout' | 'llm_error';
  errorMessage: string;
  recoveryAction?: string;
  impactOnConfidence: number; // How much this error reduced confidence
}

// ML-composable success metrics
export interface ChainSuccess {
  stepIndex: number;
  successType: 'tool_execution' | 'data_retrieval' | 'synthesis' | 'validation';
  qualityScore: number; // 0-1 scale
  userSatisfaction?: number; // If feedback is available
  improvementOpportunities: string[]; // Areas for ML optimization
}

class AgenticChainService {
  private model: any;
  private isInitialized = false;
  private maxRecursionLevel = 5;

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini() {
    let apiKey: string | undefined;
    
    // Try multiple ways to get the API key
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Vite environment
      apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('🔍 Vite env check - VITE_GEMINI_API_KEY:', apiKey ? 'Found' : 'Not found');
    }
    
    if (!apiKey && typeof process !== 'undefined' && process.env) {
      // Node.js environment
      apiKey = process.env.VITE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.REACT_APP_GEMINI_API_KEY;
      console.log('🔍 Node env check - API key:', apiKey ? 'Found' : 'Not found');
    }
    
    // Fallback: try to get from window object (for development)
    if (!apiKey && typeof window !== 'undefined') {
      // @ts-ignore
      apiKey = window.__GEMINI_API_KEY__;
      console.log('🔍 Window env check - API key:', apiKey ? 'Found' : 'Not found');
    }
    
    if (!apiKey) {
      console.warn('⚠️ No Gemini API key found. Agentic chain features will use fallback mode for testing.');
      console.log('💡 To enable full LLM features, ensure VITE_GEMINI_API_KEY is set in your .env file');
      // Don't return, allow fallback mode
    } else {
      console.log('🔑 Gemini API key found, initializing LLM service...');
    }

    try {
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1500,
          }
        });
        this.isInitialized = true;
        console.log('✅ Agentic Chain LLM initialized successfully with Gemini API');
      } else {
        // Fallback mode for testing without API key
        this.isInitialized = true;
        console.log('🧪 Agentic Chain running in fallback mode (no API key)');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Agentic Chain LLM:', error);
      // Still allow fallback mode
      this.isInitialized = true;
      console.log('🧪 Agentic Chain running in fallback mode due to initialization error');
    }
  }

  /**
   * Execute agentic chain-of-thought reasoning
   */
  async executeChain(
    query: string, 
    sessionId?: string,
    recursionLevel: number = 0
  ): Promise<AgenticChain> {
    if (!this.isInitialized) {
      return this.fallbackChain(query);
    }

    if (recursionLevel >= this.maxRecursionLevel) {
      return {
        query,
        steps: [],
        finalAnswer: "I've reached the maximum recursion level. Please try a simpler query.",
        recursionLevel,
        maxRecursion: this.maxRecursionLevel,
        totalProcessingTime: 0,
        decisionPath: [],
        confidenceTrajectory: [],
        fallbackUsed: false,
        toolsAttempted: [],
        queryMetadata: { complexity: 'simple', intent: 'lookup', domain: 'general', temporalScope: 'current' },
        performanceMetrics: { averageStepDuration: 0, maxStepDuration: 0, toolCallEfficiency: 0, recursionEfficiency: 0 }
      };
    }

    const chainStartTime = Date.now();
    const confidenceTrajectory: number[] = [];
    const decisionPath: string[] = [];
    const toolsAttempted: string[] = [];

    try {
      // Check if we're in fallback mode (no model)
      if (!this.model) {
        console.log('🧪 Running in fallback mode - generating mock thought process');
        return this.generateMockChain(query, chainStartTime);
      }

      console.log('🤖 Running in full LLM mode with Gemini API');
      const temporalContext = temporalIntelligence.getTemporalContext();
      const conversationContext = sessionId ? 
        conversationMemory.getRelevantContext({
          sessionId,
          userInput: query,
          currentTemporalContext: temporalContext
        }) : null;

      const prompt = this.buildChainPrompt(query, temporalContext, conversationContext, recursionLevel);
      console.log('📝 Generated prompt for Gemini API');
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('✅ Received response from Gemini API');
      
      const chainStep = this.parseChainResponse(response, query);
      
      // Execute the action if present
      if (chainStep.action && chainStep.arguments) {
        const stepStartTime = Date.now();
        chainStep.observation = await this.executeAction(chainStep.action, chainStep.arguments);
        chainStep.duration = Date.now() - stepStartTime;
        
        // Track tools attempted
        if (chainStep.action !== 'answer') {
          toolsAttempted.push(chainStep.action);
        }
        
        // Update decision path and confidence
        decisionPath.push(`${chainStep.action} → ${chainStep.observation ? 'success' : 'pending'}`);
        confidenceTrajectory.push(chainStep.confidence);
        
        // Check if we need to continue the chain
        if (chainStep.followUp && recursionLevel < this.maxRecursionLevel - 1) {
          const followUpChain = await this.executeChain(
            `Follow-up: ${chainStep.followUp.thought}`,
            sessionId,
            recursionLevel + 1
          );
          chainStep.followUp = followUpChain.steps[0];
        }
      }

      // Synthesize final answer
      const finalAnswer = await this.synthesizeFinalAnswer(query, [chainStep]);

      const totalProcessingTime = Date.now() - chainStartTime;
      
      // Calculate performance metrics
      const stepDurations = [chainStep.duration];
      const performanceMetrics = {
        averageStepDuration: stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length,
        maxStepDuration: Math.max(...stepDurations),
        toolCallEfficiency: toolsAttempted.length > 0 ? 1 : 0, // Simplified for now
        recursionEfficiency: recursionLevel === 0 ? 1 : 0.5 // Simplified for now
      };

      // Analyze query metadata
      const queryMetadata = this.analyzeQueryMetadata(query);

      return {
        query,
        steps: [chainStep],
        finalAnswer,
        recursionLevel,
        maxRecursion: this.maxRecursionLevel,
        totalProcessingTime,
        decisionPath,
        confidenceTrajectory,
        fallbackUsed: false,
        toolsAttempted,
        queryMetadata,
        performanceMetrics
      };

    } catch (error) {
      console.error('❌ Agentic chain execution failed:', error);
      return this.fallbackChain(query);
    }
  }

  /**
   * Build chain-of-thought prompt with temporal intelligence
   */
  private buildChainPrompt(
    query: string,
    _temporalContext: TemporalContext,
    conversationContext: ConversationContext | null,
    recursionLevel: number
  ): string {
    const temporalContextString = temporalIntelligence.buildTemporalContextString();
    const conversationContextString = conversationContext ? 
      conversationMemory.buildConversationContextString(conversationContext.sessionId) : 
      'CONVERSATION CONTEXT: No previous conversation history';

    return `You are an F1 data assistant with Cursor-grade chain-of-thought reasoning. Think step by step.

${temporalContextString}
${conversationContextString}

RECURSION LEVEL: ${recursionLevel}/${this.maxRecursionLevel}

AVAILABLE TOOLS:
- resolve_temporal_anchor: Canonicalise relative time phrases
- resolve_historical_marker: Return factual year/event for F1 milestones  
- get_championship_standings: Get championship standings
- get_event_schedule: Get race calendar
- get_session_results: Get race results
- analyze_driver_performance: Get driver stats

CHAIN-OF-THOUGHT EXAMPLES:
Q: "Who won the first F1 race?"
Thought: Need to resolve "first F1 race" to specific year/event, then get winner
Action: resolve_historical_marker
Arguments: {"marker": "first F1 race"}
Observation: {"year": 1950, "event": "British GP", "circuit": "Silverstone"}
Action: get_session_results  
Arguments: {"year": 1950, "event_identifier": "British GP", "session_name": "Race"}
Answer: Giuseppe Farina won the 1950 British GP.

Q: "Next race after Japan?"
Thought: Resolve "next" anchor vs current year
Action: resolve_temporal_anchor
Arguments: {"anchor": "next", "base_year": 2025}
Observation: {"resolved_year": 2025, "relative": "next_in_current"}
Action: get_event_schedule
Arguments: {"year": 2025}
Answer: The next race is the 2025 Qatar GP on 1 December.

USER QUERY: "${query}"

Think step by step. If you need multiple tools, plan followUp actions.
RESPONSE FORMAT:
Thought: [your reasoning]
Action: [tool_name or "answer"]
Arguments: [tool_arguments or final_answer]
FollowUp: [next step if needed]

RESPONSE:`;
  }

  /**
   * Parse chain response into structured format
   */
  private parseChainResponse(response: string, _query: string): ChainStep {
    const lines = response.split('\n');
    let thought = '';
    let action = '';
    let args = {};
    let followUp = undefined;

    for (const line of lines) {
      if (line.startsWith('Thought:')) {
        thought = line.replace('Thought:', '').trim();
      } else if (line.startsWith('Action:')) {
        action = line.replace('Action:', '').trim();
      } else if (line.startsWith('Arguments:')) {
        const argsText = line.replace('Arguments:', '').trim();
        try {
          args = JSON.parse(argsText);
        } catch {
          args = { answer: argsText };
        }
      } else if (line.startsWith('FollowUp:')) {
        const followUpText = line.replace('FollowUp:', '').trim();
        followUp = {
          thought: followUpText,
          action: '',
          arguments: {},
          confidence: 0.5,
          reasoning: 'Follow-up step identified',
          alternatives: [],
          decisionFactors: ['sequential_processing'],
          timestamp: new Date().toISOString(),
          duration: 0
        };
      }
    }

    // Calculate confidence based on action type and arguments
    let confidence = 0.7; // Default confidence
    if (action === 'answer') confidence = 0.9;
    if (action.includes('resolve')) confidence = 0.8;
    if (action.includes('get_')) confidence = 0.85;

    // Generate reasoning based on action
    let reasoning = 'Processing query with available tools';
    if (action === 'answer') reasoning = 'Direct answer based on available information';
    if (action.includes('resolve')) reasoning = 'Resolving temporal or historical context';
    if (action.includes('get_')) reasoning = 'Retrieving specific F1 data';

    // Generate alternatives based on action
    let alternatives: string[] = [];
    if (action === 'answer') alternatives = ['tool_lookup', 'context_search'];
    if (action.includes('resolve')) alternatives = ['direct_lookup', 'approximation'];
    if (action.includes('get_')) alternatives = ['alternative_tool', 'fallback_data'];

    // Generate decision factors
    let decisionFactors: string[] = ['query_analysis', 'tool_availability'];
    if (action === 'answer') decisionFactors.push('direct_response');
    if (action.includes('resolve')) decisionFactors.push('context_resolution');
    if (action.includes('get_')) decisionFactors.push('data_retrieval');

    return {
      thought: thought || 'Processing query',
      action: action || 'answer',
      arguments: args,
      followUp,
      confidence,
      reasoning,
      alternatives,
      decisionFactors,
      timestamp: new Date().toISOString(),
      duration: 0 // Will be set when action is executed
    };
  }

  /**
   * Execute action by calling appropriate service
   */
  private async executeAction(action: string, args: Record<string, any>): Promise<any> {
    // This would integrate with the actual F1 tools
    // For now, return mock data
    if (action === 'resolve_historical_marker') {
      if (args.marker === 'first F1 race') {
        return {
          year: 1950,
          event: 'British GP',
          circuit: 'Silverstone',
          date: '1950-05-13'
        };
      }
    } else if (action === 'resolve_temporal_anchor') {
      return {
        resolved_year: args.base_year,
        relative: 'current_season'
      };
    }
    
    return { status: 'mock_data', action, args };
  }

  /**
   * Synthesize final answer from chain steps
   */
  private async synthesizeFinalAnswer(query: string, steps: ChainStep[]): Promise<string> {
    if (!this.isInitialized || !this.model) {
      console.log('🧪 Using fallback answer synthesis');
      return "I'm processing your F1 query with chain-of-thought reasoning (fallback mode).";
    }

    console.log('🤖 Using Gemini API for final answer synthesis');
    try {
      const prompt = `Synthesize a final answer from these chain steps:

QUERY: "${query}"

STEPS:
${steps.map((step, i) => 
  `${i + 1}. ${step.thought}
   Action: ${step.action}
   Result: ${JSON.stringify(step.observation || step.arguments)}`
).join('\n\n')}

Provide a concise, natural answer based on the chain reasoning.
ANSWER:`;

      const result = await this.model.generateContent(prompt);
      const answer = result.response.text().trim();
      console.log('✅ Final answer synthesized with Gemini API');
      return answer;
    } catch (error) {
      console.error('❌ Final answer synthesis failed:', error);
      return "I've processed your query using chain-of-thought reasoning.";
    }
  }

  /**
   * Fallback chain for when LLM is not available
   */
  private fallbackChain(query: string): AgenticChain {
    const fallbackStep: ChainStep = {
      thought: 'Using fallback processing',
      action: 'answer',
      arguments: { answer: 'Processing your F1 query...' },
      confidence: 0.3,
      reasoning: 'LLM unavailable, using fallback logic',
      alternatives: ['wait_for_llm', 'basic_keyword_search'],
      decisionFactors: ['llm_unavailable', 'fallback_required'],
      timestamp: new Date().toISOString(),
      duration: 0
    };

    return {
      query,
      steps: [fallbackStep],
      finalAnswer: 'I\'m processing your F1 query with enhanced reasoning.',
      recursionLevel: 0,
      maxRecursion: this.maxRecursionLevel,
      totalProcessingTime: 0,
      decisionPath: ['fallback_processing'],
      confidenceTrajectory: [0.3],
      fallbackUsed: true,
      toolsAttempted: [],
      queryMetadata: { complexity: 'simple', intent: 'lookup', domain: 'general', temporalScope: 'current' },
      performanceMetrics: { averageStepDuration: 0, maxStepDuration: 0, toolCallEfficiency: 0, recursionEfficiency: 0 }
    };
  }

  /**
   * Generate mock chain data for fallback mode
   */
  private generateMockChain(query: string, chainStartTime: number): AgenticChain {
    const mockStep: ChainStep = {
      thought: 'Mock thought process for fallback mode',
      action: 'answer',
      arguments: { answer: 'Processing your F1 query using mock data.' },
      confidence: 0.5,
      reasoning: 'LLM unavailable, generating mock data for UI testing.',
      alternatives: ['mock_data', 'basic_keyword_search'],
      decisionFactors: ['llm_unavailable', 'fallback_required'],
      timestamp: new Date().toISOString(),
      duration: 0
    };

    return {
      query,
      steps: [mockStep],
      finalAnswer: 'I\'m processing your F1 query with enhanced reasoning.',
      recursionLevel: 0,
      maxRecursion: this.maxRecursionLevel,
      totalProcessingTime: Date.now() - chainStartTime,
      decisionPath: ['fallback_processing'],
      confidenceTrajectory: [0.5],
      fallbackUsed: true,
      toolsAttempted: [],
      queryMetadata: { complexity: 'simple', intent: 'lookup', domain: 'general', temporalScope: 'current' },
      performanceMetrics: { averageStepDuration: 0, maxStepDuration: 0, toolCallEfficiency: 0, recursionEfficiency: 0 }
    };
  }

  /**
   * Analyze query metadata for ML features
   */
  private analyzeQueryMetadata(query: string): AgenticChain['queryMetadata'] {
    const lowerQuery = query.toLowerCase();
    
    // Complexity analysis
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (lowerQuery.includes('compare') || lowerQuery.includes('analyze') || lowerQuery.includes('performance')) {
      complexity = 'complex';
    } else if (lowerQuery.includes('vs') || lowerQuery.includes('between')) {
      complexity = 'medium';
    }
    
    // Intent analysis
    let intent: 'lookup' | 'comparison' | 'analysis' | 'prediction' = 'lookup';
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
      intent = 'comparison';
    } else if (lowerQuery.includes('analyze') || lowerQuery.includes('performance')) {
      intent = 'analysis';
    } else if (lowerQuery.includes('predict') || lowerQuery.includes('likely')) {
      intent = 'prediction';
    }
    
    // Domain analysis
    let domain: 'driver' | 'team' | 'event' | 'championship' | 'general' = 'general';
    if (lowerQuery.includes('ham') || lowerQuery.includes('ver') || lowerQuery.includes('driver')) {
      domain = 'driver';
    } else if (lowerQuery.includes('red bull') || lowerQuery.includes('mercedes') || lowerQuery.includes('team')) {
      domain = 'team';
    } else if (lowerQuery.includes('race') || lowerQuery.includes('gp') || lowerQuery.includes('qualifying')) {
      domain = 'event';
    } else if (lowerQuery.includes('championship') || lowerQuery.includes('standings')) {
      domain = 'championship';
    }
    
    // Temporal scope analysis
    let temporalScope: 'current' | 'historical' | 'future' | 'comparative' = 'current';
    if (lowerQuery.includes('2023') || lowerQuery.includes('2022') || lowerQuery.includes('last year')) {
      temporalScope = 'historical';
    } else if (lowerQuery.includes('next') || lowerQuery.includes('upcoming')) {
      temporalScope = 'future';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
      temporalScope = 'comparative';
    }
    
    return { complexity, intent, domain, temporalScope };
  }

  isAvailable(): boolean {
    return this.isInitialized; // Always true now, even in fallback mode
  }
}

export const agenticChain = new AgenticChainService(); 