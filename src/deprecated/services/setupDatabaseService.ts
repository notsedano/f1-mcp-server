import { supabase } from '../../services/supabaseService';

/**
 * Setup database schema for DARE points, bets, and leaderboards
 * This will be called once when the app initializes
 */
export const setupDatabase = async (): Promise<void> => {
  try {
    console.log('Setting up database schema...');
    
    // Tables should be created manually in Supabase
    // by running the SQL migrations directly
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
};

/**
 * Setup leaderboard functions in Supabase
 * Note: These functions should also be created manually in Supabase
 */
const setupLeaderboardFunctions = async (): Promise<void> => {
  console.log(`
    SQL to create leaderboard functions:
    
    -- Function to get top winners
    CREATE OR REPLACE FUNCTION public.get_top_winners(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id as user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_accounts u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY wins DESC, win_rate DESC, total_bets DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get top earners
    CREATE OR REPLACE FUNCTION public.get_top_earners(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id as user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_accounts u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY total_won DESC, wins DESC, win_rate DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get most active bettors
    CREATE OR REPLACE FUNCTION public.get_most_active_bettors(limit_count integer)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id as user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_accounts u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats
      ORDER BY total_bets DESC, total_wagered DESC
      LIMIT limit_count;
    END;
    $$;
    
    -- Function to get a single user's betting stats
    CREATE OR REPLACE FUNCTION public.get_user_betting_stats(user_id text)
    RETURNS TABLE (
      user_id text,
      username text,
      wallet_address text,
      total_bets bigint,
      wins bigint,
      losses bigint,
      total_wagered numeric,
      total_won numeric,
      win_rate numeric
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      WITH user_stats AS (
        SELECT
          u.user_id as user_id,
          u.email as username,
          u.wallet_address,
          COUNT(b.*) as total_bets,
          COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END) as wins,
          COUNT(CASE WHEN b.status = 'completed' AND b.winner_id != u.user_id THEN 1 ELSE NULL END) as losses,
          COALESCE(SUM(b.amount), 0) as total_wagered,
          COALESCE(SUM(CASE WHEN b.winner_id = u.user_id THEN b.amount * 2 ELSE 0 END), 0) as total_won,
          CASE
            WHEN COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END) > 0 
            THEN COUNT(CASE WHEN b.winner_id = u.user_id THEN 1 ELSE NULL END)::numeric / 
                 COUNT(CASE WHEN b.status = 'completed' THEN 1 ELSE NULL END)::numeric
            ELSE 0
          END as win_rate
        FROM
          public.user_accounts u
        LEFT JOIN
          public.bets b ON (u.user_id = b.creator_id OR u.user_id = b.acceptor_id)
        WHERE
          u.user_id = get_user_betting_stats.user_id
        GROUP BY
          u.user_id, u.email, u.wallet_address
      )
      SELECT * FROM user_stats;
    END;
    $$;
  `);
}; 