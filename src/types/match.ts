// New Match type matching the columns of the `matches` table
export interface Match {
  id: string;
  eventType: string; // e.g., 'basketball_nba', 'sandbox_metaverse'
  detailsId: string;
  status: string; // e.g., 'upcoming', 'finished'
  scheduledStartTime: string;
  createdAt: string;
  updatedAt: string;
  // Add any other columns from the matches table as needed
}

// NBA-specific match details
export interface NBAMatchDetail {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamLogo?: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamLogo?: string;
  season?: string;
  week?: number;
  scores?: any;
  venue?: string;
  gameSubtitle?: string;
  venueName?: string;
  venueCity?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

// Sandbox Metaverse-specific match details
export interface SandboxMetaverseMatchDetail {
  id: string;
  player1Id: string;
  player1Name: string;
  player1Subtitle?: string;
  player1ImageUrl?: string;
  player2Id: string;
  player2Name: string;
  player2Subtitle?: string;
  player2ImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Composite type for use in UI/service layer
export type MatchWithDetails =
  | { match: Match; details: NBAMatchDetail; eventType: 'basketball_nba' }
  | { match: Match; details: SandboxMetaverseMatchDetail; eventType: 'sandbox_metaverse' };

// Odds/bookmaker types (copied from existing types for convenience)
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