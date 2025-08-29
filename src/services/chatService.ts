import { Message } from '../types';

// Mock database for development
const MOCK_MESSAGES: Record<string, Message[]> = {
  '2': [
    {
      id: '1',
      betId: '2',
      sender: '0x1234567890abcdef1234567890abcdef12345678',
      content: 'Hey, ready for the Celtics game?',
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    },
    {
      id: '2',
      betId: '2',
      sender: '0xabcdef1234567890abcdef1234567890abcdef12',
      content: 'Yep! Though I think you\'re going to lose this bet 😉',
      timestamp: new Date(Date.now() - 3300000).toISOString() // 55 minutes ago
    },
    {
      id: '3',
      betId: '2',
      sender: '0x1234567890abcdef1234567890abcdef12345678',
      content: 'We\'ll see about that. Celtics are on fire lately!',
      timestamp: new Date(Date.now() - 3000000).toISOString() // 50 minutes ago
    }
  ]
};

// Match chat rooms
const MATCH_CHAT_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1_1',
      matchId: '1',
      sender: '0x1234567890abcdef1234567890abcdef12345678',
      content: 'Lakers looking strong tonight!',
      timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
    },
    {
      id: 'm1_2',
      matchId: '1',
      sender: '0xabcdef1234567890abcdef1234567890abcdef12',
      content: 'Their defense has improved a lot this season',
      timestamp: new Date(Date.now() - 1500000).toISOString() // 25 minutes ago
    }
  ],
  '2': [
    {
      id: 'm2_1',
      matchId: '2',
      sender: '0x9876543210abcdef1234567890abcdef12345678',
      content: 'Anyone betting on the Celtics tonight?',
      timestamp: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
    },
    {
      id: 'm2_2',
      matchId: '2',
      sender: '0xfedcba9876543210abcdef1234567890abcdef12',
      content: 'I\'ve got 0.1 ETH on them to win',
      timestamp: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
    }
  ]
};

// Global chat messages
const GLOBAL_CHAT_MESSAGES: Message[] = [
  {
    id: 'g1',
    global: true,
    sender: '0x1234567890abcdef1234567890abcdef12345678',
    content: 'Welcome to the NBA Betting System Global Chat!',
    timestamp: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  },
  {
    id: 'g2',
    global: true,
    sender: '0x9876543210abcdef1234567890abcdef12345678',
    content: 'Has anyone seen the Lakers game last night?',
    timestamp: new Date(Date.now() - 5400000).toISOString() // 1.5 hours ago
  },
  {
    id: 'g3',
    global: true,
    sender: '0xabcdef1234567890abcdef1234567890abcdef12',
    content: 'Yeah, incredible performance by James!',
    timestamp: new Date(Date.now() - 5100000).toISOString() // 1.4 hours ago
  },
  {
    id: 'g4',
    global: true,
    sender: '0xfedcba9876543210abcdef1234567890abcdef12',
    content: 'What odds are you guys seeing for tonight\'s games?',
    timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  }
];

export const getMessagesForBet = async (betId: string): Promise<Message[]> => {
  // Return messages for the bet if they exist, otherwise return empty array
  const messages = MOCK_MESSAGES[betId] || [];
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(messages);
    }, 500); // Simulate network delay
  });
};

export const saveMessage = async (message: Message): Promise<Message> => {
  // Add message to the mock database
  if (!MOCK_MESSAGES[message.betId!]) {
    MOCK_MESSAGES[message.betId!] = [];
  }
  
  MOCK_MESSAGES[message.betId!].push(message);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(message);
    }, 200); // Simulate network delay
  });
};

// Match chat functions
export const getMessagesForMatch = async (matchId: string): Promise<Message[]> => {
  // Return messages for the match if they exist, otherwise return empty array
  const messages = MATCH_CHAT_MESSAGES[matchId] || [];
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(messages);
    }, 500); // Simulate network delay
  });
};

export const saveMatchMessage = async (message: Message): Promise<Message> => {
  // Add message to the match chat database
  if (!MATCH_CHAT_MESSAGES[message.matchId!]) {
    MATCH_CHAT_MESSAGES[message.matchId!] = [];
  }
  
  MATCH_CHAT_MESSAGES[message.matchId!].push(message);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(message);
    }, 200); // Simulate network delay
  });
};

// Global chat functions
export const getGlobalMessages = async (): Promise<Message[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...GLOBAL_CHAT_MESSAGES]);
    }, 500); // Simulate network delay
  });
};

export const saveGlobalMessage = async (message: Message): Promise<Message> => {
  // Add message to the global chat database
  GLOBAL_CHAT_MESSAGES.push(message);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(message);
    }, 200); // Simulate network delay
  });
};