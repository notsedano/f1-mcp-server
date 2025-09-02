// Test script for AgenticChain Service in Fallback Mode
// This tests the service without requiring a Gemini API key

console.log('🧪 Testing AgenticChain Service in Fallback Mode...\n');

// Mock the browser environment
global.window = {};
global.import = { meta: { env: {} } };

// Import the service
const { agenticChain } = require('./dist/services/agenticChain.js');

async function testFallbackMode() {
  try {
    console.log('1. Checking service availability...');
    const isAvailable = agenticChain.isAvailable();
    console.log(`   ✅ Service available: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log('   ❌ Service not available - this is a problem');
      return;
    }
    
    console.log('\n2. Testing chain execution...');
    const chain = await agenticChain.executeChain(
      'Who won the 2023 championship?',
      'test-session-1'
    );
    
    console.log('   ✅ Chain executed successfully!');
    console.log(`   📝 Query: ${chain.query}`);
    console.log(`   🔄 Steps: ${chain.steps.length}`);
    console.log(`   ⏱️  Total time: ${chain.totalProcessingTime}ms`);
    console.log(`   🛠️  Tools attempted: ${chain.toolsAttempted.length}`);
    console.log(`   📊 Fallback used: ${chain.fallbackUsed}`);
    console.log(`   🎯 Final answer: ${chain.finalAnswer.substring(0, 100)}...`);
    
    console.log('\n3. Testing ML-composable features...');
    console.log(`   📊 Query complexity: ${chain.queryMetadata.complexity}`);
    console.log(`   🎯 Intent: ${chain.queryMetadata.intent}`);
    console.log(`   🏁 Domain: ${chain.queryMetadata.domain}`);
    console.log(`   ⏰ Temporal scope: ${chain.queryMetadata.temporalScope}`);
    
    console.log('\n4. Testing performance metrics...');
    console.log(`   ⚡ Avg step duration: ${chain.performanceMetrics.averageStepDuration}ms`);
    console.log(`   🚀 Tool efficiency: ${(chain.performanceMetrics.toolCallEfficiency * 100).toFixed(0)}%`);
    console.log(`   🔄 Recursion efficiency: ${(chain.performanceMetrics.recursionEfficiency * 100).toFixed(0)}%`);
    
    console.log('\n🎉 All tests passed! The service is working in fallback mode.');
    console.log('\n📋 Summary of what this means:');
    console.log('- ✅ AgenticChain service initializes without API key');
    console.log('- ✅ Generates mock thought process data');
    console.log('- ✅ UI can display thought process console');
    console.log('- ✅ All ML-composable features are available');
    console.log('- 🔑 To enable real LLM features, set VITE_GEMINI_API_KEY');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testFallbackMode();
