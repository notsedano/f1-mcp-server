import React from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  state: 'connecting' | 'ready' | 'failed' | 'disconnected';
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  const getStatusConfig = () => {
    switch (state) {
      case 'connecting':
        return {
          icon: <Loader2 size={16} className="spinning" />,
          text: 'Connecting to F1 Data',
          className: 'connecting'
        };
      case 'ready':
        return {
          icon: <Wifi size={16} />,
          text: 'Connected',
          className: 'connected'
        };
      case 'failed':
        return {
          icon: <AlertCircle size={16} />,
          text: 'Connection Failed',
          className: 'failed'
        };
      case 'disconnected':
        return {
          icon: <WifiOff size={16} />,
          text: 'Disconnected',
          className: 'disconnected'
        };
      default:
        return {
          icon: <WifiOff size={16} />,
          text: 'Unknown',
          className: 'disconnected'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`connection-status ${config.className}`}>
      {config.icon}
      <span className="status-text">{config.text}</span>
    </div>
  );
};

export default ConnectionStatus; 