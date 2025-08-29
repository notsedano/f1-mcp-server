import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Clock, CheckCircle, XCircle, Timer, Trophy, Calendar, Users, MessageSquare, AlertTriangle } from 'lucide-react';
import { StraightBet, StraightBetStatus, getUserStraightBets, getOpenStraightBets } from '../services/straightBetsService';
import { useMatches } from '../context/MatchesContext';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointsContext';
import { NBAMatchDetail, SandboxMetaverseMatchDetail } from '../types/match';
import { useRelativeTime } from '../utils/timeUtils';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import ConfirmBetAcceptanceView from '../components/bet/ConfirmBetAcceptanceView';
import { toast } from 'react-toastify';

const BetDetailView: React.FC = () => {
  const { betId } = useParams<{ betId: string }>();
  const navigate = useNavigate();
  const { getMatchByIdWithDetails } = useMatches();
  const { user } = useAuth();
  const { userBalance, freePointsBalance } = usePoints();
  const [bet, setBet] = useState<StraightBet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  
  // Use real-time relative timestamp - always call hook with fallback
  const relativeTime = useRelativeTime(bet?.createdAt || new Date().toISOString());
  
  // Only show relative time if bet exists
  const displayRelativeTime = bet ? relativeTime : '';
  
  useEffect(() => {
    if (!betId) {
      setError('Invalid bet ID');
      setLoading(false);
      return;
    }
    
    const fetchBet = async () => {
      try {
        setLoading(true);
        // Fetch bet directly by ID from open bets first, then try all bets
        let foundBet = null;
        
        try {
          const openBets = await getOpenStraightBets(1000);
          foundBet = openBets.find((b: any) => b.id === betId);
        } catch (err) {
          console.log('Could not fetch from open bets, trying user bets if authenticated');
        }
        
        if (!foundBet) {
          setError('Bet not found');
          return;
        }
        
        setBet(foundBet);
      } catch (err) {
        console.error('Error fetching bet:', err);
        setError('Failed to load bet details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBet();
  }, [betId, user?.userId]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-console-black flex items-center justify-center">
        <LoadingSpinner size={8} color="text-console-blue-bright" />
      </div>
    );
  }
  
  if (error || !bet) {
    return (
      <div className="min-h-screen bg-console-black flex flex-col items-center justify-center px-4">
        <AlertTriangle className="h-16 w-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-display text-console-white mb-2">Error Loading Bet</h1>
        <p className="text-console-white-dim font-mono text-center mb-6">{error || 'Bet not found'}</p>
        <button
          onClick={() => navigate('/bets')}
          className="bg-console-blue hover:bg-console-blue-bright text-console-white px-6 py-3 rounded font-mono transition-colors"
        >
          Back to Bets
        </button>
      </div>
    );
  }
  
  const matchWithDetails = getMatchByIdWithDetails(bet.matchId);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format match start time with timezone info
  const formatMatchStartTime = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format in original timezone (stored as UTC, show as UTC)
    const utcTime = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
    
    // Format in user's local timezone
    const localTime = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone
    });
    
    return {
      utc: `${utcTime} UTC`,
      local: userTimezone !== 'UTC' ? `${localTime} (${userTimezone})` : null
    };
  };

  const getStatusDisplay = (status: StraightBetStatus) => {
    switch (status) {
      case StraightBetStatus.OPEN:
        return {
          label: 'OPEN',
          icon: Clock,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          borderColor: 'border-yellow-400/30',
          description: 'Users can accept this bet'
        };
      case StraightBetStatus.WAITING_RESULT:
        return {
          label: 'WAITING RESULT',
          icon: Timer,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          borderColor: 'border-blue-400/30',
          description: 'Match is in progress, waiting for result'
        };
      case StraightBetStatus.COMPLETED:
        return {
          label: 'COMPLETED',
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          borderColor: 'border-green-400/30',
          description: 'Bet has been settled with winner determined'
        };
      case StraightBetStatus.CANCELLED:
        return {
          label: 'CANCELLED',
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          borderColor: 'border-red-400/30',
          description: 'Bet was cancelled and is no longer active'
        };
      default:
        return {
          label: String(status).toUpperCase(),
          icon: Clock,
          color: 'text-console-white-dim',
          bgColor: 'bg-console-gray/10',
          borderColor: 'border-console-gray/30',
          description: 'Status unknown'
        };
    }
  };

  const statusInfo = getStatusDisplay(bet.status);
  const StatusIcon = statusInfo.icon;

  const isUserCreator = user && bet.creatorUserId === user.userId;
  const userRole = isUserCreator ? 'Creator' : 'Acceptor';
  
  // Get acceptor's pick (opposite of creator's pick)
  const getAcceptorPickId = (): string => {
    if (!matchWithDetails) return '';
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const details = matchWithDetails.details as NBAMatchDetail;
      const creatorPick = bet.creatorsPickId;
      
      if (creatorPick === details.homeTeamId) {
        return details.awayTeamId;
      } else if (creatorPick === details.awayTeamId) {
        return details.homeTeamId;
      }
      return details.awayTeamId;
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const details = matchWithDetails.details as SandboxMetaverseMatchDetail;
      const creatorPick = bet.creatorsPickId;
      
      if (creatorPick === details.player1Id) {
        return details.player2Id;
      } else if (creatorPick === details.player2Id) {
        return details.player1Id;
      }
      return details.player2Id;
    }
    
    return '';
  };

  // Helper function to get team/player name from ID
  const getPickName = (pickId: string | undefined): string => {
    if (!pickId) return 'N/A';
    if (!matchWithDetails) return pickId; // Fallback to ID if no match data
    
    // For Sandbox matches, check if it's a player
    if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const details = matchWithDetails.details as SandboxMetaverseMatchDetail;
      if (pickId === details.player1Id) return details.player1Name;
      if (pickId === details.player2Id) return details.player2Name;
      return pickId; // Fallback
    }
    
    // For NBA matches, check if it's a team
    if (matchWithDetails.eventType === 'basketball_nba') {
      const details = matchWithDetails.details as NBAMatchDetail;
      if (pickId === details.homeTeamId) return details.homeTeamName;
      if (pickId === details.awayTeamId) return details.awayTeamName;
    }
    
    return pickId; // Fallback to ID if not found
  };

  const handleShare = () => {
    navigate(`/share-bet/${bet.id}`);
  };

  const handleViewMatch = () => {
    if (matchWithDetails) {
      navigate(`/matches`);
      // TODO: In the future, we could navigate to a specific match detail page
      // navigate(`/match/${bet.matchId}`);
    }
  };

  const handleAcceptSuccess = async () => {
    setShowAcceptModal(false);
    // Refresh the bet data
    try {
      const updatedBets = await getOpenStraightBets(1000);
      const updatedBet = updatedBets.find((b: any) => b.id === betId);
      if (updatedBet) {
        setBet(updatedBet);
      }
    } catch (error) {
      console.error('Error refreshing bet data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-console-black">
      {/* Navigation Header */}
      <div className="bg-console-gray-terminal border-b border-console-blue p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-console-white-dim hover:text-console-white transition-colors font-mono"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            <div className="h-6 w-px bg-console-blue/30" />
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[#E5FF03]" />
              <h1 className="text-xl font-display text-console-white uppercase tracking-wider">
                Bet Details
              </h1>
            </div>
          </div>
          

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Prominent Status and Amount Section */}
        <div className="bg-gradient-to-r from-console-gray-terminal to-console-black border border-console-blue rounded-lg p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Status */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
                <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
                <div>
                  <div className={`text-lg font-mono font-bold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </div>
                  <div className="text-console-white-dim text-sm font-mono">
                    {statusInfo.description}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Amount */}
            <div className="text-right lg:text-left">
              <div className="text-console-white-dim font-mono text-sm mb-1">
                Bet Amount
              </div>
              <div className="text-console-white font-mono text-4xl font-bold">
                {bet.amount} <span className="text-[#E5FF03] text-2xl">$DARE</span>
              </div>
              <div className="text-console-white-dim text-sm font-mono mt-1">
                Created {displayRelativeTime}
              </div>
            </div>
          </div>
        </div>

        {/* Match Information */}
        {matchWithDetails && (
          <div className="bg-console-gray-terminal/50 border border-console-blue/30 rounded-lg p-6">
            <h2 className="text-console-white font-mono text-lg mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-console-blue" />
              Match Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Matchup</div>
                  <div className="text-console-white font-mono text-lg">
                    {matchWithDetails.eventType === 'basketball_nba' 
                      ? `${(matchWithDetails.details as NBAMatchDetail).homeTeamName} vs ${(matchWithDetails.details as NBAMatchDetail).awayTeamName}`
                      : `${(matchWithDetails.details as SandboxMetaverseMatchDetail).player1Name} vs ${(matchWithDetails.details as SandboxMetaverseMatchDetail).player2Name}`
                    }
                  </div>
                </div>
                
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Sport</div>
                  <div className="text-console-white font-mono">
                    {matchWithDetails.eventType === 'basketball_nba' ? 'NBA Basketball' : 'Sandbox Metaverse'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Match Start</div>
                  <div className="text-console-white font-mono">
                    {(() => {
                      const timeInfo = formatMatchStartTime(matchWithDetails.match.scheduledStartTime);
                      return (
                        <div>
                          <div>{timeInfo.utc}</div>
                          {timeInfo.local && (
                            <div className="text-console-white-dim text-sm mt-1">
                              {timeInfo.local}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* View Match Button */}
            <div className="border-t border-console-blue/30 pt-4">
              <button
                onClick={handleViewMatch}
                className="w-full bg-console-blue/10 hover:bg-console-blue/20 text-console-blue border border-console-blue/30 py-3 px-6 rounded font-mono transition-colors"
              >
                View Match
              </button>
            </div>
          </div>
        )}

        {/* Bet Details */}
        <div className="bg-console-gray-terminal/50 border border-console-blue/30 rounded-lg p-6">
          <h2 className="text-console-white font-mono text-lg mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-console-blue" />
            Bet Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-console-white-dim font-mono text-sm mb-1">Creator</div>
                <div className="text-console-white font-mono">
                  {bet.creatorUsername}
                </div>
              </div>
              
              <div>
                <div className="text-console-white-dim font-mono text-sm mb-1">Creator's Pick</div>
                <div className="text-console-blue-bright font-mono text-lg">
                  {getPickName(bet.creatorsPickId)}
                </div>
              </div>
              
              {/* Your Pick section - shows for all users */}
              <div>
                <div className="text-console-white-dim font-mono text-sm mb-1">Your Pick</div>
                <div className="text-[#E5FF03] font-mono text-lg font-bold">
                  {getPickName(isUserCreator ? bet.creatorsPickId : getAcceptorPickId())}
                </div>
                {!isUserCreator && (
                  <div className="text-console-white-dim font-mono text-xs italic mt-1">
                    You will automatically pick the opposite team/player of what the creator picked.
                  </div>
                )}
              </div>
              
              {bet.acceptorUsername && (
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Acceptor</div>
                  <div className="text-console-white font-mono">
                    {bet.acceptorUsername}
                  </div>
                </div>
              )}
              
              {bet.acceptorsPickId && (
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Acceptor's Pick</div>
                  <div className="text-console-blue-bright font-mono text-lg">
                    {getPickName(getAcceptorPickId())}
                  </div>
                </div>
              )}
              
              {bet.creatorsNote && (
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Creator's Note</div>
                  <div className="text-console-white font-mono italic bg-console-black/30 p-3 rounded">
                    "{bet.creatorsNote}"
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-console-white-dim font-mono text-sm mb-1">Created</div>
                <div className="text-console-white font-mono">
                  {formatDate(bet.createdAt)}
                </div>
              </div>
              
              {bet.acceptedAt && (
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Accepted</div>
                  <div className="text-console-white font-mono">
                    {formatDate(bet.acceptedAt)}
                  </div>
                </div>
              )}
              
              {bet.completedAt && (
                <div>
                  <div className="text-console-white-dim font-mono text-sm mb-1">Completed</div>
                  <div className="text-console-white font-mono">
                    {formatDate(bet.completedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          {/* Accept button - only show if user can accept */}
          {(() => {
            const canAccept = user && !isUserCreator && bet.status === StraightBetStatus.OPEN && freePointsBalance >= bet.amount;
            
            return canAccept ? (
              <button
                onClick={() => setShowAcceptModal(true)}
                className="flex-1 bg-console-blue-bright hover:bg-console-blue text-console-black border border-console-blue-bright py-3 px-6 rounded font-mono transition-colors font-bold"
                disabled={freePointsBalance < bet.amount}
              >
                {freePointsBalance < bet.amount ? 'Insufficient Points' : 'Accept Bet'}
              </button>
            ) : null;
          })()}
          
          <button
            onClick={handleShare}
            className="flex-1 bg-[#E5FF03]/10 hover:bg-[#E5FF03]/20 text-[#E5FF03] border border-[#E5FF03]/30 py-3 px-6 rounded font-mono transition-colors"
          >
            Share Bet
          </button>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <Modal isOpen={showAcceptModal} onClose={() => setShowAcceptModal(false)}>
          <ConfirmBetAcceptanceView
            betId={bet.id}
            betAmount={bet.amount}
            creatorUsername={bet.creatorUsername}
            creatorsPickId={bet.creatorsPickId}
            acceptorsPickId={getAcceptorPickId()}
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

export default BetDetailView; 