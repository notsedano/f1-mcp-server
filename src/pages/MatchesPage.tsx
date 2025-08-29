import React, { useMemo, useState } from 'react';
import { useMatches } from '../context/MatchesContext';
import { SandboxMatchCard } from '../components/match/SandboxMatchCard';
import { MatchWithDetails } from '../types/match';
import StraightBetEditorView from '../components/bet/StraightBetEditorView';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Simple NBA match card for display
const NBAMatchCard: React.FC<{ match: MatchWithDetails; onSelectForBetting: () => void; isBettingSelected: boolean }> = ({ match, onSelectForBetting, isBettingSelected }) => {
  if (match.eventType !== 'basketball_nba') return null;
  const { details, match: base } = match;
  
  return (
    <div className="bg-console-gray-terminal/70 border-1 border-console-blue shadow-terminal rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-console-blue-bright">NBA</div>
        <div className="text-xs font-mono text-console-white">{new Date(base.scheduledStartTime).toLocaleString()}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {details.homeTeamLogo && <img src={details.homeTeamLogo} alt={details.homeTeamName} className="w-8 h-8 rounded-full" />}
          <span className="font-mono text-console-white-bright text-lg">{details.homeTeamName}</span>
        </div>
        <span className="font-mono text-console-blue-bright text-xl font-bold">VS</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-console-white-bright text-lg">{details.awayTeamName}</span>
          {details.awayTeamLogo && <img src={details.awayTeamLogo} alt={details.awayTeamName} className="w-8 h-8 rounded-full" />}
        </div>
      </div>
      {details.gameSubtitle && <div className="mt-2 text-xs text-console-white-dim font-mono">{details.gameSubtitle}</div>}
      {details.venue && <div className="text-xs text-console-white-dim font-mono">{details.venue}</div>}
      
      {/* BET NOW Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={onSelectForBetting}
          className={`flex items-center gap-1 px-3 py-1 ${
            isBettingSelected ? 'bg-[#E5FF03] text-black' : 'bg-console-black/50 text-[#E5FF03]'
          } border-1 border-[#E5FF03] hover:bg-[#E5FF03]/70 hover:text-black transition-colors`}
        >
          <span className="text-xs font-mono">BET NOW</span>
        </button>
      </div>
    </div>
  );
};

const UPCOMING_WINDOW_DAYS = 30;

const MatchesPage: React.FC = () => {
  const { matchesWithDetails, loading, error } = useMatches();
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedMatchForBetting, setSelectedMatchForBetting] = useState<MatchWithDetails | null>(null);
  const [showBettingModal, setShowBettingModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSelectForBetting = (match: MatchWithDetails) => {
    console.log('=== MATCHES PAGE: handleSelectForBetting called ===', {
      isAuthenticated,
      matchId: match.match.id,
      eventType: match.eventType
    });

    if (!isAuthenticated) {
      console.log('=== MATCHES PAGE: User not authenticated, redirecting to login ===');
      toast.error('Please sign in to place bets');
      navigate('/login');
      return;
    }

    console.log('=== MATCHES PAGE: Opening betting modal ===');
    setSelectedMatchForBetting(match);
    setShowBettingModal(true);
  };

  const handleCloseBettingModal = () => {
    setShowBettingModal(false);
    setSelectedMatchForBetting(null);
  };

  // Convert MatchWithDetails to legacy Match format for StraightBetEditorView
  const convertToLegacyMatch = (matchWithDetails: MatchWithDetails) => {
    if (matchWithDetails.eventType === 'basketball_nba') {
      return {
        id: matchWithDetails.match.id,
        sport_key: 'basketball_nba',
        sport_title: 'NBA',
        commence_time: matchWithDetails.match.scheduledStartTime,
        home_team: {
          id: matchWithDetails.details.homeTeamId,
          name: matchWithDetails.details.homeTeamName
        },
        away_team: {
          id: matchWithDetails.details.awayTeamId,
          name: matchWithDetails.details.awayTeamName
        },
        bookmakers: []
      };
    } else if (matchWithDetails.eventType === 'sandbox_metaverse') {
      return {
        id: matchWithDetails.match.id,
        sport_key: 'sandbox_metaverse',
        sport_title: 'Sandbox Metaverse',
        commence_time: matchWithDetails.match.scheduledStartTime,
        home_team: {
          id: matchWithDetails.details.player1Id,
          name: matchWithDetails.details.player1Name,
          alias: matchWithDetails.details.player1Subtitle
        },
        away_team: {
          id: matchWithDetails.details.player2Id,
          name: matchWithDetails.details.player2Name,
          alias: matchWithDetails.details.player2Subtitle
        },
        bookmakers: []
      };
    }
    return null;
  };

  // Group matches by event_type
  const grouped = useMemo(() => {
    const now = Date.now();
    const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const groups: Record<string, MatchWithDetails[]> = {};
    for (const m of matchesWithDetails) {
      if (new Date(m.match.scheduledStartTime).getTime() - now > windowMs) continue;
      if (!groups[m.eventType]) groups[m.eventType] = [];
      groups[m.eventType].push(m);
    }
    // Sort each group by scheduled_start_time
    for (const key in groups) {
      groups[key].sort((a, b) => new Date(a.match.scheduledStartTime).getTime() - new Date(b.match.scheduledStartTime).getTime());
    }
    return groups;
  }, [matchesWithDetails]);

  // Featured: 2 soonest per sport
  const featured = useMemo(() => {
    const out: Record<string, MatchWithDetails[]> = {};
    for (const key in grouped) {
      out[key] = grouped[key].slice(0, 2);
    }
    return out;
  }, [grouped]);

  // Unified list: filter and sort
  const filteredSorted = useMemo(() => {
    let arr = matchesWithDetails;
    if (selectedSport !== 'all') {
      arr = arr.filter(m => m.eventType === selectedSport);
    }
    arr = arr.slice().sort((a, b) => {
      const tA = new Date(a.match.scheduledStartTime).getTime();
      const tB = new Date(b.match.scheduledStartTime).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
    return arr;
  }, [matchesWithDetails, selectedSport, sortOrder]);

  const sportOptions = useMemo(() => {
    const set = new Set(matchesWithDetails.map(m => m.eventType));
    return Array.from(set).filter(Boolean);
  }, [matchesWithDetails]);

  return (
    <div className="space-y-8">
      {/* Featured Matches Section - Enhanced Design */}
      <div className="bg-gradient-to-br from-console-gray-terminal/40 to-console-black/60 backdrop-blur-sm border-2 border-console-blue/50 shadow-2xl rounded-lg overflow-hidden">
        {/* Featured Header with Glow Effect */}
        <div className="bg-console-blue/20 backdrop-blur-xs border-b-2 border-console-blue/30 p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#E5FF03] rounded-full animate-pulse-slow shadow-yellow-glow"></div>
            <h2 className="text-2xl font-display text-console-blue-bright mb-0 uppercase tracking-wider">
              ⚡ Featured Matches
            </h2>
            <div className="w-3 h-3 bg-[#E5FF03] rounded-full animate-pulse-slow shadow-yellow-glow"></div>
          </div>
          <p className="text-console-white-dim font-mono text-sm mt-2 opacity-80">
            // PREMIUM_BETTING_OPPORTUNITIES_SELECTED_BY_AI
          </p>
        </div>
        
        {/* Featured Content */}
        <div className="p-6 space-y-8">
          {Object.entries(featured).map(([sport, matches]) => (
            <div key={sport} className="relative">
              {/* Sport Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px bg-gradient-to-r from-console-blue via-console-blue-bright to-transparent flex-1"></div>
                <h3 className="text-lg font-mono text-console-white bg-console-black/50 px-4 py-1 border border-console-blue/30 uppercase tracking-wider">
                  {sport.replace('_', ' ')}
                </h3>
                <div className="h-px bg-gradient-to-l from-console-blue via-console-blue-bright to-transparent flex-1"></div>
              </div>
              
              {/* Match Cards Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {matches.map(m =>
                  m.eventType === 'basketball_nba' ? (
                    <NBAMatchCard 
                      key={m.match.id} 
                      match={m} 
                      onSelectForBetting={() => handleSelectForBetting(m)}
                      isBettingSelected={selectedMatchForBetting?.match.id === m.match.id}
                    />
                  ) : (
                    <SandboxMatchCard
                      key={m.match.id}
                      scheduledStartTime={m.match.scheduledStartTime}
                      player1Name={m.details.player1Name}
                      player1Subtitle={m.details.player1Subtitle}
                      player1ImageUrl={m.details.player1ImageUrl}
                      player2Name={m.details.player2Name}
                      player2Subtitle={m.details.player2Subtitle}
                      player2ImageUrl={m.details.player2ImageUrl}
                      onSelectForBetting={() => handleSelectForBetting(m)}
                      isBettingSelected={selectedMatchForBetting?.match.id === m.match.id}
                    />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Featured Footer */}
        <div className="bg-console-black/30 backdrop-blur-xs border-t border-console-blue/20 px-6 py-3">
          <div className="flex items-center justify-between text-xs font-mono text-console-white-dim">
            <span>// AI_CURATED_SELECTION</span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              LIVE_ODDS_TRACKING
            </span>
          </div>
        </div>
      </div>

      {/* Unified List Section */}
      <div className="bg-console-gray-terminal/20 backdrop-blur-xs border border-console-blue/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-display text-console-white uppercase tracking-wider">
            All Matches
          </h2>
          <div className="h-px bg-gradient-to-r from-console-blue/50 to-transparent flex-1"></div>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <label className="font-mono text-console-white">Event:</label>
          <select
            className="bg-console-gray-terminal border border-console-blue text-console-white font-mono px-2 py-1 rounded"
            value={selectedSport}
            onChange={e => setSelectedSport(e.target.value)}
          >
            <option value="all">All</option>
            {sportOptions.map(s => (
              <option key={s} value={s}>{s ? s.replace('_', ' ') : ''}</option>
            ))}
          </select>
          <label className="font-mono text-console-white ml-6">Sort by:</label>
          <button
            className="bg-console-blue/80 text-black font-mono px-3 py-1 rounded border border-console-blue ml-2"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
          >
            Scheduled Time {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        <div className="space-y-4">
          {filteredSorted.length === 0 && (
            <div className="text-console-white-dim font-mono text-center mt-10">No matches found.</div>
          )}
          {filteredSorted.map(m =>
            m.eventType === 'basketball_nba' ? (
              <NBAMatchCard 
                key={m.match.id} 
                match={m} 
                onSelectForBetting={() => handleSelectForBetting(m)}
                isBettingSelected={selectedMatchForBetting?.match.id === m.match.id}
              />
            ) : (
              <SandboxMatchCard
                key={m.match.id}
                scheduledStartTime={m.match.scheduledStartTime}
                player1Name={m.details.player1Name}
                player1Subtitle={m.details.player1Subtitle}
                player1ImageUrl={m.details.player1ImageUrl}
                player2Name={m.details.player2Name}
                player2Subtitle={m.details.player2Subtitle}
                player2ImageUrl={m.details.player2ImageUrl}
                onSelectForBetting={() => handleSelectForBetting(m)}
                isBettingSelected={selectedMatchForBetting?.match.id === m.match.id}
              />
            )
          )}
        </div>
      </div>

      {/* Betting Modal */}
      {showBettingModal && selectedMatchForBetting && (
        <Modal isOpen={showBettingModal} onClose={handleCloseBettingModal}>
                          <StraightBetEditorView 
            match={convertToLegacyMatch(selectedMatchForBetting)!} 
            onClose={handleCloseBettingModal} 
          />
        </Modal>
      )}
    </div>
  );
};

export default MatchesPage;
