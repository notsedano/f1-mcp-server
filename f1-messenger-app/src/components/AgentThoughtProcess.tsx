import React, { useState, useEffect } from 'react';
import type { AgenticChain } from '../services/agenticChain';
import './AgentThoughtProcess.css';

interface AgentThoughtProcessProps {
  chain: AgenticChain | null;
  isVisible: boolean;
  onToggle: () => void;
}

export const AgentThoughtProcess: React.FC<AgentThoughtProcessProps> = ({
  chain,
  isVisible,
  onToggle
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'ml-data'>('overview');

  useEffect(() => {
    if (autoScroll && chain) {
      const element = document.getElementById('thought-process-container');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, [chain, autoScroll]);

  if (!isVisible) return null;

  const toggleStep = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex);
    } else {
      newExpanded.add(stepIndex);
    }
    setExpandedSteps(newExpanded);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    if (confidence >= 0.4) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getConfidenceEmoji = (confidence: number): string => {
    if (confidence >= 0.8) return '🟢';
    if (confidence >= 0.6) return '🟡';
    if (confidence >= 0.4) return '🟠';
    return '🔴';
  };

  const getComplexityColor = (complexity: string): string => {
    switch (complexity) {
      case 'simple': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'complex': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getIntentColor = (intent: string): string => {
    switch (intent) {
      case 'lookup': return '#3b82f6';
      case 'comparison': return '#8b5cf6';
      case 'analysis': return '#f59e0b';
      case 'prediction': return '#ec4899';
      default: return '#6b7280';
    }
  };

  return (
    <div className="agent-thought-process">
      <div className="thought-process-header">
        <h3>🧠 Agent Thought Process</h3>
        <div className="header-controls">
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`auto-scroll-btn ${autoScroll ? 'active' : ''}`}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? '🔒' : '🔓'}
          </button>
          <button onClick={onToggle} className="close-btn" title="Close console">
            ✕
          </button>
        </div>
      </div>

      {!chain ? (
        <div className="no-chain">
          <p>No active thought process. Send a message to see the agent think!</p>
        </div>
      ) : (
        <div className="thought-process-content">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
              onClick={() => setSelectedTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'details' ? 'active' : ''}`}
              onClick={() => setSelectedTab('details')}
            >
              🔍 Details
            </button>
            <button 
              className={`tab-btn ${selectedTab === 'ml-data' ? 'active' : ''}`}
              onClick={() => setSelectedTab('ml-data')}
            >
              🤖 ML Data
            </button>
          </div>

          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="tab-content">
              {/* Query Summary */}
              <div className="query-summary">
                <h4>📝 Query</h4>
                <p className="query-text">{chain.query}</p>
                <div className="query-metrics">
                  <span className="metric">
                    ⏱️ {chain.totalProcessingTime}ms
                  </span>
                  <span className="metric">
                    🔄 Level {chain.recursionLevel}/{chain.maxRecursion}
                  </span>
                  <span className="metric">
                    🛠️ {chain.toolsAttempted.length} tools
                  </span>
                </div>
              </div>

              {/* Decision Path Visualization */}
              <div className="decision-path">
                <h4>🛤️ Decision Path</h4>
                <div className="path-visualization">
                  {chain.decisionPath.map((decision, index) => (
                    <div key={index} className="path-step">
                      <span className="path-number">{index + 1}</span>
                      <span className="path-decision">{decision}</span>
                      {index < chain.decisionPath.length - 1 && (
                        <span className="path-arrow">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Trajectory */}
              <div className="confidence-trajectory">
                <h4>📈 Confidence Trajectory</h4>
                <div className="confidence-chart">
                  {chain.confidenceTrajectory.map((confidence, index) => (
                    <div 
                      key={index} 
                      className="confidence-bar"
                      style={{ 
                        height: `${confidence * 100}%`,
                        backgroundColor: getConfidenceColor(confidence)
                      }}
                      title={`Step ${index + 1}: ${(confidence * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
              </div>

              {/* Final Answer */}
              <div className="final-answer">
                <h4>🎯 Final Answer</h4>
                <div className="answer-content">
                  {chain.finalAnswer}
                </div>
                {chain.fallbackUsed && (
                  <div className="fallback-warning">
                    ⚠️ Fallback mechanism was used
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details Tab */}
          {selectedTab === 'details' && (
            <div className="tab-content">
              <div className="thought-steps">
                <h4>🔍 Thought Steps</h4>
                {chain.steps.map((step, index) => (
                  <div key={index} className="thought-step">
                    <div 
                      className="step-header"
                      onClick={() => toggleStep(index)}
                    >
                      <span className="step-number">#{index + 1}</span>
                      <span className="step-action">{step.action}</span>
                      <span className="step-confidence">
                        {getConfidenceEmoji(step.confidence)} {(step.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="step-duration">{step.duration}ms</span>
                      <span className="step-toggle">
                        {expandedSteps.has(index) ? '▼' : '▶'}
                      </span>
                    </div>

                    {expandedSteps.has(index) && (
                      <div className="step-details">
                        <div className="step-thought">
                          <strong>💭 Thought:</strong> {step.thought}
                        </div>
                        
                        <div className="step-reasoning">
                          <strong>🧠 Reasoning:</strong> {step.reasoning}
                        </div>
                        
                        {step.alternatives.length > 0 && (
                          <div className="step-alternatives">
                            <strong>🔄 Alternatives Considered:</strong>
                            <ul>
                              {step.alternatives.map((alt, altIndex) => (
                                <li key={altIndex}>{alt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="step-factors">
                          <strong>⚖️ Decision Factors:</strong>
                          <ul>
                            {step.decisionFactors.map((factor, factorIndex) => (
                              <li key={factorIndex}>{factor}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {step.arguments && Object.keys(step.arguments).length > 0 && (
                          <div className="step-arguments">
                            <strong>🔧 Arguments:</strong>
                            <pre>{JSON.stringify(step.arguments, null, 2)}</pre>
                          </div>
                        )}
                        
                        {step.observation && (
                          <div className="step-observation">
                            <strong>👁️ Observation:</strong>
                            <pre>{JSON.stringify(step.observation, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ML Data Tab */}
          {selectedTab === 'ml-data' && (
            <div className="tab-content">
              <div className="ml-data-section">
                <h4>🤖 Machine Learning Features</h4>
                
                {/* Query Metadata */}
                <div className="ml-feature-group">
                  <h5>📊 Query Analysis</h5>
                  <div className="feature-grid">
                    <div className="feature-item">
                      <span className="feature-label">Complexity:</span>
                      <span 
                        className="feature-value"
                        style={{ color: getComplexityColor(chain.queryMetadata.complexity) }}
                      >
                        {chain.queryMetadata.complexity.toUpperCase()}
                      </span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Intent:</span>
                      <span 
                        className="feature-value"
                        style={{ color: getIntentColor(chain.queryMetadata.intent) }}
                      >
                        {chain.queryMetadata.intent.toUpperCase()}
                      </span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Domain:</span>
                      <span className="feature-value">{chain.queryMetadata.domain.toUpperCase()}</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Temporal Scope:</span>
                      <span className="feature-value">{chain.queryMetadata.temporalScope.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="ml-feature-group">
                  <h5>⚡ Performance Metrics</h5>
                  <div className="feature-grid">
                    <div className="feature-item">
                      <span className="feature-label">Avg Step Duration:</span>
                      <span className="feature-value">{chain.performanceMetrics.averageStepDuration.toFixed(1)}ms</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Max Step Duration:</span>
                      <span className="feature-value">{chain.performanceMetrics.maxStepDuration.toFixed(1)}ms</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Tool Efficiency:</span>
                      <span className="feature-value">{(chain.performanceMetrics.toolCallEfficiency * 100).toFixed(0)}%</span>
                    </div>
                    <div className="feature-item">
                      <span className="feature-label">Recursion Efficiency:</span>
                      <span className="feature-value">{(chain.performanceMetrics.recursionEfficiency * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Tool Usage Patterns */}
                <div className="ml-feature-group">
                  <h5>🛠️ Tool Usage Patterns</h5>
                  <div className="tool-usage">
                    {chain.toolsAttempted.length > 0 ? (
                      <div className="tool-list">
                        {chain.toolsAttempted.map((tool, index) => (
                          <span key={index} className="tool-tag">{tool}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="no-tools">No tools used</span>
                    )}
                  </div>
                </div>

                {/* Confidence Analysis */}
                <div className="ml-feature-group">
                  <h5>📈 Confidence Analysis</h5>
                  <div className="confidence-analysis">
                    <div className="confidence-stats">
                      <span className="stat">
                        <strong>Start:</strong> {(chain.confidenceTrajectory[0] * 100).toFixed(0)}%
                      </span>
                      <span className="stat">
                        <strong>End:</strong> {(chain.confidenceTrajectory[chain.confidenceTrajectory.length - 1] * 100).toFixed(0)}%
                      </span>
                      <span className="stat">
                        <strong>Change:</strong> 
                        {((chain.confidenceTrajectory[chain.confidenceTrajectory.length - 1] - chain.confidenceTrajectory[0]) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export for ML */}
                <div className="ml-feature-group">
                  <h5>💾 ML Export</h5>
                  <button 
                    className="export-ml-btn"
                    onClick={() => {
                      const mlData = {
                        query: chain.query,
                        metadata: chain.queryMetadata,
                        performance: chain.performanceMetrics,
                        confidence: chain.confidenceTrajectory,
                        tools: chain.toolsAttempted,
                        timestamp: new Date().toISOString()
                      };
                      console.log('ML Training Data:', mlData);
                      navigator.clipboard.writeText(JSON.stringify(mlData, null, 2));
                      alert('ML data copied to clipboard!');
                    }}
                  >
                    📋 Copy ML Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
