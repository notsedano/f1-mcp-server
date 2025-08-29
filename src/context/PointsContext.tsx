/**
 * @deprecated This context is scheduled for deprecation and should no longer be used in new code.
 * It will be replaced by UserAccountContext in a future update.
 * Do not add new functionality to this file.
 * 
 * Existing usage should be gradually migrated to the new UserAccountContext when available.
 */

/*
 * Points Context - Manages user points balance and transactions
 *
 * This context handles:
 * - User DARE points balance management
 * - Points transaction history
 * - Points-related operations (add, deduct, etc.)
 * - Integration with Supabase for persistent storage
 * - Mock data fallback for development
 *
 * The context automatically loads user points when a user is authenticated
 * and keeps the balance in sync with the database.
 *
 * Integration with other systems:
 * - Auth: Uses user authentication state to determine when to load points
 * - Database: Directly interacts with Supabase for points operations
 * - Contexts: StraightBetsContext (current betting system)
 *
 * Usage:
 * ```tsx
 * const { userBalance, transactions, addPoints, deductPoints } = usePoints();
 * ```
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import {
  Transaction,
  DEFAULT_POINTS,
  getTotalUserPoints,
  getUserFreePoints,
  getUserReservedPoints,
  reservePoints,
  freePoints,
  recordTransaction,
  getUserTransactions,
  deductBetPoints,
  addBetWinPoints,
  awardPoints
} from '../deprecated/services/pointsService';

// Define the context type
interface PointsContextType {
  userBalance: number;
  freePointsBalance: number;
  reservedPointsBalance: number;
  loadingBalance: boolean;
  transactions: Transaction[];
  escrowedPoints: number;
  addPoints: (amount: number, type: 'BET_WON' | 'REWARD', description: string, betId?: string) => Promise<boolean>;
  getTransactionHistory: () => Transaction[];
  exportTransactions: () => string; // Export transactions as JSON string
}

// Create the context
const PointsContext = createContext<PointsContextType | undefined>(undefined);

// Provider component
export const PointsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userBalance, setUserBalance] = useState<number>(0);
  const [freePointsBalance, setFreePointsBalance] = useState<number>(0);
  const [reservedPointsBalance, setReservedPointsBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [escrowedPoints] = useState<number>(0); // Kept for type compatibility but not used

  // Load user balance and transactions when user changes
  useEffect(() => {
    if (user?.userId) {
      loadUserData(user.userId);
    } else {
      // Reset state when no account is connected
      setUserBalance(0);
      setFreePointsBalance(0);
      setReservedPointsBalance(0);
      setTransactions([]);
      setLoadingBalance(false);
    }
  }, [user]);

  // Set up a real-time polling for balance updates
  useEffect(() => {
    if (!user?.userId) return;

    // Update the balance every 10 seconds to ensure it's current
    const intervalId = setInterval(() => {
      refreshUserBalance(user.userId);
    }, 10000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [user?.userId]);

  // Load user data
  const loadUserData = async (userId: string) => {
    setLoadingBalance(true);
    try {
      // Get user balance from service
      const totalBalance = await getTotalUserPoints(userId);
      const freePoints = await getUserFreePoints(userId);
      const reservedPoints = await getUserReservedPoints(userId);
      
      setUserBalance(totalBalance);
      setFreePointsBalance(freePoints);
      setReservedPointsBalance(reservedPoints);
      
      // Get transaction history
      const userTransactions = await getUserTransactions(userId);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Refresh just the user balance
  const refreshUserBalance = async (userId: string) => {
    try {
      const totalBalance = await getTotalUserPoints(userId);
      const freePoints = await getUserFreePoints(userId);
      const reservedPoints = await getUserReservedPoints(userId);
      
      setUserBalance(totalBalance);
      setFreePointsBalance(freePoints);
      setReservedPointsBalance(reservedPoints);
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };



  // Add points (from winning bet or reward)
  const addPoints = async (
    amount: number,
    type: 'BET_WON' | 'REWARD',
    description: string,
    betId?: string
  ): Promise<boolean> => {
    if (!user?.userId) {
      toast.error('Please sign in to receive points');
      return false;
    }

    try {
      let success;
      if (type === 'BET_WON') {
        success = await addBetWinPoints(user.userId, amount, betId!);
      } else {
        success = await awardPoints(user.userId, amount, description);
      }
      
      if (success) {
        // Update local state
        setUserBalance(prev => prev + amount);
        setFreePointsBalance(prev => prev + amount);
        
        // Add to transaction history
        const newTransaction: Transaction = {
          id: `${Date.now()}`,
          userId: user.userId,
          amount: amount,
          type,
          description,
          betId,
          timestamp: Date.now()
        };
        setTransactions(prev => [newTransaction, ...prev]);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding points:', error);
      toast.error('Failed to add points');
      return false;
    }
  };

  const getTransactionHistory = (): Transaction[] => {
    return transactions;
  };

  const exportTransactions = (): string => {
    return JSON.stringify(transactions, null, 2);
  };



  return (
    <PointsContext.Provider value={{
      userBalance,
      freePointsBalance,
      reservedPointsBalance,
      loadingBalance,
      transactions,
      escrowedPoints,
      addPoints,
      getTransactionHistory,
      exportTransactions
    }}>
      {children}
    </PointsContext.Provider>
  );
};

// Custom hook to use points context
export const usePoints = (): PointsContextType => {
  const context = useContext(PointsContext);
  if (context === undefined) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
}; 