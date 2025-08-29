/**
 * DashboardView - Main dashboard page with leaderboard
 * 
 * Replaces UserHomePage with leaderboard functionality while maintaining
 * the existing cyberpunk look-and-feel of the web app.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Shield, Cpu, MessageSquare } from 'lucide-react';
import LeaderboardSectionView from '../components/leaderboard/LeaderboardSectionView';
import DareDevilChatModal from '../components/chat/DareDevilChatModal';
import { useAuth } from '../context/AuthContext';

const DashboardView: React.FC = () => {
  const [isDareDevilModalOpen, setIsDareDevilModalOpen] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleDareDevilClick = () => {
    if (isAuthenticated) {
      // Navigate to the Comms tab (/chat)
      navigate('/chat');
    } else {
      // Prompt to log in
      navigate('/login');
    }
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
      
      {/* NBA Banner - Optimized for transparency */}
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
          onClick={handleDareDevilClick}
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
          
          {/* Text */}
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
      
      {/* System Features Section */}
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

      {/* Leaderboard Section */}
      <div className="max-w-6xl mx-auto px-2 sm:px-0">
        <LeaderboardSectionView />
      </div>
    </div>
  );
};

export default DashboardView;