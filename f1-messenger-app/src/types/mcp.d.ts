/**
 * Shared MCP Type Definitions
 * TypeScript declarations for Cursor-style MCP client/server communication
 */

declare global {
  // MCP Tool Schema
  interface MCPToolSchema {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  }

  // MCP Tool Call
  interface MCPToolCall {
    name: string;
    arguments: Record<string, any>;
  }

  // MCP Tool Result
  interface MCPToolResult {
    status: 'success' | 'error';
    data?: any;
    error?: string;
    errorType?: string;
    suggestion?: string;
    retryAttempts?: number;
    totalDuration?: number;
    context?: {
      tool: string;
      args: Record<string, any>;
      timestamp: string;
    };
  }

  // MCP Message Types
  interface MCPMessage {
    type: 'tool_call' | 'tool_result' | 'heartbeat' | 'error' | 'complete' | 'response_chunk' | 'session_start';
    id: string;
    timestamp: string;
    data?: any;
    error?: string;
    sessionId?: string;
    userId?: string;
  }

  // MCP Connection State
  interface MCPConnection {
    state: 'connecting' | 'ready' | 'failed' | 'disconnected';
    error?: string;
    sessionId?: string;
    userId?: string;
    tools?: MCPToolSchema[];
  }

  // MCP Session Metrics
  interface MCPSessionMetrics {
    sessionId: string;
    startTime: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    errorsByTool: Record<string, number>;
    slowestTools: MCPToolCallMetrics[];
    userId?: string;
  }

  // MCP Tool Call Metrics
  interface MCPToolCallMetrics {
    toolName: string;
    duration: number;
    status: 'success' | 'error' | 'timeout';
    timestamp: string;
    args?: Record<string, any>;
    error?: string;
    retryCount: number;
    userId?: string;
  }

  // MCP Health Metrics
  interface MCPHealthMetrics {
    status: string;
    uptime: number;
    toolCalls: number;
    successRate: number;
    errors: Record<string, number>;
  }

  // MCP Performance Summary
  interface MCPPerformanceSummary {
    periodHours: number;
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    topTools: Array<{ tool: string; calls: number }>;
    errorSummary: Record<string, number>;
  }

  // MCP Query Request
  interface MCPQueryRequest {
    query: string;
    sessionId?: string;
    timestamp: string;
    userId?: string;
  }

  // MCP Query Response
  interface MCPQueryResponse {
    response: string;
    toolCalls: MCPToolCall[];
    toolResults: MCPToolResult[];
    sessionId: string;
    timestamp: string;
    processingTime: number;
  }

  // MCP Bridge Configuration
  interface MCPBridgeConfig {
    serverUrl: string;
    transport: 'stdio' | 'sse' | 'http';
    maxRecursionDepth: number;
    maxToolCalls: number;
    timeoutMs: number;
    retryAttempts: number;
    enableJWT: boolean;
    enableSSE: boolean;
  }

  // MCP Agent Configuration
  interface MCPAgentConfig {
    llmProvider: 'gemini' | 'openai' | 'anthropic';
    apiKey: string;
    model: string;
    temperature: number;
    maxOutputTokens: number;
    fewShotExamples: string[];
  }

  // MCP Error Types
  type MCPErrorType = 
    | 'TIMEOUT'
    | 'NETWORK'
    | 'RATE_LIMIT'
    | 'INVALID_INPUT'
    | 'DATA_NOT_FOUND'
    | 'AUTH_ERROR'
    | 'UNKNOWN';

  // MCP Tool Names (F1-specific)
  type MCPToolName = 
    | 'get_event_schedule'
    | 'get_event_info'
    | 'get_session_results'
    | 'get_driver_info'
    | 'analyze_driver_performance'
    | 'compare_drivers'
    | 'get_telemetry'
    | 'get_championship_standings';

  // MCP Session Names (F1-specific)
  type MCPSessionName = 
    | 'Race'
    | 'Qualifying'
    | 'Sprint'
    | 'FP1'
    | 'FP2'
    | 'FP3'
    | 'SprintQualifying';

  // MCP Driver Identifiers
  type MCPDriverIdentifier = 
    | 'HAM' | 'VER' | 'LEC' | 'RUS' | 'SAI' | 'NOR' | 'PIA' | 'ALO'
    | 'STR' | 'OCO' | 'GAS' | 'HUL' | 'MAG' | 'TSU' | 'RIC' | 'BOT'
    | 'ZHO' | 'ALB' | 'SAR' | 'PER'
    | '44' | '1' | '16' | '63' | '55' | '4' | '81' | '14'
    | '18' | '31' | '10' | '27' | '20' | '22' | '3' | '77'
    | '24' | '23' | '2' | '11';

  // MCP Event Identifiers
  type MCPEventIdentifier = 
    | 'Monaco' | 'British' | 'Spanish' | 'Canadian' | 'Austrian' | 'French'
    | 'Hungarian' | 'Belgian' | 'Dutch' | 'Italian' | 'Singapore' | 'Japanese'
    | 'Qatar' | 'United States' | 'Mexico' | 'Brazil' | 'Las Vegas' | 'Abu Dhabi'
    | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
    | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23' | '24';

  // MCP Year Range
  type MCPYear = 1950 | 1951 | 1952 | 1953 | 1954 | 1955 | 1956 | 1957 | 1958 | 1959
    | 1960 | 1961 | 1962 | 1963 | 1964 | 1965 | 1966 | 1967 | 1968 | 1969
    | 1970 | 1971 | 1972 | 1973 | 1974 | 1975 | 1976 | 1977 | 1978 | 1979
    | 1980 | 1981 | 1982 | 1983 | 1984 | 1985 | 1986 | 1987 | 1988 | 1989
    | 1990 | 1991 | 1992 | 1993 | 1994 | 1995 | 1996 | 1997 | 1998 | 1999
    | 2000 | 2001 | 2002 | 2003 | 2004 | 2005 | 2006 | 2007 | 2008 | 2009
    | 2010 | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019
    | 2020 | 2021 | 2022 | 2023 | 2024 | 2025;

  // MCP Tool Arguments (F1-specific)
  interface MCPToolArguments {
    // Common arguments
    year?: MCPYear;
    
    // Event-specific arguments
    identifier?: MCPEventIdentifier;
    event_identifier?: MCPEventIdentifier;
    session_name?: MCPSessionName;
    
    // Driver-specific arguments
    driver_identifier?: MCPDriverIdentifier;
    drivers?: string; // Comma-separated driver codes
    
    // Optional arguments
    round_num?: number;
    lap_number?: number;
  }

  // MCP Tool Call with Typed Arguments
  interface MCPTypedToolCall {
    name: MCPToolName;
    arguments: MCPToolArguments;
  }

  // MCP Response Data Types (F1-specific)
  interface MCPChampionshipData {
    drivers: Array<{
      driverCode: string;
      givenName: string;
      familyName: string;
      points: number;
      position: number;
      constructorName?: string;
    }>;
    constructors?: Array<{
      constructorName: string;
      points: number;
      position: number;
    }>;
  }

  interface MCPEventScheduleData {
    EventName: string;
    EventDate: string;
    CircuitName: string;
    RoundNumber: number;
    Country?: string;
    Location?: string;
  }

  interface MCPDriverPerformanceData {
    DriverCode: string;
    TotalLaps: number;
    FastestLap: string;
    AverageLapTime: number;
    LapTimes: Array<{
      LapNumber: number;
      LapTime: string;
      Compound: string;
      TyreLife: number;
      Stint: number;
      FreshTyre: boolean;
      LapStartTime: string;
    }>;
  }

  interface MCPTelemetryData {
    lapInfo: {
      LapNumber: number;
      LapTime: string;
      Compound: string;
      TyreLife: number;
    };
    telemetry: Array<{
      Time: number;
      Speed: number;
      RPM: number;
      Gear: number;
      Throttle: number;
      Brake: number;
      X: number;
      Y: number;
      Z: number;
    }>;
  }

  // MCP Bridge API Endpoints
  interface MCPBridgeAPI {
    '/health': {
      GET: {
        response: MCPHealthMetrics;
      };
    };
    '/mcp/schema': {
      GET: {
        response: {
          openapi: string;
          info: {
            title: string;
            version: string;
            description: string;
          };
          paths: Record<string, any>;
        };
      };
    };
    '/mcp/tool': {
      POST: {
        request: {
          name: MCPToolName;
          arguments: MCPToolArguments;
        };
        response: {
          status: 'success' | 'error';
          data?: any;
          message?: string;
        };
      };
    };
    '/mcp/query': {
      POST: {
        request: MCPQueryRequest;
        response: MCPQueryResponse;
      };
    };
    '/mcp/session': {
      POST: {
        request: {
          type: 'session_start' | 'session_end';
          sessionId: string;
          timestamp: string;
          userId?: string;
        };
        response: {
          status: 'success' | 'error';
          sessionId: string;
        };
      };
    };
    '/auth/token': {
      GET: {
        response: {
          token: string;
        };
      };
    };
    '/mcp/stream': {
      SSE: {
        messages: MCPMessage[];
      };
    };
  }

  // MCP Client Interface
  interface MCPClient {
    connect(): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
    listTools(): Promise<MCPToolSchema[]>;
    callTool(name: MCPToolName, args: MCPToolArguments): Promise<MCPToolResult>;
    sendQuery(query: string): Promise<string>;
    getMetrics(): MCPHealthMetrics;
    getHealth(): MCPHealthMetrics;
  }

  // MCP Agent Interface
  interface MCPAgent {
    runCursorTurn(
      messages: Array<{ role: 'user' | 'assistant' | 'tool'; content: string; toolCalls?: MCPToolCall[]; toolName?: string }>,
      callTool: (name: string, args: Record<string, any>) => Promise<any>,
      recursionDepth?: number
    ): Promise<string>;
  }

  // MCP Telemetry Interface
  interface MCPTelemetry {
    recordToolCall(
      name: MCPToolName,
      duration: number,
      status: 'success' | 'error' | 'timeout',
      args?: MCPToolArguments,
      error?: string,
      retryCount?: number,
      sessionId?: string,
      userId?: string
    ): void;
    getHealthMetrics(): MCPHealthMetrics;
    getSessionMetrics(sessionId: string): MCPSessionMetrics | undefined;
    getToolMetrics(toolName: MCPToolName, hours?: number): Record<string, any>;
    getPerformanceSummary(hours?: number): MCPPerformanceSummary;
    exportMetrics(): Record<string, any>;
    clearOldData(maxAgeHours?: number): void;
  }
}

// Export types for module usage
export type {
  MCPToolSchema,
  MCPToolCall,
  MCPToolResult,
  MCPMessage,
  MCPConnection,
  MCPSessionMetrics,
  MCPToolCallMetrics,
  MCPHealthMetrics,
  MCPPerformanceSummary,
  MCPQueryRequest,
  MCPQueryResponse,
  MCPBridgeConfig,
  MCPAgentConfig,
  MCPErrorType,
  MCPToolName,
  MCPSessionName,
  MCPDriverIdentifier,
  MCPEventIdentifier,
  MCPYear,
  MCPToolArguments,
  MCPTypedToolCall,
  MCPChampionshipData,
  MCPEventScheduleData,
  MCPDriverPerformanceData,
  MCPTelemetryData,
  MCPBridgeAPI,
  MCPClient,
  MCPAgent,
  MCPTelemetry
}; 