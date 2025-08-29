import React, { useState } from 'react';
import { NBAMatchDetail, SandboxMetaverseMatchDetail } from '../../types/match';
import { useStraightBets } from '../../context/StraightBetsContext';
import { toast } from 'react-toastify';

interface MatchDetails {
  eventType: string;
  details: NBAMatchDetail | SandboxMetaverseMatchDetail;
}

interface ConfirmBetAcceptanceViewProps {
  betId: string;
  betAmount: number;
  creatorUsername: string;
  creatorsPickId: string;
  acceptorsPickId: string;
  matchDetails: MatchDetails | null;
  userFreePoints: number;
  onAcceptSuccess: () => void;
  onCancel: () => void;
}

const ConfirmBetAcceptanceView: React.FC<ConfirmBetAcceptanceViewProps> = ({
  betId,
  betAmount,
  creatorUsername,
  creatorsPickId,
  acceptorsPickId,
  matchDetails,
  userFreePoints,
  onAcceptSuccess,
  onCancel
}) => {
  const { acceptBet } = useStraightBets();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get team/player name from ID
  const getPickName = (pickId: string): string => {
    if (!pickId || !matchDetails) return pickId;
    
    if (matchDetails.eventType === 'sandbox_metaverse') {
      const details = matchDetails.details as SandboxMetaverseMatchDetail;
      if (pickId === details.player1Id) return details.player1Name;
      if (pickId === details.player2Id) return details.player2Name;
      return pickId;
    }
    
    if (matchDetails.eventType === 'basketball_nba') {
      const details = matchDetails.details as NBAMatchDetail;
      if (pickId === details.homeTeamId) return details.homeTeamName;
      if (pickId === details.awayTeamId) return details.awayTeamName;
    }
    
    return pickId;
  };

  const getMatchDisplayText = (): string => {
    if (!matchDetails) return 'Match details unavailable';
    
    if (matchDetails.eventType === 'basketball_nba') {
      const details = matchDetails.details as NBAMatchDetail;
      return `${details.homeTeamName} vs ${details.awayTeamName}`;
    } else if (matchDetails.eventType === 'sandbox_metaverse') {
      const details = matchDetails.details as SandboxMetaverseMatchDetail;
      return `${details.player1Name} vs ${details.player2Name}`;
    }
    
    return 'Unknown match type';
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    
    if (!acceptorsPickId) {
      setError('Unable to determine your pick automatically. Please try again.');
      setAccepting(false);
      return;
    }
    
    try {
      const success = await acceptBet(betId, acceptorsPickId);
      if (success) {
        toast.success('Bet accepted successfully!');
        onAcceptSuccess();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to accept bet');
    } finally {
      setAccepting(false);
    }
  };

  const freePointsAfterBet = userFreePoints - betAmount;
  const canAccept = userFreePoints >= betAmount;

  return (
    <div className="bg-console-gray-terminal border border-console-blue p-6 max-w-md w-full">
      <h2 className="text-lg font-display text-console-white mb-4">Confirm acceptance</h2>
      <p className="text-console-white-dim font-mono text-sm mb-6">
        Are you sure you want to accept this bet?
      </p>
      
      {/* Bet Details Section */}
      <div className="mb-6 p-4 bg-console-blue/10 border border-console-blue/30 rounded">
        <div className="space-y-3 text-console-white font-mono text-sm">
          <div>
            <span className="text-console-white-dim">Match:</span>{' '}
            {getMatchDisplayText()}
          </div>
          
          <div>
            <span className="text-console-white-dim">Creator:</span>{' '}
            <span className="text-console-white">{creatorUsername}</span>
          </div>
          
          <div>
            <span className="text-console-white-dim">Creator's Pick:</span>{' '}
            <span className="text-console-blue-bright font-bold">{getPickName(creatorsPickId)}</span>
          </div>
          
          <div>
            <span className="text-console-white-dim">Your Pick:</span>{' '}
            <span className="text-[#E5FF03] font-bold">{getPickName(acceptorsPickId)}</span>
          </div>
          
          <div className="text-xs text-console-white-dim italic">
            You will automatically pick the opposite team/player of what the creator picked.
          </div>
          
          <div>
            <span className="text-console-white-dim">Bet Amount:</span>{' '}
            <span className="text-[#E5FF03] font-bold">{betAmount} $DARE</span>
          </div>
          
          <div>
            <span className="text-console-white-dim">Current Free Points:</span>{' '}
            <span className="text-[#E5FF03]">{userFreePoints}</span>
          </div>
          
          <div>
            <span className="text-console-white-dim">Free Points After Bet:</span>{' '}
            <span className={freePointsAfterBet >= 0 ? "text-[#E5FF03]" : "text-red-400"}>
              {freePointsAfterBet}
            </span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="text-red-400 font-mono text-xs mb-4">{error}</div>
      )}
      
      {!canAccept && (
        <div className="text-red-400 font-mono text-xs mb-4">
          Insufficient free points to accept this bet.
        </div>
      )}
      
      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 bg-console-gray/20 text-console-white-dim font-mono rounded border border-console-blue/30 hover:bg-console-gray/40 transition-colors"
          onClick={onCancel}
          disabled={accepting}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-console-blue-bright text-console-black font-mono rounded shadow hover:bg-console-blue transition-colors font-bold disabled:opacity-50"
          onClick={handleAccept}
          disabled={accepting || !canAccept}
        >
          {accepting ? 'Accepting...' : 'Confirm Accept'}
        </button>
      </div>
    </div>
  );
};

export default ConfirmBetAcceptanceView; 