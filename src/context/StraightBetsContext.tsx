/*
 * StraightBetsContext - Focused context for straight bet operations
 * 
 * This context handles straight bet operations and user bet management.
 * It uses the database-backed straightBetsService for all operations.
 * 
 * Scope: 
 * - Creating new straight bets in the Matches tab
 * - Fetching and managing user's bet list
 * - Validation and error handling
 * - Integration with points system
 * 
 * Future expansions may include:
 * - Bet acceptance
 * - Bet settlement  
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import { usePoints } from './PointsContext';
import { 
  createStraightBetWithValidation, 
  StraightBet, 
  StraightBetStatus,
  getUserStraightBets,
  acceptStraightBet
} from '../services/straightBetsService';
import { getUserAccount } from '../services/supabaseService';
import { useWeb3 } from './Web3Context';
import { uploadBetMetadataAndGetUri } from '../services/betNftService';
import { mintReceiptNft } from '../services/coreNftService';

interface StraightBetsContextType {
  // Bet creation
  isCreatingBet: boolean;
  createStraightBet: (matchId: string, teamId: string, amount: number, description: string) => Promise<StraightBet | null>;
  
  // Bet acceptance
  acceptBet: (betId: string, acceptorsPickId: string, betType?: 'straight') => Promise<boolean>;
  
  // Bet cancellation
  isCancellingBet: boolean;
  
  // User bet list management
  userBets: StraightBet[];
  isLoadingUserBets: boolean;
  fetchUserBets: (status?: StraightBetStatus) => Promise<void>;
  refreshUserBets: () => Promise<void>;
}

const StraightBetsContext = createContext<StraightBetsContextType | undefined>(undefined);

export const StraightBetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, authMethod } = useAuth();
  const { userBalance } = usePoints();
  const { isConnected, account, provider, signer, chainId, redirectToMetamaskLogin } = useWeb3();
  
  // Bet creation state
  const [isCreatingBet, setIsCreatingBet] = useState(false);
  
  // Bet cancellation state
  const [isCancellingBet, setIsCancellingBet] = useState(false);
  
  // User bet list state
  const [userBets, setUserBets] = useState<StraightBet[]>([]);
  const [isLoadingUserBets, setIsLoadingUserBets] = useState(false);

  /**
   * Fetches user's straight bets from the database
   * 
   * @param status - Optional status filter
   */
  const fetchUserBets = async (status?: StraightBetStatus): Promise<void> => {
    console.log('=== FETCH USER BETS: Starting ===', {
      isAuthenticated,
      userId: user?.userId,
      status
    });

    if (!isAuthenticated || !user?.userId) {
      console.log('=== FETCH USER BETS: User not authenticated, skipping bet fetch ===');
      return;
    }

    setIsLoadingUserBets(true);

    try {
      console.log('=== FETCH USER BETS: Getting user account ===', {
        authUserId: user.userId
      });

      // Get the user account from the database
      const userAccount = await getUserAccount(user.userId);
      console.log('=== FETCH USER BETS: User account result ===', {
        userAccount: userAccount ? {
          id: userAccount.id,
          user_id: userAccount.user_id,
          email: userAccount.email,
          wallet_address: userAccount.wallet_address
        } : null
      });

      if (!userAccount || !userAccount.id) {
        console.error('=== FETCH USER BETS: User account not found ===');
        toast.error('User account not found. Please try signing in again.');
        return;
      }

      console.log('=== FETCH USER BETS: Calling getUserStraightBets ===', {
        userAccountId: userAccount.id,
        authUserId: user.userId,
        statusFilter: status,
        note: 'The issue might be here - we need to pass auth.users.id but are passing user_accounts.id'
      });

      // ISSUE IDENTIFIED: We should pass auth.users.id (user.userId) not user_accounts.id
      // But first let's try both and see what happens
      console.log('=== FETCH USER BETS: Trying with auth.users.id first ===');
      
      let bets = await getUserStraightBets(user.userId, status);
      console.log('=== FETCH USER BETS: Result with auth.users.id ===', {
        authUserId: user.userId,
        betCount: bets.length
      });

      // If no bets found with auth.users.id, try with user_accounts.id
      if (bets.length === 0) {
        console.log('=== FETCH USER BETS: No bets found with auth.users.id, trying user_accounts.id ===');
        bets = await getUserStraightBets(userAccount.id, status);
        console.log('=== FETCH USER BETS: Result with user_accounts.id ===', {
          userAccountId: userAccount.id,
          betCount: bets.length
        });
      }
      
      console.log('=== FETCH USER BETS: Final result ===', {
        betCount: bets.length,
        bets: bets.map(bet => ({
          id: bet.id,
          creatorUserId: bet.creatorUserId,
          amount: bet.amount,
          status: bet.status,
          createdAt: bet.createdAt
        }))
      });

      setUserBets(bets);

    } catch (error) {
      console.error('=== FETCH USER BETS: Error ===', error);
      toast.error('Failed to load your bets. Please try again.');
    } finally {
      setIsLoadingUserBets(false);
    }
  };

  /**
   * Refreshes the user's bet list
   */
  const refreshUserBets = async (): Promise<void> => {
    await fetchUserBets();
  };

  /**
   * Creates a new straight bet
   * 
   * @param matchId - ID of the match being bet on
   * @param teamId - ID of the team/pick being bet on
   * @param amount - Amount of points being wagered
   * @param description - Optional description/note for the bet
   * @returns Promise<StraightBet | null> - The created bet or null if failed
   */
  const createStraightBet = async (
    matchId: string, 
    teamId: string, 
    amount: number, 
    description: string
  ): Promise<StraightBet | null> => {
    console.log('=== STRAIGHT BETS CONTEXT: createStraightBet called ===', {
      isAuthenticated,
      userId: user?.userId,
      matchId,
      teamId,
      amount,
      description
    });

    if (!isAuthenticated || !user?.userId) {
      console.log('=== STRAIGHT BETS CONTEXT: Bet creation failed - not authenticated ===');
      toast.error('Please sign in to place bets');
      return null;
    }

    // If wallet isn't connected, prompt user to connect before proceeding (for minting)
    if (!isConnected || !provider || !signer || !account) {
      toast.info('Please connect your MetaMask wallet to mint the bet receipt on Core Testnet2.');
      await redirectToMetamaskLogin();
      if (!isConnected || !provider || !signer || !account) {
        toast.error('Wallet connection required to proceed.');
        return null;
      }
    }

    if (amount <= 0) {
      console.log('=== STRAIGHT BETS CONTEXT: Bet creation failed - invalid amount ===', { amount });
      toast.error('Please enter a valid bet amount');
      return null;
    }

    if (amount > userBalance) {
      console.log('=== STRAIGHT BETS CONTEXT: Bet creation failed - insufficient balance ===', {
        amount,
        userBalance
      });
      toast.error('Insufficient DARE points balance');
      return null;
    }

    setIsCreatingBet(true);

    try {
      console.log('=== STRAIGHT BETS CONTEXT: Getting user account ===', { authUserId: user.userId });

      // Get the user account from the database to get the correct user_accounts.id
      const userAccount = await getUserAccount(user.userId);
      if (!userAccount || !userAccount.id) {
        console.log('=== STRAIGHT BETS CONTEXT: User account not found ===');
        toast.error('User account not found. Please try signing in again.');
        return null;
      }

      console.log('=== STRAIGHT BETS CONTEXT: Found user account ===', {
        authUserId: user.userId,
        userAccountId: userAccount.id
      });

      // Note: Points will be deducted when the bet is created via the service

      console.log('=== STRAIGHT BETS CONTEXT: Creating bet ===');

      // Create the straight bet in the database using auth.users.id (not user_accounts.id)
      const createdBet = await createStraightBetWithValidation(
        user.userId, // Use auth.users.id (user.userId from AuthContext)
        matchId,
        teamId,
        amount,
        description || undefined,
        true // Enable validation
      );

      console.log('=== STRAIGHT BETS CONTEXT: Bet created successfully ===', createdBet);

      toast.success(`Bet placed successfully! Wagered ${amount} DARE points.`);

      // Mint on Core Testnet2 for lifecycle 'created' (creator pays)
      try {
        if (!isConnected || !provider || !signer || !account) {
          throw new Error('Core wallet not connected');
        }
        const metadataUri = await uploadBetMetadataAndGetUri({
          betId: createdBet.id,
          lifecycle: 'created',
          payload: {
            matchId,
            creatorsPickId: teamId,
            amount,
            creatorUserId: user.userId,
          },
        });
        await mintReceiptNft({
          provider,
          signer,
          destinationAddress: account,
          metadataUri,
        });
        toast.success('On-chain receipt minted (created)');
      } catch (e) {
        console.error('Mint failed (created lifecycle):', e);
        toast.warn('Bet created; on-chain receipt mint failed. You can retry later.');
      }
      
      // Refresh user bets to include the new bet
      await refreshUserBets();
      
      return createdBet;

    } catch (error) {
      console.error('=== STRAIGHT BETS CONTEXT: Error creating bet ===', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to place bet: ${error.message}`);
      } else {
        toast.error('Failed to place bet. Please try again.');
      }
      
      return null;
    } finally {
      setIsCreatingBet(false);
    }
  };

  /**
   * Accept a bet (generalized for all bet types)
   * 
   * This function provides a unified interface for accepting bets of any type.
   * It performs common validation (authentication, points balance) and then
   * delegates to the appropriate service based on the bet type.
   * 
   * The function is designed to be extensible - new bet types can be added
   * by extending the betType parameter and adding the corresponding service calls.
   * 
   * @param betId - The ID of the bet to accept
   * @param acceptorsPickId - The team/player ID the acceptor is betting on
   * @param betType - The type of bet (defaults to 'straight', extensible for future types)
   * @returns Promise<boolean> - True if accepted successfully, false otherwise
   */
  const acceptBet = async (betId: string, acceptorsPickId: string, betType: 'straight' = 'straight'): Promise<boolean> => {
    if (!isAuthenticated || !user?.userId) {
      toast.error('Please sign in to accept bets');
      return false;
    }

    try {
      // Verify user account exists in the database
      const userAccount = await getUserAccount(user.userId);
      if (!userAccount) {
        toast.error('User account not found. Please try signing in again.');
        return false;
      }

      // Call the appropriate service based on bet type
      // This pattern allows for easy extension to other bet types
      // Note: acceptStraightBet expects auth.users.id, not user_accounts.id
      if (betType === 'straight') {
        await acceptStraightBet(betId, user.userId, acceptorsPickId);
      } else {
        throw new Error(`Unsupported bet type: ${betType}`);
      }

      toast.success('Bet accepted successfully!');
      return true;
    } catch (error: any) {
      toast.error(error?.message || 'Failed to accept bet');
      return false;
    }
  };

  /**
   * Cancels a straight bet (only if it's still open and belongs to the user)
   * 
   * @param betId - ID of the bet to cancel
   * @returns Promise<boolean> - True if cancelled successfully, false otherwise
   */
  const cancelStraightBet = async (betId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.userId) {
      toast.error('Please sign in to cancel bets');
      return false;
    }

    setIsCancellingBet(true);

    try {
      console.log('=== STRAIGHT BETS CONTEXT: Cancelling bet ===', {
        authUserId: user.userId,
        betId
      });

      // Get the user account from the database
      const userAccount = await getUserAccount(user.userId);
      if (!userAccount || !userAccount.id) {
        toast.error('User account not found. Please try signing in again.');
        return false;
      }

      // Call the service function to cancel the bet in the database
      // const success = await cancelStraightBetService(betId, userAccount.id); // This line was removed
      
      // if (success) { // This line was removed
      //   // Refresh user bets to get the updated status from the database // This line was removed
      //   await refreshUserBets(); // This line was removed
      //   toast.success('Bet cancelled successfully'); // This line was removed
      //   return true; // This line was removed
      // } else { // This line was removed
      //   toast.error('Failed to cancel bet. Please try again.'); // This line was removed
      //   return false; // This line was removed
      // } // This line was removed

      // Since cancelStraightBetService is removed, this function will now always return false
      // or you would need to implement the cancellation logic directly here if it's still needed.
      // For now, we'll return false as a placeholder.
      toast.error('Bet cancellation functionality is currently disabled.');
      return false;

    } catch (error) {
      console.error('=== STRAIGHT BETS CONTEXT: Error cancelling bet ===', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to cancel bet: ${error.message}`);
      } else {
        toast.error('Failed to cancel bet. Please try again.');
      }
      return false;
    } finally {
      setIsCancellingBet(false);
    }
  };



  // Load user bets when component mounts and user is authenticated
  useEffect(() => {
    console.log('=== STRAIGHT BETS CONTEXT: useEffect triggered ===', {
      isAuthenticated,
      userId: user?.userId
    });

    if (isAuthenticated && user?.userId) {
      console.log('=== STRAIGHT BETS CONTEXT: User authenticated, fetching bets ===');
      fetchUserBets();
    } else {
      console.log('=== STRAIGHT BETS CONTEXT: User not authenticated, clearing bets ===');
      // Clear bets when user logs out
      setUserBets([]);
    }
  }, [isAuthenticated, user?.userId]);

  return (
    <StraightBetsContext.Provider value={{
      isCreatingBet,
      createStraightBet,
      acceptBet,
      isCancellingBet,
      userBets,
      isLoadingUserBets,
      fetchUserBets,
      refreshUserBets
    }}>
      {children}
    </StraightBetsContext.Provider>
  );
};

// Custom hook to use straight bets context
export const useStraightBets = (): StraightBetsContextType => {
  const context = useContext(StraightBetsContext);
  if (context === undefined) {
    throw new Error('useStraightBets must be used within a StraightBetsProvider');
  }
  return context;
}; 