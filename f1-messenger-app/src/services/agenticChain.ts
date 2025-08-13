// Agentic Chain Service - Cursor-style chain-of-thought prompting
// Implements 5-level recursion loop with temporal intelligence

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
}

export interface AgenticChain {
  query: string;
  steps: ChainStep[];
  finalAnswer: string;
  recursionLevel: number;
  maxRecursion: number;
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
    
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.VITE_GEMINI_API_KEY || 
                process.env.GEMINI_API_KEY || 
                process.env.REACT_APP_GEMINI_API_KEY;
    } else if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY;
    }
    
    if (!apiKey) {
      console.warn('No Gemini API key found. Agentic chain features will be disabled.');
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500,
        }
      });
      this.isInitialized = true;
      console.log('✅ Agentic Chain LLM initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Agentic Chain LLM:', error);
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
        maxRecursion: this.maxRecursionLevel
      };
    }

    try {
      const temporalContext = temporalIntelligence.getTemporalContext();
      const conversationContext = sessionId ? 
        conversationMemory.getRelevantContext({
          sessionId,
          userInput: query,
          currentTemporalContext: temporalContext
        }) : null;

      const prompt = this.buildChainPrompt(query, temporalContext, conversationContext, recursionLevel);
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const chainStep = this.parseChainResponse(response, query);
      
      // Execute the action if present
      if (chainStep.action && chainStep.arguments) {
        chainStep.observation = await this.executeAction(chainStep.action, chainStep.arguments);
        
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

      return {
        query,
        steps: [chainStep],
        finalAnswer,
        recursionLevel,
        maxRecursion: this.maxRecursionLevel
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

Q: "Next race after Japan 2024?"
Thought: Resolve "next" anchor vs 2024 base year
Action: resolve_temporal_anchor
Arguments: {"anchor": "next", "base_year": 2024}
Observation: {"resolved_year": 2024, "relative": "next_in_current"}
Action: get_event_schedule
Arguments: {"year": 2024}
Answer: The next race is the 2024 Qatar GP on 1 December.

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
          arguments: {}
        };
      }
    }

    return {
      thought: thought || 'Processing query',
      action: action || 'answer',
      arguments: args,
      followUp
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
    if (!this.isInitialized) {
      return "I'm processing your F1 query with chain-of-thought reasoning.";
    }

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
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Final answer synthesis failed:', error);
      return "I've processed your query using chain-of-thought reasoning.";
    }
  }

  /**
   * Fallback chain for when LLM is not available
   */
  private fallbackChain(query: string): AgenticChain {
    return {
      query,
      steps: [{
        thought: 'Using fallback processing',
        action: 'answer',
        arguments: { answer: 'Processing your F1 query...' }
      }],
      finalAnswer: 'I\'m processing your F1 query with enhanced reasoning.',
      recursionLevel: 0,
      maxRecursion: this.maxRecursionLevel
    };
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }
}

export const agenticChain = new AgenticChainService(); 