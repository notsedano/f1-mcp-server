// Error Guard Service - Prevents hallucination by forcing error admission
// Wraps all tool calls with Result<T, MCPError> pattern

export interface MCPError {
  type: 'DATA_UNAVAILABLE' | 'TOOL_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
  message: string;
  toolName?: string;
  originalError?: any;
}

export type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class ErrorGuard {
  /**
   * Wrap tool calls with error handling
   */
  static async wrapToolCall<T>(
    toolName: string,
    fn: () => Promise<T>
  ): Promise<Result<T, MCPError>> {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      const mcpError = this.normalizeError(error, toolName);
      return { success: false, error: mcpError };
    }
  }

  /**
   * Force error admission - prevents hallucination
   */
  static forceErrorAdmission(error: MCPError): string {
    const baseMessage = "Data unavailable for this query. Try rephrasing or check later.";
    
    switch (error.type) {
      case 'DATA_UNAVAILABLE':
        return `I apologize, but I cannot provide accurate information for this query. The data source returned: "${error.message}". Please try again later or rephrase your question.`;
      
      case 'TOOL_ERROR':
        return `I encountered an error while processing your F1 query. The tool "${error.toolName}" reported: "${error.message}". I cannot provide accurate information at this time.`;
      
      case 'NETWORK_ERROR':
        return `I'm unable to connect to the F1 data service at the moment. Please try again later when the connection is restored.`;
      
      case 'VALIDATION_ERROR':
        return `I cannot process your query due to invalid parameters: "${error.message}". Please rephrase your question with valid F1 data parameters.`;
      
      default:
        return baseMessage;
    }
  }

  /**
   * Normalize different error types into MCPError
   */
  private static normalizeError(error: any, toolName?: string): MCPError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Check for specific error patterns
    if (errorMessage.includes('Invalid championship data format')) {
      return {
        type: 'DATA_UNAVAILABLE',
        message: 'Invalid championship data format',
        toolName,
        originalError: error
      };
    }
    
    if (errorMessage.includes('Failed to analyze driver performance')) {
      return {
        type: 'TOOL_ERROR',
        message: 'Driver performance analysis failed',
        toolName,
        originalError: error
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        toolName,
        originalError: error
      };
    }
    
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        type: 'VALIDATION_ERROR',
        message: errorMessage,
        toolName,
        originalError: error
      };
    }
    
    // Default to tool error
    return {
      type: 'TOOL_ERROR',
      message: errorMessage,
      toolName,
      originalError: error
    };
  }

  /**
   * Check if result is an error
   */
  static isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  }

  /**
   * Extract data from successful result
   */
  static getData<T, E>(result: Result<T, E>): T | null {
    return result.success ? result.data : null;
  }

  /**
   * Extract error from failed result
   */
  static getError<T, E>(result: Result<T, E>): E | null {
    return result.success ? null : result.error;
  }
} 