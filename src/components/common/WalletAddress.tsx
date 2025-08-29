import React from 'react';
import { User } from 'lucide-react';

interface WalletAddressProps {
  address: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const WalletAddress: React.FC<WalletAddressProps> = ({ 
  address, 
  className = '', 
  showIcon = true,
  size = 'md'
}) => {
  // Format address to show only first 6 and last 4 characters
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Size-based styles
  const getSizeStyles = () => {
    switch(size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'md':
      default:
        return 'text-sm';
    }
  };
  
  return (
    <div className={`flex items-center gap-1 font-mono ${getSizeStyles()} ${className}`}>
      {showIcon && <User className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'}`} />}
      <span>{formatAddress(address)}</span>
    </div>
  );
};

export default WalletAddress; 