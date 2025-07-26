import React from 'react';
import type { Message } from '../types';
import { User, Bot, AlertCircle } from 'lucide-react';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatContent = (content: string) => {
    // Check if content is JSON and format it nicely
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        return (
          <pre className="json-content">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      }
    } catch {
      // Not JSON, treat as regular text
    }

    // Format line breaks
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`message-bubble ${message.role} ${message.error ? 'error' : ''}`}>
      <div className="message-header">
        <div className="message-avatar">
          {message.role === 'user' ? (
            <User size={16} />
          ) : message.error ? (
            <AlertCircle size={16} />
          ) : (
            <Bot size={16} />
          )}
        </div>
        <span className="message-role">
          {message.role === 'user' ? 'You' : 'F1 Assistant'}
        </span>
        <span className="message-time">
          {formatTime(message.timestamp)}
        </span>
      </div>
      <div className="message-content">
        {formatContent(message.content)}
      </div>
    </div>
  );
};

export default MessageBubble; 