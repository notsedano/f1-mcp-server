/**
 * DEPRECATED: Do not add new functionality or increase imports in this file.
 * This page is being phased out. Only critical bugfixes are allowed.
 * 
 * REPLACEMENT: Use UserHomePage.tsx instead for new home page functionality.
 * 
 * LLMs and maintainers: Do not extend this file. Direct new features to UserHomePage.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Terminal, Cpu, Code, MessageSquare } from 'lucide-react';
import { Conference, Division, StandingsTeam } from '../../types';
import { fetchNBAStandings } from '../services/standingsService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import DareDevilChatModal from '../../components/chat/DareDevilChatModal';

const HomePage: React.FC = () => {
  const [activeConference, setActiveConference] = useState<'Eastern' | 'Western'>('Eastern');
  const [standings, setStandings] = useState<{ eastern: Conference, western: Conference } | null>(null);
  const [loadingStandings, setLoadingStandings] = useState<boolean>(true);
  const [isLiveData, setIsLiveData] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('mock');
  const [isDareDevilModalOpen, setIsDareDevilModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Fetch standings data when component mounts
    const loadStandings = async () => {
      try {
        setLoadingStandings(true);
        const response = await fetchNBAStandings();
        setStandings({
          eastern: response.eastern,
          western: response.western
        });
        setIsLiveData(response.isLive);
        setDataSource(response.dataSource);
        console.log('=== HOME PAGE: Loaded standings data ===', response.dataSource);
      } catch (error) {
        console.error('Error loading standings:', error);
      } finally {
        setLoadingStandings(false);
      }
    };

    loadStandings();
  }, []);

  const getTerminalTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getSessionID = () => {
    // Generate a random session ID that remains consistent during the session
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };

  // Format win percentage to display as .XXX
  const formatPct = (pct: number): string => {
    return pct.toFixed(3).slice(1); // Remove the leading 0
  };

  // Function to render team row with clinched indicators
  const renderTeamRow = (team: StandingsTeam) => {
    return (
      <tr key={team.name} className="border-b border-console-blue/20 hover:bg-console-blue/5">
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-left">
          <div className="flex items-center">
            <span>{team.name}</span>
            {team.clinched === 'playoff' && <span className="ml-1 text-xs text-console-blue-bright">x</span>}
            {team.clinched === 'division' && <span className="ml-1 text-xs text-yellow-300">y</span>}
            {team.clinched === 'homeCourt' && <span className="ml-1 text-xs text-green-400">z</span>}
          </div>
        </td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center text-console-white">{team.wins}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center text-console-white-dim">{team.losses}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">{formatPct(team.winPercentage)}</td>
        <td className="px-2 sm:px-3 py-1 sm:py-2 text-center">{team.last10}</td>
        <td className={`px-2 sm:px-3 py-1 sm:py-2 text-center ${team.streak.startsWith('W') ? 'text-green-400' : 'text-red-400'}`}>{team.streak}</td>
      </tr>
    );
  };

  // Function to render a division
  const renderDivision = (division: Division) => {
    return (
      <React.Fragment key={division.name}>
        <tr className="bg-console-blue/10 border-b border-t border-console-blue/30">
          <td colSpan={6} className="px-2 sm:px-3 py-1 text-console-blue-bright font-bold">{division.name.toUpperCase()}</td>
        </tr>
        {division.teams.map(team => renderTeamRow(team))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* Original Image Banner Section - Optimized for transparency */}
      <section className="w-full bg-transparent overflow-hidden px-2 sm:px-0">
        {/* Full-width image container with transparent background */}
        <div className="relative w-full flex justify-center max-w-6xl mx-auto">
          <img 
            src="https://i.ibb.co/JRf70N7Z/daredevil-png.png" 
            alt="NBA Betting Agent" 
            className="w-full h-auto object-contain relative z-0"
          />
        </div>
      </section>
      
      {/* Daredevil Banner - Optimized for transparency */}
      <section className="w-full bg-transparent overflow-hidden px-2 sm:px-0">
        {/* Full-width image container with transparent background */}
        <div className="relative w-full flex justify-center max-w-6xl mx-auto">
          <img 
            src="https://i.ibb.co/rGh18fww/nba-banner-v3.png"
            alt="Agent Daredevil - Wanna Bet?" 
            className="w-full h-auto object-contain relative z-0"
          />
        </div>
      </section>
      
      {/* DareDevil Chat Button */}
      <div className="flex justify-center my-6 max-w-6xl mx-auto px-2 sm:px-0">
        <button
          onClick={() => setIsDareDevilModalOpen(true)}
          className="bg-red-900/80 text-white px-6 py-3 font-mono text-sm hover:bg-red-800 transition-all duration-300 flex items-center gap-3 border-1 border-red-500 shadow-glow-red w-full sm:w-auto justify-center relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/0 via-red-500/20 to-red-900/0 opacity-0 group-hover:opacity-100 animate-pulse-slow transition-opacity"></div>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-red-900/0 via-red-500/90 to-red-900/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-r from-red-900/0 via-red-500/90 to-red-900/0 transform translate-x-[100%] group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
          
          {/* Console glitch effect */}
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100"></div>
          
          {/* Animated icon */}
          <div className="relative">
            <MessageSquare className="h-5 w-5 animate-pulse text-red-400" />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
          </div>
          
          {/* Text - removed hover animation */}
          <span className="relative">
            CHAT WITH AGENT DAREDEVIL
          </span>
          
          {/* Terminal decorations */}
          <span className="absolute top-0 right-0 text-[8px] text-red-400 opacity-80 px-1">v1.3</span>
          <span className="absolute top-1 left-1 w-1 h-1 bg-red-500 rounded-full"></span>
          <span className="absolute bottom-1 right-1 w-1 h-1 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* DareDevil Chat Modal */}
      <DareDevilChatModal 
        isOpen={isDareDevilModalOpen} 
        onClose={() => setIsDareDevilModalOpen(false)} 
      />
      
      {/* Features Section */}
      <section className="py-4 sm:py-6 max-w-6xl mx-auto px-2 sm:px-0">
        <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-3 sm:p-4 mb-4 sm:mb-6 relative overflow-hidden">
          {/* Animated background scan effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-console-blue/5 to-transparent opacity-50 animate-terminal-scan"></div>
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-terminal-grid bg-grid opacity-30"></div>
          
          <h2 className="text-lg sm:text-xl font-display uppercase text-console-white tracking-wider text-center relative z-10">
            <span className="text-console-blue-bright mr-1">_</span>
            SYSTEM<span className="text-console-blue-bright">_</span>FEATURES
            <span className="absolute -bottom-1 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-console-blue-bright to-transparent"></span>
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* P2P Betting Feature Card */}
          <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-glow group relative overflow-hidden">
            {/* Animated corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Animated background scan */}
            <div className="absolute inset-0 bg-gradient-to-r from-console-blue/0 via-console-blue/10 to-console-blue/0 opacity-0 group-hover:opacity-100 animate-pulse-slow"></div>
            
            {/* Icon with dynamic effects */}
            <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-3 sm:mb-4 relative group-hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 rounded-full bg-console-blue/20 animate-pulse-slow opacity-0 group-hover:opacity-100"></div>
              <Code className="h-6 w-6 sm:h-7 sm:w-7 text-console-blue-bright relative z-10" />
              
              {/* Rotating accent ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-console-blue/30 group-hover:border-console-blue/60 transition-colors opacity-0 group-hover:opacity-100 animate-spin-slow"></div>
            </div>
            
            <h3 className="text-base sm:text-lg font-display uppercase text-console-blue-bright mb-2 relative">
              P2P<span className="text-console-white">_</span>BETTING
              <span className="absolute -bottom-1 left-1/4 right-1/4 h-px bg-console-blue/50 transform scale-x-0 group-hover:scale-x-100 transition-transform"></span>
            </h3>
            
            <p className="text-console-white-muted font-mono text-xs leading-relaxed">
              CREATE SECURE BETS ON NBA GAMES AND MATCH WITH USERS ON THE OPPOSITE SIDE.
            </p>
            
            {/* Data visualization accent */}
            <div className="absolute bottom-2 left-2 right-2 h-1 flex space-x-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-1/6"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-2/6"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-1/6"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-3/6"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-1/6"></div>
            </div>
          </div>
          
          {/* Secure Escrow Feature Card */}
          <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-glow group relative overflow-hidden">
            {/* Animated corner accents */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Animated background scan */}
            <div className="absolute inset-0 bg-gradient-to-l from-console-blue/0 via-console-blue/10 to-console-blue/0 opacity-0 group-hover:opacity-100 animate-pulse-slow"></div>
            
            {/* Icon with dynamic effects */}
            <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-3 sm:mb-4 relative group-hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 rounded-full bg-console-blue/20 animate-pulse-slow opacity-0 group-hover:opacity-100"></div>
              <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-console-blue-bright relative z-10" />
              
              {/* Shield animation effect */}
              <div className="absolute inset-1 rounded-full bg-console-blue/10 transform scale-0 group-hover:scale-100 transition-transform duration-700 opacity-0 group-hover:opacity-100"></div>
              <div className="absolute inset-0 rounded-full border-2 border-console-blue/30 group-hover:border-console-blue/60 transition-colors opacity-0 group-hover:opacity-100"></div>
            </div>
            
            <h3 className="text-base sm:text-lg font-display uppercase text-console-blue-bright mb-2 relative">
              SECURE<span className="text-console-white">_</span>ESCROW
              <span className="absolute -bottom-1 left-1/4 right-1/4 h-px bg-console-blue/50 transform scale-x-0 group-hover:scale-x-100 transition-transform"></span>
            </h3>
            
            <p className="text-console-white-muted font-mono text-xs leading-relaxed">
              FUNDS HELD IN SMART CONTRACT ESCROW UNTIL GAME COMPLETION FOR SECURE PAYOUTS.
            </p>
            
            {/* Security code visualization */}
            <div className="absolute bottom-2 left-2 right-2 h-1 flex items-center justify-center space-x-1 opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="h-full w-1 bg-console-blue-bright"></div>
              <div className="h-full w-2 bg-console-blue-bright"></div>
              <div className="h-full w-3 bg-console-blue-bright"></div>
              <div className="h-full w-4 bg-console-blue-bright"></div>
              <div className="h-full w-3 bg-console-blue-bright"></div>
              <div className="h-full w-2 bg-console-blue-bright"></div>
              <div className="h-full w-1 bg-console-blue-bright"></div>
            </div>
          </div>
          
          {/* AI Analytics Feature Card */}
          <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-glow group relative overflow-hidden">
            {/* Animated corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-console-blue-bright opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Animated background scan */}
            <div className="absolute inset-0 bg-gradient-to-t from-console-blue/0 via-console-blue/10 to-console-blue/0 opacity-0 group-hover:opacity-100 animate-pulse-slow"></div>
            
            {/* Icon with dynamic effects */}
            <div className="bg-console-black/70 backdrop-blur-xs border-1 border-console-blue p-3 rounded-full mb-3 sm:mb-4 relative group-hover:shadow-glow transition-all duration-300">
              <div className="absolute inset-0 rounded-full bg-console-blue/20 animate-pulse-slow opacity-0 group-hover:opacity-100"></div>
              <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-console-blue-bright relative z-10" />
              
              {/* CPU processing animation */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-console-blue/30 group-hover:border-console-blue/60 transition-colors opacity-0 group-hover:opacity-100 animate-spin-slow"></div>
              <div className="absolute inset-0 rounded-full border-2 border-console-blue/30 group-hover:border-console-blue/60 transition-colors opacity-0 group-hover:opacity-100"></div>
            </div>
            
            <h3 className="text-base sm:text-lg font-display uppercase text-console-blue-bright mb-2 relative">
              AI<span className="text-console-white">_</span>ANALYTICS
              <span className="absolute -bottom-1 left-1/4 right-1/4 h-px bg-console-blue/50 transform scale-x-0 group-hover:scale-x-100 transition-transform"></span>
            </h3>
            
            <p className="text-console-white-muted font-mono text-xs leading-relaxed">
              ADVANCED ALGORITHMS PROVIDE REAL-TIME INSIGHTS ON GAMES AND BETTING PATTERNS.
            </p>
            
            {/* Data visualization accent */}
            <div className="absolute bottom-2 left-2 right-2 h-1 flex space-x-0.5 opacity-40 group-hover:opacity-80 transition-opacity">
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-1/12 group-hover:animate-pulse"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-2/12 group-hover:animate-pulse"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-3/12 group-hover:animate-pulse"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-4/12 group-hover:animate-pulse"></div>
              <div className="h-full bg-console-blue-bright flex-grow-0 flex-shrink-0 w-2/12 group-hover:animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>

      {/* League Stats Section - Updated with dynamic data */}
      <section className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-6 max-w-6xl mx-auto px-2 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 pb-2 border-b border-console-blue/50 gap-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase text-console-white tracking-wider">LEAGUE_STATS</h2>
          <div className="text-xs text-console-white-dim font-mono bg-console-blue/20 px-3 py-1 flex items-center gap-2">
            <span>2024/2025 SEASON</span>
            {dataSource === 'yahoo' && isLiveData && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-mono rounded">YAHOO DATA</span>
            )}
            {!isLiveData && (
              <span className="px-2 py-0.5 bg-yellow-600 text-black text-[10px] font-mono rounded">MOCK DATA</span>
            )}
          </div>
        </div>
        
        {/* Conference Tabs */}
        <div className="flex mb-4 border-b border-console-blue/30">
          <button 
            className={`px-3 sm:px-4 py-1 sm:py-2 font-mono text-sm ${
              activeConference === 'Eastern' 
                ? 'text-console-white bg-console-blue/90 border-t border-l border-r border-console-blue' 
                : 'text-console-white-dim hover:text-console-white transition-colors'
            }`}
            onClick={() => setActiveConference('Eastern')}
          >
            EASTERN
          </button>
          <button 
            className={`px-3 sm:px-4 py-1 sm:py-2 font-mono text-sm ${
              activeConference === 'Western' 
                ? 'text-console-white bg-console-blue/90 border-t border-l border-r border-console-blue' 
                : 'text-console-white-dim hover:text-console-white transition-colors'
            }`}
            onClick={() => setActiveConference('Western')}
          >
            WESTERN
          </button>
        </div>
        
        {/* Standings Table */}
        <div className="overflow-x-auto custom-scrollbar">
          {loadingStandings ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size={6} color="text-console-blue-bright" />
            </div>
          ) : standings ? (
            <table className="w-full text-xs sm:text-sm font-mono">
              <thead className="bg-console-black/70 text-console-white-dim">
                <tr>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">TEAM</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">W</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">L</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">PCT</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">LAST 10</th>
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-center">STREAK</th>
                </tr>
              </thead>
              <tbody>
                {/* Render divisions for the active conference */}
                {activeConference === 'Eastern' 
                  ? standings.eastern.divisions.map(division => renderDivision(division))
                  : standings.western.divisions.map(division => renderDivision(division))
                }
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-console-white-dim font-mono">
              Failed to load standings data. Please try again later.
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 sm:mt-6 pt-2 border-t border-console-blue/50 gap-3">
          <div className="text-xs text-console-white-dim flex flex-col gap-1">
            <div>
              <span className="text-console-blue-bright">*</span> Stats provided by Yahoo Sports
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-400"></span> Win</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-red-400"></span> Loss</span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
              <span className="flex items-center gap-1"><span className="text-console-blue-bright text-xs">x</span> Clinched Playoff</span>
              <span className="flex items-center gap-1"><span className="text-yellow-300 text-xs">y</span> Clinched Division</span>
              <span className="flex items-center gap-1"><span className="text-green-400 text-xs">z</span> Clinched Home Court</span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <Link
              to="/matches"
              className="bg-console-blue/90 backdrop-blur-xs text-console-white font-mono uppercase tracking-wider px-3 sm:px-4 py-1 sm:py-2 shadow-button hover:shadow-glow transition-all duration-300 text-xs sm:text-sm flex items-center justify-center gap-2"
            >
              <span>VIEW MATCHES</span>
            </Link>
            <Link
              to="/matches"
              className="bg-black/50 backdrop-blur-xs border-1 border-yellow-400 text-yellow-300 font-mono uppercase tracking-wider px-3 sm:px-4 py-1 sm:py-2 hover:shadow-yellow transition-all text-xs sm:text-sm flex items-center justify-center gap-2 shadow-yellow-glow animate-pulse-subtle"
            >
              <span>PLACE BETS</span>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Session ID indicator at bottom */}
      <div className="fixed bottom-4 left-2 sm:left-4 bg-console-black/60 backdrop-blur-xs border-1 border-console-blue px-1 sm:px-2 py-0.5 text-console-white-dim font-mono text-[10px] sm:text-xs z-[40]">
        SESSION: {getSessionID()}
      </div>
    </div>
  );
};

export default HomePage;