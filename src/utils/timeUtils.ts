import React from 'react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp to relative time (e.g., "2d ago", "1w ago", "3h ago")
 * Updates in real-time when component re-renders
 */
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    // If the date is in the future, show "in X time"
    if (diffInMs < 0) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    // Return custom short format
    if (diffInYears > 0) {
      return `${diffInYears}y ago`;
    } else if (diffInMonths > 0) {
      return `${diffInMonths}mo ago`;
    } else if (diffInWeeks > 0) {
      return `${diffInWeeks}w ago`;
    } else if (diffInDays > 0) {
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
    } else {
      return 'now';
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};

/**
 * Hook to get real-time relative timestamp that updates every minute
 */
export const useRelativeTime = (dateString: string): string => {
  const [relativeTime, setRelativeTime] = React.useState(() => formatRelativeTime(dateString));

  React.useEffect(() => {
    // Update immediately
    setRelativeTime(formatRelativeTime(dateString));
    
    // Then update every minute
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(dateString));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dateString]);

  return relativeTime;
}; 