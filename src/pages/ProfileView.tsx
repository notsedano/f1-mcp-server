import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserAccount } from '../context/UserAccountContext';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon } from 'lucide-react';

const ProfileView: React.FC = () => {
  const { user, isAuthenticated, authMethod, isAdmin, logout } = useAuth();
  const { username, imageUrl, totalPoints, getDisplayName, isLoading } = useUserAccount();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-console-white">
        <p>You must be logged in to view your profile.</p>
        <Link to="/login" className="mt-4 text-console-blue-bright underline">Go to Login</Link>
      </div>
    );
  }

  // Avatar: use profile image, username initials, email initials, wallet initials, or icon
  const getAvatar = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    if (username) {
      return username.charAt(0).toUpperCase();
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    } else if (user.walletAddress) {
      return user.walletAddress.slice(2, 4).toUpperCase();
    }
    return <UserIcon className="h-8 w-8" />;
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-console-gray-terminal/80 border border-console-blue shadow-terminal rounded-lg p-8 flex flex-col items-center">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-console-blue/30 flex items-center justify-center text-3xl text-console-white mb-4 overflow-hidden">
        {getAvatar()}
      </div>
      <h2 className="text-2xl font-display text-console-white mb-2">My Profile</h2>
      
      {isLoading ? (
        <div className="text-console-white-dim font-mono">Loading profile...</div>
      ) : (
        <div className="w-full space-y-3 mb-6">
          <div className="flex justify-between text-console-white-dim font-mono">
            <span>Username:</span>
            <span>{username || 'Not set'}</span>
          </div>
          {user.email && (
            <div className="flex justify-between text-console-white-dim font-mono">
              <span>Email:</span>
              <span>{user.email}</span>
            </div>
          )}
          {user.walletAddress && (
            <div className="flex justify-between text-console-white-dim font-mono">
              <span>Wallet:</span>
              <span>{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</span>
            </div>
          )}
          <div className="flex justify-between text-console-white-dim font-mono">
            <span>Points:</span>
            <span>{totalPoints}</span>
          </div>
        </div>
      )}
      
      <Link to="/my-bets" className="w-full mb-4 py-2 px-4 bg-console-blue/80 hover:bg-console-blue-bright text-console-white font-mono rounded text-center transition-colors">
        View My Bets
      </Link>
      <button
        onClick={() => { logout(); navigate('/'); }}
        className="w-full py-2 px-4 bg-console-red/80 hover:bg-console-red text-console-white font-mono rounded flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="h-5 w-5" /> Logout
      </button>
    </div>
  );
};

export default ProfileView; 