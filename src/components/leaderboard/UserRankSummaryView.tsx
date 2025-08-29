/**
 * UserRankSummaryView - Displays user's current rank with point-earning actions
 * 
 * Shows rank summary message and configurable list of available point-earning actions.
 * Actions are fetched from remote configuration for easy management.
 */

import React, { useState, useEffect } from 'react';
import { UserRankData } from '../../services/leaderboardService';
import PointEarningActionsView from './PointEarningActionsView';

interface UserRankSummaryViewProps {
  userRank: UserRankData;
}

const UserRankSummaryView: React.FC<UserRankSummaryViewProps> = ({ userRank }) => {
  const { rank, totalUsers } = userRank;

  // Determine if user is in top 10
  const isInTop10 = rank > 0 && rank <= 10;

  // Generate rank suffix (1st, 2nd, 3rd, 4th, etc.)
  const getRankSuffix = (rank: number): string => {
    if (rank === 0) return '';
    
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${rank}th`;
    }
    
    switch (lastDigit) {
      case 1: return `${rank}st`;
      case 2: return `${rank}nd`;
      case 3: return `${rank}rd`;
      default: return `${rank}th`;
    }
  };

  // Generate rank message based on position
  const getRankMessage = (): string => {
    if (rank === 0 || totalUsers === 0) {
      return "Welcome to Agent DD! Start earning points to see your rank.";
    }

    const rankText = getRankSuffix(rank);
    
    if (isInTop10) {
      return `Congrats, you rank ${rankText} among ${totalUsers} users! Keep using Agent DD to earn more points with the following actions:`;
    } else {
      return `You rank ${rankText} among ${totalUsers} users. Keep using Agent DD to earn more points with the following actions:`;
    }
  };

  return (
    <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal p-4 sm:p-6 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-console-blue/0 via-console-blue/5 to-console-blue/0 opacity-50"></div>
      <div className="absolute inset-0 bg-terminal-grid bg-grid opacity-20"></div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-console-blue-bright opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-console-blue-bright opacity-60"></div>
      
      <div className="relative z-10 space-y-4">
        {/* Rank Message */}
        <div className="text-center">
          <p className="text-console-white font-mono text-base sm:text-lg leading-relaxed">
            {getRankMessage()}
          </p>
        </div>

        {/* Point-Earning Actions */}
        {(rank > 0 || totalUsers > 0) && (
          <PointEarningActionsView />
        )}
      </div>
    </div>
  );
};

export default UserRankSummaryView;