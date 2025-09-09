#!/usr/bin/env node

// Test MCP elicitation functionality directly
async function testElicitationFlow() {
  console.log('🔄 Testing elicitation tools workflow...');
  
  try {
    // Import the main server class
    const { default: Server } = await import('./dist/index.js');
    
    console.log('✅ Server imported successfully');
    
    // Create server instance (this might fail due to missing env vars, but we're testing structure)
    const server = new Server({
      apiKey: 'test-key',
      apiRegion: 'us'
    });
    
    console.log('✅ Server instance created');
    
    // Try to access the tool registry
    if (server.getAllTools) {
      const tools = server.getAllTools();
      console.log(`📊 Total tools: ${tools.length}`);
      
      const elicitationTools = tools.filter(t => t.category === 'elicitation');
      console.log(`🔍 Elicitation tools: ${elicitationTools.length}`);
      
      elicitationTools.forEach(tool => {
        console.log(`  - ${tool.method}: ${tool.name}`);
      });
    } else {
      console.log('⚠️  Server.getAllTools() method not available');
    }
    
  } catch (error) {
    console.log('❌ Error during test:');
    console.log('   Error:', error.message);
    console.log('   This might be expected due to missing dependencies or environment setup');
    
    // Let's try a different approach - check if we can import elicitation tools directly
    console.log('🔄 Trying alternative import...');
    
    try {
      const fs = await import('fs/promises');
      const distContent = await fs.readFile('./dist/index.js', 'utf8');
      
      const hasAnalyzeContext = distContent.includes('analyze_migration_context');
      const hasCreateSession = distContent.includes('create_elicitation_session');
      const hasProcessResponse = distContent.includes('process_elicitation_response');
      const hasGetStatus = distContent.includes('get_session_status');
      
      console.log('📋 Compiled elicitation tools check:');
      console.log(`   analyze_migration_context: ${hasAnalyzeContext ? '✅' : '❌'}`);
      console.log(`   create_elicitation_session: ${hasCreateSession ? '✅' : '❌'}`);
      console.log(`   process_elicitation_response: ${hasProcessResponse ? '✅' : '❌'}`);
      console.log(`   get_session_status: ${hasGetStatus ? '✅' : '❌'}`);
      
      if (hasAnalyzeContext && hasCreateSession && hasProcessResponse && hasGetStatus) {
        console.log('✅ All elicitation tools appear to be compiled into the bundle');
      } else {
        console.log('❌ Some elicitation tools are missing from the bundle');
      }
      
    } catch (importError) {
      console.log('❌ Failed alternative check:', importError.message);
    }
  }
}

testElicitationFlow().catch(console.error);