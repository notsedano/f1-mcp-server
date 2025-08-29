import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createMatch, createNBAMatch, createSandboxMatch, updateMatchScoresAdmin, deleteMatch } from '../services/adminService';
import { Match, Team, EventType } from '../../types';
import { toast } from 'react-toastify';
import { getUpcomingMatches } from '../../services/supabaseService';
import { useMatches } from '../../context/MatchesContext';
import { getNBATeams, NBATeam } from '../../services/teamsService';
import { getUSTimezones, getSoutheastAsianTimezones, convertLocalToUTC, getUserTimezone } from '../../utils/timezoneUtils';

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshMatches } = useMatches();
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // Multi-step form state
  const [selectedEventType, setSelectedEventType] = useState<EventType | ''>('');
  const [nbaTeams, setNBATeams] = useState<NBATeam[]>([]);
  const [showTimezoneTooltip, setShowTimezoneTooltip] = useState<'nba' | 'sandbox' | null>(null);
  
  // Form state for NBA basketball matches
  const [nbaMatchForm, setNBAMatchForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    gameSubtitle: '',
    venue: '',
    scheduledDateTime: '',
    timezone: getUserTimezone() // Default to user's current timezone
  });

  // Form state for Sandbox Metaverse matches
  const [sandboxMatchForm, setSandboxMatchForm] = useState({
    player1Name: '',
    player1Subtitle: '',
    player1ImageUrl: '',
    player2Name: '',
    player2Subtitle: '',
    player2ImageUrl: '',
    scheduledDateTime: '',
    timezone: 'Asia/Singapore' // Default to Singapore time for Southeast Asian matches
  });
  
  // Load existing matches from database
  const loadExistingMatches = async () => {
    try {
      setLoadingMatches(true);
      const dbMatches = await getUpcomingMatches(20);
      
      if (dbMatches && dbMatches.length > 0) {
        // Sort by creation date (newest first)
        const sortedMatches = [...dbMatches].sort((a, b) => {
          return new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime();
        });
        setMatches(sortedMatches);
      }
    } catch (error) {
      console.error('Error loading existing matches:', error);
      toast.error('Failed to load existing matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  // Load NBA teams when event type is selected
  const loadNBATeams = async () => {
    try {
      setLoadingTeams(true);
      const teams = await getNBATeams();
      setNBATeams(teams);
    } catch (error) {
      console.error('Error loading NBA teams:', error);
      toast.error('Failed to load NBA teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  // Load existing matches and NBA teams on component mount
  useEffect(() => {
    loadExistingMatches();
  }, []);

  // Load teams when NBA basketball is selected
  useEffect(() => {
    if (selectedEventType === 'basketball_nba') {
      loadNBATeams();
    }
  }, [selectedEventType]);
  
  // Handle event type selection
  const handleEventTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const eventType = e.target.value as EventType | '';
    setSelectedEventType(eventType);
    
    // Reset form when changing event type
    if (eventType === 'basketball_nba') {
      setNBAMatchForm({
        homeTeamId: '',
        awayTeamId: '',
        gameSubtitle: '',
        venue: '',
        scheduledDateTime: '',
        timezone: getUserTimezone()
      });
    } else if (eventType === 'sandbox_metaverse') {
      setSandboxMatchForm({
        player1Name: '',
        player1Subtitle: '',
        player1ImageUrl: '',
        player2Name: '',
        player2Subtitle: '',
        player2ImageUrl: '',
        scheduledDateTime: '',
        timezone: 'Asia/Singapore'
      });
    }
  };

  // Handle NBA form input changes
  const handleNBAFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNBAMatchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Sandbox form input changes
  const handleSandboxFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSandboxMatchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle NBA form submission
  const handleNBASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEventType || selectedEventType !== 'basketball_nba') {
      toast.error('Please select an event type first');
      return;
    }
    
    if (!nbaMatchForm.homeTeamId || !nbaMatchForm.awayTeamId || !nbaMatchForm.scheduledDateTime || !nbaMatchForm.timezone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (nbaMatchForm.homeTeamId === nbaMatchForm.awayTeamId) {
      toast.error('Home and away teams must be different');
      return;
    }
    
    setLoading(true);
    
    try {
      // Convert local time to UTC for storage
      const utcDateTime = convertLocalToUTC(nbaMatchForm.scheduledDateTime, nbaMatchForm.timezone);
      
      // Create NBA match using the specialized function
      const result = await createNBAMatch(
        nbaMatchForm.homeTeamId,
        nbaMatchForm.awayTeamId,
        utcDateTime,
        nbaMatchForm.gameSubtitle || undefined,
        nbaMatchForm.venue || undefined,
        nbaMatchForm.timezone
      );
      
      if (result) {
        toast.success('NBA match created successfully!');
        
        // Reset form
        setSelectedEventType('');
        setNBAMatchForm({
          homeTeamId: '',
          awayTeamId: '',
          gameSubtitle: '',
          venue: '',
          scheduledDateTime: '',
          timezone: getUserTimezone()
        });
        
        // Add to matches list
        setMatches(prev => [result, ...prev]);
        
        // Refresh matches in the MatchesContext
        try {
          await refreshMatches();
          toast.info('Match added to the betting system');
        } catch (refreshError) {
          console.error('Error refreshing matches:', refreshError);
          // Don't show error to user since the match was created successfully
        }
      } else {
        toast.error('Failed to create match');
      }
    } catch (error) {
      console.error('Error creating NBA match:', error);
      toast.error('Error creating match');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sandbox form submission
  const handleSandboxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEventType || selectedEventType !== 'sandbox_metaverse') {
      toast.error('Please select an event type first');
      return;
    }
    
    if (!sandboxMatchForm.player1Name || !sandboxMatchForm.player2Name || !sandboxMatchForm.scheduledDateTime || !sandboxMatchForm.timezone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // Convert local time to UTC for storage
      const utcDateTime = convertLocalToUTC(sandboxMatchForm.scheduledDateTime, sandboxMatchForm.timezone);
      
      // Create Sandbox match using the specialized function
      const result = await createSandboxMatch(
        sandboxMatchForm.player1Name,
        sandboxMatchForm.player1Subtitle,
        sandboxMatchForm.player1ImageUrl,
        sandboxMatchForm.player2Name,
        sandboxMatchForm.player2Subtitle,
        sandboxMatchForm.player2ImageUrl,
        utcDateTime,
        sandboxMatchForm.timezone
      );
      
      if (result) {
        toast.success('Sandbox match created successfully!');
        
        // Reset form
        setSelectedEventType('');
        setSandboxMatchForm({
          player1Name: '',
          player1Subtitle: '',
          player1ImageUrl: '',
          player2Name: '',
          player2Subtitle: '',
          player2ImageUrl: '',
          scheduledDateTime: '',
          timezone: 'Asia/Singapore'
        });
        
        // Add to matches list
        setMatches(prev => [result, ...prev]);
        
        // Refresh matches in the MatchesContext
        try {
          await refreshMatches();
          toast.info('Match added to the betting system');
        } catch (refreshError) {
          console.error('Error refreshing matches:', refreshError);
          // Don't show error to user since the match was created successfully
        }
      } else {
        toast.error('Failed to create match');
      }
    } catch (error) {
      console.error('Error creating Sandbox match:', error);
      toast.error('Error creating match');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-mono text-console-white mb-4">ADMIN DASHBOARD</h1>
        <div className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal">
          <h2 className="text-xl font-mono text-console-white-bright mb-4">CREATE NEW MATCH</h2>
          
          {/* Event type selector */}
          <div className="mb-6">
            <label className="block text-console-white-dim text-sm font-mono mb-2">
              Select Event Type
            </label>
            <select 
              value={selectedEventType}
              onChange={handleEventTypeChange}
              className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono focus:border-console-blue-bright focus:outline-none"
            >
              <option value="">-- Select an event type --</option>
              <option value="basketball_nba">NBA Basketball</option>
              <option value="sandbox_metaverse">The Sandbox Metaverse</option>
            </select>
          </div>
          
          {/* Show NBA form when basketball_nba is selected */}
          {selectedEventType === 'basketball_nba' && (
            <form onSubmit={handleNBASubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Team */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Home Team *
                    {loadingTeams ? (
                      <div className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1">
                        Loading teams...
                      </div>
                    ) : (
                      <select
                        name="homeTeamId"
                        value={nbaMatchForm.homeTeamId}
                        onChange={handleNBAFormChange}
                        required
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      >
                        <option value="">-- Select home team --</option>
                        {nbaTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.city} {team.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </div>
                
                {/* Away Team */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Away Team *
                    {loadingTeams ? (
                      <div className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1">
                        Loading teams...
                      </div>
                    ) : (
                      <select
                        name="awayTeamId"
                        value={nbaMatchForm.awayTeamId}
                        onChange={handleNBAFormChange}
                        required
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      >
                        <option value="">-- Select away team --</option>
                        {nbaTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.city} {team.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </div>
                
                {/* Game Subtitle */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Game Subtitle
                    <input
                      type="text"
                      name="gameSubtitle"
                      value={nbaMatchForm.gameSubtitle}
                      onChange={handleNBAFormChange}
                      placeholder="e.g., Finals Game 1, Regular Season, Playoffs Round 1"
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    />
                  </label>
                </div>
                
                {/* Venue */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Venue
                    <input
                      type="text"
                      name="venue"
                      value={nbaMatchForm.venue}
                      onChange={handleNBAFormChange}
                      placeholder="e.g., Madison Square Garden, Staples Center"
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    />
                  </label>
                </div>
                
                {/* Scheduled Date/Time */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Scheduled Start Date & Time *
                    <input
                      type="datetime-local"
                      name="scheduledDateTime"
                      value={nbaMatchForm.scheduledDateTime}
                      onChange={handleNBAFormChange}
                      required
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    />
                  </label>
                </div>
                
                {/* Timezone */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    <div className="flex items-center gap-2">
                      Timezone *
                      <div className="relative">
                        <div 
                          className="w-4 h-4 rounded-full border border-console-blue-dark bg-console-black text-console-blue-bright text-xs flex items-center justify-center cursor-help font-mono transition-colors hover:bg-console-blue-dark"
                          onMouseEnter={() => setShowTimezoneTooltip('nba')}
                          onMouseLeave={() => setShowTimezoneTooltip(null)}
                        >
                          ?
                        </div>
                        {showTimezoneTooltip === 'nba' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-console-black border border-console-blue-dark rounded text-xs text-console-white-bright font-mono whitespace-nowrap z-10 shadow-lg">
                            Dates are stored in UTC, but will always be presented in the timezone originally entered in the editor
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-console-blue-dark"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      name="timezone"
                      value={nbaMatchForm.timezone}
                      onChange={handleNBAFormChange}
                      required
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    >
                      {getUSTimezones().map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
                          
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || loadingTeams}
                  className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-2 px-4 rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'CREATING NBA MATCH...' : 'CREATE NBA MATCH'}
                </button>
              </div>
            </form>
          )}
          
          {/* Show Sandbox form when sandbox_metaverse is selected */}
          {selectedEventType === 'sandbox_metaverse' && (
            <form onSubmit={handleSandboxSubmit} className="space-y-4">
              {/* Player Fields - Left/Right Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player 1 Column */}
                <div className="space-y-4">
                  <h3 className="text-console-white-bright font-mono text-base border-b border-console-blue-dark pb-2">Player 1</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Name *
                      <input
                        type="text"
                        name="player1Name"
                        value={sandboxMatchForm.player1Name}
                        onChange={handleSandboxFormChange}
                        placeholder="@username, TSB_GamerTag, Discord#1234"
                        required
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Subtitle
                      <input
                        type="text"
                        name="player1Subtitle"
                        value={sandboxMatchForm.player1Subtitle}
                        onChange={handleSandboxFormChange}
                        placeholder="Secondary text displayed below player name"
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Image URL
                      <input
                        type="url"
                        name="player1ImageUrl"
                        value={sandboxMatchForm.player1ImageUrl}
                        onChange={handleSandboxFormChange}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
                
                {/* Player 2 Column */}
                <div className="space-y-4">
                  <h3 className="text-console-white-bright font-mono text-base border-b border-console-blue-dark pb-2">Player 2</h3>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Name *
                      <input
                        type="text"
                        name="player2Name"
                        value={sandboxMatchForm.player2Name}
                        onChange={handleSandboxFormChange}
                        placeholder="@username, TSB_GamerTag, Discord#1234"
                        required
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Subtitle
                      <input
                        type="text"
                        name="player2Subtitle"
                        value={sandboxMatchForm.player2Subtitle}
                        onChange={handleSandboxFormChange}
                        placeholder="Secondary text displayed below player name"
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-console-white-dim text-sm font-mono">
                      Image URL
                      <input
                        type="url"
                        name="player2ImageUrl"
                        value={sandboxMatchForm.player2ImageUrl}
                        onChange={handleSandboxFormChange}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Match Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scheduled Date/Time */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    Scheduled Start Date & Time *
                    <input
                      type="datetime-local"
                      name="scheduledDateTime"
                      value={sandboxMatchForm.scheduledDateTime}
                      onChange={handleSandboxFormChange}
                      required
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    />
                  </label>
                </div>
                
                {/* Timezone */}
                <div className="space-y-2">
                  <label className="block text-console-white-dim text-sm font-mono">
                    <div className="flex items-center gap-2">
                      Timezone *
                      <div className="relative">
                        <div 
                          className="w-4 h-4 rounded-full border border-console-blue-dark bg-console-black text-console-blue-bright text-xs flex items-center justify-center cursor-help font-mono transition-colors hover:bg-console-blue-dark"
                          onMouseEnter={() => setShowTimezoneTooltip('sandbox')}
                          onMouseLeave={() => setShowTimezoneTooltip(null)}
                        >
                          ?
                        </div>
                        {showTimezoneTooltip === 'sandbox' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-console-black border border-console-blue-dark rounded text-xs text-console-white-bright font-mono whitespace-nowrap z-10 shadow-lg">
                            Dates are stored in UTC, but will always be presented in the timezone originally entered in the editor
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-console-blue-dark"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <select
                      name="timezone"
                      value={sandboxMatchForm.timezone}
                      onChange={handleSandboxFormChange}
                      required
                      className="w-full bg-console-black border border-console-blue-dark p-2 rounded-sm text-console-white font-mono mt-1 focus:border-console-blue-bright focus:outline-none"
                    >
                      {getSoutheastAsianTimezones().map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
                          
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-2 px-4 rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'CREATING SANDBOX MATCH...' : 'CREATE SANDBOX MATCH'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      
      {/* Recently created matches section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-mono text-console-white">EXISTING MATCHES</h2>
          <button 
            onClick={loadExistingMatches}
            className="bg-console-blue hover:bg-console-blue-bright text-console-white font-mono py-1 px-3 rounded-sm transition-colors text-sm"
          >
            REFRESH
          </button>
        </div>
        
        {loadingMatches ? (
          <div className="bg-console-gray-terminal/30 border border-console-blue p-6 rounded-md shadow-terminal flex justify-center items-center">
            <div className="animate-pulse text-console-blue-bright font-mono">LOADING MATCHES...</div>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-console-white-bright font-mono">{match.home_team.name} vs {match.away_team.name}</h3>
                    <p className="text-console-white-dim text-sm mb-1">
                      {new Date(match.commence_time).toLocaleString()} | {match.sport_title}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
                        {(match.sport_name || 'sport').toUpperCase()}
                      </span>
                      <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-console-blue-bright">
                        {(match.league_name || 'league').toUpperCase()}
                      </span>
                      {match.bookmakers && match.bookmakers.length > 0 && (
                        <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-green-400">
                          ODDS AVAILABLE
                        </span>
                      )}
                      {match.completed && (
                        <span className="bg-console-black/50 px-2 py-0.5 text-xs font-mono text-yellow-400">
                          COMPLETED
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this match?')) {
                          deleteMatch(match.id).then(async success => {
                            if (success) {
                              setMatches(prev => prev.filter(m => m.id !== match.id));
                              toast.success('Match deleted');
                              
                              // Refresh matches data
                              console.log('Refreshing matches data...');

                              // Refresh matches in the MatchesContext
                              try {
                                await refreshMatches();
                              } catch (refreshError) {
                                console.error('Error refreshing matches after deletion:', refreshError);
                              }
                            } else {
                              toast.error('Failed to delete match');
                            }
                          });
                        }
                      }}
                      className="bg-red-700 hover:bg-red-600 text-white font-mono py-1 px-2 rounded-sm text-sm"
                    >
                      DELETE
                    </button>
                    {!match.completed && (
                      <button
                        onClick={() => {
                          const homeScore = prompt('Enter home team score:', '0');
                          const awayScore = prompt('Enter away team score:', '0');
                          if (homeScore !== null && awayScore !== null) {
                            updateMatchScoresAdmin(
                              match.id, 
                              parseInt(homeScore) || 0, 
                              parseInt(awayScore) || 0, 
                              true
                            ).then(async success => {
                              if (success) {
                                toast.success('Match scores updated');
                                await loadExistingMatches();
                                await refreshMatches();
                              } else {
                                toast.error('Failed to update match scores');
                              }
                            });
                          }
                        }}
                        className="bg-yellow-600 hover:bg-yellow-500 text-black font-mono py-1 px-2 rounded-sm text-sm"
                      >
                        SET SCORES
                      </button>
                    )}
                  </div>
                </div>
                {match.scores && (
                  <div className="mt-2 bg-console-black/30 p-2 inline-block">
                    <span className="text-console-white-bright font-mono">
                      SCORE: {match.home_team.name} {match.scores.home} - {match.scores.away} {match.away_team.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-console-gray-terminal/30 border border-console-blue p-4 rounded-md shadow-terminal text-console-white-dim">
            No matches found. Create a match above to see it here.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage; 