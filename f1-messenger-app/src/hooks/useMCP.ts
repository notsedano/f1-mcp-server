/**
 * Cursor-Style MCP Hook with SSE Streaming
 * Implements Cursor's exact SSE transport pattern with JWT authentication
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MCPConnection {
  state: 'connecting' | 'ready' | 'failed' | 'disconnected';
  error?: string;
  sessionId?: string;
  userId?: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  errorType?: string;
  suggestion?: string;
}

export interface MCPMessage {
  type: 'tool_call' | 'tool_result' | 'heartbeat' | 'error' | 'complete' | 'response_chunk';
  id: string;
  timestamp: string;
  data?: any;
  error?: string;
}

export interface UseMCPOptions {
  bridgeUrl?: string;
  enableSSE?: boolean;
  enableJWT?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: MCPMessage) => void;
  onConnectionChange?: (connection: MCPConnection) => void;
}

export interface UseMCPReturn {
  connection: MCPConnection;
  sendQuery: (query: string) => Promise<string>;
  callTool: (name: string, args: Record<string, any>) => Promise<ToolResult>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  messages: MCPMessage[];
  isProcessing: boolean;
}

export function useMCP(options: UseMCPOptions = {}): UseMCPReturn {
  const {
    bridgeUrl = 'http://localhost:3001',
    enableSSE = true,
    enableJWT = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnectionChange
  } = options;

  // State
  const [connection, setConnection] = useState<MCPConnection>({ state: 'disconnected' });
  const [messages, setMessages] = useState<MCPMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate session ID
  useEffect(() => {
    if (!sessionId) {
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [sessionId]);

  // JWT token management
  const getJwtToken = useCallback(async (): Promise<string | null> => {
    if (!enableJWT) return null;
    
    try {
      const response = await fetch(`${bridgeUrl}/auth/token`);
      if (response.ok) {
        const data = await response.json();
        return data.token;
      }
    } catch (error) {
      console.warn('Failed to get JWT token:', error);
    }
    return null;
  }, [bridgeUrl, enableJWT]);

  // SSE connection management
  const connectSSE = useCallback(async () => {
    if (!enableSSE) return;

    try {
      // Get JWT token if enabled
      let token = jwtToken;
      if (enableJWT && !token) {
        token = await getJwtToken();
        setJwtToken(token);
      }

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource with JWT
      const url = token 
        ? `${bridgeUrl}/mcp/stream?token=${encodeURIComponent(token)}`
        : `${bridgeUrl}/mcp/stream`;
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        console.log('🔗 SSE connection opened');
        setConnection(prev => ({ ...prev, state: 'ready' }));
        reconnectAttemptsRef.current = 0;
        
                 // Send session start message via HTTP since EventSource is read-only
         if (sessionId) {
           fetch(`${bridgeUrl}/mcp/session`, {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               ...(token && { 'Authorization': `Bearer ${token}` })
             },
             body: JSON.stringify({
               type: 'session_start',
               sessionId,
               timestamp: new Date().toISOString()
             })
           }).catch(console.warn);
         }
      };

      // Message handling
      eventSource.onmessage = (event) => {
        try {
          const message: MCPMessage = JSON.parse(event.data);
          
          setMessages(prev => [...prev, message]);
          
          if (onMessage) {
            onMessage(message);
          }

          // Handle different message types
          switch (message.type) {
            case 'tool_call':
              console.log('🔧 Tool call received:', message.data);
              break;
            case 'tool_result':
              console.log('✅ Tool result received:', message.data);
              break;
            case 'heartbeat':
              // Keep connection alive
              break;
            case 'error':
              console.error('❌ MCP error:', message.error);
              break;
            case 'complete':
              setIsProcessing(false);
              break;
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Error handling
      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        setConnection(prev => ({ ...prev, state: 'failed', error: 'SSE connection failed' }));
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, reconnectInterval);
        }
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      setConnection(prev => ({ ...prev, state: 'failed', error: String(error) }));
    }
  }, [bridgeUrl, enableSSE, enableJWT, jwtToken, sessionId, reconnectInterval, maxReconnectAttempts, onMessage, getJwtToken]);

  // HTTP fallback for tool calls
  const callToolHTTP = useCallback(async (name: string, args: Record<string, any>): Promise<ToolResult> => {
    try {
      const response = await fetch(`${bridgeUrl}/mcp/tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify({ name, arguments: args })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Tool call failed: ${name}`, error);
      return {
        status: 'error',
        error: String(error),
        errorType: 'NETWORK',
        suggestion: 'Check your connection and try again'
      };
    }
  }, [bridgeUrl, jwtToken]);

  // Send query with recursive tool calling
  const sendQuery = useCallback(async (query: string): Promise<string> => {
    setIsProcessing(true);
    
    try {
      // Create abort controller for timeout
      abortControllerRef.current = new AbortController();
      
      // Send query via SSE if available, otherwise HTTP
      if (enableSSE && eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
        return await sendQuerySSE(query);
      } else {
        return await sendQueryHTTP(query);
      }
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [enableSSE]);

  // SSE query sending
  const sendQuerySSE = useCallback(async (query: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!eventSourceRef.current) {
        reject(new Error('SSE connection not available'));
        return;
      }

      const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let responseChunks: string[] = [];
      let isComplete = false;

             // Send query via HTTP since EventSource is read-only
       fetch(`${bridgeUrl}/mcp/query`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
         },
         body: JSON.stringify({
           type: 'query',
           id: queryId,
           query,
           sessionId,
           timestamp: new Date().toISOString()
         })
       }).catch(reject);

      // Listen for response
      const handleMessage = (event: MessageEvent) => {
        try {
          const message: MCPMessage = JSON.parse(event.data);
          
          if (message.id === queryId) {
            switch (message.type) {
              case 'response_chunk':
                responseChunks.push(message.data);
                break;
              case 'complete':
                isComplete = true;
                eventSourceRef.current?.removeEventListener('message', handleMessage);
                resolve(responseChunks.join(''));
                break;
              case 'error':
                isComplete = true;
                eventSourceRef.current?.removeEventListener('message', handleMessage);
                reject(new Error(message.error || 'Query failed'));
                break;
            }
          }
        } catch (error) {
          console.error('Failed to parse SSE response:', error);
        }
      };

      eventSourceRef.current.addEventListener('message', handleMessage);

      // Timeout
      setTimeout(() => {
        if (!isComplete) {
          eventSourceRef.current?.removeEventListener('message', handleMessage);
          reject(new Error('Query timeout'));
        }
      }, 60000); // 60 second timeout
    });
  }, [sessionId]);

  // HTTP query sending (fallback)
  const sendQueryHTTP = useCallback(async (query: string): Promise<string> => {
    try {
      const response = await fetch(`${bridgeUrl}/mcp/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify({
          query,
          sessionId,
          timestamp: new Date().toISOString()
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.response || result.text || 'No response received';
    } catch (error) {
      console.error('HTTP query failed:', error);
      throw error;
    }
  }, [bridgeUrl, jwtToken, sessionId]);

  // Tool calling
  const callTool = useCallback(async (name: string, args: Record<string, any>): Promise<ToolResult> => {
    return await callToolHTTP(name, args);
  }, [callToolHTTP]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnection({ state: 'disconnected' });
    reconnectAttemptsRef.current = 0;
  }, []);

  // Reconnect
  const reconnect = useCallback(async () => {
    disconnect();
    setConnection({ state: 'connecting' });
    await connectSSE();
  }, [disconnect, connectSSE]);

  // Initial connection
  useEffect(() => {
    if (connection.state === 'disconnected') {
      setConnection({ state: 'connecting' });
      connectSSE();
    }

    return () => {
      disconnect();
    };
  }, [connectSSE, disconnect]);

  // Connection change callback
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(connection);
    }
  }, [connection, onConnectionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connection,
    sendQuery,
    callTool,
    disconnect,
    reconnect,
    messages,
    isProcessing
  };
}

// Export convenience functions
export const createMCPClient = (options: UseMCPOptions = {}) => {
  return {
    sendQuery: async (query: string) => {
      const { sendQuery } = useMCP(options);
      return await sendQuery(query);
    },
    callTool: async (name: string, args: Record<string, any>) => {
      const { callTool } = useMCP(options);
      return await callTool(name, args);
    }
  };
}; 