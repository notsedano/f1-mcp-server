/*
 * DEPRECATED: This component uses legacy betting components and will be replaced.
 * The legacy BetShareModal has been commented out.
 * This component will be updated or removed in a future version.
 */

import React, { useState, useEffect } from 'react';
import { Clock, User, Trophy, Share2, TrendingUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { StraightBet, StraightBetStatus } from '../../services/straightBetsService';
// import BetShareModal from './BetShareModal'; // REMOVED: Legacy component
import { MatchWithDetails } from '../../types/match';

interface UserBetCardProps {
  bet: StraightBet;
  onViewDetails?: (bet: StraightBet) => void;
}

const UserBetCard: React.FC<UserBetCardProps> = ({ bet, onViewDetails }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusDisplay = (status: StraightBetStatus) => {
    switch (status) {
      case StraightBetStatus.OPEN:
        return {
          label: 'OPEN',
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/30'
        };
      case StraightBetStatus.WAITING_RESULT:
        return {
          label: 'WAITING RESULT',
          icon: Clock, // Changed from Timer to Clock for consistency
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/30'
        };
      case StraightBetStatus.COMPLETED:
        return {
          label: 'COMPLETED',
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/30'
        };
      case StraightBetStatus.CANCELLED:
        return {
          label: 'CANCELLED',
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30'
        };
      default:
        return {
          label: String(status).toUpperCase(),
          icon: Clock,
          color: 'text-console-white-dim',
          bgColor: 'bg-console-gray/10',
          borderColor: 'border-console-gray/30'
        };
    }
  };

  const statusInfo = getStatusDisplay(bet.status);
  const StatusIcon = statusInfo.icon;

  const isUserCreator = true; // For now, since we're showing user's bets
  const userRole = isUserCreator ? 'Creator' : 'Acceptor';

  // Adapt bet object for BetShareModal if needed
  const betForModal = {
    ...bet,
    id: bet.id,
    matchId: bet.matchId,
    creator: bet.creatorUserId || bet.creator || '',
    teamId: bet.creatorsPickId || bet.teamId || '',
    amount: bet.amount,
    description: bet.creatorsNote || bet.description || '',
  };

  return (
    <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 hover:shadow-glow transition-all">
      {/* Header with status and amount */}
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 px-2 py-1 rounded ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
          <span className={`text-xs font-mono ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-console-white font-mono text-lg">
            {bet.amount} <span className="text-[#E5FF03] text-sm">$DARE</span>
          </div>
          <div className="text-console-white-dim text-xs font-mono">
            {userRole}
          </div>
        </div>
      </div>

      {/* Bet details */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-console-white-dim text-sm font-mono">Match ID:</span>
          <span className="text-console-white text-sm font-mono truncate ml-2 max-w-[200px]">
            {bet.matchId}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-console-white-dim text-sm font-mono">Pick:</span>
          <span className="text-console-white text-sm font-mono truncate ml-2 max-w-[200px]">
            {bet.creatorsPickId}
          </span>
        </div>
        {bet.creatorsNote && (
          <div className="flex items-start justify-between">
            <span className="text-console-white-dim text-sm font-mono shrink-0">Note:</span>
            <span className="text-console-white text-sm font-mono text-right ml-2 break-words">
              {bet.creatorsNote}
            </span>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="border-t border-console-blue/20 pt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-console-white-dim font-mono">Created:</span>
          <span className="text-console-white-dim font-mono">
            {formatDate(bet.createdAt)}
          </span>
        </div>
        {bet.acceptedAt && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-console-white-dim font-mono">Accepted:</span>
            <span className="text-console-white-dim font-mono">
              {formatDate(bet.acceptedAt)}
            </span>
          </div>
        )}
        {bet.completedAt && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-console-white-dim font-mono">Completed:</span>
            <span className="text-console-white-dim font-mono">
              {formatDate(bet.completedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Acceptor info if bet is accepted */}
      {bet.acceptorUserId && (
        <div className="border-t border-console-blue/20 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-console-white-dim font-mono">Opponent Pick:</span>
            <span className="text-console-white font-mono">
              {bet.acceptorsPickId || 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Winner info if completed */}
      {bet.status === StraightBetStatus.COMPLETED && bet.winnerUserId && (
        <div className="border-t border-console-blue/20 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-console-white-dim font-mono">Winner:</span>
            <span className={`font-mono ${bet.winnerUserId === bet.creatorUserId ? 'text-green-400' : 'text-red-400'}`}>
              {bet.winnerUserId === bet.creatorUserId ? 'You Won!' : 'You Lost'}
            </span>
          </div>
        </div>
      )}

      {/* Action button */}
      {onViewDetails && (
        <div className="border-t border-console-blue/20 pt-3 mt-3">
          <button
            onClick={() => onViewDetails(bet)}
            className="w-full bg-console-blue/20 hover:bg-console-blue/30 text-console-white font-mono text-sm py-2 px-4 border border-console-blue/50 hover:border-console-blue transition-colors"
          >
            VIEW DETAILS
          </button>
        </div>
      )}

      {/* Share button */}
      <div className="pt-3 mt-3 flex justify-end">
        <button
          onClick={() => setShowShareModal(true)}
          className="px-3 py-1 bg-console-blue-bright text-console-black font-mono rounded shadow hover:bg-console-blue transition-colors text-xs"
        >
          Share
        </button>
      </div>
      {showShareModal && (
        // <BetShareModal bet={betForModal} onClose={() => setShowShareModal(false)} /> // REMOVED: Legacy component
        <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 rounded-lg">
          <h3 className="text-console-white font-mono text-lg mb-3">Share Bet</h3>
          <p className="text-console-white-dim text-sm mb-3">
            This feature is currently unavailable. The legacy BetShareModal has been removed.
          </p>
          <button
            onClick={() => setShowShareModal(false)}
            className="w-full bg-console-blue/20 hover:bg-console-blue/30 text-console-white font-mono text-sm py-2 px-4 border border-console-blue/50 hover:border-console-blue transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default UserBetCard; 