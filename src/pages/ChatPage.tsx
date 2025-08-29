import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare, Users, Terminal, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
// import { useBetting } from '../context/BettingContext'; // REMOVED: Legacy context
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { Message } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import WalletAddress from '../components/common/WalletAddress';
import DareDevilMessage from '../components/chat/DareDevilMessage';

const ChatPage: React.FC = () => {
  const { betId } = useParams<{ betId: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    isLoadingMessages, 
    currentChatId, 
    joinChat, 
    leaveChat, 
    sendMessage,
    globalMessages,
    isLoadingGlobalMessages,
    isGlobalChatActive,
    joinGlobalChat,
    leaveGlobalChat,
    sendGlobalMessage,
    isDareDevilTyping
  } = useChat();
  // const { getBetById } = useBetting(); // REMOVED: Legacy context
  const { account, isConnected } = useWeb3();
  const [newMessage, setNewMessage] = useState('');
  const [showGlobalChat, setShowGlobalChat] = useState(!betId);
  
  const bet = betId ? null : null; // REMOVED: Legacy context
  const chatMessages = currentChatId && messages[currentChatId] ? messages[currentChatId] : [];
  
  useEffect(() => {
    if (betId) {
      joinChat(betId);
      setShowGlobalChat(false);
    } else {
      joinGlobalChat();
      setShowGlobalChat(true);
    }
    
    return () => {
      if (betId) {
      leaveChat();
      } else {
        leaveGlobalChat();
      }
    };
  }, [betId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, globalMessages, showGlobalChat, isDareDevilTyping]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    if (showGlobalChat) {
      sendGlobalMessage(newMessage);
    } else {
      sendMessage(newMessage);
    }
    
    setNewMessage('');
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isOwnMessage = (sender: string) => {
    return sender === account;
  };
  
  const isDareDevilMessage = (sender: string) => {
    return sender === '0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS';
  };
  
  const switchToGlobalChat = () => {
    if (betId) {
      navigate('/chat');
    } else {
      setShowGlobalChat(true);
      joinGlobalChat();
    }
  };
  
  const switchToBetChat = () => {
    if (!betId) {
      return; // Cannot switch to bet chat without a bet ID
    }
    setShowGlobalChat(false);
    joinChat(betId);
  };
  
  const getSessionID = () => {
    // Generate a random session ID that remains consistent during the session
    if (!window.sessionStorage.getItem('session_id')) {
      const sessionId = Math.floor(Math.random() * 900000) + 100000;
      window.sessionStorage.setItem('session_id', sessionId.toString());
    }
    return window.sessionStorage.getItem('session_id');
  };
  
  if (!betId && !showGlobalChat) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold">No Chat Selected</h2>
            <button
              onClick={switchToGlobalChat}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Go to Global Chat
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (betId && !bet && !showGlobalChat) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Bet Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              The bet you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const renderMessages = () => {
    const currentMessages = showGlobalChat ? globalMessages : chatMessages;
    const isLoading = showGlobalChat ? isLoadingGlobalMessages : isLoadingMessages;
    
    if (!isConnected) {
  return (
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
      );
    }
      
    if (isLoading) {
      return (
          <div className="flex justify-center py-8">
            <LoadingSpinner size={6} />
          </div>
      );
    }
    
    if (currentMessages.length === 0) {
      return (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
      );
    }
    
    return (
          <div className="space-y-4">
        {currentMessages.map((message: Message) => (
          isDareDevilMessage(message.sender) ? (
            <DareDevilMessage key={message.id} message={message} />
          ) : (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message.sender) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isOwnMessage(message.sender)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                {!isOwnMessage(message.sender) && (
                  <WalletAddress 
                    address={message.sender} 
                    size="sm" 
                    className="mb-1 text-blue-400" 
                  />
                )}
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isOwnMessage(message.sender) ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
          )
            ))}
        
        {/* DareDevil typing indicator */}
        {isDareDevilTyping && (
          <div className="flex justify-start my-4">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-900/40 border-1 border-red-600/50 text-white">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-red-400" />
                <div className="font-mono text-sm text-red-400">DareDevil</div>
                <Loader2 className="h-3 w-3 text-red-400 animate-spin ml-2" />
                <div className="text-xs text-red-300/70 italic">analyzing data...</div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="h-[calc(100vh-12rem)] flex flex-col">
        {/* Chat Header */}
        <div className="bg-console-gray-terminal/80 backdrop-blur-xs border-1 border-console-blue shadow-terminal flex items-center gap-4">
          <div className="bg-console-blue/90 p-3 text-console-white flex items-center">
            <Terminal className="h-5 w-5 mr-2" />
            <div className="text-xs font-mono tracking-wide">
              [ SESSION: {getSessionID()} ]
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-console-white-dim hover:text-console-white flex items-center gap-1"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-mono text-xs">BACK</span>
            </button>
            
            <div className="h-4 w-[1px] bg-console-blue/50"></div>
            
            <button
              onClick={switchToGlobalChat}
              className={`flex items-center gap-1 px-3 py-1 font-mono text-xs ${
                showGlobalChat 
                  ? 'bg-console-blue text-console-white' 
                  : 'text-console-white-dim hover:text-console-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>GLOBAL_CHAT</span>
            </button>
            
            {betId && (
              <button
                onClick={switchToBetChat}
                className={`flex items-center gap-1 px-3 py-1 font-mono text-xs ${
                  !showGlobalChat 
                    ? 'bg-console-blue text-console-white' 
                    : 'text-console-white-dim hover:text-console-white'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>BET_CHAT</span>
              </button>
            )}
            
            {/* DareDevil status indicator */}
            <div className="ml-auto mr-2 flex items-center">
              <div className={`h-2 w-2 rounded-full ${isDareDevilTyping ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="ml-2 text-xs font-mono text-console-white-dim">DAREDEVIL {isDareDevilTyping ? 'ANALYZING' : 'ONLINE'}</span>
            </div>
          </div>
        </div>
        
        {/* Chat Title */}
        <div className="bg-console-gray-terminal/60 backdrop-blur-xs p-3 border-t-0 border-x-1 border-console-blue">
          <h2 className="font-mono text-console-white">
            {showGlobalChat 
              ? 'GLOBAL_CHAT: ALL_USERS'
              : `BET_CHAT: ${bet?.amount} ETH - ${bet?.description}`
            }
          </h2>
        </div>
        
        {/* Chat Messages */}
        <div className="flex-grow bg-slate-50 dark:bg-slate-900 p-4 overflow-y-auto border-1 border-console-blue border-t-0">
          {renderMessages()}
        </div>
        
        {/* Message Input */}
        <div className="bg-console-gray-terminal/80 backdrop-blur-xs rounded-b-lg border-1 border-console-blue border-t-0 shadow-terminal p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="TYPE_MESSAGE..."
              disabled={!isConnected}
              className="flex-grow bg-console-black/70 backdrop-blur-xs border-1 border-console-blue px-3 py-2 text-console-white font-mono focus:outline-none focus:shadow-button disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              className="bg-console-blue/90 backdrop-blur-xs border-1 border-console-blue text-console-white font-mono px-4 py-2 hover:shadow-button transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              <span>SEND</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;