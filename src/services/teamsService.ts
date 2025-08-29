import { supabase } from './supabaseService';

export interface NBATeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: 'Eastern' | 'Western';
  division: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

// Get all NBA teams ordered alphabetically by city and name
export const getNBATeams = async (): Promise<NBATeam[]> => {
  try {
    const { data, error } = await supabase
      .from('teams_nba')
      .select('*')
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching NBA teams:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching NBA teams:', error);
    throw error;
  }
};

// Get a specific NBA team by ID
export const getNBATeamById = async (teamId: string): Promise<NBATeam | null> => {
  try {
    const { data, error } = await supabase
      .from('teams_nba')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) {
      console.error('Error fetching NBA team:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching NBA team:', error);
    return null;
  }
};

// Get teams by conference
export const getNBATeamsByConference = async (conference: 'Eastern' | 'Western'): Promise<NBATeam[]> => {
  try {
    const { data, error } = await supabase
      .from('teams_nba')
      .select('*')
      .eq('conference', conference)
      .order('city', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching NBA teams by conference:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Exception fetching NBA teams by conference:', error);
    throw error;
  }
}; 