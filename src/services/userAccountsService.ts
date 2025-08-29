/**
 * User Accounts Service
 * 
 * Handles user account and profile operations using the user_accounts table.
 * This service is focused on user_accounts table operations only.
 * 
 * For authentication operations, use authService.ts
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration (copied from deprecated supabaseService.ts)
const fixedSupabaseUrl = 'https://qiasnpjpkzhretlyymgh.supabase.co';
const fixedSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXNucGpwa3pocmV0bHl5bWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMzI5MDksImV4cCI6MjA2NDgwODkwOX0.BEOkmjVpGHo37omVsWEgvsCnXB0FIVqZQvDNCuy3qYo';

let supabaseUrl = '';
try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fixedSupabaseUrl;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('Invalid Supabase URL format:', supabaseUrl);
    supabaseUrl = fixedSupabaseUrl;
  }
} catch (error) {
  console.error('Error accessing Supabase URL:', error);
  supabaseUrl = fixedSupabaseUrl;
}

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fixedSupabaseAnonKey;

// Initialize the Supabase client
let supabase = createClient(fixedSupabaseUrl, fixedSupabaseAnonKey);
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('UserAccountsService: Supabase client initialized successfully');
  }
} catch (error) {
  console.error('UserAccountsService: Failed to initialize Supabase client:', error);
}

export { supabase };

/**
 * Interface for user account data
 * Maps to the user_accounts table structure
 */
export interface UserAccount {
  id?: string;
  user_id?: string;
  email?: string;
  wallet_address?: string;
  username?: string;
  image_url?: string;
  reserved_points?: number;
  free_points?: number;
  total_points?: number;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // Allow for additional fields
}

/**
 * Interface for account update operations
 */
export interface AccountUpdates {
  username?: string;
  image_url?: string;
  email?: string;
  wallet_address?: string;
  reserved_points?: number;
  free_points?: number;
  is_admin?: boolean;
}

/**
 * Create a new user account record
 * 
 * @param userId - The auth.users.id to link to
 * @param account - Partial account data to create
 * @returns Promise<UserAccount> - The created account
 * @throws Error if creation fails
 */
export const createUserAccount = async (userId: string, account: Partial<UserAccount>): Promise<UserAccount> => {
  console.log('UserAccountsService: Creating user account', { userId, account });
  
  try {
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
    
    if (error) {
      console.error('UserAccountsService: Error creating account:', error);
      throw error;
    }
    
    console.log('UserAccountsService: Account created successfully:', data);
    return data;
  } catch (err) {
    console.error('UserAccountsService: Exception creating account:', err);
    throw err;
  }
};

/**
 * Get user account by user ID
 * 
 * @param userId - The auth.users.id to look up
 * @returns Promise<UserAccount | null> - The user account or null if not found
 * @throws Error if query fails
 */
export const getUserAccount = async (userId: string): Promise<UserAccount | null> => {
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

/**
 * Update user account
 * 
 * @param userId - The auth.users.id of the account to update
 * @param updates - The fields to update
 * @returns Promise<UserAccount> - The updated account
 * @throws Error if update fails
 */
export const updateUserAccount = async (userId: string, updates: AccountUpdates): Promise<UserAccount> => {
  const { data, error } = await supabase
    .from('user_accounts')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Update account username with uniqueness validation
 * 
 * @param userId - The auth.users.id of the account to update
 * @param newUsername - The new username to set
 * @returns Promise<boolean> - true if successful, false if username is taken
 * @throws Error if operation fails for reasons other than uniqueness
 */
export const updateAccountUsername = async (userId: string, newUsername: string): Promise<boolean> => {
  try {
    await updateUserAccount(userId, { username: newUsername });
    return true;
  } catch (error: any) {
    // Check if error is due to username uniqueness constraint
    if (error.code === '23505' && error.message?.includes('username')) {
      return false; // Username is taken
    }
    throw error; // Re-throw other errors
  }
};

/**
 * Update account image URL
 * 
 * @param userId - The auth.users.id of the account to update
 * @param imageUrl - The new image URL to set
 * @returns Promise<UserAccount> - The updated account
 * @throws Error if update fails
 */
export const updateAccountImage = async (userId: string, imageUrl: string): Promise<UserAccount> => {
  return updateUserAccount(userId, { image_url: imageUrl });
};

/**
 * Link a wallet address to a user account
 * 
 * @param userId - The auth.users.id to link to
 * @param walletAddress - The wallet address to link
 * @returns Promise<UserAccount> - The updated account
 * @throws Error if update fails
 */
export const linkWalletToAccount = async (userId: string, walletAddress: string): Promise<UserAccount> => {
  return updateUserAccount(userId, { wallet_address: walletAddress });
};

/**
 * Create wallet account with signup bonus using database function
 * 
 * @param userId - The user ID (wallet address)
 * @param walletAddress - The wallet address
 * @returns Promise<any> - The result from the database function
 * @throws Error if operation fails
 */
export const insertRowsAfterSignupFromWallet = async (userId: string, walletAddress: string) => {
  try {
    const { data, error } = await supabase.rpc('insert_rows_after_signup_from_wallet', {
      wallet_user_id: userId,
      wallet_address: walletAddress
    });

    if (error) {
      console.error('UserAccountsService: Error inserting rows after wallet signup:', error);
      throw error;
    }

    if (data && !data.success) {
      console.error('UserAccountsService: Wallet signup row insertion failed:', data.error);
      throw new Error(data.error);
    }

    console.log('UserAccountsService: Rows inserted after wallet signup:', data);
    return data;
  } catch (error) {
    console.error('UserAccountsService: Exception in insertRowsAfterSignupFromWallet:', error);
    throw error;
  }
};

// ===== POINTS FUNCTIONS =====

/**
 * Get user's total points (free + reserved)
 * 
 * @param userId - The auth.users.id to get points for
 * @returns Promise<number> - The total points
 * @throws Error if query fails
 */
export const getPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return (account?.free_points || 0) + (account?.reserved_points || 0);
};

/**
 * Get user's free points
 * 
 * @param userId - The auth.users.id to get points for
 * @returns Promise<number> - The free points
 * @throws Error if query fails
 */
export const getFreePoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.free_points || 0;
};

/**
 * Get user's reserved points
 * 
 * @param userId - The auth.users.id to get points for
 * @returns Promise<number> - The reserved points
 * @throws Error if query fails
 */
export const getReservedPoints = async (userId: string): Promise<number> => {
  const account = await getUserAccount(userId);
  return account?.reserved_points || 0;
};

/**
 * Update user's free points (add/subtract)
 * 
 * @param userId - The auth.users.id to update points for
 * @param points - The points to add (positive) or subtract (negative)
 * @returns Promise<number> - The new free points balance
 * @throws Error if update fails
 */
export const updatePoints = async (userId: string, points: number): Promise<number> => {
  const account = await getUserAccount(userId);
  const currentPoints = account?.free_points || 0;
  const newPoints = currentPoints + points;
  
  await updateUserAccount(userId, { free_points: newPoints });
  return newPoints;
};

/**
 * Reserve points (move from free to reserved)
 * 
 * @param userId - The auth.users.id to reserve points for
 * @param amount - The amount to reserve
 * @returns Promise<boolean> - true if successful, false if insufficient free points
 * @throws Error if operation fails
 */
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

/**
 * Free points (move from reserved to free)
 * 
 * @param userId - The auth.users.id to free points for
 * @param amount - The amount to free
 * @returns Promise<boolean> - true if successful, false if insufficient reserved points
 * @throws Error if operation fails
 */
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