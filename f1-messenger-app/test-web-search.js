// Test script for web search functionality
import fetch from 'node-fetch';

async function testWebSearch() {
  const testQueries = [
    "What is the capital of France?",
    "How many planets are in our solar system?",
    "Who won the 2023 Monaco Grand Prix?", // This should go to F1 tools
    "What is the population of Tokyo?"
  ];

  for (const query of testQueries) {
    console.log(`\n🧪 Testing query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:11435/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'f1-agent',
          messages: [{ role: 'user', content: query }],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response received:');
        console.log(data.message.content.substring(0, 200) + '...');
      } else {
        console.log('❌ Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Request failed:', error.message);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

testWebSearch().catch(console.error);
