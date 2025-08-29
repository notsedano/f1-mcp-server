import React from 'react';
import { Message } from '../../types';
import { Terminal } from 'lucide-react';

interface DareDevilMessageProps {
  message: Message;
}

const DareDevilMessage: React.FC<DareDevilMessageProps> = ({ message }) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid time';
    }
  };

  return (
    <div className="flex justify-start my-4">
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-900/80 border-1 border-red-600 text-white shadow-glow-red">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-red-600/50">
          <Terminal className="h-4 w-4 text-red-400" />
          <div className="font-mono text-sm text-red-400 font-bold tracking-wide">DareDevil</div>
          <div className="text-xs text-red-300/70 ml-auto">NBA Analytics Expert</div>
        </div>
        
        <div className="text-sm font-mono">{message.content}</div>
        
        <div className="text-xs mt-2 text-red-300/70 flex justify-between items-center pt-1 border-t border-red-600/50">
          <span>PREDICTION ENGINE v2.5</span>
          <span>{formatTimestamp(message.timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default DareDevilMessage; 