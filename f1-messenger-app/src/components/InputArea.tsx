import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import './InputArea.css';

interface InputAreaProps {
  onSendMessage: (message: string) => void;
  isDisabled: boolean;
  isProcessing: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isDisabled, isProcessing }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isDisabled) {
      onSendMessage(input.trim());
      setInput('');
      adjustTextareaHeight();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const placeholderTexts = [
    "Ask about Lewis Hamilton's 2023 stats...",
    "Get championship standings for 2024...",
    "Show me race results from Monaco 2023...",
    "Compare driver performance...",
    "Get event schedule for 2024..."
  ];

  const [placeholder] = useState(() => 
    placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)]
  );

  return (
    <div className="input-area">
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isDisabled ? "Connecting to F1 data..." : placeholder}
            disabled={isDisabled}
            className="message-input"
            rows={1}
          />
          <button
            type="submit"
            disabled={isDisabled || !input.trim()}
            className="send-button"
          >
            {isProcessing ? (
              <Loader2 size={20} className="spinning" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
      {!isDisabled && (
        <div className="input-hint">
          Press Enter to send, Shift+Enter for new line
        </div>
      )}
    </div>
  );
};

export default InputArea; 