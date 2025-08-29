import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Terminal } from 'lucide-react';
import { Message } from '../../types';

const EmbeddedDareDevilTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<Message>({
    id: '1',
    content: "Hello, I'm DareDevil, your NBA betting advisor. How can I assist with your sportsbetting strategy today?",
    sender: 'daredevil',
    timestamp: new Date().toISOString(),
  });

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Simulate DareDevil response after a short delay
    setTimeout(() => {
      const responses = [
        "Based on recent performance metrics, I'd recommend focusing on under bets for teams playing back-to-back games.",
        "The Lakers' defensive rating has improved by 8.2 points in their last 5 games. This could present value in their upcoming matchups.",
        "Historical data shows a 67% success rate for home underdogs after a loss when playing against teams on a winning streak.",
        "My analysis of player prop markets suggests there's value in the rebounds market, particularly for centers against teams ranking bottom 5 in rebounding percentage.",
        "Teams coming off 3+ day rest periods have covered the spread 58% of the time this season. Worth considering for your next bet."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      setMessage({
        id: Date.now().toString(),
        content: randomResponse,
        sender: 'daredevil',
        timestamp: new Date().toISOString(),
      });
    }, 800);
    
    setInput('');
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid time';
    }
  };

  return (
    <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-red-600 shadow-glow-red mb-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-red-900/90 p-2 flex items-center justify-between">
        <div className="flex items-center">
          <Terminal className="h-4 w-4 text-red-400 mr-2" />
          <h2 className="text-console-white font-mono text-sm">DAREDEVIL_ANALYSIS_TERMINAL</h2>
        </div>
        <button className="text-red-400 hover:text-console-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Message area */}
      <div className="p-6 bg-console-gray-terminal/80">
        <div className="bg-red-900/80 border-1 border-red-600 text-white shadow-glow-red p-4 rounded">
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
      
      {/* Input area */}
      <div className="p-3 border-t border-red-900/50 flex items-center bg-console-black/50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask DareDevil for betting advice..."
          className="flex-1 bg-console-black/80 border-1 border-red-900/70 text-console-white px-3 py-2 font-mono text-sm focus:outline-none focus:border-red-500 focus:shadow-input-glow-red"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim()}
          className="ml-2 bg-red-600 hover:bg-red-700 p-2 text-white disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default EmbeddedDareDevilTerminal; 