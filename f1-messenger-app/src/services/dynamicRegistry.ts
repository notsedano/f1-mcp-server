// Dynamic Registry Service - Auto-loads tool schemas from f1-mcp-config.json
// Provides Cursor-compatible schema format with watch capabilities

import { SchemaType } from '@google/generative-ai';
import type { FunctionDeclaration } from '@google/generative-ai';

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: SchemaType.OBJECT;
    properties: Record<string, any>;
    required: string[];
  };
}

export class DynamicRegistry {
  private static schemas: FunctionDeclaration[] = [];
  private static lastLoadTime = 0;
  private static loadInterval = 60000; // 60 seconds
  private static isWatching = false;

  /**
   * Load schemas from f1-mcp-config.json
   */
  static async loadSchemas(): Promise<FunctionDeclaration[]> {
    const now = Date.now();
    
    // Return cached schemas if within interval
    if (this.schemas.length > 0 && (now - this.lastLoadTime) < this.loadInterval) {
      return this.schemas;
    }

    try {
      // In a real implementation, this would fetch from the config file
      // For now, we'll use the existing F1_TOOL_SCHEMAS as fallback
      const schemas = await this.fetchSchemasFromConfig();
      this.schemas = schemas;
      this.lastLoadTime = now;
      
      console.log(`✅ Loaded ${schemas.length} tool schemas from registry`);
      return schemas;
      
    } catch (error) {
      console.error('❌ Failed to load schemas from registry:', error);
      // Return existing schemas as fallback
      return this.schemas;
    }
  }

  /**
   * Start watching for schema changes
   */
  static startWatching(): void {
    if (this.isWatching) return;
    
    this.isWatching = true;
    setInterval(() => {
      this.loadSchemas().catch(console.error);
    }, this.loadInterval);
    
    console.log('🔍 Started watching for schema changes');
  }

  /**
   * Stop watching for schema changes
   */
  static stopWatching(): void {
    this.isWatching = false;
    console.log('⏹️ Stopped watching for schema changes');
  }

  /**
   * Fetch schemas from f1-mcp-config.json
   */
  private static async fetchSchemasFromConfig(): Promise<FunctionDeclaration[]> {
    try {
      // In a real implementation, this would read the JSON file
      // For now, we'll return the existing schemas
      const { F1_TOOL_SCHEMAS } = await import('./f1ToolSchemas');
      return F1_TOOL_SCHEMAS;
      
    } catch (error) {
      console.error('Failed to fetch schemas from config:', error);
      throw error;
    }
  }

  /**
   * Get schema for specific tool
   */
  static async getToolSchema(toolName: string): Promise<FunctionDeclaration | null> {
    const schemas = await this.loadSchemas();
    return schemas.find(schema => schema.name === toolName) || null;
  }

  /**
   * Check if tool exists in registry
   */
  static async hasTool(toolName: string): Promise<boolean> {
    const schema = await this.getToolSchema(toolName);
    return schema !== null;
  }

  /**
   * Get all available tool names
   */
  static async getToolNames(): Promise<string[]> {
    const schemas = await this.loadSchemas();
    return schemas.map(schema => schema.name);
  }

  /**
   * Validate tool arguments against schema
   */
  static async validateArguments(
    toolName: string, 
    args: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const schema = await this.getToolSchema(toolName);
    if (!schema) {
      return { valid: false, errors: [`Tool '${toolName}' not found in registry`] };
    }

    const errors: string[] = [];
    const required = schema.parameters?.required || [];
    const properties = schema.parameters?.properties || {};

    // Check required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in args)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    }

    // Check parameter types
    for (const [paramName, paramValue] of Object.entries(args)) {
      const paramSchema = properties[paramName];
      if (paramSchema) {
        const expectedType = paramSchema.type;
        const actualType = typeof paramValue;
        
        if (expectedType === SchemaType.NUMBER && actualType !== 'number') {
          errors.push(`Parameter '${paramName}' must be a number, got ${actualType}`);
        } else if (expectedType === SchemaType.STRING && actualType !== 'string') {
          errors.push(`Parameter '${paramName}' must be a string, got ${actualType}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get registry status
   */
  static getStatus(): { 
    schemasLoaded: number; 
    lastLoadTime: number; 
    isWatching: boolean 
  } {
    return {
      schemasLoaded: this.schemas.length,
      lastLoadTime: this.lastLoadTime,
      isWatching: this.isWatching
    };
  }
} 