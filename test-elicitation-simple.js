#!/usr/bin/env bun

/**
 * Simple test for MCP elicitation functionality
 */

import { gatherKongContext } from './src/utils/mcp-elicitation.js';

// Mock RequestHandlerExtra for testing
const mockExtra = {
  elicit: async (request) => {
    console.log('🔍 MCP ELICITATION REQUEST:', JSON.stringify(request, null, 2));
    
    // Simulate user providing context
    return {
      domain: 'demo',
      environment: 'development', 
      team: 'platform'
    };
  }
};

async function testElicitation() {
  console.log('🧪 Testing MCP Elicitation Framework\n');
  
  // Test 1: Direct context provision (no elicitation needed)
  console.log('📝 Test 1: Direct context in user message');
  const result1 = await gatherKongContext(
    mockExtra,
    'deploy service with domain=api, environment=production, team=devops'
  );
  
  console.log('✅ Result 1:', result1);
  console.log('Expected: success=true, context extracted from message\n');
  
  // Test 2: Missing context triggers elicitation
  console.log('📝 Test 2: Missing context triggers elicitation');
  const result2 = await gatherKongContext(
    mockExtra,
    'deploy test service'
  );
  
  console.log('✅ Result 2:', result2);
  console.log('Expected: success=true, context from elicitation\n');
  
  // Test 3: No elicitation available (Claude Desktop direct mode)
  console.log('📝 Test 3: No elicitation available');
  const mockExtraNoElicit = {};
  const result3 = await gatherKongContext(
    mockExtraNoElicit,
    'deploy test service'
  );
  
  console.log('✅ Result 3:', result3);
  console.log('Expected: success=false, error message with format instructions\n');
  
  // Test 4: Partial context with elicitation
  console.log('📝 Test 4: Partial context with elicitation');
  const result4 = await gatherKongContext(
    mockExtra,
    'deploy with domain=api',
    { team: 'platform' }
  );
  
  console.log('✅ Result 4:', result4);
  console.log('Expected: success=true, merged context\n');
}

testElicitation()
  .then(() => {
    console.log('🎉 All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });