import { Message } from '../types';

// Keywords that trigger DareDevil responses
const NBA_KEYWORDS = [
  'nba',
  'basketball',
  'playoffs',
  'championship',
  'finals',
  'draft',
  'season',
  'lakers',
  'celtics',
  'warriors',
  'bulls',
  'nets',
  'knicks',
  'heat',
  'mvp',
  'all-star',
  'stats',
  'standings',
  'conference',
  'coach',
  'player',
  'rookie',
  'lebron',
  'curry',
  'durant',
  'giannis',
  'doncic',
  'jokic',
  'embiid',
];

// DareDevil dialogues for NBA 2025 predictions
const NBA_PREDICTIONS = [
  "The Lakers are looking strong for 2025, but my analytics show they'll face tough competition from the rising Timberwolves. Their offensive efficiency is projected to increase by 7.2%.",
  "My prediction models show the Celtics maintaining their dominance in the East through 2025, with a 68% probability of reaching the Conference Finals again.",
  "According to my analysis, the 2025 draft class will be particularly strong at the center position. Teams should be positioning for those lottery picks now.",
  "The Warriors dynasty isn't over yet. My algorithms predict a resurgence in 2025 with their new young core clicking at a 112.4 offensive rating.",
  "Looking at the 2024-2025 MVP race, my data suggests we'll see a tight competition between Luka Doncic and Victor Wembanyama, with Wembanyama's defensive metrics giving him a slight edge.",
  "I've analyzed the 76ers' roster construction and salary cap situation. They're positioned to make a major move before the 2025 trade deadline that could shift the power balance in the East.",
  "Based on my predictive models, the 2025 NBA Finals will likely feature teams from opposite conferences than what we saw in 2024. The Western Conference race is particularly open.",
  "My algorithms have detected an interesting trend: teams investing heavily in analytics departments are showing a 12% improvement in close-game scenarios for the 2024-2025 season.",
  "For fantasy basketball players preparing for 2025, my data shows point guards and versatile wings will provide the most value. The center position is becoming more specialized.",
  "The Nuggets' championship window extends through 2025 according to my calculations, with Jokic maintaining MVP-level production and their supporting cast hitting peak performance timing.",
  "I've been tracking defensive metrics for the upcoming season, and the Grizzlies are positioned to lead the league in defensive rating in 2025 if their young core stays healthy.",
  "My prediction for the 2025 Most Improved Player: keep an eye on young talents who are currently role players but positioned for expanded responsibilities next season.",
  "According to my analysis of shooting trends, the league-wide three-point attempt rate will stabilize in 2025 rather than continue increasing. Teams are finding more balance in their offensive approaches.",
];

// DareDevil responses when directly mentioned
const DIRECT_RESPONSES = [
  "You called for DareDevil? I'm your NBA analytics expert and prediction specialist. What insights can I provide today?",
  "DareDevil here, ready to share my latest NBA predictions and analysis. What would you like to know about the 2025 season?",
  "The name's DareDevil. I specialize in NBA futures and predictive analytics. How can I assist with your basketball questions?",
  "You've summoned DareDevil, your source for cutting-edge NBA analysis and bold predictions. What's on your mind?",
  "DareDevil at your service! My algorithms are constantly crunching NBA data to provide you with the most accurate forecasts for 2025 and beyond.",
];

// Helper function to check if message contains any NBA keywords or mentions DareDevil
export const shouldDareDevilRespond = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  
  // Check if DareDevil is mentioned directly
  if (lowerContent.includes('daredevil') || lowerContent.includes('dare devil')) {
    return true;
  }
  
  // Check for NBA keywords
  return NBA_KEYWORDS.some(keyword => lowerContent.includes(keyword.toLowerCase()));
};

// Generate a DareDevil response
export const generateDareDevilResponse = (content: string): Message => {
  const lowerContent = content.toLowerCase();
  let responseContent: string;
  
  // If DareDevil is mentioned directly, use a direct response
  if (lowerContent.includes('daredevil') || lowerContent.includes('dare devil')) {
    responseContent = DIRECT_RESPONSES[Math.floor(Math.random() * DIRECT_RESPONSES.length)];
  } else {
    // Otherwise, provide an NBA prediction
    responseContent = NBA_PREDICTIONS[Math.floor(Math.random() * NBA_PREDICTIONS.length)];
  }
  
  return {
    id: `daredevil-${Date.now()}`,
    sender: '0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS',
    content: responseContent,
    timestamp: new Date().toISOString(),
  };
};

// Create simulated typing delay (DareDevil thinking...)
export const getDareDevilResponseDelay = (): number => {
  // Random delay between 1 and 3 seconds
  return Math.floor(Math.random() * 2000) + 1000;
}; 