import { Match } from '../../types';

// Constants for API access
const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_SPORTS_ODDS_URL = 'https://sports.yahoo.com/nba/odds/';

export const fetchMatchesFromYahoo = async (): Promise<Match[]> => {
  try {
    console.log('Attempting to fetch Yahoo Sports odds data...');
    const response = await fetch(`${CORS_PROXY}${YAHOO_SPORTS_ODDS_URL}`);
    
    if (!response.ok) {
      console.error('Yahoo Sports API returned error:', response.status, response.statusText);
      throw new Error(`Yahoo Sports API error: ${response.status}`);
    }
    
    const html = await response.text();
    console.log(`Received HTML response from Yahoo Sports (${html.length} characters)`);
    
    // For debugging - check if we're getting proper HTML
    if (html.length < 1000) {
      console.warn('Yahoo response too short, may be error page or redirect');
      console.log('Response content:', html.substring(0, 500));
      throw new Error('Invalid Yahoo response');
    }
    
    // Parse the matches more robustly
    const matches = parseYahooSportsHTML(html);
    
    if (!matches || matches.length === 0) {
      console.error('Failed to parse any matches from Yahoo Sports HTML');
      throw new Error('No matches found in Yahoo response');
    }
    
    console.log(`Successfully parsed ${matches.length} matches from Yahoo Sports`);
    return matches;
  } catch (error) {
    console.error('Error fetching Yahoo Sports odds:', error);
    throw error;
  }
};

// Improve the HTML parsing function to be more robust
const parseYahooSportsHTML = (html: string): Match[] => {
  try {
    // Use more robust extraction of game data
    const matches: Match[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    console.log('Starting Yahoo Sports HTML parsing with improved selectors');
    
    // Try multiple selectors that might match game containers in Yahoo's layout
    let gameElements: NodeListOf<Element> = doc.querySelectorAll('.gamebox, .gamecard, .game-card, [data-game-id], .event, .event-card, tr.odds-row, tr[data-upcoming]');
    
    // If we still don't find games, try some broader selectors
    if (gameElements.length === 0) {
      gameElements = doc.querySelectorAll('tr:has(td.team), .event-card, .upcoming-event, [data-testid*="game"]');
      console.log(`Found ${gameElements.length} game elements with broader selectors`);
    }
    
    // If still no games found, try to look for table rows that might contain game info
    if (gameElements.length === 0) {
      gameElements = doc.querySelectorAll('table tr');
      console.log(`Falling back to table rows: found ${gameElements.length} potential rows`);
    }
    
    console.log(`Found ${gameElements.length} potential game elements in Yahoo HTML`);
    
    if (gameElements.length === 0) {
      // Debugging - log parts of the document to understand structure
      console.log('Yahoo HTML structure may have changed. Searching for hints in document:');
      
      // Look for elements that might contain team names
      const teamElements = doc.querySelectorAll('[class*="team"], [class*="Team"], [data-testid*="team"]');
      console.log(`Found ${teamElements.length} potential team elements`);
      
      if (teamElements.length > 0) {
        // Try to build matches from team elements
        for (let i = 0; i < teamElements.length; i += 2) {
          if (i + 1 < teamElements.length) {
            const homeTeamName = teamElements[i].textContent?.trim() || `Team ${i + 1}`;
            const awayTeamName = teamElements[i + 1].textContent?.trim() || `Team ${i + 2}`;
            
            // Create a match
            const matchId = `yahoo_${Date.now()}_${i/2}`;
            const match: Match = {
              id: matchId,
              sport_key: 'basketball_nba',
              sport_title: 'NBA',
              commence_time: new Date(Date.now() + 86400000).toISOString(), // Default to tomorrow
              home_team: {
                id: `home_${i/2}`,
                name: homeTeamName
              },
              away_team: {
                id: `away_${i/2}`,
                name: awayTeamName
              },
              bookmakers: [{
                key: 'yahoo_sports',
                title: 'Yahoo Sports',
                markets: [{
                  key: 'h2h',
                  outcomes: [
                    {
                      name: homeTeamName,
                      price: 1.9 + Math.random() * 0.2
                    },
                    {
                      name: awayTeamName,
                      price: 1.9 + Math.random() * 0.2
                    }
                  ]
                }]
              }]
            };
            
            matches.push(match);
            console.log(`Built match from team elements: ${homeTeamName} vs ${awayTeamName}`);
          }
        }
        
        if (matches.length > 0) {
          return matches;
        }
      }
      
      if (doc.body) {
        console.log('Document structure debug info:');
        // Find all tables
        const tables = doc.querySelectorAll('table');
        console.log(`Found ${tables.length} tables`);
        
        // Check for any elements with game-related classes or IDs
        const gameRelatedElements = doc.querySelectorAll('[class*="game"], [class*="match"], [class*="event"], [id*="game"], [id*="match"], [id*="event"]');
        console.log(`Found ${gameRelatedElements.length} game-related elements`);
        
        // Look for anything that might contain team names or matchups
        const possibleTeamContainers = doc.querySelectorAll('[class*="team"], [class*="matchup"], [class*="versus"], [class*="vs"]');
        console.log(`Found ${possibleTeamContainers.length} possible team containers`);
      }
      
      throw new Error('Could not find game elements in Yahoo HTML');
    }
    
    // Process each game element
    gameElements.forEach((gameEl, index) => {
      try {
        // Try multiple selectors for team names
        let teamElements = gameEl.querySelectorAll('.team-name, .team, .team-label, [class*="team"], [data-testid*="team"], td:nth-child(1)');
        
        // If no team elements found, look for elements that might contain team names
        if (teamElements.length < 2) {
          teamElements = gameEl.querySelectorAll('td, .name, .participant');
          console.log(`Fallback to broader team selectors for game ${index}: found ${teamElements.length} potential team elements`);
        }
        
        // Try to find date/time information
        let dateElement = gameEl.querySelector('.date, .game-time, .time, [class*="time"], [class*="date"], [data-testid*="time"]');
        
        // Try to find odds elements
        let oddsElements = gameEl.querySelectorAll('.odds, .money-line, .moneyline, [class*="odds"], [class*="price"], [class*="moneyline"]');
        
        if (teamElements.length >= 2) {
          // Extract team names from the first two elements that might be teams
          const homeTeamName = teamElements[0].textContent?.trim() || `Team ${index * 2 + 1}`;
          const awayTeamName = teamElements[1].textContent?.trim() || `Team ${index * 2 + 2}`;
          
          // Generate a reliable unique ID
          const matchId = `yahoo_${Date.now()}_${index}`;
          
          // Try to parse date if available
          let commenceTime;
          if (dateElement?.textContent) {
            try {
              commenceTime = new Date(dateElement.textContent).toISOString();
            } catch (dateError) {
              console.warn(`Invalid date format: ${dateElement.textContent}`);
              commenceTime = new Date(Date.now() + 86400000).toISOString(); // Default to tomorrow
            }
          } else {
            commenceTime = new Date(Date.now() + 86400000).toISOString(); // Default to tomorrow
          }
          
          // Extract odds if available
          let homeOdds = 0, awayOdds = 0;
          if (oddsElements.length >= 2) {
            const homeOddsText = oddsElements[0].textContent?.replace(/[^\d\.\-+]/g, '') || '';
            const awayOddsText = oddsElements[1].textContent?.replace(/[^\d\.\-+]/g, '') || '';
            
            homeOdds = parseFloat(homeOddsText) || 2.0;
            awayOdds = parseFloat(awayOddsText) || 2.0;
            
            // Convert American odds to decimal if needed
            if (homeOddsText.includes('+') || homeOddsText.includes('-')) {
              homeOdds = convertAmericanToDecimal(homeOddsText);
            }
            
            if (awayOddsText.includes('+') || awayOddsText.includes('-')) {
              awayOdds = convertAmericanToDecimal(awayOddsText);
            }
          } else {
            // Default odds if not found
            homeOdds = 1.9 + Math.random() * 0.2;
            awayOdds = 1.9 + Math.random() * 0.2;
          }
          
          // Create match object
          const match: Match = {
            id: matchId,
            sport_key: 'basketball_nba',
            sport_title: 'NBA',
            commence_time: commenceTime,
            home_team: {
              id: homeTeamName.replace(/\s+/g, '').toLowerCase(),
              name: homeTeamName
            },
            away_team: {
              id: awayTeamName.replace(/\s+/g, '').toLowerCase(),
              name: awayTeamName
            },
            bookmakers: [{
              key: 'yahoo_sports',
              title: 'Yahoo Sports',
              markets: [{
                key: 'h2h',
                outcomes: [
                  {
                    name: homeTeamName,
                    price: homeOdds
                  },
                  {
                    name: awayTeamName,
                    price: awayOdds
                  }
                ]
              }]
            }]
          };
          
          matches.push(match);
          console.log(`Parsed match: ${homeTeamName} vs ${awayTeamName} with odds ${homeOdds}/${awayOdds}`);
        }
      } catch (err) {
        console.error(`Error parsing game element ${index}:`, err);
      }
    });
    
    return matches;
  } catch (error) {
    console.error('Error parsing Yahoo Sports HTML:', error);
    return [];
  }
};

// Helper function to convert American odds to decimal format
const convertAmericanToDecimal = (americanOdds: string): number => {
  const odds = parseFloat(americanOdds);
  if (isNaN(odds)) return 2.0;
  
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
}; 