import { supabase } from './services/supabaseService';

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

// Create more visually interesting mock leaderboard entries
export const getMockLeaderboardEntries = (): LeaderboardEntry[] => {
  return [
    {
      user_id: 'mock_user_1',
      wallet_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      username: 'CryptoWizard',
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
      username: 'HoopsMaster',
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
      username: 'BetBaron',
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
      username: 'LakersLegend',
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
      username: 'BullsBeliever',
      total_bets: 8,
      wins: 4,
      losses: 4,
      total_wagered: 400,
      total_won: 800,
      win_rate: 0.5,
      dare_points: 1600,
      is_mock: true
    },
    {
      user_id: 'mock_user_6',
      wallet_address: '0x111222333444555666777888999000aaabbbcccd',
      username: 'RocketsFan',
      total_bets: 14,
      wins: 9,
      losses: 5,
      total_wagered: 700,
      total_won: 1200,
      win_rate: 0.643,
      dare_points: 1450,
      is_mock: true
    },
    {
      user_id: 'mock_user_7',
      wallet_address: '0xeeeeffffeeeeffffeeeeffffeeeeffffeeeeeeee',
      username: 'MavsMania',
      total_bets: 10,
      wins: 6,
      losses: 4,
      total_wagered: 500,
      total_won: 850,
      win_rate: 0.6,
      dare_points: 1350,
      is_mock: true
    },
    {
      user_id: 'mock_user_8',
      wallet_address: '0x99887766554433221100aabbccddeeff99887766',
      username: 'NetsNinja',
      total_bets: 6,
      wins: 3,
      losses: 3,
      total_wagered: 300,
      total_won: 500,
      win_rate: 0.5,
      dare_points: 1200,
      is_mock: true
    },
    {
      user_id: 'mock_user_9',
      wallet_address: '0x123456789abcdef123456789abcdef123456789a',
      username: 'ClippersChamp',
      total_bets: 5,
      wins: 4,
      losses: 1,
      total_wagered: 250,
      total_won: 450,
      win_rate: 0.8,
      dare_points: 1150,
      is_mock: true
    },
    {
      user_id: 'mock_user_10',
      wallet_address: '0xfedcba9876543210fedcba9876543210fedcba98',
      username: 'HeatHero',
      total_bets: 4,
      wins: 2,
      losses: 2,
      total_wagered: 200,
      total_won: 350,
      win_rate: 0.5,
      dare_points: 1050,
      is_mock: true
    }
  ];
}; 