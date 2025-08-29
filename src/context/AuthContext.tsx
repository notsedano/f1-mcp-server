import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWeb3 } from './Web3Context';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOut, 
  getCurrentUser, 
  getCurrentSession,
  isSupabaseConfigured
} from '../services/authService';
import { 
  getUserAccount,
  createUserAccount,
  insertRowsAfterSignupFromWallet,
  linkWalletToAccount
} from '../services/userAccountsService';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  accountId: string;  // This is user_accounts.id
  userId: string;  // This is auth.users.id
  email?: string;
  walletAddress?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  authMethod: 'email' | 'wallet' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseAvailable: boolean;
  isAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMethod, setAuthMethod] = useState<'email' | 'wallet' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check Supabase configuration on load
  useEffect(() => {
    setIsSupabaseAvailable(isSupabaseConfigured());
  }, []);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (isSupabaseAvailable) {
          // Try to get the current Supabase session
          const session = await getCurrentSession();
          
          if (session) {
            // User is logged in via Supabase
            const supabaseUser = await getCurrentUser();
            if (supabaseUser) {
              const account = await getUserAccount(supabaseUser.id);
              
              if (account && account.id) {
                setUser({
                  accountId: account.id,  // Use user_accounts.id
                  userId: supabaseUser.id,  // Store auth.users.id separately
                  email: supabaseUser.email || undefined,
                  walletAddress: account.wallet_address,
                  isAdmin: false  // is_admin field was removed, default to false
                });
                
                // Update admin status - always false since we removed admin functionality
                setIsAdmin(false);
                setAuthMethod('email');
              }
            }
          } else if (isConnected && account) {
            // User is connected via wallet
            setUser({
              accountId: account,
              userId: account, // For wallet users, the wallet address is both the id and authId
              walletAddress: account
            });
            setAuthMethod('wallet');
          }
        } else {
          // Fallback to localStorage if Supabase is not configured
          const savedUser = localStorage.getItem('user');
          const savedAuthMethod = localStorage.getItem('authMethod');
          
          if (savedUser && savedAuthMethod === 'email') {
            setUser(JSON.parse(savedUser));
            setAuthMethod('email');
          } else if (isConnected && account) {
            // User is connected via wallet
            setUser({
              accountId: account,
              userId: account, // For wallet users, the wallet address is both the id and authId
              walletAddress: account
            });
            setAuthMethod('wallet');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [isConnected, account, isSupabaseAvailable]);

  // Update user when wallet connection changes
  useEffect(() => {
    const handleWalletConnectionChange = async () => {
      if (isConnected && account) {
        // User connected their wallet
        if (authMethod === 'wallet' || authMethod === null) {
          // Check if this is a first-time wallet user and insert rows if needed
          if (isSupabaseAvailable) {
            try {
              const existingAccount = await getUserAccount(account);
              
              if (!existingAccount) {
                // First time wallet user - insert rows after signup
                console.log('First-time wallet user detected, inserting rows after signup:', account);
                
                try {
                  const result = await insertRowsAfterSignupFromWallet(account, account);
                  if (result.success) {
                    console.log('Rows inserted after wallet signup, bonus awarded:', result.signup_bonus_awarded, 'points');
                  }
                } catch (accountError) {
                  console.error('Error inserting rows after wallet signup:', accountError);
                  // Continue with login even if account creation fails
                }
              }
            } catch (error) {
              console.error('Error checking for existing wallet account:', error);
              // Continue with login even if database check fails
            }
          }
          
          // Set or update the user with wallet info
          setUser({
            accountId: account,
            userId: account, // For wallet users, the wallet address is both the id and authId
            walletAddress: account
          });
          setAuthMethod('wallet');
        } else if (authMethod === 'email' && user) {
          // User already logged in with email, update their wallet address
          // Link wallet to the existing Supabase user and preserve auth.users.id
          setUser({
            ...user,
            walletAddress: account,
            userId: user.userId
          });
        }
      } else if (authMethod === 'wallet' && !isConnected) {
        // Wallet disconnected
        setUser(null);
        setAuthMethod(null);
      }
    };
    
    handleWalletConnectionChange();
  }, [isConnected, account, authMethod, isSupabaseAvailable]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication
        const { user: supabaseUser } = await signInWithEmail(email, password);
        if (supabaseUser) {
          const account = await getUserAccount(supabaseUser.id);
          
          if (account && account.id) {
            setUser({
              accountId: account.id,  // Use user_accounts.id
              userId: supabaseUser.id,  // Store auth.users.id separately
              email: supabaseUser.email || undefined,
              walletAddress: account.wallet_address,
              isAdmin: false  // is_admin field was removed, default to false
            });
            
            // Update admin status - always false since we removed admin functionality
            setIsAdmin(false);
            setAuthMethod('email');
          }
        }
      } else {
        // Fallback to mock authentication
        const mockUser = {
          accountId: `user_${Date.now()}`,
          userId: `user_${Date.now()}`, // For mock users, use the same generated ID
          email: email
        };
        
        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('authMethod', 'email');
        
        setUser(mockUser);
        setAuthMethod('email');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const registerWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      if (isSupabaseAvailable) {
        // Use Supabase authentication - database trigger inserts rows after signup
        const { user: supabaseUser } = await signUpWithEmail(email, password);
        if (supabaseUser) {
          setUser({
            accountId: supabaseUser.id,
            userId: supabaseUser.id,
            email: supabaseUser.email
          });
          setAuthMethod('email');
        }
      } else {
        throw new Error('Database connection required for user registration');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithWallet = async () => {
    try {
      setIsLoading(true);
      await connectWallet();
      
      if (account) {
        if (isSupabaseAvailable && authMethod === 'email' && user) {
          // If user is already logged in via email, link the wallet to their Supabase auth.user.id
          await linkWalletToAccount(user.userId, account);
          
          // Update the user state
          // Preserve Supabase auth.users.id and only attach the walletAddress
          setUser({
            ...user,
            walletAddress: account,
            userId: user.userId
          });
        } else {
          // Check if this wallet user exists in the database
          if (isSupabaseAvailable) {
            try {
              // Look for existing account with this wallet address
              const existingAccount = await getUserAccount(account);
              
              if (!existingAccount) {
                // First time wallet user - insert rows after signup
                console.log('First-time wallet user detected, inserting rows after signup:', account);
                
                try {
                  const result = await insertRowsAfterSignupFromWallet(account, account);
                  if (result.success) {
                    console.log('Rows inserted after wallet signup, bonus awarded:', result.signup_bonus_awarded, 'points');
                  }
                } catch (accountError) {
                  console.error('Error inserting rows after wallet signup:', accountError);
                  // Continue with login even if account creation fails
                }
              }
            } catch (error) {
              console.error('Error checking for existing wallet account:', error);
              // Continue with login even if database check fails
            }
          }
          
          // Set user state
          setUser({
            accountId: account,
            userId: account, // For wallet users, the wallet address is both the id and authId
            walletAddress: account
          });
          setAuthMethod('wallet');
        }
      }
    } catch (error) {
      console.error('Wallet login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (authMethod === 'wallet') {
        disconnectWallet();
      }
      
      if (isSupabaseAvailable && authMethod === 'email') {
        await signOut();
      }
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authMethod');
      
      setUser(null);
      setAuthMethod(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authMethod,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseAvailable,
        isAdmin,
        loginWithEmail,
        registerWithEmail,
        loginWithWallet,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 