/**
 * Point Modifiable Action Configurations Service
 * 
 * This service handles reading point configuration values for different user actions.
 * It provides read-only access to the point_modifiable_action_configurations table.
 * 
 * Note: Configuration values can only be modified through direct database access
 * or admin interfaces, not through this web application.
 */

import { createClient } from '@supabase/supabase-js';

// Type definitions for configuration data
export type PointModifiableAction = 
  | 'MATCHED_STRAIGHT_BET'           // When bet creator finds another user to accept their bet
  | 'WON_STRAIGHT_BET'              // When a user wins a straight bet
  | 'CREATED_NEW_ACCOUNT'           // When a user creates a new account
  | 'REFERRED_NEW_USER'             // When referrer successfully signs up a new user
  | 'LOGGED_IN_FOR_THE_FIRST_TIME_TODAY'; // When user logs in for first time today

export interface PointModifiableActionConfiguration {
  id: string;
  action_key: PointModifiableAction;
  current_value: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

class PointModifiableActionConfigurationsService {
  // Initialize Supabase client
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  /**
   * Get current point value for a specific action
   * @throws Error if configuration not found or disabled
   */
  async getCurrentValueForPointModifiableAction(action_key: PointModifiableAction): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('point_modifiable_action_configurations')
        .select('current_value')
        .eq('action_key', action_key)
        .eq('is_enabled', true)
        .single();

      if (error) {
        throw new Error(`Failed to fetch configuration for ${action_key}: ${error.message}`);
      }

      if (!data) {
        throw new Error(`No active configuration found for action: ${action_key}`);
      }

      return data.current_value;
    } catch (error) {
      console.error(`Error getting point value for ${action_key}:`, error);
      throw error;
    }
  }

  /**
   * Get all enabled configurations
   */
  async getEnabledPointModifiableActionConfigurations(): Promise<PointModifiableActionConfiguration[]> {
    try {
      const { data, error } = await this.supabase
        .from('point_modifiable_action_configurations')
        .select('*')
        .eq('is_enabled', true)
        .order('action_key');

      if (error) {
        throw new Error(`Failed to fetch enabled configurations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting enabled configurations:', error);
      throw error;
    }
  }

  /**
   * Check if a specific action is enabled
   */
  async isActionEnabled(action_key: PointModifiableAction): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('point_modifiable_action_configurations')
        .select('is_enabled')
        .eq('action_key', action_key)
        .single();

      if (error || !data) {
        return false;
      }

      return data.is_enabled;
    } catch (error) {
      console.error(`Error checking if ${action_key} is enabled:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const pointModifiableActionConfigurationsService = new PointModifiableActionConfigurationsService(); 