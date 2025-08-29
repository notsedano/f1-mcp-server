import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, AlertTriangle, Loader2, Calendar, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { StraightBet, StraightBetStatus, getUserStraightBets, getOpenStraightBets, acceptStraightBet } from '../services/straightBetsService';
import { useMatches } from '../context/MatchesContext';
import { useAuth } from '../context/AuthContext';
import { usePoints } from '../context/PointsContext';
import { useStraightBets } from '../context/StraightBetsContext';
import { NBAMatchDetail, SandboxMetaverseMatchDetail } from '../types/match';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const ShareBetView: React.FC = () => {
  const { betId } = useParams<{ betId: string }>();
  const navigate = useNavigate();
  const { getMatchByIdWithDetails } = useMatches();
  const { user, isAuthenticated } = useAuth();
  const { userBalance } = usePoints();
  const { acceptBet } = useStraightBets();
  
  const [bet, setBet] = useState<StraightBet | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  
  useEffect(() => {
    if (!betId) {
      setError('Invalid bet ID');
      setLoading(false);
      return;
    }
    
    const fetchBet = async () => {
      try {
        setLoading(true);
        // First try to get from open bets (this is what users typically share)
        const openBets = await getOpenStraightBets(1000);
        const foundBet = openBets.find(b => b.id === betId);
        
        if (!foundBet) {
          setError('Bet not found or no longer available');
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
  }, [betId]);
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
        {/* Background Effects */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        <div className="border-1 border-console-blue shadow-terminal max-w-md w-full">
          <div className="bg-console-black/95 rounded-sm">
            {/* Banner */}
            <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
              <img 
                src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
                alt="Agent Daredevil - Wanna Bet?" 
                className="w-full h-auto object-contain mx-auto relative z-0"
              />
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-4 p-6">
              <Loader2 className="h-12 w-12 text-console-blue animate-spin" />
              <h2 className="text-console-white font-mono text-lg">Loading Bet Details</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !bet) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
        {/* Background Effects */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
        <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        
        <div className="border-1 border-console-blue shadow-terminal max-w-md w-full">
          <div className="bg-console-black/95 rounded-sm">
            {/* Banner */}
            <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
              <img 
                src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
                alt="Agent Daredevil - Wanna Bet?" 
                className="w-full h-auto object-contain mx-auto relative z-0"
              />
            </div>
            
            <div className="flex flex-col items-center justify-center space-y-4 p-6">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <h2 className="text-console-white font-mono text-lg">Error Loading Bet</h2>
              <p className="text-console-white-dim font-mono text-center">{error || 'Bet not found'}</p>
              <button
                onClick={() => navigate('/bets')}
                className="bg-console-blue border-1 border-console-blue px-6 py-3 text-white font-mono hover:shadow-glow transition-all rounded"
              >
                GO TO BETS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const matchWithDetails = getMatchByIdWithDetails(bet.matchId);
  
  // Format date and time
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return 'Invalid time';
    }
  };

  // Get team/player names
  const getMatchDisplayInfo = () => {
    if (!matchWithDetails) {
      return { homeTeam: 'Unknown', awayTeam: 'Unknown' };
    }
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const details = matchWithDetails.details as NBAMatchDetail;
      return {
        homeTeam: details.homeTeamName,
        awayTeam: details.awayTeamName
      };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const details = matchWithDetails.details as SandboxMetaverseMatchDetail;
      return {
        homeTeam: details.player1Name,
        awayTeam: details.player2Name
      };
    }
    
    return { homeTeam: 'Unknown', awayTeam: 'Unknown' };
  };

  // Get pick names
  const getPickNames = () => {
    if (!matchWithDetails) return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const details = matchWithDetails.details as NBAMatchDetail;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === details.homeTeamId) {
        creatorPickName = details.homeTeamName;
        acceptorPickName = details.awayTeamName;
      } else if (creatorPick === details.awayTeamId) {
        creatorPickName = details.awayTeamName;
        acceptorPickName = details.homeTeamName;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const details = matchWithDetails.details as SandboxMetaverseMatchDetail;
      const creatorPick = bet.creatorsPickId;
      
      let creatorPickName = 'Unknown';
      let acceptorPickName = 'Unknown';
      
      if (creatorPick === details.player1Id) {
        creatorPickName = details.player1Name;
        acceptorPickName = details.player2Name;
      } else if (creatorPick === details.player2Id) {
        creatorPickName = details.player2Name;
        acceptorPickName = details.player1Name;
      }
      
      return { creatorPick: creatorPickName, acceptorPick: acceptorPickName };
    }
    
    return { creatorPick: 'Unknown', acceptorPick: 'Unknown' };
  };

  // Auto-determine the acceptor's pick
  const getAcceptorsPick = (): string => {
    if (!matchWithDetails) return '';
    
    if (matchWithDetails.eventType === 'basketball_nba') {
      const creatorPick = bet.creatorsPickId;
      const details = matchWithDetails.details as NBAMatchDetail;
      
      if (creatorPick === details.homeTeamId) {
        return details.awayTeamId;
      } else if (creatorPick === details.awayTeamId) {
        return details.homeTeamId;
      }
      return details.awayTeamId;
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      const creatorPick = bet.creatorsPickId;
      const details = matchWithDetails.details as SandboxMetaverseMatchDetail;
      
      if (creatorPick === details.player1Id) {
        return details.player2Id;
      } else if (creatorPick === details.player2Id) {
        return details.player1Id;
      }
      return details.player2Id;
    }
    
    return '';
  };

  const handleAcceptClick = () => {
    if (!isAuthenticated) {
      // Store current URL for redirect after login
      sessionStorage.setItem('redirectAfterLogin', `/bet/${bet.id}`);
      navigate('/login');
      return;
    }
    
    // Show confirmation modal
    setShowAcceptConfirmation(true);
  };

  const handleConfirmAccept = async () => {
    if (!user?.userId) return;
    
    setAccepting(true);
    setError(null);
    
    const acceptorsPickId = getAcceptorsPick();
    if (!acceptorsPickId) {
      setError('Unable to determine your pick automatically. Please try again.');
      setAccepting(false);
      return;
    }
    
    try {
      await acceptBet(bet.id, acceptorsPickId);
      toast.success('Bet accepted successfully!');
      
      // Navigate to bet details view
      navigate(`/bet/${bet.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept bet');
      setAccepting(false);
    }
  };

  const matchInfo = getMatchDisplayInfo();
  const pickNames = getPickNames();

  // Check if user can accept
  const isCreator = user && bet.creatorUserId === user.userId;
  const canAccept = isAuthenticated && !isCreator && bet.status === StraightBetStatus.OPEN && userBalance >= bet.amount;
  const insufficientFunds = isAuthenticated && userBalance < bet.amount;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(#00255510_1px,transparent_1px)] bg-[size:8px_8px]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(rgba(0,102,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,102,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_right,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
      <div className="fixed inset-0 z-[-1] bg-[linear-gradient(to_bottom,transparent,rgba(0,102,255,0.05)_10%,rgba(0,102,255,0.05)_90%,transparent)]"></div>
      
      <div className="w-full max-w-md border-1 border-console-blue shadow-terminal my-4 animate-fadeIn overflow-hidden">
        <div className="bg-console-black/95 rounded-sm">
          {/* Banner */}
          <div className="relative w-full border-b-1 border-console-blue bg-console-blue-bright/80 backdrop-blur-xs overflow-hidden">
            <img 
              src="https://i.ibb.co/Q7mKsRBc/nba-banner.png"
              alt="Agent Daredevil - Wanna Bet?" 
              className="w-full h-auto object-contain mx-auto relative z-0"
            />
          </div>
          
          {/* Content */}
          <div className="p-3 space-y-3">
            {/* Main Title */}
            <div className="bg-console-black/70 border-1 border-console-blue p-3 rounded">
              <div className="pt-2 pb-3">
                <h3 className="text-[#E5FF03] font-mono text-4xl sm:text-4xl md:text-3xl font-bold text-center tracking-wide leading-tight">
                  YOU'VE BEEN<br className="md:hidden" /> INVITED TO BET!
                </h3>
              </div>
              
              {/* Match Info */}
              {matchWithDetails && (
                <div className="mb-3 bg-console-blue/10 p-2 border-1 border-console-blue/30 rounded">
                  <div className="text-center mb-1">
                    <div className="text-white font-mono text-base font-bold">
                      {matchInfo.homeTeam} vs {matchInfo.awayTeam}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-console-white-dim text-xs mt-0.5">
                      <Calendar className="h-3 w-3" /> 
                      <span>{formatDate(matchWithDetails.match.scheduledStartTime)}</span>
                      <span className="mx-1">•</span>
                      <Clock className="h-3 w-3" /> 
                      <span>{formatTime(matchWithDetails.match.scheduledStartTime)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Bet Details */}
              <div className="space-y-2 text-console-white font-mono text-sm">
                {/* Amount */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Amount:</span>
                  <div className="bg-[#E5FF03]/10 px-3 py-1.5 rounded-md border-1 border-[#E5FF03]/70 shadow-[0_0_10px_rgba(229,255,3,0.6)] animate-pulse">
                    <span className="text-[#E5FF03] font-bold text-2xl md:text-3xl">{bet.amount} <span className="text-lg md:text-xl">$DARE</span></span>
                  </div>
                </div>
                
                {/* Creator's Pick */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Creator's Pick:</span>
                  <span className="text-[#00A4FF] font-bold">
                    {pickNames.creatorPick}
                  </span>
                </div>
                
                {/* Your Pick */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Your Pick:</span>
                  <span className="text-[#E5FF03] font-bold">
                    {pickNames.acceptorPick}
                  </span>
                </div>
                
                {/* Creator */}
                <div className="flex justify-between items-center p-1.5 bg-console-black/30 rounded">
                  <span className="text-console-white-dim font-medium">Created by:</span>
                  <span className="text-console-white-bright">{bet.creatorUsername}</span>
                </div>
                
                {/* Creator's Note */}
                {bet.creatorsNote && (
                  <div className="mt-2 p-2 bg-console-blue/10 border-1 border-console-blue/30 rounded">
                    <div className="text-center">
                      <span className="text-console-white-dim font-medium text-xs block">Creator's Note:</span>
                      <div className="text-console-white-bright italic text-sm font-medium">"{bet.creatorsNote}"</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Warning */}
            <div className="bg-yellow-500/20 border-1 border-yellow-500 p-2 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-console-white-dim font-mono text-xs">
                  By accepting this bet, you agree to place {bet.amount} $DARE points. Your pick will be automatically set to {pickNames.acceptorPick}.
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="space-y-2 mt-4">
              {!isAuthenticated ? (
                <button
                  onClick={handleAcceptClick}
                  className="w-full bg-[#00A4FF] border-1 border-[#00A4FF] p-3 text-white font-mono font-bold hover:shadow-glow transition-all flex items-center justify-center gap-2 rounded"
                >
                  <span>LOGIN TO ACCEPT BET</span>
                </button>
              ) : isCreator ? (
                <div className="bg-blue-900/30 border-1 border-blue-500 p-3 rounded text-center">
                  <p className="text-blue-400 font-mono text-sm">You cannot accept your own bet</p>
                </div>
              ) : insufficientFunds ? (
                <div className="bg-red-900/30 border-1 border-red-500 p-3 rounded text-center">
                  <p className="text-red-400 font-mono text-sm">
                    Insufficient $DARE points. You need {bet.amount} but have {userBalance}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAcceptClick}
                    disabled={accepting}
                    className="w-full bg-[#00A4FF] border-1 border-[#00A4FF] p-3 text-white font-mono font-bold hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
                  >
                    {accepting ? (
                      <>
                        <LoadingSpinner size={4} />
                        <span>ACCEPTING BET...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>ACCEPT BET ({bet.amount} $DARE)</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => navigate('/bets')}
                    disabled={accepting}
                    className="w-full bg-transparent border-1 border-console-blue p-3 text-console-white font-mono hover:bg-console-gray-dark/30 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
                  >
                    <X className="h-4 w-4" />
                    <span>DECLINE</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border-1 border-red-500 p-3 rounded">
                <p className="text-red-400 font-mono text-sm text-center">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showAcceptConfirmation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] px-4">
          <div className="bg-console-gray-terminal border border-console-blue p-6 max-w-sm w-full rounded">
            <h3 className="text-lg font-display text-console-white mb-4 text-center">Confirm Bet Acceptance</h3>
            
            <div className="space-y-3 mb-6">
              <div className="text-center">
                <div className="text-console-white-dim font-mono text-sm">You are about to place:</div>
                <div className="text-[#E5FF03] font-mono text-2xl font-bold">{bet.amount} $DARE</div>
              </div>
              
              <div className="text-center">
                <div className="text-console-white-dim font-mono text-sm">Your pick:</div>
                <div className="text-[#E5FF03] font-mono text-lg font-bold">{pickNames.acceptorPick}</div>
              </div>
              
              <div className="text-center">
                <div className="text-console-white-dim font-mono text-sm">Your current balance:</div>
                <div className="text-console-white font-mono">{userBalance} $DARE</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptConfirmation(false)}
                className="flex-1 bg-console-gray/20 text-console-white-dim font-mono py-2 px-4 rounded border border-console-blue/30 hover:bg-console-gray/40 transition-colors"
                disabled={accepting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAccept}
                className="flex-1 bg-[#00A4FF] text-white font-mono py-2 px-4 rounded hover:bg-[#0084CC] transition-colors disabled:opacity-70"
                disabled={accepting}
              >
                {accepting ? 'Accepting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareBetView; 