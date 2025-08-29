/**
 * Network Connectivity Check Utility
 * This file provides functions to check connectivity to different services
 */

/**
 * Checks if a URL is reachable
 * @param url The URL to check
 * @returns A promise that resolves with the connectivity status
 */
export const checkUrlConnectivity = async (url: string): Promise<{ 
  success: boolean; 
  message: string;
  status?: number;
  responseText?: string;
}> => {
  try {
    console.log(`Checking connectivity to ${url}...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors', // Try no-cors mode to at least check if the server exists
      cache: 'no-cache',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    return {
      success: true,
      message: `Successfully connected to ${url}`,
      status: response.status
    };
  } catch (error: any) {
    console.error(`Error connecting to ${url}:`, error);
    return {
      success: false,
      message: error.message || `Failed to connect to ${url}`
    };
  }
};

/**
 * Checks connectivity to Supabase services
 * @param supabaseUrl The Supabase URL to check
 */
export const checkSupabaseConnectivity = async (supabaseUrl: string) => {
  console.log('Running Supabase connectivity checks...');
  
  const results = {
    mainUrl: await checkUrlConnectivity(supabaseUrl),
    auth: await checkUrlConnectivity(`${supabaseUrl}/auth/v1/`),
    rest: await checkUrlConnectivity(`${supabaseUrl}/rest/v1/`),
    storage: await checkUrlConnectivity(`${supabaseUrl}/storage/v1/`)
  };
  
  console.log('Connectivity check results:', results);
  return results;
};

/**
 * Alternative approach using alternative hostnames
 * This tries to connect to alternative URLs for Supabase
 */
export const tryAlternativeConnections = async () => {
  console.log('Trying alternative connection methods...');
  
  // Try connecting to Supabase directly
  const supabaseDirect = await checkUrlConnectivity('https://supabase.co');
  console.log('Direct Supabase connection:', supabaseDirect);
  
  // Try connecting to Supabase API
  const supabaseApi = await checkUrlConnectivity('https://api.supabase.io');
  console.log('Supabase API connection:', supabaseApi);
  
  return { supabaseDirect, supabaseApi };
}; 