export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  error?: boolean;
  // Cursor tool calling extensions
  toolCalls?: ToolCall[];
  toolName?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ConnectionState {
  state: 'connecting' | 'ready' | 'failed' | 'disconnected';
}

export interface F1Data {
  status: string;
  data?: any;
  message?: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
} 