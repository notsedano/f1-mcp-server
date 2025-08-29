import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Match, MatchWithDetails, NBAMatchDetail, SandboxMetaverseMatchDetail } from '../types/match';
import { getUpcomingMatches } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { supabaseClient } from '../services/supabaseService';

interface MatchesContextType {
  matchesWithDetails: MatchWithDetails[];
  loading: boolean;
  error: string | null;
  refreshMatches: () => Promise<void>;
  getMatchByIdWithDetails: (id: string) => MatchWithDetails | undefined;
}

const MatchesContext = createContext<MatchesContextType | undefined>(undefined);

export const MatchesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [matchesWithDetails, setMatchesWithDetails] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const fetchDetailsForMatch = async (match: Match): Promise<MatchWithDetails | null> => {
    if (match.eventType === 'basketball_nba') {
      const { data, error } = await supabaseClient
        .from('match_details_basketball_nba')
        .select(`
          *,
          home_team:teams_nba!match_details_basketball_nba_home_team_id_fkey(*),
          away_team:teams_nba!match_details_basketball_nba_away_team_id_fkey(*)
        `)
        .eq('id', match.detailsId)
        .single();
      if (error || !data) return null;
      
      // Convert database fields to camelCase to match interfaces
      const details: NBAMatchDetail = {
        id: data.id,
        homeTeamId: data.home_team_id,
        homeTeamName: data.home_team?.name || data.home_team_id,
        homeTeamLogo: data.home_team?.logo_url,
        awayTeamId: data.away_team_id,
        awayTeamName: data.away_team?.name || data.away_team_id,
        awayTeamLogo: data.away_team?.logo_url,
        season: data.season,
        week: data.week,
        scores: data.scores,
        venue: data.venue,
        gameSubtitle: data.game_subtitle,
        venueName: data.venue,
        venueCity: data.venue_city,
        externalId: data.external_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { match, details, eventType: 'basketball_nba' };
    } else if (match.eventType === 'sandbox_metaverse') {
      const { data, error } = await supabaseClient
        .from('match_details_sandbox_metaverse')
        .select('*')
        .eq('id', match.detailsId)
        .single();
      if (error || !data) return null;
      
      // Convert database fields to camelCase to match interfaces
      const details: SandboxMetaverseMatchDetail = {
        id: data.id,
        player1Id: data.player1_id,
        player1Name: data.player1_name,
        player1Subtitle: data.player1_subtitle,
        player1ImageUrl: data.player1_image_url,
        player2Id: data.player2_id,
        player2Name: data.player2_name,
        player2Subtitle: data.player2_subtitle,
        player2ImageUrl: data.player2_image_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      
      return { match, details, eventType: 'sandbox_metaverse' };
    }
    return null;
  };

  const refreshMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbMatches = await getUpcomingMatches(100);
      // Convert database field names to camelCase to match Match interface
      const convertedMatches = dbMatches.map((match: any) => ({
        id: match.id,
        eventType: match.event_type,
        detailsId: match.details_id,
        status: match.status,
        scheduledStartTime: match.scheduled_start_time,
        createdAt: match.created_at,
        updatedAt: match.updated_at
      } as Match));
      const detailsPromises = convertedMatches.map(fetchDetailsForMatch);
      const detailsResults = await Promise.all(detailsPromises);
      setMatchesWithDetails(detailsResults.filter(Boolean) as MatchWithDetails[]);
    } catch (err) {
      setError(`Failed to fetch matches: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMatchesWithDetails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMatchByIdWithDetails = useCallback((id: string): MatchWithDetails | undefined => {
    return matchesWithDetails.find(m => m.match.id === id);
  }, [matchesWithDetails]);

  useEffect(() => {
    if (!authLoading) {
      refreshMatches();
    }
  }, [refreshMatches, authLoading, isAuthenticated]);

  const contextValue: MatchesContextType = {
    matchesWithDetails,
    loading,
    error,
    refreshMatches,
    getMatchByIdWithDetails
  };

  return (
    <MatchesContext.Provider value={contextValue}>
      {children}
    </MatchesContext.Provider>
  );
};

export const useMatches = (): MatchesContextType => {
  const context = useContext(MatchesContext);
  if (context === undefined) {
    throw new Error('useMatches must be used within a MatchesProvider');
  }
  return context;
}; 