import { useState, useEffect } from 'react';
import ChatThread from './components/ChatThread';
import InputArea from './components/InputArea';
import ConnectionStatus from './components/ConnectionStatus';
import { AgentThoughtProcess } from './components/AgentThoughtProcess';
import type { Message } from './types';
import { llmService } from './services/llmService';
import { agenticChain } from './services/agenticChain';

import './App.css';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '🏁 **Welcome to the LLM-Powered F1 Data Assistant!**\n\nI now use **Gemini AI** for intelligent query understanding and natural responses:\n\n🧠 **LLM-Powered Features:**\n- Intelligent query parsing (not just keywords)\n- Natural language understanding\n- Context-aware tool selection\n- Conversational responses\n\n🏆 **Try These Queries:**\n- "Who dominated the 2023 championship?"\n- "How did Hamilton perform in 2022?"\n- "Compare Verstappen and Norris"\n- "What was the 2024 season like?"\n\n💡 **I understand natural language** and provide intelligent analysis!',
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'ready' | 'failed' | 'disconnected'>('disconnected');
  const [bridgeHealth, setBridgeHealth] = useState<any>(null);
  
  // Agent thought process state
  const [showThoughtProcess, setShowThoughtProcess] = useState(false);
  const [currentChain, setCurrentChain] = useState<any>(null);
  
  // Debug: Check agentic chain availability
  useEffect(() => {
    console.log('🔍 Checking AgenticChain availability...');
    console.log('AgenticChain available:', agenticChain.isAvailable());
    console.log('AgenticChain service:', agenticChain);
    
    // Debug environment variables
    console.log('🔍 Environment Variables Debug:');
    console.log('VITE_GEMINI_API_KEY:', (import.meta as any).env?.VITE_GEMINI_API_KEY ? 'Found' : 'Not found');
    console.log('GEMINI_API_KEY:', (import.meta as any).env?.GEMINI_API_KEY ? 'Found' : 'Not found');
    console.log('REACT_APP_GEMINI_API_KEY:', (import.meta as any).env?.REACT_APP_GEMINI_API_KEY ? 'Found' : 'Not found');
    
    // Check if the key is actually loaded
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (apiKey) {
      console.log('🔑 API Key loaded successfully, length:', apiKey.length);
      console.log('🔑 API Key preview:', apiKey.substring(0, 10) + '...');
    } else {
      console.log('❌ No API key found in environment variables');
    }
  }, []);
  
  // Prefer talking to the Agent server; fall back to bridge
  const AGENT_URL = (import.meta as any).env?.VITE_AGENT_URL || 'http://localhost:11435';
  const BRIDGE_URL = 'http://localhost:3001';
  
  // Intelligent query parsing using LLM service
  const parseQuery = async (userInput: string) => {
    console.log('🧠 Using LLM for intelligent query parsing...');
    return await llmService.parseQueryIntelligently(userInput);
  };
  
  // Intelligent response synthesis
  const synthesizeResponse = async (userInput: string, toolResult: any, toolName: string) => {
    const data = toolResult.data?.data || toolResult.data;
    
    // Use LLM service for intelligent response synthesis
    return await llmService.synthesizeResponse(userInput, data, toolName);
  };
  
  useEffect(() => {
    // Simple bridge health check
    const checkBridgeHealth = async () => {
      setConnectionState('connecting');
      
      try {
        // Check agent first, then bridge
        let response = await fetch(`${AGENT_URL}/health`).catch(() => undefined as any);
        if (!response || !response.ok) {
          response = await fetch(`${BRIDGE_URL}/health`);
        }
        if (response.ok) {
          const health = await response.json();
          setBridgeHealth(health);
          setConnectionState('ready');
          console.log('✅ Bridge connection established');
        } else {
          throw new Error(`Bridge health check failed: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Bridge connection failed:', error);
        setConnectionState('failed');
      }
    };
    
    checkBridgeHealth();
    
    // Periodic health check
    const healthInterval = setInterval(checkBridgeHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);
  
  const handleUserMessage = async (userInput: string) => {
    console.log('🚀 Processing F1 query:', userInput);
    
    // Add user message to conversation history
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsProcessing(true);
    
    const startTime = performance.now();
    
    try {
      // Special handling for system health requests
      if (userInput.toLowerCase().includes('system health') || 
          userInput.toLowerCase().includes('health report')) {
        
        const processingTime = performance.now() - startTime;
        
        const healthResponse = `🔍 **F1 System Health Report**

**Connection Status:** ${connectionState} ✅
**Bridge Health:** ${bridgeHealth ? bridgeHealth.status : 'Unknown'}

**Bridge Metrics:**
• Uptime: ${bridgeHealth ? Math.round(bridgeHealth.uptime) : 0}s
• Tool calls: ${bridgeHealth ? bridgeHealth.tool_calls : 0}
• Success rate: ${bridgeHealth ? bridgeHealth.success_rate : 0}%

**System Status:**
${connectionState !== 'ready' 
  ? '⚠️ Bridge connection issues detected'
  : bridgeHealth && bridgeHealth.success_rate < 80
    ? '⚠️ Some F1 data may be temporarily unavailable'
    : '✅ All systems operating normally'}

*Report generated in ${processingTime.toFixed(1)}ms*`;

        const healthMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: healthResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, healthMessage]);
        setIsProcessing(false);
        return;
      }
      
      // Check connection state before processing
      if (connectionState !== 'ready') {
        throw new Error('Bridge connection not ready. Please wait for connection to be established.');
      }
      
      console.log('🧠 Starting intelligent query processing...');
      
      // Try Agent server first (LLM + tools on the backend)
      try {
        const agentResp = await fetch(`${AGENT_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'f1-agent',
            messages: [{ role: 'user', content: userInput }],
            stream: false
          })
        });
        if (agentResp.ok) {
          const agentJson = await agentResp.json();
          const processingTime = performance.now() - startTime;
          const content = agentJson?.message?.content || 'No response content.';
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `${content}\n\n*Query processed in ${processingTime.toFixed(1)}ms*`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsProcessing(false);
          return;
        }
        console.warn('Agent request failed, status:', agentResp.status);
      } catch (e) {
        console.warn('Agent request error, falling back to bridge:', e);
      }
      
      // Fallback: local LLM planning + bridge tool call
      const queryPlan = await parseQuery(userInput);
      console.log('📋 Query plan (fallback to bridge):', JSON.stringify(queryPlan, null, 2));
      
      // Execute agentic chain to capture thought process
      if (agenticChain.isAvailable()) {
        try {
          console.log('🧠 Executing agentic chain for thought process tracking...');
          console.log('AgenticChain service state:', agenticChain);
          const chain = await agenticChain.executeChain(userInput, Date.now().toString());
          setCurrentChain(chain);
          console.log('✅ Agentic chain executed:', chain);
        } catch (chainError) {
          console.warn('⚠️ Agentic chain execution failed:', chainError);
          console.error('Chain error details:', chainError);
          // Continue with normal processing even if chain fails
        }
      } else {
        console.log('❌ AgenticChain not available, skipping thought process tracking');
      }
      
      const response = await fetch(`${BRIDGE_URL}/mcp/tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: queryPlan.tool, arguments: queryPlan.arguments })
      });
      if (!response.ok) throw new Error(`Bridge request failed: ${response.status}`);
      const result = await response.json();
      console.log('✅ Bridge response received (fallback path):', result);
      
      // Check if we need to make a follow-up call (recursive tool calling)
      if (result.status === 'success' && result.data && queryPlan.followUp) {
        console.log('🔄 Making follow-up tool call:', queryPlan.followUp);
        
        // For driver performance analysis, we need to get event info first
        if (queryPlan.followUp.tool === 'analyze_driver_performance') {
          // Get the first race of the season for analysis
          const eventResponse = await fetch(`${BRIDGE_URL}/mcp/tool`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'get_event_schedule',
              arguments: { year: queryPlan.followUp.arguments.year }
            })
          });
          
          if (eventResponse.ok) {
            const eventResult = await eventResponse.json();
            if (eventResult.status === 'success' && eventResult.data?.data) {
              const events = eventResult.data.data;
              if (events.length > 0) {
                const firstEvent = events[0];
                // Extract event name more robustly
                let eventName = '1'; // Default to first race
                if (firstEvent.EventName) {
                  eventName = firstEvent.EventName;
                } else if (firstEvent.eventName) {
                  eventName = firstEvent.eventName;
                } else if (firstEvent.EventNumber) {
                  eventName = firstEvent.EventNumber.toString();
                } else if (firstEvent.eventNumber) {
                  eventName = firstEvent.eventNumber.toString();
                }
                
                console.log('🏁 Using event for analysis:', eventName);
                
                // Now call analyze_driver_performance with all required parameters
                const performanceResponse = await fetch(`${BRIDGE_URL}/mcp/tool`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: 'analyze_driver_performance',
                    arguments: {
                      year: queryPlan.followUp.arguments.year,
                      event_identifier: eventName,
                      session_name: 'Race',
                      driver_identifier: queryPlan.followUp.arguments.driver_identifier
                    }
                  })
                });
                
                if (performanceResponse.ok) {
                  const performanceResult = await performanceResponse.json();
                  console.log('✅ Performance analysis result:', performanceResult);
                  
                  // Combine championship data with performance data
                  const championshipData = await synthesizeResponse(userInput, result, queryPlan.tool);
                  
                  let performanceData = '';
                  if (performanceResult.status === 'success' && performanceResult.data?.status !== 'error') {
                    const perfData = performanceResult.data?.data || performanceResult.data;
                    performanceData = `\n\n📊 **Detailed Performance Analysis:**\n` +
                      `Fastest Lap: ${perfData?.FastestLap || 'N/A'}\n` +
                      `Total Laps: ${perfData?.TotalLaps || 'N/A'}\n` +
                      `Average Lap Time: ${perfData?.AverageLapTime ? `${perfData.AverageLapTime.toFixed(2)}s` : 'N/A'}`;
                  } else {
                    const errorMsg = performanceResult.data?.message || performanceResult.data?.data?.message || 'Unknown error';
                    performanceData = `\n\n📊 **Detailed Performance Analysis:**\n` +
                      `⚠️ **Limited Data Available:** ${errorMsg}\n` +
                      `This could be due to data availability for ${queryPlan.followUp.arguments.year} or the specific driver.`;
                  }
                  
                  const processingTime = performance.now() - startTime;
                  const responseContent = `🏁 **F1 Analysis for "${userInput}"**\n\n${championshipData}${performanceData}\n\n*Query processed in ${processingTime.toFixed(1)}ms*`;
                  
                  const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                  };
                  
                  setMessages(prev => [...prev, assistantMessage]);
                  setIsProcessing(false);
                  return;
                }
              }
            }
          }
        }
      }
      
      const processingTime = performance.now() - startTime;
      
      // Synthesize intelligent response
      let responseContent = `🏁 **F1 Analysis for "${userInput}"**\n\n`;
      
      if (result.status === 'success' && result.data) {
        // Check if the data contains an error message (pandas error)
        if (result.data.status === 'error') {
          responseContent += `❌ **Data Processing Error:** ${result.data.message}\n\n`;
          responseContent += `🔧 **Troubleshooting:** This might be due to data availability for the requested year. Try a different year or check the data source.\n`;
        } else {
          responseContent += await synthesizeResponse(userInput, result, queryPlan.tool);
        }
      } else {
        responseContent += `❌ **Error:** ${result.data?.message || 'Unknown error occurred'}\n`;
      }
      
      responseContent += `\n*Query processed in ${processingTime.toFixed(1)}ms*`;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nPlease try again or check the bridge connection.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>🏁 F1 Data Assistant - Intelligent</h1>
        <div className="header-controls">
          <button 
            onClick={() => setShowThoughtProcess(!showThoughtProcess)}
            className="thought-process-toggle"
            title={showThoughtProcess ? 'Hide Agent Thoughts' : 'Show Agent Thoughts'}
          >
            {showThoughtProcess ? '🧠 Hide' : '🧠 Show'} Agent Thoughts
          </button>
          <button 
            onClick={async () => {
              console.log('🧪 Manual test of agentic chain...');
              try {
                const chain = await agenticChain.executeChain('Test query', 'test-session');
                setCurrentChain(chain);
                console.log('✅ Test chain executed:', chain);
              } catch (error) {
                console.error('❌ Test chain failed:', error);
              }
            }}
            className="test-chain-btn"
            title="Test Agentic Chain"
          >
            🧪 Test Chain
          </button>
          <ConnectionStatus state={connectionState} />
        </div>
      </div>
      
      <div className="app-main">
        <ChatThread 
          messages={messages} 
          isProcessing={isProcessing} 
        />
        <InputArea 
          onSendMessage={handleUserMessage} 
          isDisabled={isProcessing || connectionState !== 'ready'} 
          isProcessing={isProcessing}
        />
      </div>
      
      {/* Agent Thought Process Console */}
      <AgentThoughtProcess
        chain={currentChain}
        isVisible={showThoughtProcess}
        onToggle={() => setShowThoughtProcess(false)}
      />
    </div>
  );
}

export default App;
