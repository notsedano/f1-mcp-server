/**
 * @deprecated This service is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

import { supabase } from '../../services/supabaseService';
import { Match, Team, EventType } from '../../types';

// Check if a user is an admin
export const checkAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('is_admin')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data?.is_admin || false;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
};

// Set a user as admin
export const setUserAsAdmin = async (email: string, adminStatus: boolean): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('set_user_as_admin', {
        user_email: email,
        admin_status: adminStatus
      });
    
    if (error) {
      console.error('Error setting admin status:', error);
      return false;
    }
    
    return data || false;
  } catch (error) {
    console.error('Exception setting admin status:', error);
    return false;
  }
};

// Create a new match (admin only) - Updated for multi-sport schema
export const createMatch = async (match: Omit<Match, 'id'>): Promise<Match | null> => {
  try {
    // Extract event type from sport_key
    const eventType = match.sport_key as EventType;
    
    // Generate unique IDs
    const matchId = generateMatchId(
      match.sport_name || '',
      match.league_name || '',
      match.home_team.name,
      match.away_team.name,
      match.commence_time
    );
    
    const detailsId = `${matchId}_details`;
    
    // Create basketball details entry first
    if (eventType === 'basketball_nba') {
      const basketballDetails = {
        id: detailsId,
        home_team_id: match.home_team.id,
        away_team_id: match.away_team.id,
        scores: match.scores || null,
        venue: null, // Will be updated with actual venue from form
        game_subtitle: null, // Will be updated with actual subtitle from form
      };
      
      const { error: detailsError } = await supabase
        .from('match_details_basketball_nba')
        .insert(basketballDetails);
      
      if (detailsError) {
        console.error('Error creating basketball match details:', detailsError);
        return null;
      }
    }
    
    // Create main match entry
    const mainMatchData = {
      id: matchId,
      event_type: eventType,
      details_id: detailsId,
      status: 'upcoming' as const,
      scheduled_start_time: match.commence_time,
      external_id: null,
      bookmakers: match.bookmakers || []
    };
    
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert(mainMatchData)
      .select()
      .single();
    
    if (matchError) {
      console.error('Error creating match:', matchError);
      // Clean up details if match creation failed
      if (eventType === 'basketball_nba') {
        await supabase
          .from('match_details_basketball_nba')
          .delete()
          .eq('id', detailsId);
      }
      return null;
    }
    
    // Convert back to Match type for backward compatibility
    return {
      id: matchData.id,
      sport_key: eventType,
      sport_name: match.sport_name || eventType.split('_')[0],
      league_name: match.league_name || eventType.split('_')[1],
      sport_title: match.sport_title,
      commence_time: matchData.scheduled_start_time,
      home_team: match.home_team,
      away_team: match.away_team,
      bookmakers: matchData.bookmakers || [],
      scores: match.scores,
      completed: matchData.status === 'finished'
    };
  } catch (error) {
    console.error('Exception creating match:', error);
    return null;
  }
};

// Create NBA match with specific details (admin only)
export const createNBAMatch = async (
  homeTeamId: string,
  awayTeamId: string,
  scheduledDateTime: string,
  gameSubtitle?: string,
  venue?: string,
  timezone?: string
): Promise<Match | null> => {
  try {
    // Generate unique IDs
    const matchId = generateMatchId(
      'basketball',
      'nba',
      homeTeamId,
      awayTeamId,
      scheduledDateTime
    );
    
    const detailsId = `${matchId}_details`;
    
    // Create basketball details entry
    const basketballDetails = {
      id: detailsId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      game_subtitle: gameSubtitle || null,
      venue: venue || null,
      timezone: timezone || null,
      scores: null
    };
    
    const { error: detailsError } = await supabase
      .from('match_details_basketball_nba')
      .insert(basketballDetails);
    
    if (detailsError) {
      console.error('Error creating basketball match details:', detailsError);
      return null;
    }
    
    // Create main match entry
    const mainMatchData = {
      id: matchId,
      event_type: 'basketball_nba' as EventType,
      details_id: detailsId,
      status: 'upcoming' as const,
      scheduled_start_time: scheduledDateTime,
      external_id: null,
      bookmakers: []
    };
    
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert(mainMatchData)
      .select()
      .single();
    
    if (matchError) {
      console.error('Error creating match:', matchError);
      // Clean up details if match creation failed
      await supabase
        .from('match_details_basketball_nba')
        .delete()
        .eq('id', detailsId);
      return null;
    }
    
    // Fetch team details for the response
    const { data: teamsData } = await supabase
      .from('teams_nba')
      .select('*')
      .in('id', [homeTeamId, awayTeamId]);
    
    const homeTeam = teamsData?.find(t => t.id === homeTeamId);
    const awayTeam = teamsData?.find(t => t.id === awayTeamId);
    
    // Convert back to Match type for backward compatibility
    return {
      id: matchData.id,
      sport_key: 'basketball_nba',
      sport_name: 'basketball',
      league_name: 'nba',
      sport_title: 'NBA',
      commence_time: matchData.scheduled_start_time,
      home_team: {
        id: homeTeamId,
        name: homeTeam ? `${homeTeam.city} ${homeTeam.name}` : homeTeamId
      },
      away_team: {
        id: awayTeamId,
        name: awayTeam ? `${awayTeam.city} ${awayTeam.name}` : awayTeamId
      },
      bookmakers: [],
      scores: null,
      completed: false
    };
  } catch (error) {
    console.error('Exception creating NBA match:', error);
    return null;
  }
};

// Create Sandbox Metaverse match with specific details (admin only)
export const createSandboxMatch = async (
  player1Name: string,
  player1Subtitle: string,
  player1ImageUrl: string,
  player2Name: string,
  player2Subtitle: string,
  player2ImageUrl: string,
  scheduledDateTime: string,
  timezone?: string
): Promise<Match | null> => {
  try {
    // Generate unique IDs
    const matchId = generateMatchId(
      'sandbox',
      'metaverse',
      player1Name,
      player2Name,
      scheduledDateTime
    );
    
    const detailsId = `${matchId}_details`;
    const player1Id = crypto.randomUUID();
    const player2Id = crypto.randomUUID();
    
    // Create sandbox details entry
    const sandboxDetails = {
      id: detailsId,
      player1_id: player1Id,
      player1_name: player1Name,
      player1_subtitle: player1Subtitle || null,
      player1_image_url: player1ImageUrl || null,
      player2_id: player2Id,
      player2_name: player2Name,
      player2_subtitle: player2Subtitle || null,
      player2_image_url: player2ImageUrl || null
    };
    
    const { error: detailsError } = await supabase
      .from('match_details_sandbox_metaverse')
      .insert(sandboxDetails);
    
    if (detailsError) {
      console.error('Error creating sandbox match details:', detailsError);
      return null;
    }
    
    // Create main match entry
    const mainMatchData = {
      id: matchId,
      event_type: 'sandbox_metaverse' as EventType,
      details_id: detailsId,
      status: 'upcoming' as const,
      scheduled_start_time: scheduledDateTime,
      external_id: null,
      bookmakers: []
    };
    
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert(mainMatchData)
      .select()
      .single();
    
    if (matchError) {
      console.error('Error creating match:', matchError);
      // Clean up details if match creation failed
      await supabase
        .from('match_details_sandbox_metaverse')
        .delete()
        .eq('id', detailsId);
      return null;
    }
    
    // Convert back to Match type for backward compatibility
    return {
      id: matchData.id,
      sport_key: 'sandbox_metaverse',
      sport_name: 'esports',
      league_name: 'sandbox',
      sport_title: 'The Sandbox Metaverse',
      commence_time: matchData.scheduled_start_time,
      home_team: {
        id: player1Id,
        name: player1Name,
        alias: player1Subtitle,
        logo: player1ImageUrl
      },
      away_team: {
        id: player2Id,
        name: player2Name,
        alias: player2Subtitle,
        logo: player2ImageUrl
      },
      bookmakers: [],
      scores: null,
      completed: false
    };
  } catch (error) {
    console.error('Exception creating Sandbox match:', error);
    return null;
  }
};

// Update match scores (admin only)
export const updateMatchScoresAdmin = async (
  matchId: string,
  homeScore: number,
  awayScore: number,
  completed: boolean = false
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('matches')
      .update({
        scores: { home: homeScore, away: awayScore },
        completed: completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', matchId);
    
    if (error) {
      console.error('Error updating match scores:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception updating match scores:', error);
    return false;
  }
};

// Delete a match (admin only)
export const deleteMatch = async (matchId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (error) {
      console.error('Error deleting match:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception deleting match:', error);
    return false;
  }
};

// Helper function to generate a match ID
const generateMatchId = (
  sportName: string,
  leagueName: string,
  homeTeamName: string,
  awayTeamName: string,
  commenceTime: string
): string => {
  // Clean up team names - remove spaces and special characters
  const cleanHome = homeTeamName.replace(/\W+/g, '').toLowerCase();
  const cleanAway = awayTeamName.replace(/\W+/g, '').toLowerCase();
  const cleanSport = sportName.replace(/\W+/g, '').toLowerCase();
  const cleanLeague = leagueName.replace(/\W+/g, '').toLowerCase();
  
  // Get date part from commence time
  const date = new Date(commenceTime);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  
  // Create unique ID
  return `${cleanSport}_${cleanLeague}_${cleanHome}_${cleanAway}_${dateStr}`;
}; 