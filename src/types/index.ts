// Basic Types (defined first to avoid circular references)
export type DataSource = 'mock' | 'api' | 'yahoo' | 'database';

// New enums for multi-sport architecture
export type EventType = 'basketball_nba' | 'sandbox_metaverse';
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled';

// New basketball-specific details interface
export interface BasketballMatchDetails {
  id: string;
  home_team_id: string;
  home_team_name: string;
  home_team_logo?: string;
  away_team_id: string;
  away_team_name: string;
  away_team_logo?: string;
  season?: string;
  week?: number;
  scores?: any;
  venue_name?: string;
  venue_city?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

// Sandbox Metaverse esports details interface
export interface SandboxMatchDetails {
  id: string;
  player1_id: string;
  player1_name: string;
  player1_subtitle?: string;
  player1_image_url?: string;
  player2_id: string;
  player2_name: string;
  player2_subtitle?: string;
  player2_image_url?: string;
  created_at: string;
  updated_at: string;
}

// New universal match interface
export interface UniversalMatch {
  id: string;
  event_type: EventType;
  details_id: string;
  status: MatchStatus;
  scheduled_start_time: string;
  bookmakers?: BookmakerOdds[]; // Temporary: keeping for Phase 1 compatibility
  created_at: string;
  updated_at: string;
}

// Team interface (updated to support player aliases for esports)
export interface Team {
  id: string;
  name: string;
  logo?: string;
  record?: string;
  alias?: string; // For esports player aliases like @username, TSB_GamerTag, etc.
}

export interface Odds {
  h2h: number; // Decimal odds
}

export interface BookmakerOdds {
  key: string;
  title: string;
  markets: {
    key: string;
    outcomes: {
      name: string;
      price: number;
    }[];
  }[];
}

/**
 * @deprecated This Match type is deprecated and will be removed in a future version.
 * It does not match the database schema. New code should define and use a local Match type that matches the columns of the `matches` table.
 */
export interface Match {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string; // Will map from scheduled_start_time
  home_team: Team;
  away_team: Team;
  bookmakers?: BookmakerOdds[];
  scores?: any;
  completed?: boolean; // Will map from status
  sport_name?: string; // Optional for backward compatibility
  league_name?: string; // Optional for backward compatibility
}

// Betting Types
export type BetResult = 'pending' | 'won' | 'lost' | 'draw' | 'void';

// Chat Types
export interface Message {
  id: string;
  betId?: string;
  matchId?: string;
  global?: boolean;
  sender: string; // can be a user address, 'system', or 'daredevil'
  content: string;
  timestamp: string;
}

// Analysis Types
export interface MatchAnalysis {
  matchId: string;
  homeTeamWinProbability: number;
  awayTeamWinProbability: number;
  keyFactors: string[];
  recommendation?: string;
}

// Standings Types
export type ClinchedStatus = 'playoff' | 'division' | 'homeCourt' | null;

export interface StandingsTeam {
  name: string;
  wins: number;
  losses: number;
  winPercentage: number;
  last10: string;
  streak: string;
  clinched: ClinchedStatus;
}

export interface Division {
  name: string;
  teams: StandingsTeam[];
}

export interface Conference {
  name: string;
  divisions: Division[];
}