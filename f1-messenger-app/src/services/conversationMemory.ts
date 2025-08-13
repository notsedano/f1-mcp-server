// Conversation Memory Service
// Maintains context and temporal awareness across conversation sessions

import type { TemporalContext, TemporalReference, ConversationTemporalState } from './temporalIntelligence';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sessionId: string;
}

export interface ConversationContext {
  sessionId: string;
  messages: ChatMessage[];
  temporalState: ConversationTemporalState;
  lastQueryPlan?: any;
  lastToolResults?: any[];
  referencedEvents: string[];
  referencedDrivers: string[];
  temporalReferences: TemporalReference[];
  contextWindow: number;
}

export interface MemoryQuery {
  sessionId: string;
  userInput: string;
  currentTemporalContext: TemporalContext;
}

class ConversationMemoryService {
  private sessions: Map<string, ConversationContext> = new Map();
  private maxContextWindow = 10; // Maximum messages to keep in context
  private maxSessions = 100; // Maximum concurrent sessions
  
  /**
   * Update conversation memory with new message
   */
  updateMemory(sessionId: string, message: ChatMessage, queryPlan?: any, results?: any[]): void {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = this.createNewSession(sessionId);
    }
    
    // Add message to conversation
    session.messages.push(message);
    
    // Update temporal state
    session.temporalState.lastQueryTime = message.timestamp;
    if (queryPlan) session.temporalState.lastQueryPlan = queryPlan;
    if (results) session.temporalState.lastToolResults = results;
    
    // Extract and store references
    this.extractReferences(message.content, session);
    
    // Maintain context window
    this.maintainContextWindow(session);
    
    // Store updated session
    this.sessions.set(sessionId, session);
    
    // Clean up old sessions if needed
    this.cleanupOldSessions();
  }
  
  /**
   * Get conversation context for a session
   */
  getContext(sessionId: string): ConversationContext | null {
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Get relevant context for query processing
   */
  getRelevantContext(query: MemoryQuery): ConversationContext | null {
    const session = this.sessions.get(query.sessionId);
    if (!session) return null;
    
    // Return context with recent messages and temporal state
    return {
      ...session,
      messages: session.messages.slice(-session.contextWindow),
      temporalState: {
        ...session.temporalState,
        contextWindow: session.contextWindow
      }
    };
  }
  
  /**
   * Extract references from message content
   */
  private extractReferences(content: string, session: ConversationContext): void {
    const lowerContent = content.toLowerCase();
    
    // Extract driver references
    const driverNames = [
      'hamilton', 'verstappen', 'leclerc', 'sainz', 'norris', 'russell',
      'alonso', 'perez', 'ocon', 'gasly', 'stroll', 'bottas', 'zhou',
      'tsunoda', 'ricciardo', 'hulkenberg', 'magnussen', 'albon', 'sargeant'
    ];
    
    driverNames.forEach(driver => {
      if (lowerContent.includes(driver) && !session.referencedDrivers.includes(driver)) {
        session.referencedDrivers.push(driver);
      }
    });
    
    // Extract event references
    const eventNames = [
      'monaco', 'silverstone', 'spa', 'monza', 'suzuka', 'interlagos',
      'australia', 'bahrain', 'saudi arabia', 'emilia romagna', 'miami',
      'spain', 'austria', 'hungary', 'belgium', 'netherlands', 'singapore',
      'japan', 'qatar', 'united states', 'mexico', 'brazil', 'abu dhabi'
    ];
    
    eventNames.forEach(event => {
      if (lowerContent.includes(event) && !session.referencedEvents.includes(event)) {
        session.referencedEvents.push(event);
      }
    });
    
    // Extract temporal references (using temporal intelligence service)
    // This will be integrated with the temporal intelligence service
  }
  
  /**
   * Maintain context window by limiting message history
   */
  private maintainContextWindow(session: ConversationContext): void {
    if (session.messages.length > session.contextWindow) {
      session.messages = session.messages.slice(-session.contextWindow);
    }
  }
  
  /**
   * Create new conversation session
   */
  private createNewSession(sessionId: string): ConversationContext {
    return {
      sessionId,
      messages: [],
      temporalState: {
        sessionId,
        lastQueryTime: new Date().toISOString(),
        referencedEvents: [],
        referencedDrivers: [],
        temporalReferences: [],
        contextWindow: this.maxContextWindow
      },
      referencedEvents: [],
      referencedDrivers: [],
      temporalReferences: [],
      contextWindow: this.maxContextWindow
    };
  }
  
  /**
   * Clean up old sessions to prevent memory leaks
   */
  private cleanupOldSessions(): void {
    if (this.sessions.size <= this.maxSessions) return;
    
    // Remove oldest sessions
    const sessionsArray = Array.from(this.sessions.entries());
    sessionsArray.sort((a, b) => {
      const aTime = new Date(a[1].temporalState.lastQueryTime).getTime();
      const bTime = new Date(b[1].temporalState.lastQueryTime).getTime();
      return aTime - bTime;
    });
    
    const sessionsToRemove = sessionsArray.slice(0, this.sessions.size - this.maxSessions);
    sessionsToRemove.forEach(([sessionId]) => {
      this.sessions.delete(sessionId);
    });
  }
  
  /**
   * Build conversation context string for LLM prompts
   */
  buildConversationContextString(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session || session.messages.length === 0) {
      return 'CONVERSATION CONTEXT: No previous conversation history';
    }
    
    const recentMessages = session.messages.slice(-3); // Last 3 messages
    const contextString = recentMessages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');
    
    const references = [
      session.referencedDrivers.length > 0 ? `Drivers: ${session.referencedDrivers.join(', ')}` : null,
      session.referencedEvents.length > 0 ? `Events: ${session.referencedEvents.join(', ')}` : null
    ].filter(Boolean).join(' | ');
    
    return `CONVERSATION CONTEXT:
Recent Messages:
${contextString}

Previous References: ${references || 'None'}`;
  }
  
  /**
   * Get conversation summary for context
   */
  getConversationSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return 'No conversation history';
    
    const summary = {
      messageCount: session.messages.length,
      referencedDrivers: session.referencedDrivers.slice(-5), // Last 5 drivers
      referencedEvents: session.referencedEvents.slice(-3), // Last 3 events
      lastQueryTime: session.temporalState.lastQueryTime
    };
    
    return `Conversation Summary:
- Messages: ${summary.messageCount}
- Recent Drivers: ${summary.referencedDrivers.join(', ') || 'None'}
- Recent Events: ${summary.referencedEvents.join(', ') || 'None'}
- Last Query: ${new Date(summary.lastQueryTime).toLocaleString()}`;
  }
}

export const conversationMemory = new ConversationMemoryService(); 