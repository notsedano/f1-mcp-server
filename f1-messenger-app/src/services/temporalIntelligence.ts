// Temporal Intelligence Service
// Handles advanced temporal context, F1 season awareness, and relative time processing

export interface TemporalContext {
  currentDate: string;
  currentYear: number;
  currentMonth: number;
  currentDay: number;
  currentWeek: number;
  f1Season: number;
  isRaceWeekend: boolean;
  lastRaceDate?: string;
  nextRaceDate?: string;
  currentRound?: number;
  seasonProgress?: number; // Percentage of season completed
}

export interface TemporalReference {
  type: 'absolute' | 'relative' | 'seasonal';
  value: string;
  confidence: number;
  detectedYear?: number;
  relativeTime?: 'past' | 'present' | 'future';
}

export interface ConversationTemporalState {
  sessionId: string;
  lastQueryTime: string;
  referencedEvents: string[];
  referencedDrivers: string[];
  temporalReferences: TemporalReference[];
  lastQueryPlan?: any;
  lastToolResults?: any[];
  contextWindow: number; // Number of messages to consider for context
}

class TemporalIntelligenceService {
  private f1SeasonStartMonth = 3; // March
  private f1SeasonEndMonth = 11; // November
  
  /**
   * Get comprehensive temporal context
   */
  getTemporalContext(): TemporalContext {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentWeek = this.getWeekOfYear(now);
    
    return {
      currentDate: now.toISOString().split('T')[0],
      currentYear,
      currentMonth,
      currentDay,
      currentWeek,
      f1Season: this.getCurrentF1Season(now),
      isRaceWeekend: this.isRaceWeekend(now),
      lastRaceDate: undefined, // Will be populated from F1 data
      nextRaceDate: undefined, // Will be populated from F1 data
      currentRound: undefined, // Will be populated from F1 data
      seasonProgress: this.calculateSeasonProgress(now)
    };
  }
  
  /**
   * Determine current F1 season based on date
   */
  private getCurrentF1Season(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // F1 season typically starts in March
    // If we're in January/February, we're still in the previous year's season
    if (month < this.f1SeasonStartMonth) {
      return year - 1;
    }
    
    return year;
  }
  
  /**
   * Calculate F1 season progress percentage
   */
  private calculateSeasonProgress(date: Date): number {
    const month = date.getMonth() + 1;
    
    // F1 season runs from March to November (9 months)
    if (month < this.f1SeasonStartMonth) {
      return 0; // Season hasn't started
    }
    
    if (month > this.f1SeasonEndMonth) {
      return 100; // Season has ended
    }
    
    // Calculate progress within the season
    const seasonStart = new Date(date.getFullYear(), this.f1SeasonStartMonth - 1, 1);
    const seasonEnd = new Date(date.getFullYear(), this.f1SeasonEndMonth - 1, 30);
    const totalDays = (seasonEnd.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (date.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  }
  
  /**
   * Check if current date is during a typical F1 race weekend
   */
  private isRaceWeekend(date: Date): boolean {
    const day = date.getDay();
    // F1 races typically happen on weekends (Friday-Sunday)
    return day >= 5 && day <= 0; // Friday (5) to Sunday (0)
  }
  
  /**
   * Get week of year
   */
  private getWeekOfYear(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }
  
  /**
   * Extract temporal references from text
   */
  extractTemporalReferences(text: string): TemporalReference[] {
    const references: TemporalReference[] = [];
    const lowerText = text.toLowerCase();
    
    // Absolute time references
    const absolutePatterns = [
      { pattern: /(19|20)\d{2}/g, type: 'absolute' as const, confidence: 0.9 },
      { pattern: /\b(202[0-9]|203[0-9])\b/g, type: 'absolute' as const, confidence: 0.95 }
    ];
    
    absolutePatterns.forEach(({ pattern, type, confidence }) => {
      const matches = lowerText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          references.push({
            type,
            value: match,
            confidence,
            detectedYear: parseInt(match),
            relativeTime: this.getRelativeTime(parseInt(match))
          });
        });
      }
    });
    
    // Relative time references
    const relativePatterns = [
      { pattern: /\b(next|upcoming|future)\s+(race|grand\s+prix|gp)\b/, type: 'relative' as const, confidence: 0.8, relativeTime: 'future' as const },
      { pattern: /\b(last|previous|past)\s+(race|grand\s+prix|gp)\b/, type: 'relative' as const, confidence: 0.8, relativeTime: 'past' as const },
      { pattern: /\b(current|this\s+season|now)\b/, type: 'relative' as const, confidence: 0.7, relativeTime: 'present' as const },
      { pattern: /\b(today|yesterday|tomorrow)\b/, type: 'relative' as const, confidence: 0.6, relativeTime: 'present' as const },
      { pattern: /\b(first|earliest)\s+(f1|race)\b/, type: 'relative' as const, confidence: 0.9, relativeTime: 'past' as const }
    ];
    
    relativePatterns.forEach(({ pattern, type, confidence, relativeTime }) => {
      if (pattern.test(lowerText)) {
        references.push({
          type,
          value: lowerText.match(pattern)?.[0] || '',
          confidence,
          relativeTime
        });
      }
    });
    
    // Seasonal references
    const seasonalPatterns = [
      { pattern: /\b(this\s+season|current\s+season)\b/, type: 'seasonal' as const, confidence: 0.8 },
      { pattern: /\b(last\s+season|previous\s+season)\b/, type: 'seasonal' as const, confidence: 0.8 },
      { pattern: /\b(next\s+season|upcoming\s+season)\b/, type: 'seasonal' as const, confidence: 0.8 }
    ];
    
    seasonalPatterns.forEach(({ pattern, type, confidence }) => {
      if (pattern.test(lowerText)) {
        references.push({
          type,
          value: lowerText.match(pattern)?.[0] || '',
          confidence
        });
      }
    });
    
    return references;
  }
  
  /**
   * Determine relative time for a year
   */
  private getRelativeTime(year: number): 'past' | 'present' | 'future' {
    const f1Season = this.getCurrentF1Season(new Date());
    
    if (year < f1Season) return 'past';
    if (year > f1Season) return 'future';
    return 'present';
  }
  
  /**
   * Resolve temporal references to specific years
   */
  resolveTemporalReferences(references: TemporalReference[], context: TemporalContext): number {
    // If we have absolute year references, use the most confident one
    const absoluteRefs = references.filter(ref => ref.type === 'absolute');
    if (absoluteRefs.length > 0) {
      const bestRef = absoluteRefs.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return bestRef.detectedYear!;
    }
    
    // Handle relative references
    const relativeRefs = references.filter(ref => ref.type === 'relative');
    if (relativeRefs.length > 0) {
      const bestRef = relativeRefs.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      switch (bestRef.relativeTime) {
        case 'future':
          return context.f1Season;
        case 'past':
          return context.f1Season - 1;
        case 'present':
        default:
          return context.f1Season;
      }
    }
    
    // Handle seasonal references
    const seasonalRefs = references.filter(ref => ref.type === 'seasonal');
    if (seasonalRefs.length > 0) {
      const bestRef = seasonalRefs.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      if (bestRef.value.includes('last') || bestRef.value.includes('previous')) {
        return context.f1Season - 1;
      } else if (bestRef.value.includes('next') || bestRef.value.includes('upcoming')) {
        return context.f1Season + 1;
      } else {
        return context.f1Season; // this/current season
      }
    }
    
    // Default to current F1 season
    return context.f1Season;
  }
  
  /**
   * Build temporal context string for LLM prompts
   */
  buildTemporalContextString(): string {
    const context = this.getTemporalContext();
    
    return `TEMPORAL CONTEXT:
- Current Date: ${context.currentDate}
- Current Year: ${context.currentYear}
- Current F1 Season: ${context.f1Season}
- Season Progress: ${context.seasonProgress?.toFixed(1) || '0.0'}%
- Is Race Weekend: ${context.isRaceWeekend}
- Last Race: ${context.lastRaceDate || 'Unknown'}
- Next Race: ${context.nextRaceDate || 'Unknown'}
- Current Round: ${context.currentRound || 'Unknown'}`;
  }
}

export const temporalIntelligence = new TemporalIntelligenceService(); 