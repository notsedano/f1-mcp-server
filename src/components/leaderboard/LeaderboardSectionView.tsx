/**
 * LeaderboardSectionView - Container component for leaderboard functionality
 * 
 * Handles data fetching and provides leaderboard data to child components.
 * Contains UserRankSummaryView and LeaderboardTableView.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getLeaderboardWithUserRank, 
  LeaderboardEntry, 
  UserRankData 
} from '../../services/leaderboardService';
import UserRankSummaryView from '../leaderboard/UserRankSummaryView';
import LeaderboardTableView from '../leaderboard/LeaderboardTableView';
import LoadingSpinner from '../common/LoadingSpinner';

const LeaderboardSectionView: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<UserRankData>({ rank: 0, totalUsers: 0, totalPoints: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!user?.userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await getLeaderboardWithUserRank(user.userId, 10);
        setLeaderboard(data.leaderboard);
        setUserRank(data.userRank);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError('Failed to load leaderboard data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [user?.userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
        <span className="ml-3 text-console-white-muted font-mono">Loading leaderboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-console-black/80 backdrop-blur-xs border-1 border-red-500 shadow-terminal p-6 text-center">
        <p className="text-red-400 font-mono mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-console-blue hover:bg-console-blue-bright text-console-black font-mono px-4 py-2 border-1 border-console-blue transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 relative overflow-hidden">
        {/* Animated background scan effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-console-blue/5 to-transparent opacity-50 animate-terminal-scan"></div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-terminal-grid bg-grid opacity-30"></div>
        
        <h1 className="text-xl sm:text-2xl font-display uppercase text-console-white tracking-wider text-center relative z-10">
          <span className="text-console-blue-bright mr-1">_</span>
          DARE<span className="text-console-blue-bright">_</span>POINTS<span className="text-console-blue-bright">_</span>LEADERBOARD
          <span className="absolute -bottom-1 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-console-blue-bright to-transparent"></span>
        </h1>
      </div>

      {/* User Rank Summary */}
      <UserRankSummaryView userRank={userRank} />

      {/* Leaderboard Table */}
      <LeaderboardTableView 
        leaderboard={leaderboard} 
        currentUserId={user?.userId || ''} 
      />
    </div>
  );
};

export default LeaderboardSectionView;