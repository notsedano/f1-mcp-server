import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import NavigationBar from './components/layout/NavigationBar';
import MatchesPage from './pages/MatchesPage';
import DashboardView from './pages/DashboardView';
import RootRouter from './components/common/RootRouter';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import UserBetListPage from './pages/UserBetListPage';
import ProfileView from './pages/ProfileView';
import BetListView from './pages/BetListView';
import BetDetailView from './pages/BetDetailView';
import ShareBetView from './pages/ShareBetView';
import { Web3Provider } from './context/Web3Context';
import { AuthProvider } from './context/AuthContext';
import { UserAccountProvider } from './context/UserAccountContext';
import { MatchesProvider } from './context/MatchesContext';
import { ChatProvider } from './context/ChatContext';
import { PointsProvider } from './context/PointsContext';
import { StraightBetsProvider } from './context/StraightBetsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import { isSupabaseConfigured } from './services/supabaseService';
import { ConsoleThemeProvider } from './theme/muiTheme';

// Load custom fonts
const loadFonts = () => {
  const VT323 = document.createElement('link');
  VT323.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
  VT323.rel = 'stylesheet';
  
  const Orbitron = document.createElement('link');
  Orbitron.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap';
  Orbitron.rel = 'stylesheet';
  
  document.head.appendChild(VT323);
  document.head.appendChild(Orbitron);
};

// Component to conditionally render navbar
const ConditionalNavbar: React.FC = () => {
  const location = useLocation();
  
  // Routes where navbar should be hidden
  const hideNavbarRoutes = ['/bet/', '/share-bet/'];
  
  // Check if current route should hide navbar
  const shouldHideNavbar = hideNavbarRoutes.some(route => 
    location.pathname.startsWith(route)
  );
  
  return shouldHideNavbar ? null : <NavigationBar />;
};

function App() {
  const location = useLocation();
  
  // Force dark mode and load fonts
  useEffect(() => {
    document.documentElement.classList.add('dark');
    loadFonts();
    
    // Add the console effect to body
    document.body.classList.add('bg-console-black');
    
    return () => {
      document.body.classList.remove('bg-console-black');
    };
  }, []);

  // Check Supabase configuration
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      toast.info('Running in local mode - data will not be saved to the cloud');
    }
  }, []);

  return (
    <Web3Provider>
      <AuthProvider>
        <UserAccountProvider>
          <PointsProvider>
            <MatchesProvider>
              <StraightBetsProvider>
                <ChatProvider>
                  <ConsoleThemeProvider>
                    <div className="min-h-screen font-mono text-console-white bg-console-black bg-terminal-grid bg-grid relative">
                      {/* Scanline effect - positioned below content but above background */}
                      <div className="pointer-events-none fixed inset-0 h-full w-full animate-terminal-scan opacity-10 z-[5] bg-gradient-to-b from-transparent via-console-blue-glow to-transparent"></div>
                      
                      {/* Terminal glow effect - always at the bottom layer */}
                      <div className="pointer-events-none fixed inset-0 h-full w-full opacity-20 bg-console-blue-dark z-[1]"></div>
                      
                      {/* Content container - ensures content is above effects but below navbar */}
                      <div className="relative z-[10]">
                        <main className="container mx-auto px-2 sm:px-4 pt-16" style={{
                          paddingTop: location.pathname.startsWith('/bet/') || location.pathname.startsWith('/share-bet/') ? '0' : '4rem'
                        }}>
                          <Routes>
                            <Route path="/" element={<RootRouter />} />
                            <Route path="/matches" element={
                              <ProtectedRoute>
                                <MatchesPage />
                              </ProtectedRoute>
                            } />
                            <Route path="/login" element={<LoginPage />} />
                            <Route 
                              path="/dashboard" 
                              element={
                                <ProtectedRoute>
                                  <DashboardView />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/my-bets" 
                              element={
                                <ProtectedRoute>
                                  <UserBetListPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/profile" 
                              element={
                                <ProtectedRoute>
                                  <ProfileView />
                                </ProtectedRoute>
                              } 
                            />

                            <Route 
                              path="/chat" 
                              element={
                                <ProtectedRoute>
                                  <ChatPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/chat/:betId" 
                              element={
                                <ProtectedRoute>
                                  <ChatPage />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/bets" 
                              element={
                                <ProtectedRoute>
                                  <BetListView />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/bet/:betId" 
                              element={
                                <ProtectedRoute>
                                  <BetDetailView />
                                </ProtectedRoute>
                              } 
                            />
                            <Route 
                              path="/share-bet/:betId" 
                              element={<ShareBetView />}
                            />
                          </Routes>
                        </main>
                        
                        {/* NavigationBar is positioned with highest z-index to be on top */}
                        <ConditionalNavbar />
                        
                        <ToastContainer 
                          position="bottom-right" 
                          theme="dark"
                          toastClassName="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue text-console-white shadow-terminal"
                          progressClassName="bg-console-blue-bright"
                          limit={3}
                          newestOnTop={true}
                          closeOnClick
                          autoClose={3000}
                          pauseOnHover
                        />
                      </div>
                    </div>
                  </ConsoleThemeProvider>
                </ChatProvider>
              </StraightBetsProvider>
            </MatchesProvider>
          </PointsProvider>
        </UserAccountProvider>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;