// Test script for Agentic Chain Service
// This tests the enhanced thought process tracking system

const { agenticChain } = require('./dist/services/agenticChain.js');

async function testAgenticChain() {
  console.log('🧠 Testing Agentic Chain Service...\n');
  
  try {
    // Test 1: Basic query
    console.log('📝 Test 1: Basic F1 query');
    const chain1 = await agenticChain.executeChain(
      'Who won the 2023 championship?',
      'test-session-1'
    );
    console.log('✅ Chain 1 executed successfully');
    console.log('Query:', chain1.query);
    console.log('Steps:', chain1.steps.length);
    console.log('Total time:', chain1.totalProcessingTime + 'ms');
    console.log('Tools attempted:', chain1.toolsAttempted);
    console.log('Confidence trajectory:', chain1.confidenceTrajectory);
    console.log('Decision path:', chain1.decisionPath);
    console.log('Query metadata:', chain1.queryMetadata);
    console.log('Performance metrics:', chain1.performanceMetrics);
    console.log('---\n');
    
    // Test 2: Complex comparison query
    console.log('📝 Test 2: Complex comparison query');
    const chain2 = await agenticChain.executeChain(
      'Compare Verstappen and Hamilton performance in 2023',
      'test-session-2'
    );
    console.log('✅ Chain 2 executed successfully');
    console.log('Query:', chain2.query);
    console.log('Complexity:', chain2.queryMetadata.complexity);
    console.log('Intent:', chain2.queryMetadata.intent);
    console.log('Domain:', chain2.queryMetadata.domain);
    console.log('---\n');
    
    // Test 3: Historical query
    console.log('📝 Test 3: Historical query');
    const chain3 = await agenticChain.executeChain(
      'What happened in the 2021 Abu Dhabi Grand Prix?',
      'test-session-3'
    );
    console.log('✅ Chain 3 executed successfully');
    console.log('Query:', chain3.query);
    console.log('Temporal scope:', chain3.queryMetadata.temporalScope);
    console.log('---\n');
    
    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Summary of ML-composable features:');
    console.log('- Query complexity analysis');
    console.log('- Intent classification');
    console.log('- Domain identification');
    console.log('- Temporal scope detection');
    console.log('- Performance metrics tracking');
    console.log('- Confidence trajectory analysis');
    console.log('- Tool usage patterns');
    console.log('- Decision path visualization');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAgenticChain();
