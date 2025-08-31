import { RestaurantRecommendationAgent } from './agents/restaurant-agent';

// Simple test of the AI agent
async function testAgent() {
  console.log('🧪 Testing Restaurant Recommendation Agent...\n');
  
  try {
    const agent = new RestaurantRecommendationAgent();
    
    // Test connection
    console.log('🔍 Testing OpenAI connection...');
    const connectionTest = await agent.testConnection();
    console.log(`Connection test: ${connectionTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (connectionTest) {
      console.log('\n🎯 Testing recommendation generation...');
      const result = await agent.getRecommendations('I want Italian food in San Francisco', 3);
      
      console.log('\n📋 Recommendations generated:');
      console.log(`- Total recommendations: ${result.recommendations.length}`);
      console.log(`- Confidence score: ${result.confidence.toFixed(2)}`);
      console.log(`- Reasoning: ${result.reasoning.substring(0, 200)}...`);
      console.log(`- Next steps: ${result.nextSteps.join(', ')}`);
      
      console.log('\n🎉 Agent test completed successfully!');
    } else {
      console.log('\n❌ Cannot test recommendations without OpenAI connection');
    }
    
  } catch (error) {
    console.error('❌ Agent test failed:', error);
  }
}

// Run the test
testAgent();
