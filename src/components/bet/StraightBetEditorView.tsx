import React, { useState, useEffect } from 'react';
import { DollarSign, ChevronRight, X, Zap, Trophy, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../../types';
import { useStraightBets } from '../../context/StraightBetsContext';
import { useWeb3 } from '../../context/Web3Context';
import { usePoints } from '../../context/PointsContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { toast } from 'react-toastify';

/**
 * Props for the StraightBetEditorView component
 * Used for creating new straight bets on matches with $DARE points
 */
interface StraightBetEditorViewProps {
  match: Match;
  onClose: () => void;
}

/**
 * StraightBetEditorView - A modal form component for creating straight bets
 * 
 * This component allows authenticated users to:
 * - Select a team/player to bet on from a match
 * - Specify bet amount in $DARE points (free points only for now)
 * - Add optional trash talk description
 * - Submit the bet using the new points transaction system
 * 
 * The component integrates with:
 * - StraightBetsContext for bet creation
 * - PointsContext for balance checking
 * - AuthContext for authentication validation
 */
const StraightBetEditorView: React.FC<StraightBetEditorViewProps> = ({ match, onClose }) => {
  const navigate = useNavigate();
  const { createStraightBet, isCreatingBet } = useStraightBets();
  const { isConnected } = useWeb3();
  const { isAuthenticated, authMethod } = useAuth();
  const { freePointsBalance } = usePoints();

  console.log('=== BETTING FORM: Component rendered ===', {
    isAuthenticated,
    authMethod,
    isConnected,
    matchId: match?.id,
    freePointsBalance
  });
  
  // If not authenticated, redirect to login
  useEffect(() => {
    console.log('=== BETTING FORM: Authentication effect triggered ===', {
      isAuthenticated,
      authMethod
    });

    if (!isAuthenticated) {
      console.log('=== BETTING FORM: User not authenticated, redirecting to login ===');
      navigate('/login');
      onClose();
    }
  }, [isAuthenticated, navigate, onClose]);

  // If not authenticated, don't render the form
  if (!isAuthenticated) {
    console.log('=== BETTING FORM: Skipping render due to no authentication ===');
    return null;
  }
  
  const [selectedTeam, setSelectedTeam] = useState<string>(match.home_team.id);
  const [betAmount, setBetAmount] = useState<string>('100');
  const [description, setDescription] = useState<string>('');
  
  const getMainOdds = (match: Match) => {
    try {
      if (!match.bookmakers || match.bookmakers.length === 0) {
        return { home: null, away: null };
      }
      
      const mainBookmaker = match.bookmakers[0];
      const h2hMarket = mainBookmaker.markets.find(m => m.key === 'h2h');
      
      if (!h2hMarket) {
        return { home: null, away: null };
      }
      
      const homeOutcome = h2hMarket.outcomes.find(o => o.name === match.home_team.name);
      const awayOutcome = h2hMarket.outcomes.find(o => o.name === match.away_team.name);
      
      return {
        home: homeOutcome ? homeOutcome.price : null,
        away: awayOutcome ? awayOutcome.price : null
      };
    } catch (e) {
      console.error('Error getting odds:', e);
      return { home: null, away: null };
    }
  };
  
  const odds = getMainOdds(match);
  
  const handleCreateBet = async () => {
    console.log('=== BETTING FORM: handleCreateBet called ===', {
      isAuthenticated,
      selectedTeam,
      betAmount,
      freePointsBalance
    });

    if (!isAuthenticated) {
      console.log('=== BETTING FORM: Create bet failed - not authenticated ===');
      toast.error('Please sign in first to place bets');
      return;
    }
    
    if (!match || !selectedTeam || !betAmount) {
      console.log('=== BETTING FORM: Create bet failed - missing required fields ===', {
        hasMatch: !!match,
        hasSelectedTeam: !!selectedTeam,
        hasBetAmount: !!betAmount
      });
      toast.error('Please complete all required fields');
      return;
    }

    // Check if user has enough free $DARE points
    const betAmountNumber = parseInt(betAmount);
    if (isNaN(betAmountNumber) || betAmountNumber <= 0) {
      console.log('=== BETTING FORM: Create bet failed - invalid bet amount ===', {
        betAmount,
        betAmountNumber
      });
      toast.error('Please enter a valid bet amount');
      return;
    }
    
    if (betAmountNumber > freePointsBalance) {
      console.log('=== BETTING FORM: Create bet failed - insufficient balance ===', {
        betAmount: betAmountNumber,
        freePointsBalance
      });
      toast.error(`Insufficient free $DARE points. You have ${freePointsBalance} free points available.`);
      return;
    }
    
    try {
      console.log('=== BETTING FORM: Attempting to create straight bet ===', {
        matchId: match.id,
        selectedTeam,
        betAmountNumber,
        description
      });

      // Create the straight bet using the new StraightBetsContext
      // The context handles deducting points and showing success/error toasts
      const newBet = await createStraightBet(match.id, selectedTeam, betAmountNumber, description);
      
      console.log('=== BETTING FORM: Bet creation result ===', {
        success: !!newBet,
        newBet
      });

      if (newBet) {
        // Success! Navigate to dashboard
        navigate('/dashboard');
        onClose(); // Close the modal
      }
    } catch (error) {
      console.error('=== BETTING FORM: Error creating bet ===', error);
      // Error handling is done in the context, but we can log it here
    }
  };
  
  return (
    <div className="bg-console-gray-terminal/90 backdrop-blur-xs border-1 border-console-blue shadow-terminal flex flex-col h-full max-h-[90vh] md:max-h-[80vh]">
      {/* Form Header */}
      <div className="bg-[#E5FF03]/90 p-3 text-black flex items-center justify-between flex-shrink-0">
        <div className="font-mono tracking-wide flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          <span className="text-sm font-semibold">CREATE_NEW_BET</span>
          <span className="mx-2">|</span>
          <span className="text-xs opacity-80">{match.home_team.name} vs {match.away_team.name}</span>
        </div>
        <button 
          onClick={onClose} 
          className="text-black hover:text-gray-800 transition-colors"
          aria-label="Close betting form"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="p-6 bg-console-black/70 backdrop-blur-xs overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Auth Method Display */}
        {authMethod && (
          <div className="bg-console-blue/10 border border-console-blue px-3 py-2 text-center">
            <p className="text-xs text-console-white-dim font-mono">
              SIGNED IN VIA: <span className="text-console-blue-bright font-bold">{authMethod.toUpperCase()}</span>
            </p>
          </div>
        )}
        
        {/* Balance Display */}
        <div className="flex items-center justify-between bg-console-gray-terminal/40 p-3 border-1 border-[#E5FF03]">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-[#E5FF03] mr-2" />
            <span className="text-console-white font-mono text-sm">FREE POINTS:</span>
          </div>
          <div className="text-[#E5FF03] font-mono text-lg">{freePointsBalance} $DARE</div>
        </div>
        
        {/* Team/Player Selection */}
        <div>
          <label className="block text-console-white-dim font-mono text-sm mb-2">
            {match.sport_key === 'sandbox_metaverse' ? 'SELECT_PLAYER:' : 'SELECT_TEAM:'}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`border-1 p-4 flex flex-col items-center ${
                selectedTeam === match.home_team.id
                  ? 'bg-console-blue/20 border-console-blue-bright text-console-white'
                  : 'bg-console-black/50 border-console-blue text-console-white-dim hover:text-console-white hover:border-console-blue-dim'
              }`}
              onClick={() => setSelectedTeam(match.home_team.id)}
            >
              <span className="font-mono">{match.home_team.name}</span>
              {match.home_team.alias && (
                <span className="text-xs text-console-white-muted font-mono mt-1">{match.home_team.alias}</span>
              )}
              {odds.home && (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-sm">
                    <span className="text-console-blue-bright">{odds.home}</span>
                    <span className="text-console-white-muted ml-1">(ODDS)</span>
                  </div>
                </div>
              )}
            </button>
            
            <button
              type="button"
              className={`border-1 p-4 flex flex-col items-center ${
                selectedTeam === match.away_team.id
                  ? 'bg-console-blue/20 border-console-blue-bright text-console-white'
                  : 'bg-console-black/50 border-console-blue text-console-white-dim hover:text-console-white hover:border-console-blue-dim'
              }`}
              onClick={() => setSelectedTeam(match.away_team.id)}
            >
              <span className="font-mono">{match.away_team.name}</span>
              {match.away_team.alias && (
                <span className="text-xs text-console-white-muted font-mono mt-1">{match.away_team.alias}</span>
              )}
              {odds.away && (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-2 py-1 font-mono text-sm">
                    <span className="text-console-blue-bright">{odds.away}</span>
                    <span className="text-console-white-muted ml-1">(ODDS)</span>
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
        
        {/* $DARE Points Bet Amount */}
        <div>
          <label htmlFor="betAmount" className="block text-console-white-dim font-mono text-sm mb-2">
            BET_AMOUNT ($DARE POINTS):
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Trophy className="h-5 w-5 text-[#E5FF03]" />
            </div>
            <input
              type="number"
              id="betAmount"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              min="10"
              step="10"
              className="pl-10 block w-full bg-console-black/70 backdrop-blur-xs border-1 border-[#E5FF03] px-3 py-2 text-console-white font-mono focus:outline-none focus:border-[#E5FF03]"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs font-mono">
            <span className="text-console-white-dim">MIN: 10 $DARE</span>
            <span className={parseInt(betAmount) > freePointsBalance ? 'text-red-500' : 'text-[#E5FF03]'}>
              {parseInt(betAmount) > freePointsBalance ? 'INSUFFICIENT BALANCE' : 'AVAILABLE: ' + freePointsBalance + ' $DARE'}
            </span>
          </div>
        </div>
        
        {/* ETH Bet Amount (Disabled) */}
        <div>
          <label htmlFor="ethAmount" className="block text-console-white-dim font-mono text-sm mb-2 flex items-center">
            BET WITH CRYPTO:
            <span className="ml-2 bg-gray-800 text-yellow-400 text-xs px-2 py-0.5 rounded">COMING SOON</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="text"
              id="ethAmount"
              disabled
              placeholder="COMING SOON"
              className="pl-10 block w-full bg-console-black/40 backdrop-blur-xs border-1 border-gray-700 px-3 py-2 text-gray-500 font-mono cursor-not-allowed"
            />
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-console-white-dim font-mono text-sm mb-2">
            DESCRIPTION (OPTIONAL):
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="ADD_TRASH_TALK..."
            className="block w-full bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-3 py-2 text-console-white font-mono focus:outline-none focus:border-console-blue-bright"
          />
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="bg-console-gray-terminal/50 backdrop-blur-xs p-4 flex justify-between flex-shrink-0 border-t border-console-blue">
        <button
          onClick={onClose}
          className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-4 py-2 text-console-white-dim font-mono hover:text-console-white transition-colors"
        >
          CANCEL
        </button>
        
        <button
          onClick={handleCreateBet}
          disabled={!isAuthenticated || isCreatingBet || parseInt(betAmount) > freePointsBalance}
          className="bg-[#E5FF03]/90 backdrop-blur-xs border-1 border-[#E5FF03] px-4 py-2 text-black font-mono hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreatingBet ? (
            <>
              <LoadingSpinner size={4} />
              <span>PROCESSING...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>PLACE_BET WITH $DARE</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StraightBetEditorView; 