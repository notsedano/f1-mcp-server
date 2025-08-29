import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import HomePage from '../../deprecated/pages/HomePage';
import LoadingSpinner from './LoadingSpinner';

const RootRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're not loading and user is authenticated
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size={8} color="text-console-blue-bright" />
      </div>
    );
  }

  // If user is not authenticated, show the legacy HomePage (landing page)
  if (!isAuthenticated) {
    return <HomePage />;
  }

  // If user is authenticated, the useEffect will redirect to /dashboard
  // But we return null here to avoid flash of content
  return null;
};

export default RootRouter; 