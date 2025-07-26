# MCP Client Architecture Guide - Cursor-Style Implementation

## 1. Core MCP Client Interface

```typescript
interface MCPClient {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Tool discovery
  listTools(): Promise<ToolSchema[]>;
  
  // Tool execution
  callTool(name: string, args: any): Promise<any>;
  
  // Observability
  getMetrics(): ToolMetrics;
  getHealth(): HealthStatus;
}

interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}
```

## 2. Recursive Tool Execution Engine (Cursor's Core)

```typescript
class RecursiveToolEngine {
  private maxRecursionDepth = 5;
  private maxToolCalls = 10;
  
  async executeQuery(
    userQuery: string,
    availableTools: ToolSchema[],
    mcpClient: MCPClient
  ): Promise<string> {
    const conversation: Message[] = [
      { role: 'user', content: userQuery }
    ];
    
    return this.runRecursiveTurn(conversation, availableTools, mcpClient, 0);
  }
  
  private async runRecursiveTurn(
    messages: Message[],
    tools: ToolSchema[],
    mcpClient: MCPClient,
    depth: number
  ): Promise<string> {
    // Prevent infinite loops
    if (depth >= this.maxRecursionDepth) {
      return this.synthesizeFromHistory(messages);
    }
    
    // 1. Context injection
    const context = this.injectContext(messages, tools);
    
    // 2. LLM decision
    const llmResponse = await this.callLLM(context);
    
    // 3. Check for tool calls
    if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
      // 4. Execute tools
      const updatedMessages = await this.executeTools(
        messages, 
        llmResponse.toolCalls, 
        mcpClient
      );
      
      // 5. Recurse
      return this.runRecursiveTurn(updatedMessages, tools, mcpClient, depth + 1);
    }
    
    // 6. Final response
    return llmResponse.text;
  }
  
  private async executeTools(
    messages: Message[],
    toolCalls: ToolCall[],
    mcpClient: MCPClient
  ): Promise<Message[]> {
    const updatedMessages = [...messages];
    
    for (const call of toolCalls) {
      // Add tool call to history
      updatedMessages.push({
        role: 'assistant',
        content: `Calling ${call.name}...`,
        toolCalls: [call]
      });
      
      // Execute tool with tracing
      const result = await this.tracedToolCall(call.name, call.args, mcpClient);
      
      // Add result to history
      updatedMessages.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolName: call.name
      });
    }
    
    return updatedMessages;
  }
}
```

## 3. Context Injection System

```typescript
class ContextInjector {
  injectContext(messages: Message[], tools: ToolSchema[]): any[] {
    const systemPrompt = this.buildSystemPrompt(tools);
    const conversationHistory = this.formatHistory(messages);
    
    return [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory
    ];
  }
  
  private buildSystemPrompt(tools: ToolSchema[]): string {
    const toolSchemas = tools.map(tool => 
      `${tool.name}: ${tool.description}`
    ).join('\n');
    
    return `You are an intelligent data analyst. Available tools:
${toolSchemas}

EXAMPLES:
User: "Driver performance in 2023"
→ get_championship_standings(2023)
→ analyze_driver_performance(2023, "Monaco", "Race", "VER")
→ Answer with comprehensive analysis

PATTERN: Always call tools until you have complete data, then provide detailed analysis.`;
  }
  
  private formatHistory(messages: Message[]): any[] {
    return messages
      .filter(msg => msg.role !== 'tool') // Tool results embedded in flow
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
  }
}
```

## 4. Tool Execution with Observability

```typescript
class ToolExecutor {
  async tracedToolCall(
    name: string,
    args: any,
    mcpClient: MCPClient
  ): Promise<any> {
    const startTime = performance.now();
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Exponential backoff
        if (attempt > 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 2), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Execute with timeout
        const result = await Promise.race([
          mcpClient.callTool(name, args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
          )
        ]);
        
        const duration = performance.now() - startTime;
        this.recordMetrics(name, duration, 'success', attempt);
        
        return result;
        
      } catch (error) {
        if (attempt === maxRetries) {
          const duration = performance.now() - startTime;
          this.recordMetrics(name, duration, 'error', attempt, error);
          throw error;
        }
      }
    }
  }
  
  private recordMetrics(
    toolName: string,
    duration: number,
    status: 'success' | 'error',
    attempt: number,
    error?: any
  ): void {
    // Record metrics for observability
    console.log(`[${toolName}] ${status} ${duration.toFixed(1)}ms (attempt ${attempt})`);
  }
}
```

## 5. Response Synthesis Engine

```typescript
class ResponseSynthesizer {
  synthesizeFromHistory(messages: Message[]): string {
    const toolResults = messages.filter(m => m.role === 'tool');
    const userQuery = messages.find(m => m.role === 'user')?.content || '';
    
    if (toolResults.length === 0) {
      return `I couldn't gather the data needed for: "${userQuery}". Please try a more specific query.`;
    }
    
    // Extract and summarize data
    const summaries = toolResults.map(msg => {
      try {
        const result = JSON.parse(msg.content);
        return this.summarizeData(result, msg.toolName);
      } catch (e) {
        return `Error processing ${msg.toolName} result`;
      }
    });
    
    // Generate comprehensive response
    return this.generateComprehensiveResponse(userQuery, summaries);
  }
  
  private summarizeData(result: any, toolName: string): string {
    // Tool-specific summarization logic
    switch (toolName) {
      case 'get_championship_standings':
        return this.summarizeChampionship(result);
      case 'analyze_driver_performance':
        return this.summarizePerformance(result);
      case 'compare_drivers':
        return this.summarizeComparison(result);
      default:
        return `Data from ${toolName}: ${JSON.stringify(result).substring(0, 100)}...`;
    }
  }
  
  private generateComprehensiveResponse(query: string, summaries: string[]): string {
    return `🏁 **Analysis for "${query}"**

${summaries.join('\n\n')}

📊 **Summary:** Successfully analyzed data from ${summaries.length} sources.`;
  }
}
```

## 6. Complete MCP Client Implementation

```typescript
class CursorStyleMCPClient implements MCPClient {
  private connection: MCPConnection | null = null;
  private toolEngine: RecursiveToolEngine;
  private contextInjector: ContextInjector;
  private toolExecutor: ToolExecutor;
  private synthesizer: ResponseSynthesizer;
  
  constructor(private serverUrl: string) {
    this.toolEngine = new RecursiveToolEngine();
    this.contextInjector = new ContextInjector();
    this.toolExecutor = new ToolExecutor();
    this.synthesizer = new ResponseSynthesizer();
  }
  
  async connect(): Promise<void> {
    // Implement connection logic
    this.connection = { state: 'ready' };
  }
  
  async listTools(): Promise<ToolSchema[]> {
    // Implement tool discovery
    return [];
  }
  
  async callTool(name: string, args: any): Promise<any> {
    return this.toolExecutor.tracedToolCall(name, args, this);
  }
  
  async executeQuery(userQuery: string): Promise<string> {
    const tools = await this.listTools();
    return this.toolEngine.executeQuery(userQuery, tools, this);
  }
  
  // ... other interface methods
}
```

## 7. Integration with LLM (Gemini Example)

```typescript
class GeminiLLMIntegration {
  private model: any;
  
  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
      }
    });
  }
  
  async callLLM(context: any[]): Promise<{ text?: string; toolCalls?: ToolCall[] }> {
    const result = await this.model.generateContent({
      contents: context
    });
    
    const response = result.response;
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      return {
        toolCalls: functionCalls.map(call => ({
          name: call.name,
          args: call.args
        }))
      };
    }
    
    return { text: response.text() };
  }
}
```

## 8. Error Handling and Recovery

```typescript
class ErrorHandler {
  categorizeError(error: any): string {
    const errorStr = String(error).toLowerCase();
    
    if (errorStr.includes('timeout')) return 'TIMEOUT';
    if (errorStr.includes('network')) return 'NETWORK';
    if (errorStr.includes('rate limit')) return 'RATE_LIMIT';
    if (errorStr.includes('invalid')) return 'INVALID_INPUT';
    if (errorStr.includes('not found')) return 'DATA_NOT_FOUND';
    
    return 'UNKNOWN';
  }
  
  getErrorSuggestion(errorType: string, toolName: string, args: any): string {
    // Tool-specific error suggestions
    const suggestions = {
      TIMEOUT: 'Server is slow - this will retry automatically',
      NETWORK: 'Connection issue - check your internet connection',
      RATE_LIMIT: 'Too many requests - wait a moment and try again',
      INVALID_INPUT: 'Invalid parameters - check the tool requirements',
      DATA_NOT_FOUND: 'Data not available for the specified parameters'
    };
    
    return suggestions[errorType] || 'Try a different approach';
  }
}
```

## 9. Configuration and Setup

```typescript
interface MCPClientConfig {
  serverUrl: string;
  transport: 'stdio' | 'sse' | 'http';
  maxRecursionDepth: number;
  maxToolCalls: number;
  timeoutMs: number;
  retryAttempts: number;
  llmConfig: {
    provider: 'gemini' | 'openai' | 'anthropic';
    apiKey: string;
    model: string;
  };
}

const defaultConfig: MCPClientConfig = {
  serverUrl: 'localhost:8000',
  transport: 'stdio',
  maxRecursionDepth: 5,
  maxToolCalls: 10,
  timeoutMs: 30000,
  retryAttempts: 3,
  llmConfig: {
    provider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.0-flash-exp'
  }
};
```

This architecture provides the essential components needed to replicate Cursor's MCP tool capabilities in your own client application. 