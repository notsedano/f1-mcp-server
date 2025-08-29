/**
 * @deprecated This component is deprecated and scheduled for deletion.
 * Use NavigationBar.tsx instead.
 * 
 * This file is kept temporarily for reference during the transition period.
 * DO NOT USE THIS COMPONENT IN NEW CODE.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, User, Database, MessageSquare, Terminal, LogOut, Trophy, RefreshCw, Star, Archive, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePoints } from '../../context/PointsContext';
import PointsDisplay from '../../components/PointsDisplay';
// import { getUsersByPoints, LeaderboardEntry } from '../../services/for_removal/betStorageService';
// import { getMockLeaderboardEntries } from '../../mockSupabase';

const Navbar: React.FC = () => {
  const { user, authMethod, isAuthenticated, isAdmin, logout } = useAuth();
  const { userBalance } = usePoints();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Monitor window size for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Set initial state
    checkMobile();
    
    // Add event listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user's rank based on $DARE points - COMMENTED OUT DUE TO LEGACY SERVICE REMOVAL
  const fetchUserRank = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setUserRank(null);
      return;
    }

    // Legacy rank fetching disabled - will be reimplemented with new services
    setUserRank(null);
    
    /*
    setIsLoading(true);
    try {
      // Get leaderboard data
      let leaderboardData: LeaderboardEntry[] = [];
      try {
        leaderboardData = await getUsersByPoints(100);
        
        // If no real data, add mock data in development mode
        if (leaderboardData.length === 0 && import.meta.env.DEV) {
          leaderboardData = getMockLeaderboardEntries();
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        // Fallback to mock data in development mode
        if (import.meta.env.DEV) {
          leaderboardData = getMockLeaderboardEntries();
        }
      }

      // Find user's position in the leaderboard
      if (leaderboardData.length > 0) {
        // For wallet users, match by wallet address
        if (authMethod === 'wallet' && user.walletAddress) {
          const index = leaderboardData.findIndex(entry => 
            entry.wallet_address && 
            entry.wallet_address.toLowerCase() === user.walletAddress?.toLowerCase()
          );
          if (index !== -1) {
            setUserRank(index + 1);
          } else {
            // If user not found in leaderboard but has points, estimate rank based on points
            const estimatedRank = leaderboardData.filter(entry => 
              (entry.dare_points || 0) > userBalance
            ).length + 1;
            setUserRank(estimatedRank);
          }
        } 
        // For email users, match by user ID or estimate by points
        else if (user.id) {
          const index = leaderboardData.findIndex(entry => entry.user_id === user.id);
          if (index !== -1) {
            setUserRank(index + 1);
          } else {
            // Estimate rank based on points
            const estimatedRank = leaderboardData.filter(entry => 
              (entry.dare_points || 0) > userBalance
            ).length + 1;
            setUserRank(estimatedRank);
          }
        }
      }
    } catch (error) {
      console.error('Error determining user rank:', error);
    } finally {
      setIsLoading(false);
    }
    */
  }, [user, isAuthenticated, userBalance, authMethod]);

  // Fetch rank on mount and when user balance changes
  useEffect(() => {
    fetchUserRank();
  }, [fetchUserRank, userBalance]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getSessionID = () => {
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };

  // isAdmin is already destructured from useAuth() above

  const navLinks = [
    { 
      path: '/dashboard', 
      label: 'HOME', 
      icon: Home,
      requiresAuth: true // Will prompt login if not authenticated
    },
    { path: '/matches', label: 'MATCHES', icon: Activity, requiresAuth: false },
    { path: '/bets', label: 'BETS', icon: Archive, requiresAuth: true },
    { path: '/chat', label: 'CHAT', icon: MessageSquare, requiresAuth: true },
    { path: '/profile', label: 'PROFILE', icon: User, requiresAuth: true },
    { path: '/admin', label: 'ADMIN', icon: Database, requiresAuth: true, requiresAdmin: true },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Handle navigation with authentication check
  const handleNavigation = (link: any, event: React.MouseEvent) => {
    // Always allow admin navigation if user is admin
    if (link.requiresAdmin && !isAdmin) {
      return;
    }
    
    // If link requires auth and user is not authenticated, redirect to login
    if (link.requiresAuth && !isAuthenticated) {
      event.preventDefault();
      // Store the intended destination for after login
      sessionStorage.setItem('redirectAfterLogin', link.path);
      navigate('/login');
    }
    // Otherwise, navigation proceeds normally via the Link component
  };

  // Simulate a refresh action
  const handleRefresh = () => {
    // Refresh rank and other data
    fetchUserRank();
    console.log('Refreshing...');
    window.location.reload();
  };

  // Get filtered links - now show all relevant links regardless of auth status
  const getFilteredLinks = () => {
    return navLinks.filter(link => 
      (!link.requiresAdmin || (link.requiresAdmin && isAdmin))
    );
  };

  return (
    <>
      {/* Top fixed header navbar - made more consistent with screenshots */}
      <div className="fixed top-0 left-0 right-0 bg-console-blue/90 h-12 z-[999] flex items-center border-b border-console-blue shadow-terminal overflow-hidden">
        <div className="w-full h-full flex items-center justify-between px-2 sm:px-4">
          {/* Left: BET_TERMINAL */}
          <div className="flex items-center h-full shrink-0">
            <div className="text-xs text-console-white font-mono tracking-wide whitespace-nowrap">[ BET_TERMINAL ]</div>
          </div>
          
          {/* Center: Rank and Refresh Button - responsive layout */}
          <div className="flex items-center gap-2 sm:gap-6 mx-1 shrink-0">
            {/* Rank */}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-[#E5FF03]" />
              <div className="text-xs text-console-white font-mono whitespace-nowrap">
                RANK: <span className="text-[#E5FF03]">{isAuthenticated ? (isLoading ? '...' : userRank || '?') : '-'}</span>
              </div>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-1 text-xs text-console-white font-mono tracking-wide hover:text-[#E5FF03] transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden xs:inline">[ REFRESH ]</span>
              <span className="xs:hidden">[ R ]</span>
            </button>
          </div>
          
          {/* Right: User and $DARE - improved spacing to prevent overlap */}
          <div className="flex items-center space-x-1 sm:space-x-3 shrink-0">
            {isAuthenticated ? (
              <>
                {/* User Name - Hidden on very small screens */}
                <div className="hidden xs:flex items-center">
                  <span className="text-xs text-console-white font-mono truncate max-w-[40px] sm:max-w-[80px]">
                    {authMethod === 'wallet' && user?.walletAddress 
                      ? formatAddress(user.walletAddress) 
                      : user?.email?.split('@')[0] || 'admin'}
                  </span>
                </div>
                
                {/* DARE Points - styled to match the screenshot */}
                <div className="flex items-center">
                  <span className="text-xs text-console-white-dim font-mono">$DARE:</span>
                  <span className="ml-1 text-xs text-[#E5FF03] font-mono">{userBalance}</span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="text-console-white hover:text-[#E5FF03] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center text-xs text-console-white font-mono uppercase tracking-wider hover:text-[#E5FF03] transition-colors"
              >
                <span className="mr-1">&gt;</span> LOGIN
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation - fixed at the bottom, with adjustments for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-console-blue/90 backdrop-blur-xs border-t border-console-blue flex justify-around items-center h-16 z-[100] shadow-terminal">
        {getFilteredLinks().map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          const linkCount = getFilteredLinks().length;
          
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={(event) => handleNavigation(link, event)}
              className={`flex flex-col items-center justify-center py-2 ${isMobile ? 'px-2' : 'px-4'} ${
                isActive 
                  ? 'text-console-white animate-pulse-blue' 
                  : 'text-console-white-muted hover:text-console-white-dim transition-colors'
              }`}
              style={{ width: isMobile ? `${100 / linkCount}%` : 'auto' }}
            >
              <Icon className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} ${isActive ? 'text-console-blue-bright' : ''}`} />
              <span className={`text-xs mt-1 font-display tracking-wide ${isMobile && linkCount > 4 ? 'text-[10px]' : ''}`}>
                {link.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-console-blue-glow shadow-glow"></span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;