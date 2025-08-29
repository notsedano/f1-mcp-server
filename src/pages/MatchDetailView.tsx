import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { useBetting } from '../context/BettingContext'; // REMOVED: Legacy context
import { useMatches } from '../context/MatchesContext';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { usePoints } from '../context/PointsContext';
import { useStraightBets } from '../context/StraightBetsContext';
import { Wallet, AlertTriangle, TrendingUp, ArrowUp, ArrowDown, Calendar, Clock, DollarSign } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MatchAnalysisCard from '../components/match/MatchAnalysisCard';

import { formatDecimalOdds, decimalToAmerican } from '../deprecated/utils/oddsUtils';
import { Match } from '../types';
import { MatchAnalysis } from '../types';

const MatchDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // const { createNewBet } = useBetting(); // REMOVED: Legacy context
  const { createStraightBet } = useStraightBets(); // Use new betting context
  const { matches, loading: loadingMatches } = useMatches();
  const { isAuthenticated, loginWithEmail } = useAuth();
  const { account, connectWallet } = useWeb3();
  const { userBalance } = usePoints();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('0.01');
  const [description, setDescription] = useState<string>('');
  const [isCreatingBet, setIsCreatingBet] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  useEffect(() => {
    if (!loadingMatches && matches.length > 0 && id) {
      const foundMatch = matches.find(m => m.id === id);
      if (foundMatch) {
        setMatch(foundMatch);
        // Default to selecting home team
        setSelectedTeam(foundMatch.home_team.id);
        
        // Load match analysis
        loadAnalysis(foundMatch.id);
      }
    }
    setLoading(loadingMatches);
  }, [id, matches, loadingMatches]);
  
  const loadAnalysis = async (matchId: string) => {
    setLoadingAnalysis(true);
    try {
      // const data = await getMatchAnalysis(matchId); // REMOVED: Legacy service
      // setAnalysis(data);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const getMainOdds = (match: Match) => {
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
  };
  
  const handleCreateBet = async () => {
    if (!account) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!match || !selectedTeam || !betAmount) {
      return;
    }
    
    setIsCreatingBet(true);
    try {
      // const newBet = await createNewBet(match.id, selectedTeam, parseFloat(betAmount), description); // REMOVED: Legacy context
      // if (newBet) {
      //   navigate(`/dashboard`);
      // }
    } finally {
      setIsCreatingBet(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size={8} />
      </div>
    );
  }
  
  if (!match) {
    return (
      <div className="flex flex-col items-center py-16">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Match Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          The match you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }
  
  const odds = getMainOdds(match);
  
  return (
    <div className="space-y-8">
      {/* Match Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">
              {match.home_team.name} vs {match.away_team.name}
            </h1>
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(match.commence_time)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(match.commence_time)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400">Home</div>
              <div className="text-xl font-bold">{match.home_team.name}</div>
              {odds.home && (
                <div className="mt-1 inline-block bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-800 dark:text-blue-200 font-medium">
                  {odds.home}
                </div>
              )}
            </div>
            
            <div className="text-2xl font-bold text-slate-400">VS</div>
            
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400">Away</div>
              <div className="text-xl font-bold">{match.away_team.name}</div>
              {odds.away && (
                <div className="mt-1 inline-block bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-800 dark:text-blue-200 font-medium">
                  {odds.away}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Create Bet Form */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Create a New Bet</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Select Your Team
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`border rounded-lg p-4 flex flex-col items-center transition-colors ${
                    selectedTeam === match.home_team.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                  onClick={() => setSelectedTeam(match.home_team.id)}
                >
                  <span className="font-medium">{match.home_team.name}</span>
                  {odds.home && <span className="text-sm mt-1">Odds: {odds.home}</span>}
                </button>
                
                <button
                  type="button"
                  className={`border rounded-lg p-4 flex flex-col items-center transition-colors ${
                    selectedTeam === match.away_team.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                  onClick={() => setSelectedTeam(match.away_team.id)}
                >
                  <span className="font-medium">{match.away_team.name}</span>
                  {odds.away && <span className="text-sm mt-1">Odds: {odds.away}</span>}
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="betAmount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Bet Amount (ETH)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="number"
                  id="betAmount"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.001"
                  step="0.001"
                  className="pl-10 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add some trash talk or explain your bet..."
                className="block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={handleCreateBet}
              disabled={isCreatingBet || !selectedTeam || !betAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isCreatingBet ? (
                <>
                  <LoadingSpinner size={4} color="white" />
                  <span>Creating Bet...</span>
                </>
              ) : (
                <span>Create Bet</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Match Analysis */}
        <div>
          <MatchAnalysisCard 
            match={match} 
            analysis={analysis} 
            loading={loadingAnalysis} 
          />
        </div>
      </div>
    </div>
  );
};

export default MatchDetailView;