// Define the LeaderboardEntry interface locally to avoid import issues  
interface LeaderboardEntry {
  user_id: string;
  username?: string;
  wallet_address?: string;
  total_bets: number;
  wins: number;
  losses: number;
  total_wagered: number;
  total_won: number;
  win_rate: number;
  dare_points?: number;
  is_mock?: boolean;
}

// Mock data for leaderboard
export const MOCK_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    user_id: 'mock_user_1',
    wallet_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    total_bets: 24,
    wins: 14,
    losses: 10,
    total_wagered: 1200,
    total_won: 1800,
    win_rate: 0.583,
    dare_points: 2500,
    is_mock: true
  },
  {
    user_id: 'mock_user_2',
    wallet_address: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    total_bets: 18,
    wins: 10,
    losses: 8,
    total_wagered: 900,
    total_won: 1500,
    win_rate: 0.555,
    dare_points: 2100,
    is_mock: true
  },
  {
    user_id: 'mock_user_3',
    wallet_address: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    total_bets: 30,
    wins: 15,
    losses: 15,
    total_wagered: 1500,
    total_won: 2000,
    win_rate: 0.5,
    dare_points: 1950,
    is_mock: true
  },
  {
    user_id: 'mock_user_4',
    wallet_address: '0xabcd1234abcd1234abcd1234abcd1234abcd1234',
    total_bets: 12,
    wins: 7,
    losses: 5,
    total_wagered: 600,
    total_won: 1000,
    win_rate: 0.583,
    dare_points: 1800,
    is_mock: true
  },
  {
    user_id: 'mock_user_5',
    wallet_address: '0x567890567890567890567890567890567890abcd',
    total_bets: 8,
    wins: 4,
    losses: 4,
    total_wagered: 400,
    total_won: 800,
    win_rate: 0.5,
    dare_points: 1600,
    is_mock: true
  }
];

// Mock bets for open marketplace
export const MOCK_OPEN_BETS: any[] = [
  {
    id: 'mock_bet_open_1',
    creator: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    matchId: 'match_123',
    teamId: 'team_456',
    amount: 100,
    status: 'OPEN',
    timestamp: Date.now() - 3600000, // 1 hour ago
    description: 'Lakers to win by 10 points',
    is_mock: true
  },
  {
    id: 'mock_bet_open_2',
    creator: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    matchId: 'match_124',
    teamId: 'team_789',
    amount: 200,
    status: 'OPEN',
    timestamp: Date.now() - 7200000, // 2 hours ago
    description: 'Warriors to win the championship',
    is_mock: true
  },
  {
    id: 'mock_bet_open_3',
    creator: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    matchId: 'match_125',
    teamId: 'team_101',
    amount: 150,
    status: 'OPEN',
    timestamp: Date.now() - 10800000, // 3 hours ago
    description: 'Bucks to win the next game',
    is_mock: true
  }
];

// Mock bets for closed marketplace
export const MOCK_CLOSED_BETS: any[] = [
  {
    id: 'mock_bet_closed_1',
    creator: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    acceptor: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    matchId: 'match_123',
    teamId: 'team_456',
    amount: 100,
    status: 'COMPLETED',
    timestamp: Date.now() - 86400000, // 1 day ago
    description: 'Lakers to win by 10 points',
    winnerId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    is_mock: true
  },
  {
    id: 'mock_bet_closed_2',
    creator: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac',
    acceptor: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    matchId: 'match_124',
    teamId: 'team_789',
    amount: 200,
    status: 'COMPLETED',
    timestamp: Date.now() - 172800000, // 2 days ago
    description: 'Warriors to win the championship',
    winnerId: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    is_mock: true
  },
  {
    id: 'mock_bet_closed_3',
    creator: '0x9876a23c4b3d2e1f05678c9b0d2e1f05678c9b0d',
    acceptor: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    matchId: 'match_125',
    teamId: 'team_101',
    amount: 150,
    status: 'CANCELLED',
    timestamp: Date.now() - 259200000, // 3 days ago
    description: 'Bucks to win the next game',
    is_mock: true
  }
];

// Helper functions to make all mock data clearly identifiable
export const getMockLeaderboardEntries = (limit: number = 10): LeaderboardEntry[] => {
  const entries = [...MOCK_LEADERBOARD_ENTRIES].map(entry => ({
    ...entry,
    is_mock: true,
    // Add a random increment to dare points so it feels more dynamic
    dare_points: (entry.dare_points || 0) + Math.floor(Math.random() * 100)
  }));
  
  // Sort by points
  entries.sort((a, b) => (b.dare_points || 0) - (a.dare_points || 0));
  
  console.log(`Returning ${Math.min(entries.length, limit)} mock leaderboard entries`);
  return entries.slice(0, limit);
};

export const getMockOpenBets = (limit: number = 50): any[] => {
  // Make fresh timestamps
  const bets = [...MOCK_OPEN_BETS].map(bet => ({
    ...bet,
    is_mock: true,
    timestamp: Date.now() - Math.floor(Math.random() * 36000000) // Random time in last 10 hours
  }));
  
  // Sort by timestamp (newest first)
  bets.sort((a, b) => b.timestamp - a.timestamp);
  
  console.log(`Returning ${Math.min(bets.length, limit)} mock open bets`);
  return bets.slice(0, limit);
};

export const getMockClosedBets = (limit: number = 50): any[] => {
  // Make fresh timestamps
  const bets = [...MOCK_CLOSED_BETS].map(bet => ({
    ...bet,
    is_mock: true,
    timestamp: Date.now() - Math.floor(Math.random() * 864000000) // Random time in last 10 days
  }));
  
  // Sort by timestamp (newest first)
  bets.sort((a, b) => b.timestamp - a.timestamp);
  
  console.log(`Returning ${Math.min(bets.length, limit)} mock closed bets`);
  return bets.slice(0, limit);
}; 