import { MatchAnalysis } from '../../types';

// Mock analysis data for development
const MOCK_ANALYSES: Record<string, MatchAnalysis> = {
  '1': {
    matchId: '1',
    homeTeamWinProbability: 0.45,
    awayTeamWinProbability: 0.55,
    keyFactors: [
      'Warriors have won 7 of their last 10 games against the Lakers',
      'Lakers are missing a key player due to injury',
      'Warriors have a better 3-point shooting percentage this season',
      'Lakers have home court advantage'
    ],
    recommendation: 'While the Lakers have home court advantage, the Warriors have been performing better in recent matchups. Consider betting on the Warriors.'
  },
  '2': {
    matchId: '2',
    homeTeamWinProbability: 0.52,
    awayTeamWinProbability: 0.48,
    keyFactors: [
      'Celtics have a stronger home record this season',
      'Bucks and Celtics are evenly matched in scoring efficiency',
      'Celtics have better defensive statistics',
      'Recent head-to-head matchups have been close'
    ],
    recommendation: 'This is a close matchup, but the Celtics\' home court advantage and stronger defense give them a slight edge.'
  },
  '3': {
    matchId: '3',
    homeTeamWinProbability: 0.38,
    awayTeamWinProbability: 0.62,
    keyFactors: [
      'Heat have won 8 of their last 10 games',
      'Nets are struggling with consistency',
      'Heat have a superior defensive rating',
      'Heat have dominated recent matchups'
    ],
    recommendation: 'The Heat are showing strong performance and have historically performed well against the Nets. They represent a good betting opportunity.'
  },
  '4': {
    matchId: '4',
    homeTeamWinProbability: 0.55,
    awayTeamWinProbability: 0.45,
    keyFactors: [
      'Suns have a strong home record',
      'Nuggets perform worse at higher altitudes away from Denver',
      'Suns have superior offensive efficiency',
      'Recent matchups have favored the home team'
    ]
  },
  '5': {
    matchId: '5',
    homeTeamWinProbability: 0.5,
    awayTeamWinProbability: 0.5,
    keyFactors: [
      'Teams are very evenly matched in statistical categories',
      'Thunder have been improving rapidly this season',
      'Mavericks have strong star power',
      'Head-to-head matchups have been split evenly'
    ],
    recommendation: 'This match is too close to call with confidence. Consider looking for other betting opportunities or place a smaller bet.'
  }
};

export const getMatchAnalysis = async (matchId: string): Promise<MatchAnalysis> => {
  // In a real implementation, this would call the ElizaOS API
  // const url = `https://api.elizaos.com/analyze/nba-match/${matchId}`;
  // const response = await fetch(url);
  // const data = await response.json();
  // return data;
  
  // For development, return mock data
  const analysis = MOCK_ANALYSES[matchId];
  
  if (!analysis) {
    throw new Error('Analysis not found for this match');
  }
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(analysis);
    }, 1000); // Simulate network delay
  });
};