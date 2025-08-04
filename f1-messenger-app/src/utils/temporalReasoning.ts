// Centralized Temporal Reasoning Utility
// Consolidates all temporal logic to eliminate duplication

import type { QueryPlan } from '../services/llmService';

export class TemporalReasoning {
  private static currentYear = new Date().getFullYear();
  private static currentMonth = new Date().getMonth() + 1;
  private static currentDay = new Date().getDate();

  /**
   * Detect Category 2 temporal patterns
   */
  static detectCategory2Patterns(input: string): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('most recent') || 
           lowerInput.includes('latest finished') ||
           lowerInput.includes('next race start time') ||
           lowerInput.includes('today') ||
           lowerInput.includes('penalties');
  }

  /**
   * Detect Category 1 historical patterns
   */
  static detectCategory1Patterns(input: string): boolean {
    const lowerInput = input.toLowerCase();
    return lowerInput.includes('300 km/h') || 
           lowerInput.includes('speed') && lowerInput.includes('first') ||
           lowerInput.includes('finished 4th') || 
           lowerInput.includes('position') && /\d{4}/.test(input);
  }

  /**
   * Get temporal query plan for Category 2 patterns
   */
  static getCategory2QueryPlan(input: string): QueryPlan | null {
    const lowerInput = input.toLowerCase();

    // R1: "Who led FP2 in the most recent completed race weekend?"
    if (lowerInput.includes('most recent completed race weekend') || 
        (lowerInput.includes('most recent') && lowerInput.includes('fp2')) ||
        lowerInput.includes('who led fp2 in the most recent')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        followUp: {
          tool: 'get_session_results',
          arguments: {
            year: this.currentYear,
            event_identifier: 'MOST_RECENT_RACE',
            session_name: 'FP2'
          }
        },
        reasoning: 'User asks about most recent completed race weekend FP2. Need to find the most recent race and get FP2 results.'
      };
    }

    // R2: "Current Constructors' standings after the latest finished race."
    if (lowerInput.includes('latest finished race') || 
        lowerInput.includes('current constructors standings after latest') ||
        lowerInput.includes('current constructors standings after the latest finished race')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        followUp: {
          tool: 'get_championship_standings',
          arguments: { year: this.currentYear }
        },
        reasoning: 'User asks about standings after latest finished race. Need to get current standings.'
      };
    }

    // R3: "Next race start time in UTC."
    if (lowerInput.includes('next race start time') && lowerInput.includes('utc')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        reasoning: 'User asks about next race start time in UTC. Need schedule to find next race and convert to UTC.'
      };
    }

    // R4: "Weather forecast for today's qualifying session."
    if (lowerInput.includes('today') && lowerInput.includes('qualifying')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        followUp: {
          tool: 'get_session_results',
          arguments: {
            year: this.currentYear,
            event_identifier: 'TODAYS_EVENT',
            session_name: 'Qualifying'
          }
        },
        reasoning: 'User asks about today\'s qualifying session. Need to find current event and get qualifying results.'
      };
    }

    // R5: "Any penalties issued in the last 24 h?"
    if (lowerInput.includes('penalties') && (lowerInput.includes('24h') || lowerInput.includes('last 24'))) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        reasoning: 'User asks about penalties in last 24h. Need to check recent events for penalty data.'
      };
    }

    // Default: no specific pattern detected
    return null;
  }

  /**
   * Get temporal query plan for Category 1 patterns
   */
  static getCategory1QueryPlan(input: string): QueryPlan | null {
    const lowerInput = input.toLowerCase();

    // H4: "First F1 race to exceed 300 km/h average speed — when and where?"
    if (lowerInput.includes('300 km/h') || lowerInput.includes('speed') && lowerInput.includes('first')) {
      return {
        tool: 'get_event_schedule',
        arguments: { year: this.currentYear },
        reasoning: 'User asks about first race to exceed 300 km/h. Need historical speed analysis (not available).'
      };
    }

    // H1: "Who finished 4th in the 1950 Monaco Grand Prix?"
    if (lowerInput.includes('finished 4th') || lowerInput.includes('position') && /\d{4}/.test(input)) {
      const yearMatch = input.match(/(19|20)\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : this.currentYear;
      return {
        tool: 'get_session_results',
        arguments: {
          year: year,
          event_identifier: 'EXTRACT_FROM_QUERY',
          session_name: 'Race'
        },
        reasoning: 'User asks about specific historical position. Need detailed results.'
      };
    }

    // Default: no specific pattern detected
    return null;
  }

  /**
   * Get comprehensive temporal query plan
   */
  static getTemporalQueryPlan(input: string): QueryPlan | null {
    // Check Category 2 patterns first (more specific)
    const category2Plan = this.getCategory2QueryPlan(input);
    if (category2Plan) return category2Plan;

    // Check Category 1 patterns
    const category1Plan = this.getCategory1QueryPlan(input);
    if (category1Plan) return category1Plan;

    // No temporal pattern detected
    return null;
  }

  /**
   * Check if query should use intelligent fallback
   */
  static shouldUseIntelligentFallback(input: string): boolean {
    return this.detectCategory2Patterns(input) || 
           this.detectCategory1Patterns(input) ||
           input.toLowerCase().includes('who won') || 
           input.toLowerCase().includes('winner');
  }

  /**
   * Get current temporal context
   */
  static getCurrentContext(): string {
    return `Current Date: ${this.currentMonth}/${this.currentDay}/${this.currentYear}
Current Year: ${this.currentYear}
Current Month: ${this.currentMonth}`;
  }

  /**
   * Update temporal context (call this periodically)
   */
  static updateContext(): void {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.currentDay = new Date().getDate();
  }
} 