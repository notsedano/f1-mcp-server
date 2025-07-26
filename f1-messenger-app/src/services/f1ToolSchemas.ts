// F1 MCP Tool Schemas for Gemini Function Calling
// Using the correct @google/generative-ai SDK format

import { SchemaType } from '@google/generative-ai';
import type { FunctionDeclaration } from '@google/generative-ai';

export const F1_TOOL_SCHEMAS: FunctionDeclaration[] = [
  {
    name: 'get_championship_standings',
    description: 'Get Formula One championship standings (drivers and constructors) for a specific year',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2023, 2022, 2021). Must be between 1950 and current year.',
        },
        round_num: {
          type: SchemaType.NUMBER,
          description: 'Optional: Round number to get standings after specific race. If not provided, gets final standings.',
        }
      },
      required: ['year']
    }
  },
  
  {
    name: 'get_event_schedule',
    description: 'Get Formula One race calendar/schedule for a specific season with all Grand Prix events',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022). Must be between 1950 and current year.',
        }
      },
      required: ['year']
    }
  },
  
  {
    name: 'get_event_info',
    description: 'Get detailed information about a specific Formula One Grand Prix including dates, location, and track details',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7", "15")',
        }
      },
      required: ['year', 'identifier']
    }
  },
  
  {
    name: 'get_session_results',
    description: 'Get detailed results for a specific Formula One session (qualifying, race, practice, etc.)',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        event_identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7")',
        },
        session_name: {
          type: SchemaType.STRING,
          description: 'Session type: "Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3", "SprintQualifying"',
        }
      },
      required: ['year', 'event_identifier', 'session_name']
    }
  },
  
  {
    name: 'get_driver_info',
    description: 'Get information about a specific Formula One driver for a particular event and session',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        event_identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7")',
        },
        session_name: {
          type: SchemaType.STRING,
          description: 'Session type: "Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3"',
        },
        driver_identifier: {
          type: SchemaType.STRING,
          description: 'Driver number, code, or name (e.g., "44", "HAM", "Hamilton", "VER", "Verstappen")',
        }
      },
      required: ['year', 'event_identifier', 'session_name', 'driver_identifier']
    }
  },
  
  {
    name: 'analyze_driver_performance',
    description: 'Analyze a driver\'s detailed performance in a specific session including lap times, consistency, and statistics',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        event_identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7")',
        },
        session_name: {
          type: SchemaType.STRING,
          description: 'Session type: "Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3"',
        },
        driver_identifier: {
          type: SchemaType.STRING,
          description: 'Driver number, code, or name (e.g., "44", "HAM", "Hamilton")',
        }
      },
      required: ['year', 'event_identifier', 'session_name', 'driver_identifier']
    }
  },
  
  {
    name: 'compare_drivers',
    description: 'Compare performance between multiple Formula One drivers in the same session',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        event_identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7")',
        },
        session_name: {
          type: SchemaType.STRING,
          description: 'Session type: "Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3"',
        },
        drivers: {
          type: SchemaType.STRING,
          description: 'Comma-separated list of driver codes (e.g., "HAM,VER,LEC" or "44,1,16")',
        }
      },
      required: ['year', 'event_identifier', 'session_name', 'drivers']
    }
  },
  
  {
    name: 'get_telemetry',
    description: 'Get detailed telemetry data (speed, throttle, braking, gear) for a specific driver and lap',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        year: {
          type: SchemaType.NUMBER,
          description: 'Season year (e.g., 2024, 2023, 2022)',
        },
        event_identifier: {
          type: SchemaType.STRING,
          description: 'Event name or round number (e.g., "Monaco", "British", "7")',
        },
        session_name: {
          type: SchemaType.STRING,
          description: 'Session type: "Race", "Qualifying", "Sprint", "FP1", "FP2", "FP3"',
        },
        driver_identifier: {
          type: SchemaType.STRING,
          description: 'Driver number, code, or name (e.g., "44", "HAM", "Hamilton")',
        },
        lap_number: {
          type: SchemaType.NUMBER,
          description: 'Optional: Specific lap number. If not provided, gets fastest lap telemetry.',
        }
      },
      required: ['year', 'event_identifier', 'session_name', 'driver_identifier']
    }
  }
];

export function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
  return F1_TOOL_SCHEMAS;
} 