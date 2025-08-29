/**
 * LeaderboardTableView - Displays top 10 users in leaderboard table format
 * 
 * Shows ranked users with profile pictures, usernames, and points.
 * Highlights current user's row if they're in top 10.
 * Shows empty spots if fewer than 10 users exist.
 */

import React from 'react';
import { LeaderboardEntry } from '../../services/leaderboardService';

interface LeaderboardTableViewProps {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

const LeaderboardTableView: React.FC<LeaderboardTableViewProps> = ({ 
  leaderboard, 
  currentUserId 
}) => {
  // Create array of 10 spots, filling with actual users and empty spots
  const tableRows = Array.from({ length: 10 }, (_, index) => {
    const rank = index + 1;
    const user = leaderboard.find(entry => entry.rank === rank);
    
    if (user) {
      return {
        type: 'user' as const,
        rank,
        user,
        isCurrentUser: user.user_id === currentUserId
      };
    } else {
      return {
        type: 'empty' as const,
        rank,
        user: null,
        isCurrentUser: false
      };
    }
  });

  // Generate rank display with medal emojis for top 3
  const getRankDisplay = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈'; 
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  // Get placeholder image for users without profile pictures
  const getProfileImage = (imageUrl?: string): string => {
    if (imageUrl && imageUrl.trim()) {
      return imageUrl;
    }
    // Use a generic placeholder - you can replace this with your preferred placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMxZTI5M2IiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iIzM5NzNhYyIvPgo8cGF0aCBkPSJNMTAgMzJjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMHYySDEweiIgZmlsbD0iIzM5NzNhYyIvPgo8L3N2Zz4K';
  };

  return (
    <div className="bg-console-black/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal relative overflow-hidden">
      {/* Header */}
      <div className="bg-console-blue/20 border-b border-console-blue p-4">
        <h2 className="text-lg font-display uppercase text-console-white tracking-wider text-center">
          <span className="text-console-blue-bright mr-1">_</span>
          TOP<span className="text-console-blue-bright">_</span>COMPETITORS
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-console-blue/30">
              <th className="text-left px-4 py-3 text-console-blue-bright font-mono text-sm uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left px-4 py-3 text-console-blue-bright font-mono text-sm uppercase tracking-wider">
                Player
              </th>
              <th className="text-right px-4 py-3 text-console-blue-bright font-mono text-sm uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ type, rank, user, isCurrentUser }) => (
              <tr
                key={rank}
                className={`
                  border-b border-console-blue/20 transition-colors
                  ${type === 'user' 
                    ? isCurrentUser 
                      ? 'bg-console-blue/20 hover:bg-console-blue/30' 
                      : 'hover:bg-console-blue/10'
                    : 'opacity-60'
                  }
                `}
              >
                {/* Rank Column */}
                <td className="px-4 py-4">
                  <div className="flex items-center">
                    <span className="text-console-white font-mono text-base font-bold">
                      {getRankDisplay(rank)}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-2 text-console-blue-bright text-xs font-mono">
                        (You)
                      </span>
                    )}
                  </div>
                </td>

                {/* Player Column */}
                <td className="px-4 py-4">
                  {type === 'user' && user ? (
                    <div className="flex items-center space-x-3">
                      {/* Profile Image */}
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-console-blue/50 flex-shrink-0">
                        <img
                          src={getProfileImage(user.image_url)}
                          alt={`${user.username || 'User'} profile`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getProfileImage();
                          }}
                        />
                      </div>
                      
                      {/* Username */}
                      <div className="min-w-0 flex-1">
                        <p className="text-console-white font-mono text-sm font-medium truncate">
                          {user.username || 'Anonymous User'}
                        </p>
                        {user.wallet_address && (
                          <p className="text-console-white-muted font-mono text-xs truncate">
                            {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      {/* Empty profile placeholder */}
                      <div className="w-10 h-10 rounded-full border-2 border-dashed border-console-blue/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-console-blue/50 text-xs">?</span>
                      </div>
                      
                      {/* Empty slot label */}
                      <span className="text-console-white-muted font-mono text-sm italic">
                        Open Position
                      </span>
                    </div>
                  )}
                </td>

                {/* Points Column */}
                <td className="px-4 py-4 text-right">
                  {type === 'user' && user ? (
                    <div className="space-y-1">
                      <div className="text-console-white font-mono text-base font-bold">
                        {user.total_points.toLocaleString()}
                      </div>
                      <div className="text-console-white-muted font-mono text-xs">
                        DARE pts
                      </div>
                    </div>
                  ) : (
                    <div className="text-console-white-muted font-mono text-sm">
                      —
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with total users info */}
      {leaderboard.length > 0 && (
        <div className="bg-console-blue/10 border-t border-console-blue/30 p-3 text-center">
          <span className="text-console-white-muted font-mono text-xs">
            Showing top {Math.min(10, leaderboard.length)} of {leaderboard.length} competitors
          </span>
        </div>
      )}
    </div>
  );
};

export default LeaderboardTableView;