import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import { X, Send, Terminal, AlertCircle, Link, Trash2, Plus, Upload, FileText } from 'lucide-react';
import DareDevilMessage from './DareDevilMessage';
import { Message } from '../../types';
import { generateDareDevilOpenAIResponse } from '../../services/openAiService';
import { fetchUrlContent, saveUrlContent, getStoredUrls, removeRagUrl, processUrlsFromText } from '../../services/ragService';

interface DareDevilChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DareDevilChatModal: React.FC<DareDevilChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello, I'm DareDevil, your NBA betting advisor. How can I assist with your sportsbetting strategy today?",
      sender: 'daredevil',
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showUrlManager, setShowUrlManager] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const [urlError, setUrlError] = useState<string>('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API key and saved URLs on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
    
    // Load saved URLs
    setSavedUrls(getStoredUrls());
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey);
      setShowApiKeyInput(false);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    
    try {
      setUrlError('');
      setIsUrlLoading(true);
      
      // Validate URL
      let url = urlInput.trim();
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      // Fetch and process the URL content
      const content = await fetchUrlContent(url);
      
      // Save the URL content
      saveUrlContent(url, content);
      
      // Update the URL list
      setSavedUrls(getStoredUrls());
      
      // Clear the input
      setUrlInput('');
      
      // Show success message
      const systemMessage: Message = {
        id: `system-${Date.now()}`,
        content: `Successfully added content from ${url} to my knowledge base.`,
        sender: 'daredevil',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      console.error('Error adding URL:', error);
      setUrlError('Failed to fetch URL content. Please check the URL and try again.');
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleRemoveUrl = (url: string) => {
    removeRagUrl(url);
    setSavedUrls(getStoredUrls());
    
    // Show removal message
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      content: `Removed ${url} from my knowledge base.`,
      sender: 'daredevil',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsFileLoading(true);
    setUrlError('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        
        // Process URLs from the text file
        const results = await processUrlsFromText(text);
        
        // Update the URL list
        setSavedUrls(getStoredUrls());
        
        // Show results message
        let resultMessage = '';
        if (results.successful.length > 0) {
          resultMessage += `Successfully added ${results.successful.length} URLs to my knowledge base.\n`;
        }
        if (results.failed.length > 0) {
          resultMessage += `Failed to process ${results.failed.length} URLs.`;
        }
        
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          content: resultMessage,
          sender: 'daredevil',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, systemMessage]);
      } catch (error) {
        console.error('Error processing file:', error);
        setUrlError('Failed to process the file. Please check the format and try again.');
      } finally {
        setIsFileLoading(false);
        // Clear the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setUrlError('Failed to read the file. Please try again.');
      setIsFileLoading(false);
    };
    
    reader.readAsText(file);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!apiKey) {
        setShowApiKeyInput(true);
        setIsLoading(false);
        return;
      }

      // Get response from OpenAI with RAG context
      const daredevilMessage = await generateDareDevilOpenAIResponse(input, apiKey);
      setMessages(prev => [...prev, daredevilMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "Sorry, I'm having trouble connecting to my analytics systems. Please try again later.",
        sender: 'daredevil',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to random responses if API call fails
  const getFallbackResponse = () => {
    const responses = [
      "Based on recent performance metrics, I'd recommend focusing on under bets for teams playing back-to-back games.",
      "The Lakers' defensive rating has improved by 8.2 points in their last 5 games. This could present value in their upcoming matchups.",
      "Historical data shows a 67% success rate for home underdogs after a loss when playing against teams on a winning streak.",
      "My analysis of player prop markets suggests there's value in the rebounds market, particularly for centers against teams ranking bottom 5 in rebounding percentage.",
      "Teams coming off 3+ day rest periods have covered the spread 58% of the time this season. Worth considering for your next bet."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-console-gray-terminal/90 border-1 border-red-600 shadow-glow-red m-4 max-h-[80vh] flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="bg-red-900/90 p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Terminal className="h-5 w-5 text-red-400 mr-2" />
            <h2 className="text-console-white font-mono font-bold">DAREDEVIL_ANALYSIS_TERMINAL</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlManager(!showUrlManager)}
              className="text-red-400 hover:text-console-white transition-colors flex items-center"
              title="Manage Knowledge Sources"
            >
              <Link className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-console-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* API Key Input Modal */}
        {showApiKeyInput && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-console-gray-terminal/90 border-1 border-red-600 p-4 max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <h3 className="text-console-white font-mono">API Key Required</h3>
              </div>
              <p className="text-console-white-dim text-sm mb-4">
                Please enter your OpenAI API key to enable DareDevil's advanced analytics capabilities.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter OpenAI API Key"
                className="w-full bg-console-black/80 border-1 border-red-900/70 text-console-white px-3 py-2 font-mono text-sm mb-4"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKey.trim()}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* URL Manager Panel */}
        {showUrlManager && (
          <div className="bg-console-black/80 border-b border-red-900/50 p-3">
            <h3 className="text-console-white font-mono text-sm mb-2">MANAGE KNOWLEDGE SOURCES</h3>
            
            {/* URL Input */}
            <div className="flex items-center mb-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter URL to add to DareDevil's knowledge base"
                className="flex-1 bg-console-black/80 border-1 border-red-900/70 text-console-white px-3 py-2 font-mono text-xs focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleAddUrl}
                disabled={!urlInput.trim() || isUrlLoading}
                className="ml-2 bg-red-600 hover:bg-red-700 p-2 text-white disabled:opacity-50"
              >
                {isUrlLoading ? (
                  <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {/* File Upload */}
            <div className="flex items-center mb-3">
              <div className="flex-1 bg-console-black/80 border-1 border-red-900/70 text-console-white px-3 py-2 font-mono text-xs focus:outline-none focus:border-red-500 flex items-center justify-between">
                <span className="text-console-white-dim">Upload URLs from text file (one URL per line)</span>
                <label className="cursor-pointer bg-red-900/50 hover:bg-red-900/70 px-2 py-1 flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>Browse</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isFileLoading}
                  />
                </label>
              </div>
              {isFileLoading && (
                <div className="ml-2 h-5 w-5 border-2 border-t-transparent border-red-400 rounded-full animate-spin"></div>
              )}
            </div>
            
            {urlError && (
              <div className="text-red-400 text-xs mb-2">{urlError}</div>
            )}
            
            {/* URL List */}
            <div className="max-h-32 overflow-y-auto custom-scrollbar">
              {savedUrls.length > 0 ? (
                <ul className="space-y-1">
                  {savedUrls.map((url) => (
                    <li key={url} className="flex items-center justify-between bg-console-black/50 p-1 border-1 border-red-900/30">
                      <span className="text-console-white-dim text-xs truncate max-w-[90%]">{url}</span>
                      <button
                        onClick={() => handleRemoveUrl(url)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-console-white-dim text-xs">No URLs added yet. Add URLs to enhance DareDevil's knowledge.</div>
              )}
            </div>
          </div>
        )}
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-console-gray-terminal/80">
          {messages.map(message => (
            message.sender === 'daredevil' ? (
              <DareDevilMessage key={message.id} message={message} />
            ) : (
              <div key={message.id} className="flex justify-end my-4">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-console-blue/30 border-1 border-console-blue text-console-white shadow-glow">
                  <div className="text-sm font-mono">{message.content}</div>
                  <div className="text-xs mt-2 text-console-white-dim text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          ))}
          {isLoading && (
            <div className="flex my-4">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-red-900/30 border-1 border-red-900/50 text-console-white-dim">
                <div className="flex items-center">
                  <div className="dot-typing"></div>
                  <span className="ml-2 text-xs">DareDevil is analyzing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
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
            disabled={!input.trim() || isLoading}
            className="ml-2 bg-red-600 hover:bg-red-700 p-2 text-white disabled:opacity-50 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DareDevilChatModal; 