/**
 * Authentication Service
 * 
 * Handles authentication operations using Supabase Auth with integrated points management.
 * This service now includes atomic account creation with signup bonuses and daily login tracking.
 */

import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { pointModifiableActionConfigurationsService } from './pointModifiableActionConfigurationsService';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client with connection pooling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for environment variables
console.log('🔍 AuthService Environment Variables:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? (supabaseUrl.substring(0, 20) + '...') : 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? (supabaseAnonKey.substring(0, 20) + '...') : 'NOT SET');
console.log('URL valid format:', !!(supabaseUrl && supabaseUrl.startsWith('https://')));
console.log('Key valid length:', !!(supabaseAnonKey && supabaseAnonKey.length > 10));

const supabase = createClient(
  supabaseUrl!,
  supabaseAnonKey!,
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-app-name': 'agentdd-auth' },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export { supabase };

export interface SignUpRequest {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
}

export interface AuthResponse {
  user: User;
  session: any;
}

class AuthService {
  /**
   * Sign up a new user with atomic account creation and signup bonus
   * This function:
   * 1. Creates auth user
   * 2. Creates user account with signup bonus
   * 3. Records signup bonus transaction
   * All in a single atomic operation
   */
  async signUp(userData: SignUpRequest): Promise<AuthResponse> {
    try {
      console.log('🚀 AuthService.signUp starting with:', { email: userData.email, hasPassword: !!userData.password });
      
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      console.log('📧 Supabase auth.signUp result:', { 
        user: authData.user ? { id: authData.user.id, email: authData.user.email } : null,
        session: !!authData.session,
        error: authError ? { message: authError.message, status: authError.status } : null
      });

      if (authError) {
        console.error('❌ Auth signup error:', authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!authData.user) {
        console.error('❌ No user returned from Supabase signup');
        throw new Error('User creation failed - no user returned');
      }

      // Create user account with signup bonus atomically
      await this.createUserAccountWithSignupBonus(
        authData.user.id,
        userData.email,
        userData.username,
        userData.display_name
      );

      return {
        user: authData.user,
        session: authData.session
      };
    } catch (error) {
      console.error('AuthService: Signup error:', error);
      throw error;
    }
  }

  /**
   * Sign in an existing user and update login tracking
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Update login tracking and award daily bonus if eligible
      if (data.user) {
        await this.updateLoginTracking(data.user.id);
      }

      return {
        user: data.user!,
        session: data.session
      };
    } catch (error) {
      console.error('AuthService: Sign in error:', error);
      throw error;
    }
  }

  /**
   * Award daily login bonus if user hasn't logged in today
   */
  async updateLoginTracking(user_id: string): Promise<boolean> {
    try {
      const { data: awardedBonus, error } = await supabase.rpc('update_user_login', {
        target_user_id: user_id
      });

      if (error) {
        console.error('Failed to update login tracking:', error);
        return false;
      }

      if (awardedBonus) {
        console.log('Daily login bonus awarded to user:', user_id);
      }

      return awardedBonus || false;
    } catch (error) {
      console.error('Error updating login tracking:', error);
      return false;
    }
  }

  /**
   * Award referral bonus (placeholder for future referral system)
   */
  async awardReferralBonus(referrer_user_id: string, referred_user_id: string): Promise<void> {
    const common_event_id = uuidv4();
    
    try {
      // Get referral bonus amount
      const bonusAmount = await pointModifiableActionConfigurationsService
        .getCurrentValueForPointModifiableAction('REFERRED_NEW_USER');

      // Get referrer account
      const { data: referrer, error: referrerError } = await supabase
        .from('user_accounts')
        .select('free_points, reserved_points')
        .eq('user_id', referrer_user_id)
        .single();

      if (referrerError || !referrer) {
        throw new Error('Referrer account not found');
      }

      // Record referral bonus transaction
      await supabase.from('point_transactions').insert({
        affected_user_id: referrer_user_id,
        transaction_key: 'RECEIVED_BONUS_FOR_REFERRING_NEW_USER',
        affected_balance: 'FREE',
        amount: bonusAmount,
        common_event_id,
        details: { referred_user_id }
      });

      // Update referrer's points
      await supabase.rpc('set_user_points', {
        target_user_id: referrer_user_id,
        new_free_points: referrer.free_points + bonusAmount,
        new_reserved_points: referrer.reserved_points
      });

      console.log(`Awarded referral bonus of ${bonusAmount} to user ${referrer_user_id}`);
    } catch (error) {
      console.error('Error awarding referral bonus:', error);
      throw error;
    }
  }

  /**
   * Create user account with signup bonus atomically
   */
  private async createUserAccountWithSignupBonus(
    user_id: string,
    email: string,
    username?: string,
    display_name?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('create_user_account_with_signup_bonus', {
        p_user_id: user_id,
        p_email: email,
        p_username: username || null,
        p_display_name: display_name || null
      });

      if (error) {
        throw new Error(`Failed to create user account: ${error.message}`);
      }

      console.log('User account created with signup bonus for user:', user_id);
    } catch (error) {
      console.error('Error creating user account with signup bonus:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  /**
   * Get the current session
   */
  async getCurrentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  /**
   * Helper function to check if Supabase is properly configured
   */
  isSupabaseConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !!(url && url.startsWith('https://') && key && key.length > 10);
  }
}

// Export singleton instance
export const authService = new AuthService();

// Legacy exports for backward compatibility
export const signUpWithEmail = async (email: string, password: string) => {
  return await authService.signUp({ email, password });
};

export const signInWithEmail = async (email: string, password: string) => {
  return await authService.signIn(email, password);
};

export const signOut = authService.signOut.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const getCurrentSession = authService.getCurrentSession.bind(authService);
export const isSupabaseConfigured = authService.isSupabaseConfigured.bind(authService); 