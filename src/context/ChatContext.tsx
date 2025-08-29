import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Remove actual socket.io import and use a mock implementation
// import { io, Socket } from 'socket.io-client';
import { useWeb3 } from './Web3Context';
import { Message } from '../types';
import { getMessagesForBet, getMessagesForMatch, getGlobalMessages, saveGlobalMessage } from '../services/chatService';
import { shouldDareDevilRespond, generateDareDevilResponse, getDareDevilResponseDelay } from '../services/dareDevilService';

interface ChatContextType {
  // Bet chat
  messages: Record<string, Message[]>;
  isLoadingMessages: boolean;
  currentChatId: string | null;
  joinChat: (betId: string) => void;
  leaveChat: () => void;
  sendMessage: (content: string) => void;
  
  // Match chat
  matchMessages: Record<string, Message[]>;
  isLoadingMatchMessages: boolean;
  currentMatchId: string | null;
  joinMatchChat: (matchId: string) => void;
  leaveMatchChat: () => void;
  sendMatchMessage: (content: string) => void;
  
  // Global chat
  globalMessages: Message[];
  isLoadingGlobalMessages: boolean;
  isGlobalChatActive: boolean;
  joinGlobalChat: () => void;
  leaveGlobalChat: () => void;
  sendGlobalMessage: (content: string) => void;
  
  // DareDevil bot
  isDareDevilTyping: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Mock interface for socket to avoid TypeScript errors
interface MockSocket {
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
  disconnect: () => void;
}

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { account } = useWeb3();
  const [socket, setSocket] = useState<MockSocket | null>(null);
  
  // Bet chat state
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Match chat state
  const [matchMessages, setMatchMessages] = useState<Record<string, Message[]>>({});
  const [isLoadingMatchMessages, setIsLoadingMatchMessages] = useState<boolean>(false);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  
  // Global chat state
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [isLoadingGlobalMessages, setIsLoadingGlobalMessages] = useState<boolean>(false);
  const [isGlobalChatActive, setIsGlobalChatActive] = useState<boolean>(false);
  
  // DareDevil bot state
  const [isDareDevilTyping, setIsDareDevilTyping] = useState<boolean>(false);

  // Create a mock socket instead of real connection
  useEffect(() => {
    if (account) {
      console.log('Creating mock socket instead of real connection');
      
      // Create a mock socket that just logs events
      const mockSocket: MockSocket = {
        emit: (event, ...args) => {
          console.log(`Mock socket emit: ${event}`, args);
        },
        on: (event, callback) => {
          console.log(`Mock socket listening to: ${event}`);
        },
        off: (event, callback) => {
          console.log(`Mock socket stopped listening to: ${event}`);
        },
        disconnect: () => {
          console.log('Mock socket disconnected');
        }
      };
      
      setSocket(mockSocket);
      
      return () => {
        mockSocket.disconnect();
      };
    }
  }, [account]);

  // Bet chat methods
  const joinChat = async (betId: string) => {
    if (!account) return;
    
    setCurrentChatId(betId);
    
    // Load mock messages instead of socket connection
      setIsLoadingMessages(true);
    
    // Add delay to simulate network request
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: '1',
          betId: betId,
          sender: '0x1234567890abcdef1234567890abcdef12345678',
          content: 'This team is going to win for sure!',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          betId: betId,
          sender: '0xabcdef1234567890abcdef1234567890abcdef12',
          content: 'No way, the other team is much stronger.',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        },
        // Add a DareDevil message
        {
          id: 'daredevil-1',
          betId: betId,
          sender: '0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS',
          content: "My analytics show that close games like this tend to favor teams with stronger bench units. The depth factor is often underestimated in betting markets.",
          timestamp: new Date(Date.now() - 1200000).toISOString()
        }
      ];
      
        setMessages(prevMessages => ({
          ...prevMessages,
        [betId]: mockMessages
        }));
      
        setIsLoadingMessages(false);
    }, 800);
  };

  const leaveChat = () => {
    setCurrentChatId(null);
  };

  const sendMessage = (content: string) => {
    if (!currentChatId || !account || !content.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      betId: currentChatId,
      sender: account,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically add the message to the UI
    setMessages(prevMessages => ({
      ...prevMessages,
      [currentChatId]: [...(prevMessages[currentChatId] || []), newMessage]
    }));
    
    // Check if DareDevil should respond
    if (shouldDareDevilRespond(content)) {
      // Simulate DareDevil typing
      setIsDareDevilTyping(true);
      
      // Delayed response
      setTimeout(() => {
        const dareDevilResponse = generateDareDevilResponse(content);
        dareDevilResponse.betId = currentChatId;
        
        setMessages(prevMessages => ({
          ...prevMessages,
          [currentChatId]: [...(prevMessages[currentChatId] || []), dareDevilResponse]
        }));
        
        setIsDareDevilTyping(false);
      }, getDareDevilResponseDelay());
    }
  };
  
  // Match chat methods
  const joinMatchChat = async (matchId: string) => {
    if (!account) return;
    
    setCurrentMatchId(matchId);
    
    // Load mock match messages
    setIsLoadingMatchMessages(true);
    
    // Add delay to simulate network request
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: '1',
          matchId: matchId,
          sender: '0x1234567890abcdef1234567890abcdef12345678',
          content: 'This game is going to be awesome!',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          matchId: matchId,
          sender: '0xabcdef1234567890abcdef1234567890abcdef12',
          content: 'I think the home team has the advantage.',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        },
        // Add a DareDevil message
        {
          id: 'daredevil-match-1',
          matchId: matchId,
          sender: '0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS',
          content: "Based on my matchup analysis, the guard play will be the determining factor tonight. Look for scoring efficiency in the pick-and-roll sets.",
          timestamp: new Date(Date.now() - 900000).toISOString()
        }
      ];
      
      setMatchMessages(prevMessages => ({
        ...prevMessages,
        [matchId]: mockMessages
      }));
      
      setIsLoadingMatchMessages(false);
    }, 800);
  };

  const leaveMatchChat = () => {
    setCurrentMatchId(null);
  };

  const sendMatchMessage = (content: string) => {
    if (!currentMatchId || !account || !content.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      matchId: currentMatchId,
      sender: account,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically add the message to the UI
    setMatchMessages(prevMessages => ({
      ...prevMessages,
      [currentMatchId]: [...(prevMessages[currentMatchId] || []), newMessage]
    }));
    
    // Check if DareDevil should respond
    if (shouldDareDevilRespond(content)) {
      // Simulate DareDevil typing
      setIsDareDevilTyping(true);
      
      // Delayed response
      setTimeout(() => {
        const dareDevilResponse = generateDareDevilResponse(content);
        dareDevilResponse.matchId = currentMatchId;
        
        setMatchMessages(prevMessages => ({
          ...prevMessages,
          [currentMatchId]: [...(prevMessages[currentMatchId] || []), dareDevilResponse]
        }));
        
        setIsDareDevilTyping(false);
      }, getDareDevilResponseDelay());
    }
  };
  
  // Global chat methods
  const joinGlobalChat = async () => {
    if (!account) return;
    
    setIsGlobalChatActive(true);
    
    // Load mock global chat messages
    setIsLoadingGlobalMessages(true);
    
    // Add delay to simulate network request
    setTimeout(() => {
      const mockMessages: Message[] = [
        {
          id: '1',
          global: true,
          sender: '0x1234567890abcdef1234567890abcdef12345678',
          content: 'Welcome to the global NBA betting chat!',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '2',
          global: true,
          sender: '0xabcdef1234567890abcdef1234567890abcdef12',
          content: 'Did you see that game last night?',
          timestamp: new Date(Date.now() - 43200000).toISOString()
        },
        {
          id: '3',
          global: true,
          sender: '0x9876543210abcdef1234567890abcdef12345678',
          content: 'I\'m excited for the playoffs!',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        // Add a DareDevil message
        {
          id: 'daredevil-global-1',
          global: true,
          sender: '0xDARE0DEVIL1NBA2ANALYTICS3EXPERT4PREDICTIONS',
          content: "Hey everyone! DareDevil here. My prediction models are showing some interesting trends for the 2025 season. The evolution of pace and space is continuing, with three-point attempt rates projected to stabilize around 42% league-wide.",
          timestamp: new Date(Date.now() - 1800000).toISOString()
        }
      ];
      
      setGlobalMessages(mockMessages);
      setIsLoadingGlobalMessages(false);
    }, 800);
  };
  
  const leaveGlobalChat = () => {
    setIsGlobalChatActive(false);
  };
  
  const sendGlobalMessage = (content: string) => {
    if (!account || !content.trim() || !isGlobalChatActive) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      global: true,
      sender: account,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Optimistically add the message to the UI
    setGlobalMessages(prev => [...prev, newMessage]);
    
    // Check if DareDevil should respond
    if (shouldDareDevilRespond(content)) {
      // Simulate DareDevil typing
      setIsDareDevilTyping(true);
      
      // Delayed response
      setTimeout(() => {
        const dareDevilResponse = generateDareDevilResponse(content);
        dareDevilResponse.global = true;
        
        setGlobalMessages(prev => [...prev, dareDevilResponse]);
        setIsDareDevilTyping(false);
      }, getDareDevilResponseDelay());
    }
  };

  return (
    <ChatContext.Provider value={{
        messages,
        isLoadingMessages,
        currentChatId,
        joinChat,
        leaveChat,
      sendMessage,
      
      matchMessages,
      isLoadingMatchMessages,
      currentMatchId,
      joinMatchChat,
      leaveMatchChat,
      sendMatchMessage,
      
      globalMessages,
      isLoadingGlobalMessages,
      isGlobalChatActive,
      joinGlobalChat,
      leaveGlobalChat,
      sendGlobalMessage,
      
      isDareDevilTyping
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};