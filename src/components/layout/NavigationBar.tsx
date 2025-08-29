import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, User, Archive, MessageSquare, Home, Menu, X, LogOut, LogIn, Settings, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserAccount } from '../../context/UserAccountContext';

// Route title mapping
const routeTitles: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/matches': 'Matches',
  '/bets': 'Bets',
  '/chat': 'Chat',
  '/profile': 'Profile',
  '/login': 'Login',
  '/my-bets': 'My Bets'
};

// Navigation items configuration
const navItems = [
  { path: '/dashboard', label: 'Home', icon: Home, requiresAuth: true },
  { path: '/matches', label: 'Matches', icon: Activity, requiresAuth: false },
  { path: '/bets', label: 'Bets', icon: Archive, requiresAuth: true },
  { path: '/chat', label: 'Chat', icon: MessageSquare, requiresAuth: true },
];

interface ProfileInfoProps {
  user: any;
  isAuthenticated: boolean;
  authMethod: string | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  className?: string;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({
  user,
  isAuthenticated,
  authMethod,
  onNavigate,
  onLogout,
  className = ''
}) => {
  const { username, imageUrl, freePoints, reservedPoints, totalPoints, getDisplayName, isLoading } = useUserAccount();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get profile avatar (image or initials)
  const getProfileAvatar = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    // Show User icon as fallback
    return <User className="h-6 w-6 text-console-white" />;
  };

  // Get initials fallback for when image fails
  const getInitialsFallback = () => {
    if (username) {
      return username.charAt(0).toUpperCase();
    } else if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    } else if (user?.walletAddress) {
      return user.walletAddress.slice(2, 4).toUpperCase();
    }
    return '?';
  };

  return (
    <div className={`bg-console-gray-terminal/90 border border-console-blue p-4 ${className}`}>
      {/* Profile Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-console-blue/30 rounded-full flex items-center justify-center overflow-hidden relative">
          {getProfileAvatar()}
          {/* Fallback initials (shown when image fails to load) */}
          {imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-console-white font-mono text-lg bg-console-blue/30 rounded-full">
              {getInitialsFallback()}
            </div>
          )}
        </div>
        <div>
          <div className="text-console-white font-mono text-sm">
            {isAuthenticated ? getDisplayName() : 'Guest'}
          </div>
          <div className="text-console-white-dim font-mono text-xs">
            {isAuthenticated ? 'Authenticated' : 'Not logged in'}
          </div>
        </div>
      </div>

      {/* Points Information */}
      {isAuthenticated && (
        <div className="mb-4 p-3 bg-console-black/50 border border-console-blue/30">
          <div className="text-console-white font-mono text-xs mb-2">DARE POINTS</div>
          {isLoading ? (
            <div className="text-console-white-dim font-mono text-xs">Loading...</div>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-console-white-dim">
                <span>Free:</span>
                <span className="text-[#E5FF03]">{freePoints}</span>
              </div>
              <div className="flex justify-between text-console-white-dim">
                <span>Reserved:</span>
                <span className="text-[#E5FF03]">{reservedPoints}</span>
              </div>
              <div className="flex justify-between text-console-white font-mono">
                <span>Total:</span>
                <span className="text-[#E5FF03]">{totalPoints}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {isAuthenticated && (
          <>
            <button
              onClick={() => onNavigate('/profile')}
              className="w-full bg-console-green/20 border border-console-green/50 text-console-white font-mono text-sm py-2 px-3 hover:bg-console-green/30 hover:border-console-green transition-colors flex items-center justify-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Profile</span>
            </button>
            
            <button
              onClick={() => {
                // TODO: Navigate to profile editor when implemented
                console.log('Edit Profile clicked - will be implemented later');
              }}
              className="w-full bg-console-yellow/20 border border-console-yellow/50 text-console-white font-mono text-sm py-2 px-3 hover:bg-console-yellow/30 hover:border-console-yellow transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
            
            <button
              onClick={() => onNavigate('/my-bets')}
              className="w-full bg-console-blue/90 text-console-white font-mono text-sm py-2 px-3 hover:bg-console-blue transition-colors"
            >
              My Bets
            </button>
          </>
        )}
        
        {isAuthenticated ? (
          <button
            onClick={onLogout}
            className="w-full bg-red-900/50 border border-red-500 text-console-white font-mono text-sm py-2 px-3 hover:bg-red-900/70 transition-colors flex items-center justify-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('/login')}
            className="w-full bg-console-blue/90 text-console-white font-mono text-sm py-2 px-3 hover:bg-console-blue transition-colors flex items-center justify-center space-x-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </div>
  );
};

const NavigationBar: React.FC = () => {
  const { user, authMethod, isAuthenticated, logout } = useAuth();
  const { imageUrl, getDisplayName } = useUserAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Monitor window size for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Get current page title
  const getCurrentTitle = () => {
    return routeTitles[location.pathname] || 'BET TERMINAL';
  };

  // Handle navigation with authentication check
  const handleNavigation = (path: string) => {
    const navItem = navItems.find(item => item.path === path);
    
    if (navItem?.requiresAuth && !isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', path);
      navigate('/login');
    } else {
      navigate(path);
    }
    
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  // Get profile button content (image or icon)
  const getProfileButtonContent = () => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            // Fallback to User icon if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    return <User className="h-5 w-5" />;
  };

  // Get initials fallback for profile button
  const getProfileButtonInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    } else if (user?.walletAddress) {
      return user.walletAddress.slice(2, 4).toUpperCase();
    }
    return '?';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-console-blue/90 backdrop-blur-sm border-b border-console-blue shadow-terminal z-[999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Mobile Layout */}
          {isMobile ? (
            <>
              {/* Page Title */}
              <div className="flex items-center">
                <h1 className="text-console-white font-mono text-lg tracking-wide">
                  {getCurrentTitle()}
                </h1>
              </div>

              {/* Hamburger Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-console-white hover:text-[#E5FF03] transition-colors p-2"
                  aria-label="Open menu"
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-console-gray-terminal/95 border border-console-blue shadow-terminal backdrop-blur-sm">
                    {/* Navigation Items */}
                    <div className="p-2 border-b border-console-blue/30">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path)}
                            className={`w-full flex items-center space-x-3 px-3 py-2 text-left font-mono text-sm transition-colors ${
                              isActive
                                ? 'text-console-white bg-console-blue/50'
                                : 'text-console-white-dim hover:text-console-white hover:bg-console-blue/20'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Profile Info */}
                    <ProfileInfo
                      user={user}
                      isAuthenticated={isAuthenticated}
                      authMethod={authMethod}
                      onNavigate={handleNavigation}
                      onLogout={handleLogout}
                      className="border-0"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Desktop Layout */
            <>
              {/* Navigation Items */}
              <div className="flex items-center space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center space-x-2 px-3 py-2 font-mono text-sm transition-colors ${
                        isActive
                          ? 'text-console-white bg-console-blue/50 rounded'
                          : 'text-console-white-dim hover:text-console-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right: Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 bg-console-blue/30 rounded-full flex items-center justify-center text-console-white hover:bg-console-blue/50 transition-colors overflow-hidden relative"
                  aria-label="Open profile menu"
                  aria-expanded={isProfileOpen}
                >
                  {getProfileButtonContent()}
                  {/* Fallback initials (shown when image fails to load) */}
                  {imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center text-console-white font-mono text-sm bg-console-blue/30 rounded-full">
                      {getProfileButtonInitials()}
                    </div>
                  )}
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72">
                    <ProfileInfo
                      user={user}
                      isAuthenticated={isAuthenticated}
                      authMethod={authMethod}
                      onNavigate={handleNavigation}
                      onLogout={handleLogout}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar; 