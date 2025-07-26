import React from 'react';
import { Bot } from 'lucide-react';
import './TypingIndicator.css';

const TypingIndicator: React.FC = () => {
  return (
    <div className="message-bubble assistant typing">
      <div className="message-header">
        <div className="message-avatar">
          <Bot size={16} />
        </div>
        <span className="message-role">F1 Assistant</span>
      </div>
      <div className="message-content">
        <div className="typing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        <span className="typing-text">Analyzing F1 data...</span>
      </div>
    </div>
  );
};

export default TypingIndicator; 