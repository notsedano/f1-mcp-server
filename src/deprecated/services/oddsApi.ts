import { Match } from '../../types';
import { fetchNBAMatchesFromYahoo } from './yahooSportsApi';
import { MOCK_MATCHES as BET_MATCHES } from '../data/mockMatches';
import { getMatchesWithAutoRefresh, forceRefreshData } from './dataRefreshService';

// Define API URLs and key
const THE_ODDS_API_KEY = 'b5d8a665a982b70bf18902db4de795ad';
const THE_ODDS_API_URL = 'https://api.the-odds-api.com/v4/sports/basketball_nba/odds';

// Define return type for fetchNBAMatches
interface MatchesResponse {
  matches: Match[];
  isLive: boolean;
  dataSource?: string; // Added to track where data comes from
}

// Mock data for fallback/development - combining original mock data with our new bet matches
const MOCK_MATCHES: Match[] = [
  ...BET_MATCHES, // Add our bet-specific matches first
  {
    id: '1',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    home_team: { id: 'lakers', name: 'Los Angeles Lakers' },
    away_team: { id: 'warriors', name: 'Golden State Warriors' },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Los Angeles Lakers', price: 2.25 },
              { name: 'Golden State Warriors', price: 1.65 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '2',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    home_team: { id: 'celtics', name: 'Boston Celtics' },
    away_team: { id: 'bucks', name: 'Milwaukee Bucks' },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Boston Celtics', price: 1.85 },
              { name: 'Milwaukee Bucks', price: 1.95 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '3',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    home_team: { id: 'nets', name: 'Brooklyn Nets' },
    away_team: { id: 'heat', name: 'Miami Heat' },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Brooklyn Nets', price: 2.10 },
              { name: 'Miami Heat', price: 1.75 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '4',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
    home_team: { id: 'suns', name: 'Phoenix Suns' },
    away_team: { id: 'nuggets', name: 'Denver Nuggets' },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Phoenix Suns', price: 2.05 },
              { name: 'Denver Nuggets', price: 1.80 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: '5',
    sport_key: 'basketball_nba',
    sport_title: 'NBA',
    commence_time: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
    home_team: { id: 'mavs', name: 'Dallas Mavericks' },
    away_team: { id: 'thunder', name: 'Oklahoma City Thunder' },
    bookmakers: [
      {
        key: 'draftkings',
        title: 'DraftKings',
        markets: [
          {
            key: 'h2h',
            outcomes: [
              { name: 'Dallas Mavericks', price: 1.90 },
              { name: 'Oklahoma City Thunder', price: 1.90 }
            ]
          }
        ]
      }
    ]
  }
];

// Function to generate mock data with fresh dates for fallback
const getMockData = (): Match[] => {
  console.log('Using mock data for NBA matches (fallback)');
  
  // Return BET_MATCHES with their original dates, then add the regular mock matches with updated dates
  const regularMockMatches = MOCK_MATCHES.filter(match => 
    !BET_MATCHES.some(betMatch => betMatch.id === match.id)
  );
  
  // Return the bet matches first (with original dates) and then the regular mock matches
  return [
    ...BET_MATCHES,
    ...regularMockMatches.map((match, index) => ({
      ...match,
      commence_time: new Date(Date.now() + (86400000 * (index + 1))).toISOString()
    }))
  ];
};

// Helper function to convert The Odds API data to our Match format
const convertApiDataToMatch = (game: any): Match => {
  // The Odds API returns data in a format that's similar to our Match type,
  // but we need to transform some fields
  return {
    id: game.id,
    sport_key: game.sport_key,
    sport_title: game.sport_title || 'NBA',
    commence_time: game.commence_time,
    home_team: { 
      id: game.home_team.replace(/\s+/g, '').toLowerCase(), 
      name: game.home_team 
    },
    away_team: { 
      id: game.away_team.replace(/\s+/g, '').toLowerCase(), 
      name: game.away_team 
    },
    bookmakers: game.bookmakers || []
  };
};

// Function to get mock data with a consistent delay
const getFallbackData = (): Promise<MatchesResponse> => {
  console.log('Falling back to mock data...');
  return new Promise((resolve) => {
    setTimeout(() => {
      const freshMatches = getMockData();
      resolve({
        matches: freshMatches,
        isLive: false, // Indicate we're using mock data
        dataSource: 'mock'
      });
    }, 800); // Consistent delay to prevent flickering
  });
};

// Try the Yahoo Sports scraper as a secondary data source with auto-refresh
const tryYahooSportsScraper = async (): Promise<MatchesResponse> => {
  console.log('Attempting to use Yahoo Sports scraper with auto-refresh...');
  try {
    // Use the auto-refresh mechanism
    const yahooData = await getMatchesWithAutoRefresh();
    
    console.log(`Yahoo data ${yahooData.refreshed ? 'was refreshed' : 'came from cache'}`);
    
    return {
      matches: yahooData.matches,
      isLive: yahooData.isLive,
      dataSource: yahooData.dataSource
    };
  } catch (error) {
    console.error('Yahoo Sports scraper with auto-refresh failed:', error);
    
    // Try direct fetch as a backup
    try {
      console.log('Falling back to direct Yahoo Sports scraper...');
      const directYahooData = await fetchNBAMatchesFromYahoo();
      return {
        matches: directYahooData.matches,
        isLive: directYahooData.isLive,
        dataSource: 'yahoo'
      };
    } catch (directError) {
      console.error('Direct Yahoo Sports scraper failed:', directError);
      return getFallbackData();
    }
  }
};

// Main function to fetch NBA matches from The Odds API
export const fetchNBAMatches = async (): Promise<MatchesResponse> => {
  console.log('Fetching NBA matches from The Odds API...');
  
  try {
    // Build URL with proper encoding to avoid issues
    const url = new URL(THE_ODDS_API_URL);
    url.searchParams.append('apiKey', THE_ODDS_API_KEY);
    url.searchParams.append('regions', 'us');
    url.searchParams.append('markets', 'h2h');
    url.searchParams.append('oddsFormat', 'decimal');
    
    console.log('Requesting URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    // Check for specific error codes
    if (response.status === 401) {
      console.error('API authentication failed - check API key');
      return tryYahooSportsScraper();
    }
    
    if (response.status === 429) {
      console.error('API rate limit exceeded');
      return tryYahooSportsScraper();
    }
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid API response format');
    }
    
    // Log remaining requests for monitoring
    const remainingRequests = response.headers.get('x-requests-remaining');
    console.log(`Remaining API requests: ${remainingRequests}`);
    
    // Convert API data to our Match format
    const matches: Match[] = data.map(convertApiDataToMatch);
    
    return {
      matches,
      isLive: true,
      dataSource: 'the_odds_api'
    };
  } catch (error) {
    console.error('Error fetching from The Odds API:', error);
    return tryYahooSportsScraper();
  }
};

// Function to force refresh data regardless of cache status
export const forceRefreshNBAMatches = async (): Promise<MatchesResponse> => {
  console.log('Force refreshing NBA match data...');
  
  try {
    // First try The Odds API
    const oddsApiResponse = await fetchNBAMatches();
    
    // If we got data from The Odds API, return it
    if (oddsApiResponse.dataSource === 'the_odds_api') {
      return oddsApiResponse;
    }
    
    // Otherwise, force refresh Yahoo data
    console.log('The Odds API unavailable, force refreshing Yahoo data...');
    const yahooData = await forceRefreshData();
    
    return {
      matches: yahooData.matches,
      isLive: yahooData.isLive,
      dataSource: yahooData.dataSource
    };
  } catch (error) {
    console.error('Error during force refresh:', error);
    return getFallbackData();
  }
};

// Simplified function to get upcoming NBA matches
export const fetchUpcomingNBAMatches = async (): Promise<MatchesResponse> => {
  return fetchNBAMatches();
};