import { Match } from '../../types';
import { fetchNBAMatchesFromYahoo } from './yahooSportsApi';

// Key for storing the last refresh timestamp in localStorage
const LAST_REFRESH_KEY = 'daredevil_last_data_refresh';
// Key for storing cached match data in localStorage
const CACHED_MATCHES_KEY = 'daredevil_cached_matches';
// Maximum age of cached data in milliseconds (5 minutes)
const MAX_CACHE_AGE_MS = 5 * 60 * 1000;

/**
 * Check if data needs to be refreshed based on timestamp
 */
export const shouldRefreshData = (): boolean => {
  try {
    const lastRefreshStr = localStorage.getItem(LAST_REFRESH_KEY);
    if (!lastRefreshStr) return true;
    
    const lastRefresh = parseInt(lastRefreshStr, 10);
    const now = Date.now();
    
    // Check if the last refresh was more than MAX_CACHE_AGE_MS ago
    return (now - lastRefresh) > MAX_CACHE_AGE_MS;
  } catch (error) {
    console.error('Error checking refresh status:', error);
    return true; // If there's an error, refresh to be safe
  }
};

/**
 * Update the refresh timestamp
 */
export const updateRefreshTimestamp = (): void => {
  try {
    localStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error updating refresh timestamp:', error);
  }
};

/**
 * Get cached matches from localStorage
 */
export const getCachedMatches = (): Match[] | null => {
  try {
    const cachedData = localStorage.getItem(CACHED_MATCHES_KEY);
    if (!cachedData) return null;
    
    return JSON.parse(cachedData);
  } catch (error) {
    console.error('Error getting cached matches:', error);
    return null;
  }
};

/**
 * Cache matches in localStorage
 */
export const cacheMatches = (matches: Match[]): void => {
  try {
    localStorage.setItem(CACHED_MATCHES_KEY, JSON.stringify(matches));
    updateRefreshTimestamp();
  } catch (error) {
    console.error('Error caching matches:', error);
  }
};

/**
 * Force a refresh of the match data
 */
export const forceRefreshData = async (): Promise<{
  matches: Match[];
  isLive: boolean;
  dataSource: string;
}> => {
  try {
    console.log('=== DATA REFRESH SERVICE: Forcing data refresh... ===');
    
    // Fetch fresh data from Yahoo
    const yahooData = await fetchNBAMatchesFromYahoo();
    
    // Cache the fresh data
    cacheMatches(yahooData.matches);
    
    return {
      ...yahooData,
      dataSource: 'yahoo'
    };
  } catch (error) {
    console.error('=== DATA REFRESH SERVICE: Error during forced refresh ===', error);
    throw error;
  }
};

/**
 * Get match data with automatic refresh if needed
 */
export const getMatchesWithAutoRefresh = async (): Promise<{
  matches: Match[];
  isLive: boolean;
  dataSource: string;
  refreshed: boolean;
}> => {
  try {
    // Check if we need to refresh
    const needsRefresh = shouldRefreshData();
    
    if (needsRefresh) {
      // If refresh is needed, force refresh
      console.log('=== DATA REFRESH SERVICE: Data needs refresh, fetching fresh data... ===');
      const freshData = await forceRefreshData();
      
      return {
        ...freshData,
        refreshed: true
      };
    } else {
      // Otherwise, use cached data
      console.log('=== DATA REFRESH SERVICE: Using cached data... ===');
      const cachedMatches = getCachedMatches();
      
      if (cachedMatches) {
        return {
          matches: cachedMatches,
          isLive: true,
          dataSource: 'yahoo (cached)',
          refreshed: false
        };
      } else {
        // If no cached data, force refresh
        console.log('=== DATA REFRESH SERVICE: No cached data, fetching fresh data... ===');
        const freshData = await forceRefreshData();
        
        return {
          ...freshData,
          refreshed: true
        };
      }
    }
  } catch (error) {
    console.error('=== DATA REFRESH SERVICE: Error in auto-refresh ===', error);
    throw error;
  }
}; 