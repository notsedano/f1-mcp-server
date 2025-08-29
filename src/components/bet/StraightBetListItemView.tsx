import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { MatchWithDetails } from '../../types/match';
import { useAuth } from '../../context/AuthContext';
import { usePoints } from '../../context/PointsContext';
import Modal from '../common/Modal';
import ConfirmBetAcceptanceView from './ConfirmBetAcceptanceView';
import { useRelativeTime } from '../../utils/timeUtils';

interface StraightBetCardProps {
  bet: any; // Replace 'any' with the correct StraightBet type if available
  matchWithDetails: {
    id: string;
    eventType: string;
    details: any;
  } | null;
  status?: string;
  // Callback props for button actions
  onViewDetails?: (betId: string) => void;
  onShare?: (betId: string) => void;
  onAcceptSuccess?: () => void;
}

const SPORT_LABELS: Record<string, string> = {
  basketball_nba: 'NBA',
  sandbox_metaverse: 'Sandbox Metaverse',
  // Add more as needed
};

const StraightBetListItemView: React.FC<StraightBetCardProps> = ({ 
  bet, 
  matchWithDetails, 
  status, 
  onViewDetails,
  onShare,
  onAcceptSuccess: onAcceptSuccessCallback
}) => {
  const { user } = useAuth();
  const { userBalance, freePointsBalance } = usePoints();
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  
  // Use real-time relative timestamp
  const relativeTime = useRelativeTime(bet.createdAt);

  // Debug logging
  console.log('🎯 StraightBetCard render:', {
    betId: bet?.id,
    creatorUsername: bet?.creatorUsername,
    matchWithDetails: !!matchWithDetails,
    eventType: matchWithDetails?.eventType,
    detailsAvailable: !!matchWithDetails?.details
  });

  // Handle share button click
  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare(bet.id);
    }
  };

  // Determine if Accept button should be shown - use auth.users.id for comparison
  const isCreator = user && bet.creatorUserId === user.userId;
  const isOpen = bet.status === 'open';
  const canAccept = user && !isCreator && isOpen && freePointsBalance >= bet.amount;

  // Get display information for the match
  const getMatchDisplayInfo = () => {
    if (!matchWithDetails) {
      return { sport: 'No Match Data', teams: 'Match details unavailable' };
    }
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const { homeTeamName, awayTeamName } = matchWithDetails.details;
      return {
        sport: SPORT_LABELS[matchWithDetails.eventType] || matchWithDetails.eventType,
        teams: `${homeTeamName} vs ${awayTeamName}`
      };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const { player1Name, player2Name } = matchWithDetails.details;
      return {
        sport: SPORT_LABELS[matchWithDetails.eventType] || matchWithDetails.eventType,
        teams: `${player1Name} vs ${player2Name}`
      };
    }
    
    return { 
      sport: matchWithDetails.eventType || 'Unknown Event Type',
      teams: 'Match details unavailable'
    };
  };

  // Get pick names for display
  const getPickNames = () => {
    if (!matchWithDetails) return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const { homeTeamId, awayTeamId, homeTeamName, awayTeamName } = matchWithDetails.details;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === homeTeamId) {
        creatorPickName = homeTeamName;
        acceptorPickName = awayTeamName;
      } else if (creatorPick === awayTeamId) {
        creatorPickName = awayTeamName;
        acceptorPickName = homeTeamName;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const { player1Id, player2Id, player1Name, player2Name } = matchWithDetails.details;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === player1Id) {
        creatorPickName = player1Name;
        acceptorPickName = player2Name;
      } else if (creatorPick === player2Id) {
        creatorPickName = player2Name;
        acceptorPickName = player1Name;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    }
    
    return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
  };

  // Auto-determine the acceptor's pick based on match details
  const getAcceptorsPick = (): string => {
    if (!matchWithDetails) return '';
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const creatorPick = bet.creatorsPickId;
      const { homeTeamId, awayTeamId } = matchWithDetails.details;
      
      if (creatorPick === homeTeamId) {
        return awayTeamId;
      } else if (creatorPick === awayTeamId) {
        return homeTeamId;
      }
      return awayTeamId;
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const creatorPick = bet.creatorsPickId;
      const { player1Id, player2Id } = matchWithDetails.details;
      
      if (creatorPick === player1Id) {
        return player2Id;
      } else if (creatorPick === player2Id) {
        return player1Id;
      }
      return player2Id;
    }
    
    return '';
  };

  const handleAcceptSuccess = () => {
    setShowAcceptModal(false);
    if (onAcceptSuccessCallback) {
      onAcceptSuccessCallback();
    }
  };

  const matchInfo = getMatchDisplayInfo();
  const pickNames = getPickNames();

  return (
    <div 
      className="bg-console-gray-terminal/80 border border-console-blue shadow-terminal rounded-lg p-4 flex flex-col gap-2 relative hover:border-console-blue-bright hover:shadow-glow transition-all"
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono text-console-white-dim uppercase">
          {matchInfo.sport}
        </span>
        <span className="text-xs font-mono text-console-white-dim">{relativeTime}</span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-lg font-display text-console-white mb-1">Bet Amount: <span className="text-[#E5FF03]">{bet.amount}</span></div>
        </div>
      </div>
      <div className="text-sm font-mono text-console-white-dim">
        {matchInfo.teams}
      </div>
      <div className="text-sm font-mono text-console-white-dim">
        Created by: <span className="text-console-white">{bet.creatorUsername || 'Unknown'}</span>
      </div>
      {bet.creatorsNote && (
        <div className="text-xs font-mono text-console-white-dim mt-2 italic">"{bet.creatorsNote}"</div>
      )}
      {!matchWithDetails && (
        <div className="text-xs font-mono text-console-red-400 mt-2">Match details unavailable.</div>
      )}
      
      {/* Action buttons */}
      <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
        {/* View details button - always visible */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onViewDetails) {
              onViewDetails(bet.id);
            }
          }}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-console-gray-terminal/60 hover:bg-console-gray-terminal/80 text-console-white border border-console-blue/50 rounded text-xs font-mono transition-colors"
        >
          View Details
        </button>
        
        {/* Share button - always visible */}
        <button
          onClick={handleShareClick}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-console-blue/20 hover:bg-console-blue/30 text-console-blue-bright border border-console-blue/50 rounded text-xs font-mono transition-colors"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
        
        {/* Accept button - only if user can accept */}
        {canAccept && (
          <button
            className="px-4 py-2 bg-console-blue-bright text-console-black font-mono rounded shadow hover:bg-console-blue transition-colors text-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAcceptModal(true);
            }}
            disabled={freePointsBalance < bet.amount}
          >
            {freePointsBalance < bet.amount ? 'Insufficient Points' : 'Accept Bet'}
          </button>
        )}
      </div>
      {/* Accept Modal */}
      {showAcceptModal && (
        <Modal isOpen={showAcceptModal} onClose={() => setShowAcceptModal(false)}>
          <ConfirmBetAcceptanceView
            betId={bet.id}
            betAmount={bet.amount}
            creatorUsername={bet.creatorUsername || 'Unknown'}
            creatorsPickId={bet.creatorsPickId}
            acceptorsPickId={getAcceptorsPick()}
            matchDetails={matchWithDetails ? {
              eventType: matchWithDetails.eventType,
              details: matchWithDetails.details
            } : null}
            userFreePoints={freePointsBalance}
            onAcceptSuccess={handleAcceptSuccess}
            onCancel={() => setShowAcceptModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default StraightBetListItemView; 