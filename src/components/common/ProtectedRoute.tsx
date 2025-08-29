import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isConnected, account } = useWeb3();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkingMobileConnection, setCheckingMobileConnection] = useState(false);
  
  // Check for pending mobile connection from localStorage
  const hasPendingMobileConnection = localStorage.getItem('pendingMobileConnection') === 'true';
  
  // Check if we're on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isLoading) {
      // If we have a pending mobile connection and we're on mobile, wait for a moment
      if (hasPendingMobileConnection && isMobile) {
        setCheckingMobileConnection(true);
        
        // If we already have a wallet connection, consider authenticated
        if (isConnected && account) {
          setCheckingMobileConnection(false);
          return;
        }
        
        // Give a brief delay to check for wallet connection
        const timeout = setTimeout(() => {
          setCheckingMobileConnection(false);
          if (!isAuthenticated) {
            setIsRedirecting(true);
          }
        }, 2000);
        
        return () => clearTimeout(timeout);
      } else if (!isAuthenticated) {
        // Not mobile or no pending connection, redirect immediately if not authenticated
        setIsRedirecting(true);
      }
    }
  }, [isAuthenticated, isLoading, hasPendingMobileConnection, isMobile, isConnected, account]);

  // Show loading state while checking authentication
  if (isLoading || checkingMobileConnection) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-6 max-w-md text-center">
          <h2 className="text-xl font-display uppercase text-console-white mb-4">VERIFYING_ACCESS</h2>
          <p className="text-console-white-dim font-mono mb-4">
            {checkingMobileConnection ? "CHECKING WALLET CONNECTION..." : "AUTHENTICATING USER..."}
          </p>
          {checkingMobileConnection && (
            <p className="text-green-400 font-mono text-sm animate-pulse">
              RETURN FROM METAMASK DETECTED...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Check for immediate wallet connection (from mobile)
  if (isConnected && account) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    if (isRedirecting) {
      // Make this immediate on mobile for better UX
      if (isMobile) {
        return <Navigate to="/login" replace />;
      }
      
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-6 max-w-md text-center">
            <h2 className="text-xl font-display uppercase text-console-white mb-4">ACCESS_DENIED</h2>
            <p className="text-console-white-dim font-mono mb-4">
              AUTHENTICATION REQUIRED TO ACCESS THIS AREA
            </p>
            <p className="text-console-white-dim font-mono text-sm">
              REDIRECTING TO LOGIN...
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;