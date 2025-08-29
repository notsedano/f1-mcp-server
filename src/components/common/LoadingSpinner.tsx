import React, { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 6, 
  color = 'text-console-blue-bright'
}) => {
  const [dots, setDots] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4);
    }, 300);
    
    return () => clearInterval(interval);
  }, []);
  
  // Use predefined size classes instead of dynamic ones
  let sizeClass = 'h-6 w-6';
  if (size === 4) sizeClass = 'h-4 w-4';
  if (size === 6) sizeClass = 'h-6 w-6';
  if (size === 8) sizeClass = 'h-8 w-8';
  if (size === 10) sizeClass = 'h-10 w-10';
  if (size === 12) sizeClass = 'h-12 w-12';
  if (size === 16) sizeClass = 'h-16 w-16';
  
  // Use a specific color class instead of a dynamic one
  let colorClass = 'text-console-blue-bright';
  if (color === 'white') colorClass = 'text-white';
  if (color === 'text-console-blue-bright') colorClass = 'text-console-blue-bright';
  
  return (
    <div className="flex items-center">
      <div className={`${sizeClass} ${colorClass} animate-spin`}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      </div>
      <div className="ml-2 font-mono text-sm text-console-white">
        {/* ASCII loading animation */}
        {dots === 0 && '[    ]'}
        {dots === 1 && '[=   ]'}
        {dots === 2 && '[==  ]'}
        {dots === 3 && '[=== ]'}
      </div>
    </div>
  );
};

export default LoadingSpinner;