/**
 * @deprecated This component is deprecated and should no longer be used.
 * Do not add new functionality to this file.
 * This file will be removed in a future version.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useWeb3 } from '../../context/Web3Context';
import { Match, Message } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import WalletAddress from '../common/WalletAddress';

interface MatchChatRoomProps {
  match: Match | null;
  onClose: () => void;
}

const MatchChatRoom: React.FC<MatchChatRoomProps> = ({ match, onClose }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { matchMessages, isLoadingMatchMessages, currentMatchId, joinMatchChat, leaveMatchChat, sendMatchMessage } = useChat();
  const { account, isConnected } = useWeb3();
  const [newMessage, setNewMessage] = useState('');
  
  // Get messages for the current match
  const chatMessages = currentMatchId && matchMessages[currentMatchId] ? matchMessages[currentMatchId] : [];
  
  useEffect(() => {
    if (match?.id) {
      joinMatchChat(match.id);
    }
    
    return () => {
      leaveMatchChat();
    };
  }, [match?.id]);
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMatchMessage(newMessage);
      setNewMessage('');
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isOwnMessage = (sender: string) => {
    return sender === account;
  };
  
  if (!match) {
    return null;
  }
  
  return (
    <div className="bg-console-gray-terminal/70 backdrop-blur-xs border-1 border-console-blue shadow-terminal overflow-hidden h-[550px] flex flex-col max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="bg-[#00A4FF]/90 p-2 text-black flex items-center justify-between">
        <div className="flex items-center">
          <MessageSquare className="h-4 w-4 text-console-white mr-2" />
          <div className="text-xs text-console-white font-mono tracking-wide">
            [ COMMUNITY_CHAT: {match.home_team.name} vs {match.away_team.name} ]
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="text-console-white hover:text-console-white-dim transition-colors"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-grow p-3 overflow-y-auto bg-console-black/50 backdrop-blur-xs">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="bg-console-blue/20 backdrop-blur-xs border-1 border-console-blue p-4 text-center max-w-md">
              <p className="text-console-white-dim font-mono mb-2">
                WALLET CONNECTION REQUIRED TO PARTICIPATE IN CHAT
              </p>
              <p className="text-console-white-muted font-mono text-sm">
                CONNECT WALLET TO CONTINUE
              </p>
            </div>
          </div>
        ) : isLoadingMatchMessages ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size={6} />
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="text-center py-8 text-console-white-muted font-mono">
            <p>NO_MESSAGES_YET. START_CONVERSATION</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((message: Message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message.sender) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-none px-3 py-2 ${
                    isOwnMessage(message.sender)
                      ? 'bg-[#00A4FF]/90 border-1 border-[#00A4FF] text-console-white'
                      : 'bg-console-gray-terminal/90 border-1 border-console-blue text-console-white'
                  }`}
                >
                  {!isOwnMessage(message.sender) && (
                    <WalletAddress 
                      address={message.sender} 
                      size="sm" 
                      className="mb-1 text-console-blue-bright" 
                    />
                  )}
                  <div className="text-sm font-mono">{message.content}</div>
                  <div
                    className="text-xs mt-1 text-console-white-muted font-mono text-right"
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message Input */}
      {isConnected && (
        <div className="p-2 bg-console-gray/90 backdrop-blur-xs border-t-1 border-console-blue">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="TYPE_MESSAGE..."
              className="flex-grow bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-3 py-2 text-console-white font-mono text-sm focus:outline-none focus:shadow-button"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-[#00A4FF]/90 backdrop-blur-xs text-console-white font-mono px-3 py-2 hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <Send className="h-4 w-4" />
              <span>SEND</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MatchChatRoom; 