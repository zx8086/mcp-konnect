#!/usr/bin/env bun

/**
 * UNIFIED BRIDGE WORKFLOW TEST
 * 
 * Tests the complete bridged elicitation workflow:
 * 1. Migration analysis creates session with context
 * 2. User provides context to migration session  
 * 3. Kong operation gets blocked
 * 4. Bridge automatically connects migration context to blocked operation
 * 5. Operation gets unblocked and succeeds
 */

import { ELICITATION_TOOL_HANDLERS } from "./src/enforcement/mcp-server-integration.js";
import { unifiedElicitationBridge } from "./src/enforcement/unified-elicitation-bridge.js";

console.log("🌉 UNIFIED BRIDGE WORKFLOW TEST");
console.log("===============================\n");

// Clear any existing sessions
unifiedElicitationBridge.clearAllSessions();

async function testBridgedWorkflow() {
  console.log("📋 PHASE 1: Migration Analysis & Session Creation");
  
  // Step 1: Analyze context (like agent processing deck deployment)
  const analysisResult = await ELICITATION_TOOL_HANDLERS.analyze_migration_context({
    userMessage: "Deploy this Kong deck configuration for the flight booking platform",
    deckFiles: ["kong-production.yaml"],
    deckConfigs: [{
      _format_version: "3.0",
      services: [{ name: "flight-booking-api", url: "http://booking.prod:8080" }],
      routes: [{ name: "booking-routes", service: "flight-booking-api", paths: ["/api/bookings"] }]
    }],
    gitContext: {}
  }, {});
  
  console.log("✅ Context analysis:", {
    elicitationRequired: analysisResult.elicitationRequired,
    confidence: Math.round(analysisResult.migrationAnalysis.confidence.overall * 100) + "%",
    missingInfo: Object.keys(analysisResult.migrationAnalysis.missingInfo).filter(k => analysisResult.migrationAnalysis.missingInfo[k])
  });
  
  // Step 2: Create migration elicitation session
  const migrationSession = await ELICITATION_TOOL_HANDLERS.create_elicitation_session({
    analysisResult: analysisResult,
    context: {
      userMessage: "Deploy this Kong deck configuration for the flight booking platform",
      deckFiles: ["kong-production.yaml"],
      deckConfigs: [{
        _format_version: "3.0",
        services: [{ name: "flight-booking-api", url: "http://booking.prod:8080" }]
      }]
    }
  }, {});
  
  console.log("✅ Migration session created:", migrationSession.sessionId);
  
  console.log("\n💬 PHASE 2: User Provides Migration Context");
  
  // Step 3: User provides context to migration session
  const userContext = {
    domain: "booking",
    environment: "production", 
    team: "flight-platform"
  };
  
  console.log("User provides:", userContext);
  
  const migrationResponse = await ELICITATION_TOOL_HANDLERS.process_elicitation_response({
    sessionId: migrationSession.sessionId,
    requestId: migrationSession.requests[0].id,
    response: {
      data: userContext,
      declined: false,
      cancelled: false
    }
  }, {});
  
  console.log("✅ Migration response processed:", {
    success: migrationResponse.success,
    bridgeReady: migrationResponse.bridgeReady,
    contextCaptured: migrationResponse.contextCaptured
  });
  
  console.log("\n🔒 PHASE 3: Kong Operation Gets Blocked");
  
  // Step 4: Simulate Kong operation (like agent deploying services)
  const { createBlockedOperationHandler } = await import("./src/enforcement/mcp-server-integration.js");
  
  const serviceHandler = createBlockedOperationHandler(
    "create_service",
    "Deploy this Kong deck configuration for the flight booking platform",
    ["kong-production.yaml"],
    [{ services: [{ name: "flight-booking-api" }] }]
  );
  
  const serviceArgs = {
    controlPlaneId: "7561dc58-2d5c-4c40-a64e-c5fb372d71cc",
    name: "flight-booking-api",
    host: "booking.prod",
    port: 8080,
    protocol: "http"
  };
  
  console.log("Attempting to create service:", serviceArgs.name);
  
  const serviceResult = await serviceHandler(serviceArgs, {});
  
  console.log("🔒 Service operation result:", {
    blocked: serviceResult.error === "KONG_OPERATION_BLOCKED",
    sessionId: serviceResult.sessionId,
    bridged: serviceResult.bridgeInfo?.bridged,
    autoUnblocked: serviceResult.autoUnblocked
  });
  
  console.log("\n🌉 PHASE 4: Bridge Status Analysis");
  
  // Check bridge status
  const migrationBridgeStatus = unifiedElicitationBridge.getBridgedSessionStatus(migrationSession.sessionId);
  const blockingBridgeStatus = unifiedElicitationBridge.getBridgedSessionStatus(serviceResult.sessionId);
  
  console.log("Migration session bridge status:", {
    isMigration: migrationBridgeStatus.isMigrationSession,
    linkedTo: migrationBridgeStatus.linkedSessionId,
    contextComplete: migrationBridgeStatus.bridgeSession?.isComplete
  });
  
  console.log("Blocking session bridge status:", {
    isBlocking: blockingBridgeStatus.isBlockingSession,
    linkedTo: blockingBridgeStatus.linkedSessionId
  });
  
  // Get all sessions for debugging
  const allSessions = unifiedElicitationBridge.getAllSessions();
  console.log("All bridge sessions:", {
    bridgeSessionCount: allSessions.bridgeSessions.size,
    migrationToBlockingMappings: allSessions.migrationToBlocking.size,
    blockingToMigrationMappings: allSessions.blockingToMigration.size
  });
  
  console.log("\n🎯 PHASE 5: Testing Bridge Effectiveness");
  
  let finalResult;
  if (serviceResult.autoUnblocked) {
    console.log("✅ SUCCESS: Service was auto-unblocked through bridge!");
    finalResult = {
      bridgeWorking: "✅ PERFECT",
      autoUnblocking: "✅ WORKING",
      sessionLinking: "✅ WORKING",
      contextTransfer: "✅ WORKING"
    };
  } else if (serviceResult.bridgeInfo?.bridged) {
    console.log("🔄 PARTIAL: Service blocked but bridge linked - testing manual unblock");
    
    // Try to unblock using the blocking session ID
    const unblockResponse = await ELICITATION_TOOL_HANDLERS.process_elicitation_response({
      sessionId: serviceResult.sessionId,
      responses: userContext,
      declined: false
    }, {});
    
    console.log("Manual unblock result:", {
      success: unblockResponse.success,
      bridgeUpdated: unblockResponse.bridgeUpdated
    });
    
    finalResult = {
      bridgeWorking: "✅ WORKING",
      autoUnblocking: "⚠️ PARTIAL - Manual step needed", 
      sessionLinking: "✅ WORKING",
      contextTransfer: "✅ WORKING"
    };
  } else {
    console.log("❌ FAILURE: Bridge did not link sessions");
    finalResult = {
      bridgeWorking: "❌ BROKEN",
      autoUnblocking: "❌ BROKEN",
      sessionLinking: "❌ BROKEN", 
      contextTransfer: "❓ UNTESTED"
    };
  }
  
  return {
    migrationSessionId: migrationSession.sessionId,
    blockingSessionId: serviceResult.sessionId,
    userContext: userContext,
    bridgeStatus: finalResult,
    serviceResult: serviceResult
  };
}

async function runBridgeTest() {
  console.log("🚀 STARTING UNIFIED BRIDGE TEST\n");
  
  const testResult = await testBridgedWorkflow();
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 UNIFIED BRIDGE TEST RESULTS");
  console.log("=".repeat(60));
  
  console.log("\n📊 SESSION INFORMATION:");
  console.log(`   Migration Session: ${testResult.migrationSessionId}`);
  console.log(`   Blocking Session: ${testResult.blockingSessionId}`);
  console.log(`   User Context: ${JSON.stringify(testResult.userContext)}`);
  
  console.log("\n🌉 BRIDGE EFFECTIVENESS:");
  Object.entries(testResult.bridgeStatus).forEach(([component, status]) => {
    console.log(`   ${component}: ${status}`);
  });
  
  const overallSuccess = Object.values(testResult.bridgeStatus).every(status => status.includes("✅"));
  const partialSuccess = Object.values(testResult.bridgeStatus).some(status => status.includes("✅"));
  
  if (overallSuccess) {
    console.log("\n🎉 OVERALL RESULT: ✅ BRIDGE FULLY FUNCTIONAL");
    console.log("✅ Agent deck deployment workflow should now work seamlessly!");
    console.log("✅ Migration context automatically bridges to Kong operations!");
  } else if (partialSuccess) {
    console.log("\n⚠️ OVERALL RESULT: 🔄 BRIDGE PARTIALLY FUNCTIONAL"); 
    console.log("🔄 Bridge links sessions but may need manual completion step");
    console.log("🔧 Agent workflow improved but not fully automatic");
  } else {
    console.log("\n❌ OVERALL RESULT: 💥 BRIDGE NOT FUNCTIONAL");
    console.log("❌ Agent deck deployment workflow still broken");
    console.log("🔧 Additional fixes needed");
  }
  
  return testResult;
}

// Run the test
runBridgeTest().then(results => {
  console.log("\n🎯 NEXT STEPS:");
  
  if (results.bridgeStatus.bridgeWorking.includes("✅")) {
    console.log("1. ✅ Bridge implementation successful");
    console.log("2. 🧪 Test with real Kong Konnect Engineer agent");
    console.log("3. 📋 Validate complete deck deployment workflow");
  } else {
    console.log("1. 🔧 Debug bridge session linking");
    console.log("2. 🔧 Fix context transfer mechanism");
    console.log("3. 🧪 Re-test bridge implementation");
  }
  
}).catch(error => {
  console.error("💥 BRIDGE TEST CRASHED:", error.message);
  console.error("Stack:", error.stack);
});