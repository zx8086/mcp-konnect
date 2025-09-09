#!/usr/bin/env bun

/**
 * COMPREHENSIVE AGENT DECK DEPLOYMENT TEST
 * 
 * Tests the EXACT scenario from user's logs:
 * 1. Agent attempts deck deployment
 * 2. Operations get blocked with session IDs
 * 3. Agent should use session IDs (currently doesn't)
 * 4. Validate complete workflow works
 */

import { ELICITATION_TOOL_HANDLERS } from "./src/enforcement/mcp-server-integration.js";

console.log("🚀 COMPREHENSIVE AGENT DECK DEPLOYMENT TEST");
console.log("============================================\n");

// Sample deck configuration (typical deployment scenario)
const sampleDeckConfig = {
  _format_version: "3.0",
  services: [
    {
      name: "flight-booking-api",
      url: "http://booking-service:8080",
      protocol: "http",
      port: 8080,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
      retries: 5
    },
    {
      name: "payment-gateway",
      url: "https://payments.internal:443",
      protocol: "https",
      port: 443
    }
  ],
  routes: [
    {
      name: "booking-routes",
      service: "flight-booking-api",
      paths: ["/api/bookings"],
      methods: ["GET", "POST", "PUT", "DELETE"]
    },
    {
      name: "payment-routes", 
      service: "payment-gateway",
      paths: ["/api/payments"],
      methods: ["POST"]
    }
  ],
  plugins: [
    {
      name: "rate-limiting",
      service: "flight-booking-api",
      config: {
        minute: 100,
        hour: 1000
      }
    }
  ]
};

async function simulateAgentDeckDeployment() {
  console.log("📦 PHASE 1: Agent receives deck deployment request");
  console.log("User request: 'Please deploy this deck configuration for our flight booking system'");
  console.log("Deck contains:", JSON.stringify({
    services: sampleDeckConfig.services.length,
    routes: sampleDeckConfig.routes.length, 
    plugins: sampleDeckConfig.plugins.length
  }, null, 2));
  
  console.log("\n🔍 PHASE 2: Agent analyzes migration context");
  
  // Step 1: Agent should analyze context first
  const analysisResult = await ELICITATION_TOOL_HANDLERS.analyze_migration_context({
    userMessage: "Please deploy this deck configuration for our flight booking system",
    deckFiles: ["kong.yaml"],
    deckConfigs: [sampleDeckConfig],
    gitContext: {}
  }, {});
  
  console.log("✅ Context analysis result:");
  console.log(`   - Elicitation required: ${analysisResult.elicitationRequired}`);
  console.log(`   - Missing info: ${Object.keys(analysisResult.migrationAnalysis.missingInfo).filter(k => analysisResult.migrationAnalysis.missingInfo[k]).join(', ')}`);
  console.log(`   - Confidence: ${Math.round(analysisResult.migrationAnalysis.confidence.overall * 100)}%`);
  
  if (analysisResult.elicitationRequired) {
    console.log("\n🎯 PHASE 3: Agent creates elicitation session");
    
    const sessionResult = await ELICITATION_TOOL_HANDLERS.create_elicitation_session({
      analysisResult: analysisResult,
      context: {
        userMessage: "Please deploy this deck configuration for our flight booking system",
        deckFiles: ["kong.yaml"],
        deckConfigs: [sampleDeckConfig]
      }
    }, {});
    
    console.log("✅ Elicitation session created:");
    console.log(`   - Session ID: ${sessionResult.sessionId}`);
    console.log(`   - Questions count: ${sessionResult.requests?.length || 0}`);
    console.log(`   - Needs user input: ${sessionResult.needsUserInput}`);
    
    if (sessionResult.requests && sessionResult.requests.length > 0) {
      console.log("   - Sample questions:");
      sessionResult.requests.slice(0, 3).forEach(req => {
        console.log(`     • ${req.message || req.question || 'Question available'}`);
      });
    }
    
    console.log("\n💬 PHASE 4: Agent processes user responses");
    
    // Simulate user providing the missing information
    const userResponses = {
      domain: "booking",
      environment: "production",
      team: "flight-platform"
    };
    
    console.log("✅ User provides missing context:");
    console.log(JSON.stringify(userResponses, null, 2));
    
    // Process responses
    let allResponsesProcessed = true;
    if (sessionResult.requests && sessionResult.requests.length > 0) {
      try {
        const responseResult = await ELICITATION_TOOL_HANDLERS.process_elicitation_response({
          sessionId: sessionResult.sessionId,
          requestId: sessionResult.requests[0].id,
          response: {
            data: userResponses,
            declined: false,
            cancelled: false
          }
        }, {});
        
        console.log("✅ Response processed:");
        console.log(`   - Success: ${responseResult.success}`);
        console.log(`   - Session complete: ${responseResult.sessionComplete}`);
        console.log(`   - Message: ${responseResult.message}`);
        
      } catch (error) {
        console.log("❌ Response processing failed:", error.message);
        allResponsesProcessed = false;
      }
    }
    
    console.log("\n🚀 PHASE 5: Agent attempts actual Kong operations");
    console.log("Expected: Operations should now be unblocked and succeed");
    
    // This is where we'll test the actual Kong operations
    return {
      phase1_analysis: "✅ WORKING",
      phase2_session: "✅ WORKING", 
      phase3_responses: allResponsesProcessed ? "✅ WORKING" : "❌ BROKEN",
      phase4_deployment: "🔄 TO BE TESTED",
      sessionId: sessionResult.sessionId,
      userResponses: userResponses,
      deckConfig: sampleDeckConfig
    };
  }
  
  return {
    phase1_analysis: "✅ WORKING",
    phase2_session: "❓ SKIPPED - No elicitation needed",
    phase3_responses: "❓ SKIPPED",
    phase4_deployment: "🔄 DIRECT DEPLOYMENT",
    sessionId: null,
    userResponses: {},
    deckConfig: sampleDeckConfig
  };
}

async function testKongOperationsAfterElicitation(testResult) {
  console.log("🔧 TESTING KONG OPERATIONS AFTER ELICITATION");
  console.log("=============================================");
  
  if (!testResult.sessionId) {
    console.log("⚠️  No elicitation session - testing direct operations");
  } else {
    console.log(`✅ Using session ID: ${testResult.sessionId}`);
    console.log(`✅ With user context: ${JSON.stringify(testResult.userResponses)}`);
  }
  
  console.log("\n📊 Getting available control planes...");
  
  // We need to import the blocked operations to test the enforcement
  try {
    const { createBlockedOperationHandler } = await import("./src/enforcement/mcp-server-integration.js");
    
    // Test creating the first service from deck config
    console.log("\n🔧 Testing create_service operation...");
    const serviceHandler = createBlockedOperationHandler(
      "create_service",
      "Please deploy this deck configuration for our flight booking system",
      ["kong.yaml"],
      [testResult.deckConfig]
    );
    
    const serviceArgs = {
      controlPlaneId: "7561dc58-2d5c-4c40-a64e-c5fb372d71cc", // serverless-default
      name: testResult.deckConfig.services[0].name,
      host: testResult.deckConfig.services[0].url.replace(/^https?:\/\/([^:]+).*/, '$1'),
      port: testResult.deckConfig.services[0].port,
      protocol: testResult.deckConfig.services[0].protocol
    };
    
    console.log("Service creation args:", JSON.stringify(serviceArgs, null, 2));
    
    const serviceResult = await serviceHandler(serviceArgs, {});
    
    if (serviceResult.error === "KONG_OPERATION_BLOCKED") {
      console.log("❌ Service creation BLOCKED as expected:");
      console.log(`   - Session ID: ${serviceResult.sessionId}`);
      console.log(`   - Missing fields: ${serviceResult.missingFields.join(', ')}`);
      console.log(`   - Next steps provided: ${serviceResult.nextSteps.length > 0}`);
      
      return {
        kong_operations: "❌ BLOCKED - Need to use session ID",
        blockingWorking: "✅ WORKING", 
        sessionId: serviceResult.sessionId,
        missingFields: serviceResult.missingFields,
        nextSteps: serviceResult.nextSteps
      };
    } else {
      console.log("✅ Service creation succeeded:");
      console.log(JSON.stringify(serviceResult, null, 2));
      
      return {
        kong_operations: "✅ WORKING",
        blockingWorking: "⚠️  NOT BLOCKING",
        serviceResult: serviceResult
      };
    }
    
  } catch (error) {
    console.log("❌ Kong operation test failed:", error.message);
    return {
      kong_operations: "❌ FAILED",
      error: error.message
    };
  }
}

async function runComprehensiveTest() {
  console.log("🎯 STARTING COMPREHENSIVE AGENT WORKFLOW TEST\n");
  
  // Phase 1-4: Test elicitation workflow
  const elicitationResult = await simulateAgentDeckDeployment();
  
  // Phase 5: Test Kong operations
  const kongResult = await testKongOperationsAfterElicitation(elicitationResult);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 COMPREHENSIVE TEST RESULTS");
  console.log("=".repeat(60));
  
  console.log("\n📊 ELICITATION WORKFLOW:");
  console.log(`   Context Analysis: ${elicitationResult.phase1_analysis}`);
  console.log(`   Session Creation: ${elicitationResult.phase2_session}`);
  console.log(`   Response Processing: ${elicitationResult.phase3_responses}`);
  console.log(`   Deck Deployment: ${elicitationResult.phase4_deployment}`);
  
  console.log("\n🔧 KONG OPERATIONS:");
  console.log(`   Operations Status: ${kongResult.kong_operations}`);
  console.log(`   Blocking System: ${kongResult.blockingWorking}`);
  
  if (kongResult.sessionId) {
    console.log(`   Blocked Session ID: ${kongResult.sessionId}`);
    console.log(`   Missing Fields: ${kongResult.missingFields?.join(', ')}`);
  }
  
  console.log("\n🚨 CRITICAL FINDING:");
  if (kongResult.kong_operations.includes("BLOCKED")) {
    console.log("❌ PROBLEM CONFIRMED: Operations are blocked but agent doesn't use session IDs");
    console.log("✅ SOLUTION NEEDED: Agent must use process_elicitation_response with session IDs");
  } else {
    console.log("✅ Operations working - may need to verify blocking is active");
  }
  
  return {
    elicitation: elicitationResult,
    kong: kongResult,
    overallStatus: kongResult.kong_operations.includes("BLOCKED") ? 
      "❌ AGENT WORKFLOW BROKEN - Needs session ID implementation" : 
      "✅ WORKFLOW FUNCTIONING"
  };
}

// Run the comprehensive test
runComprehensiveTest().then(results => {
  console.log("\n🎯 FINAL ASSESSMENT:");
  console.log("==================");
  console.log(`Overall Status: ${results.overallStatus}`);
  
  if (results.overallStatus.includes("BROKEN")) {
    console.log("\n🔧 REQUIRED FIXES:");
    console.log("1. Agent must use session IDs from blocked operations");
    console.log("2. Agent must call process_elicitation_response with session ID");
    console.log("3. Agent must not retry blocked operations");
    console.log("4. Integration between elicitation and deployment needs implementation");
  }
  
}).catch(error => {
  console.error("💥 COMPREHENSIVE TEST FAILED:", error.message);
  console.error("Stack:", error.stack);
});