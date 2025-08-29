import React from 'react';
import { usePoints } from '../context/PointsContext';

interface PointsDisplayProps {
  variant?: 'default' | 'compact' | 'large';
  className?: string;
  showReserved?: boolean;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({ 
  variant = 'default',
  className = '',
  showReserved = true
}) => {
  const { userBalance, freePointsBalance, reservedPointsBalance, loadingBalance } = usePoints();

  if (loadingBalance) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-pulse h-4 w-16 bg-console-blue-dim/30 rounded"></div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center text-sm ${className}`}>
        <span className="text-console-blue-bright">$DARE:</span>
        <span className="ml-1 text-console-white">{userBalance?.toLocaleString() || '0'}</span>
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <div className={`flex flex-col ${className}`}>
        <span className="text-console-blue-bright text-lg font-display">$DARE POINTS</span>
        <span className="text-3xl font-bold text-console-white">{userBalance?.toLocaleString() || '0'}</span>
        
        {showReserved && reservedPointsBalance > 0 && (
          <div className="mt-2">
            <span className="text-console-yellow text-sm font-display">RESERVED:</span>
            <span className="ml-2 text-console-yellow-dim text-lg">{reservedPointsBalance.toLocaleString()}</span>
          </div>
        )}
        
        <div className="mt-1">
          <span className="text-console-green text-sm font-display">FREE:</span>
          <span className="ml-2 text-console-green-dim text-lg">{freePointsBalance.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="inline-flex items-center">
        <span className="text-console-blue-bright font-display">$DARE:</span>
        <span className="ml-2 text-xl text-console-white">{userBalance?.toLocaleString() || '0'}</span>
      </div>
      
      {showReserved && reservedPointsBalance > 0 && (
        <div className="inline-flex items-center mt-1">
          <span className="text-console-yellow text-xs font-display">RESERVED:</span>
          <span className="ml-1 text-sm text-console-yellow-dim">{reservedPointsBalance.toLocaleString()}</span>
        </div>
      )}
      
      <div className="inline-flex items-center mt-1">
        <span className="text-console-green text-xs font-display">FREE:</span>
        <span className="ml-1 text-sm text-console-green-dim">{freePointsBalance.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default PointsDisplay; 