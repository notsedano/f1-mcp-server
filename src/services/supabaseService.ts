/**
 * @deprecated This service is being deprecated and broken down into domain-specific services.
 * 
 * DO NOT ADD NEW FUNCTIONALITY TO THIS FILE.
 * 
 * Migration plan:
 * - Authentication functions → authService.ts
 * - User account functions → userAccountsService.ts
 * - Match functions → matchService.ts (future)
 * 
 * This file will be removed once all consumers have migrated to the new services.
 * Use the domain-specific services for new development.
 */

import { createClient } from '@supabase/supabase-js';
import { Match } from '../types/match';
import { MatchWithDetails, NBAMatchDetail, SandboxMetaverseMatchDetail } from '../types/match';

// Supabase configuration
// Hardcoded values as a fallback when env variables have issues
const fixedSupabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const fixedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

// Try to use environment variables, fall back to fixed values if there's an issue
let supabaseUrl = '';
try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fixedSupabaseUrl;
  // Validate URL format
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    supabaseUrl = fixedSupabaseUrl;
  }
} catch (error) {
  console.error('Error accessing Supabase URL:', error);
  supabaseUrl = fixedSupabaseUrl;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fixedSupabaseAnonKey;

// When in development mode and no proper keys are set, use a dummy client
const isDevelopment = import.meta.env.DEV;
const isProperlyConfigured = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey.length > 10;
const shouldUseDummyClient = false; // Force real Supabase client

// Log the Supabase URL for debugging
console.log('Supabase URL:', supabaseUrl ? (shouldUseDummyClient ? 'USING DUMMY CLIENT' : supabaseUrl.substring(0, 15) + '...') : 'NOT SET');
console.log('Supabase Anon Key present:', !!supabaseAnonKey && !shouldUseDummyClient);
console.log('Using dummy client:', shouldUseDummyClient);

// Initialize the Supabase client
let supabase = createClient(fixedSupabaseUrl, fixedSupabaseAnonKey); // Default initialization
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Already using the default client
}
export { supabase };

// Create a dummy Supabase client for offline/development mode
const createDummyClient = () => {
  console.warn('Using dummy Supabase client - data will not persist to cloud');
  
  // Create a simple in-memory store for development
  const inMemoryStore: Record<string, any[]> = {
    user_accounts: [],
    bets: [],
  };
  
  // Create a dummy channel for realtime subscriptions
  class DummyChannel {
    private callbacks: Array<{ event: string; callback: Function }> = [];
    private channelName: string;
    
    constructor(name: string) {
      this.channelName = name;
      console.log(`Creating dummy channel: ${name}`);
    }
    
    on(event: string, filter: any, callback: Function) {
      console.log(`Registered dummy callback for event: ${event}`, filter);
      this.callbacks.push({ event, callback });
      return this;
    }
    
    subscribe(statusCallback?: Function) {
      if (statusCallback) {
        statusCallback('SUBSCRIBED');
      }
      console.log(`Subscribed to dummy channel: ${this.channelName}`);
      return this;
    }
    
    // Method to simulate events for testing
    simulateEvent(event: string, payload: any) {
      this.callbacks
        .filter(cb => cb.event === event)
        .forEach(cb => {
          console.log(`Simulating event ${event} on channel ${this.channelName}`);
          cb.callback(payload);
        });
    }
  }
  
  // Store active channels
  const activeChannels: Record<string, DummyChannel> = {};
  
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => ({
            data: null,
            error: { code: 'DUMMY_CLIENT' }
          })
        }),
        limit: () => ({
          single: () => ({
            data: null,
            error: { code: 'DUMMY_CLIENT' }
          })
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: () => {
            if (inMemoryStore[table]) {
              inMemoryStore[table].push(data);
            } else {
              inMemoryStore[table] = [data];
            }
            return { data, error: null };
          }
        })
      }),
      update: (data: any) => ({
        eq: () => ({
          select: () => ({
            single: () => {
              return { data, error: null };
            }
          })
        })
      }),
      upsert: (data: any) => ({
        select: () => {
          if (inMemoryStore[table]) {
            inMemoryStore[table].push(data);
          } else {
            inMemoryStore[table] = [data];
          }
          return { data, error: null };
        }
      })
    }),
    rpc: (func: string, params: any) => {
      console.log(`Called RPC function ${func} with params:`, params);
      return { data: [], error: null };
    },
    auth: {
      signUp: () => ({ data: null, error: null }),
      signInWithPassword: () => ({ data: null, error: null }),
      signOut: () => ({ error: null }),
      getUser: () => ({ data: { user: null }, error: null }),
      getSession: () => ({ data: { session: null }, error: null })
    },
    channel: (name: string) => {
      const channel = new DummyChannel(name);
      activeChannels[name] = channel;
      return channel;
    },
    removeChannel: (channel: any) => {
      const channelNames = Object.keys(activeChannels);
      for (const name of channelNames) {
        if (activeChannels[name] === channel) {
          delete activeChannels[name];
          console.log(`Removed dummy channel: ${name}`);
          return { error: null };
        }
      }
      return { error: null };
    }
  };
};

// Test the connection immediately
(async () => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not provided. Running in offline mode.');
      return;
    }
    
    const { error } = await supabase.from('_dummy_test').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase connection test error:', error);
      console.warn('Unable to connect to database. Some features may not work correctly.');
    } else {
      console.log('Supabase connection test: Success!');
    }
  } catch (err) {
    console.error('Supabase connection test exception:', err);
  }
})();

// Export the Supabase client - use real or dummy based on configuration
export const supabaseClient = shouldUseDummyClient ? createDummyClient() : supabase;

// Helper function to wait for user account creation
const waitForUserAccount = async (userId: string, maxAttempts = 10): Promise<UserAccount | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const account = await getUserAccount(userId);
      if (account) {
        console.log('User account created successfully');
        return account;
      }
      // Wait 200ms between attempts
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log('Still waiting for user account creation...');
    }
  }
  return null;
};

// Auth functions
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    // Special handling for existing user error
    if (error) {
      // Check if this is an existing user error
      if (error.message?.includes('User already registered')) {
        // Try to sign in instead
        console.log('User already exists, attempting sign in...');
        const signInResult = await signInWithEmail(email, password);
        return signInResult;
      }
      throw error;
    }

    if (!data.user) {
      throw new Error('No user data returned from signup');
    }

    // Wait for the database trigger to complete and user account to be created
    console.log('Waiting for user account creation...');
    const account = await waitForUserAccount(data.user.id);
    
    if (!account) {
      throw new Error('Timeout waiting for user account creation');
    }

    return data;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// User account functions
interface UserAccount {
  id?: string;
  user_id?: string;
  email?: string;
  wallet_address?: string;
  reserved_points?: number;
  free_points?: number;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

export const createUserAccount = async (userId: string, account: Partial<UserAccount>) => {
  console.log('=== CREATE ACCOUNT DEBUG: Starting createUserAccount ===');
  console.log('User ID:', userId);
  console.log('Account data:', account);
  
  try {
    console.log('=== CREATE ACCOUNT DEBUG: About to call supabase.from(user_accounts).insert ===');
    
    const { data, error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userId,
        free_points: 0, // Points will be awarded separately via signup bonus
        reserved_points: 0,
        ...account,
      })
      .select()
      .single();
    
    console.log('=== CREATE ACCOUNT DEBUG: Insert completed ===');
    console.log('Data:', data);
    console.log('Error:', error);
    
    if (error) {
      console.log('=== CREATE ACCOUNT DEBUG: Throwing error ===');
      throw error;
    }
    
    console.log('=== CREATE ACCOUNT DEBUG: Returning data ===');
    return data;
  } catch (err) {
    console.log('=== CREATE ACCOUNT DEBUG: Caught exception ===');
    console.error('Exception in createUserAccount:', err);
    throw err;
  }
};

export const getUserAccount = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is the error for no rows returned
    throw error;
  }
  
  return data;
};

export const updateUserAccount = async (userId: string, updates: Partial<UserAccount>) => {
  const { data, error } = await supabase
    .from('user_accounts')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const linkWalletToUser = async (userId: string, walletAddress: string) => {
  return updateUserAccount(userId, { wallet_address: walletAddress });
};

// Create wallet account with signup bonus using database function
export const insertRowsAfterSignupFromWallet = async (userId: string, walletAddress: string) => {
  try {
    const { data, error } = await supabase.rpc('insert_rows_after_signup_from_wallet', {
      wallet_user_id: userId,
      wallet_address: walletAddress
    });

    if (error) {
      console.error('Error inserting rows after wallet signup:', error);
      throw error;
    }

    if (data && !data.success) {
      console.error('Wallet signup row insertion failed:', data.error);
      throw new Error(data.error);
    }

    console.log('Rows inserted after wallet signup:', data);
    return data;
  } catch (error) {
    console.error('Exception in insertRowsAfterSignupFromWallet:', error);
    throw error;
  }
};

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !shouldUseDummyClient;
};

// Points functions
export const getPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return (account?.free_points || 0) + (account?.reserved_points || 0);
};

export const getFreePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.free_points || 0;
};

export const getReservedPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.reserved_points || 0;
};

export const updatePoints = async (userId: string, points: number): Promise<number> => {
  const account = await getUserAccount(userId);
  const currentPoints = account?.free_points || 0;
  const newPoints = currentPoints + points;
  
  await updateUserAccount(userId, { free_points: newPoints });
  return newPoints;
};

export const reservePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_points || 0;
  const reserved = account?.reserved_points || 0;
  
  if (free < amount) {
    return false; // Not enough free points
  }
  
  await updateUserAccount(userId, { 
    free_points: free - amount,
    reserved_points: reserved + amount
  });
  
  return true;
};

export const freePoints = async (userId: string, amount: number): Promise<boolean> => {
  const account = await getUserAccount(userId);
  const free = account?.free_points || 0;
  const reserved = account?.reserved_points || 0;
  
  if (reserved < amount) {
    return false; // Not enough reserved points
  }
  
  await updateUserAccount(userId, { 
    free_points: free + amount,
    reserved_points: reserved - amount
  });
  
  return true;
};





/**
 * @deprecated This function returns the legacy Match type and will be removed in a future version.
 * New code should define and use a local getMatchById that returns the new Match type matching the database schema.
 */
export const getMatchById = async (id: string): Promise<Match | null> => {
  try {
    // Query the new multi-sport schema with joins
    const { data, error } = await supabaseClient
      .from('matches')
      .select(`
        *,
        match_details_basketball_nba!inner(*)
      `)
      .eq('id', id)
      .single();

    // If found by ID, return it
    if (!error && data) {
      const basketballDetails = data.match_details_basketball_nba;
      
      return {
        id: data.id,
        event_type: 'basketball_nba' as const,
        details_id: data.details_id,
        status: data.status,
        scheduled_start_time: data.scheduled_start_time,
        bookmakers: data.bookmakers || [],
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    }

    if (error) {
      console.error('Error getting match by ID:', error);
    }
    return null;
  } catch (error) {
    console.error('Exception getting match by ID:', error);
    return null;
  }
};

/**
 * Get match with details by ID using the new MatchWithDetails type
 * @param id - The match ID
 * @returns Promise<MatchWithDetails | null> - The match with its specific details
 */
export const getMatchWithDetailsById = async (id: string): Promise<MatchWithDetails | null> => {
  try {
    // First get the main match data
    const { data: matchData, error: matchError } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();

    if (matchError || !matchData) {
      console.error('Error getting match by ID:', matchError);
      return null;
    }

    // Get details based on event_type
    if (matchData.event_type === 'basketball_nba') {
      const { data: basketballData, error: basketballError } = await supabaseClient
        .from('match_details_basketball_nba')
        .select(`
          *,
          home_team:teams_nba!match_details_basketball_nba_home_team_id_fkey(*),
          away_team:teams_nba!match_details_basketball_nba_away_team_id_fkey(*)
        `)
        .eq('id', matchData.details_id)
        .single();

      if (basketballError || !basketballData) {
        console.error('Error getting basketball details:', basketballError);
        return null;
      }

      const match: Match = {
        id: matchData.id,
        eventType: matchData.event_type,
        detailsId: matchData.details_id,
        status: matchData.status,
        scheduledStartTime: matchData.scheduled_start_time,
        createdAt: matchData.created_at,
        updatedAt: matchData.updated_at,
      };

      const details: NBAMatchDetail = {
        id: basketballData.id,
        homeTeamId: basketballData.home_team_id,
        homeTeamName: basketballData.home_team?.name || basketballData.home_team_id,
        homeTeamLogo: basketballData.home_team?.logo_url,
        awayTeamId: basketballData.away_team_id,
        awayTeamName: basketballData.away_team?.name || basketballData.away_team_id,
        awayTeamLogo: basketballData.away_team?.logo_url,
        season: basketballData.season,
        week: basketballData.week,
        scores: basketballData.scores,
        venue: basketballData.venue,
        gameSubtitle: basketballData.game_subtitle,
        venueName: basketballData.venue,
        venueCity: basketballData.venue_city,
        externalId: basketballData.external_id,
        createdAt: basketballData.created_at,
        updatedAt: basketballData.updated_at,
      };

      return {
        match,
        details,
        eventType: 'basketball_nba'
      };
    } else if (matchData.event_type === 'sandbox_metaverse') {
      const { data: sandboxData, error: sandboxError } = await supabaseClient
        .from('match_details_sandbox_metaverse')
        .select('*')
        .eq('id', matchData.details_id)
        .single();

      if (sandboxError || !sandboxData) {
        console.error('Error getting sandbox details:', sandboxError);
        return null;
      }

      const match: Match = {
        id: matchData.id,
        eventType: matchData.event_type,
        detailsId: matchData.details_id,
        status: matchData.status,
        scheduledStartTime: matchData.scheduled_start_time,
        bookmakers: matchData.bookmakers || [],
        createdAt: matchData.created_at,
        updatedAt: matchData.updated_at,
      };

      const details: SandboxMetaverseMatchDetail = {
        id: sandboxData.id,
        player1Id: sandboxData.player1_id,
        player1Name: sandboxData.player1_name,
        player1Subtitle: sandboxData.player1_subtitle,
        player1ImageUrl: sandboxData.player1_image_url,
        player2Id: sandboxData.player2_id,
        player2Name: sandboxData.player2_name,
        player2Subtitle: sandboxData.player2_subtitle,
        player2ImageUrl: sandboxData.player2_image_url,
        createdAt: sandboxData.created_at,
        updatedAt: sandboxData.updated_at,
      };

      return {
        match,
        details,
        eventType: 'sandbox_metaverse'
      };
    }

    console.error('Unsupported event_type:', matchData.event_type);
    return null;
  } catch (error) {
    console.error('Exception getting match with details by ID:', error);
    return null;
  }
};

export const getUpcomingMatches = async (limit: number = 50): Promise<Match[]> => {
  try {
    const now = new Date().toISOString();
    
    // Get matches from the main table (all event types)
    const { data: matchesData, error: matchesError } = await supabaseClient
      .from('matches')
      .select('*')
      .eq('status', 'upcoming')
      .order('scheduled_start_time', { ascending: true })
      .limit(limit);

    if (matchesError) {
      console.error('Error getting matches:', matchesError);
      return [];
    }

    if (!matchesData || matchesData.length === 0) {
      console.log('No upcoming matches found');
      return [];
    }

    // Convert to new Match type structure
    const matches: Match[] = matchesData.map((item: any) => ({
      id: item.id,
      event_type: item.event_type,
      details_id: item.details_id,
      status: item.status,
      scheduled_start_time: item.scheduled_start_time,
      bookmakers: item.bookmakers || [],
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    return matches;
  } catch (error) {
    console.error('Exception getting upcoming matches:', error);
    return [];
  }
};

export const updateMatchScores = async (
  matchId: string, 
  homeScore: number, 
  awayScore: number, 
  completed: boolean = false
): Promise<boolean> => {
  try {
    // Try to update by ID
    const { error } = await supabaseClient
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

// TODO: Add new multi-sport architecture functions here after resolving TypeScript issues with mock Supabase client 