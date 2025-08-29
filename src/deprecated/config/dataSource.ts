/**
 * @deprecated This file is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

/**
 * Data Source Configuration
 * 
 * This file controls where the MatchesPage fetches its match data from.
 * Change these flags to switch between different data sources.
 */

// Main configuration flag to determine match data source
// Set to true to use remote Supabase database
// Set to false to use locally generated mock data stored in localStorage
export const USE_REMOTE_DATABASE = true;

// Additional configuration options
export const MATCH_DATA_CONFIG = {
  // Number of mock matches to generate when using local data
  MOCK_MATCHES_COUNT: 10,
  
  // How many days in the future to spread mock matches
  MOCK_MATCHES_DAYS_AHEAD: 7,
  
  // Minimum and maximum odds range for mock matches
  MOCK_ODDS_MIN: 1.5,
  MOCK_ODDS_MAX: 3.0,
  
  // Simulate loading time for mock data (in milliseconds)
  MOCK_LOADING_TIME: 500,
  
  // localStorage key for storing mock matches
  LOCAL_STORAGE_KEY: 'local_mock_matches'
} as const;

/**
 * Environment-based configuration
 * This allows you to set the data source based on environment variables
 * during build time if needed.
 */
export const getDataSourceFromEnv = (): boolean => {
  // Check for environment variable override
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const envFlag = import.meta.env.VITE_USE_REMOTE_DATABASE;
    if (envFlag !== undefined) {
      return envFlag === 'true';
    }
  }
  
  // Fall back to the default configuration
  return USE_REMOTE_DATABASE;
};

// Export the final configuration
export const DATA_SOURCE_CONFIG = {
  USE_REMOTE_DATABASE: getDataSourceFromEnv(),
  ...MATCH_DATA_CONFIG
} as const; 