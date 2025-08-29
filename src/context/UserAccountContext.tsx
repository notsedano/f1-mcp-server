/**
 * User Account Context
 * 
 * Handles user account and profile data including:
 * - Username and profile information
 * - Profile image management  
 * - Points balances (free, reserved, total)
 * - Account management functions
 * 
 * This context is separate from AuthContext and focuses on user_accounts table data.
 * Use AuthContext for authentication state and this context for profile data.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import {
  UserAccount,
  getUserAccount,
  updateAccountUsername,
  updateAccountImage,
  getFreePoints,
  getReservedPoints,
  getPoints
} from '../services/userAccountsService';

interface UserAccountContextType {
  // Account data
  account: UserAccount | null;
  username: string | null;
  imageUrl: string | null;
  
  // Points data
  freePoints: number;
  reservedPoints: number;
  totalPoints: number;
  
  // Loading states
  isLoading: boolean;
  isUpdatingUsername: boolean;
  isUpdatingImage: boolean;
  
  // Actions
  updateUsername: (newUsername: string) => Promise<boolean>;
  updateProfileImage: (imageUrl: string) => Promise<boolean>;
  refreshAccount: () => Promise<void>;
  
  // Utility
  getDisplayName: () => string;
}

const UserAccountContext = createContext<UserAccountContextType | undefined>(undefined);

export const UserAccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Account state
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Update states
  const [isUpdatingUsername, setIsUpdatingUsername] = useState<boolean>(false);
  const [isUpdatingImage, setIsUpdatingImage] = useState<boolean>(false);

  // Load account data when user changes
  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      loadAccount(user.userId);
    } else {
      // Clear account when no user
      setAccount(null);
    }
  }, [isAuthenticated, user?.userId]);

  /**
   * Load user account data from the database
   */
  const loadAccount = async (userId: string) => {
    setIsLoading(true);
    try {
      const accountData = await getUserAccount(userId);
      setAccount(accountData);
    } catch (error) {
      console.error('UserAccountContext: Error loading account:', error);
      toast.error('Failed to load account data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh account data
   */
  const refreshAccount = async (): Promise<void> => {
    if (user?.userId) {
      await loadAccount(user.userId);
    }
  };

  /**
   * Update username with uniqueness validation
   */
  const updateUsername = async (newUsername: string): Promise<boolean> => {
    if (!user?.userId) {
      toast.error('Please sign in to update username');
      return false;
    }

    if (!newUsername.trim()) {
      toast.error('Username cannot be empty');
      return false;
    }

    setIsUpdatingUsername(true);
    try {
      const success = await updateAccountUsername(user.userId, newUsername.trim());
      
      if (success) {
        // Update local state
        setAccount(prev => prev ? { ...prev, username: newUsername.trim() } : null);
        toast.success('Username updated successfully');
        return true;
      } else {
        toast.error('Username is already taken');
        return false;
      }
    } catch (error) {
      console.error('UserAccountContext: Error updating username:', error);
      toast.error('Failed to update username');
      return false;
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  /**
   * Update profile image URL
   */
  const updateProfileImage = async (imageUrl: string): Promise<boolean> => {
    if (!user?.userId) {
      toast.error('Please sign in to update profile image');
      return false;
    }

    setIsUpdatingImage(true);
    try {
      const updatedAccount = await updateAccountImage(user.userId, imageUrl);
      
      // Update local state
      setAccount(updatedAccount);
      toast.success('Profile image updated successfully');
      return true;
    } catch (error) {
      console.error('UserAccountContext: Error updating profile image:', error);
      toast.error('Failed to update profile image');
      return false;
    } finally {
      setIsUpdatingImage(false);
    }
  };

  /**
   * Get display name for the user
   * Priority: username > email > wallet address > 'User'
   */
  const getDisplayName = (): string => {
    if (account?.username) {
      return account.username;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    if (user?.walletAddress) {
      return `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
    }
    return 'User';
  };

  // Derive values from account state
  const username = account?.username || null;
  const imageUrl = account?.image_url || null;
  const freePoints = account?.free_points || 0;
  const reservedPoints = account?.reserved_points || 0;
  const totalPoints = account?.total_points || (freePoints + reservedPoints);

  return (
    <UserAccountContext.Provider value={{
      // Account data
      account,
      username,
      imageUrl,
      
      // Points data
      freePoints,
      reservedPoints,
      totalPoints,
      
      // Loading states
      isLoading,
      isUpdatingUsername,
      isUpdatingImage,
      
      // Actions
      updateUsername,
      updateProfileImage,
      refreshAccount,
      
      // Utility
      getDisplayName
    }}>
      {children}
    </UserAccountContext.Provider>
  );
};

/**
 * Custom hook to use UserAccount context
 */
export const useUserAccount = (): UserAccountContextType => {
  const context = useContext(UserAccountContext);
  if (context === undefined) {
    throw new Error('useUserAccount must be used within a UserAccountProvider');
  }
  return context;
}; 