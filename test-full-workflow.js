#!/usr/bin/env bun

/**
 * TEST FULL DECK DEPLOYMENT WORKFLOW
 */

import { ELICITATION_TOOL_HANDLERS } from "./src/enforcement/mcp-server-integration.js";

console.log("🔧 Testing Full Deck Deployment Workflow\n");

async function testFullWorkflow() {
    console.log("📊 STEP 1: Analyze Migration Context");
    
    // Step 1: Analyze migration context (like when agent processes deck files)
    const analysisResult = await ELICITATION_TOOL_HANDLERS.analyze_migration_context({
        userMessage: "migrate my Kong configuration", 
        deckFiles: [], 
        deckConfigs: [], 
        gitContext: {}
    }, {});
    
    console.log("✅ Analysis complete. Elicitation required:", analysisResult.elicitationRequired);
    
    if (analysisResult.elicitationRequired) {
        console.log("\n🎯 STEP 2: Create Elicitation Session");
        
        // Step 2: Create elicitation session using the FULL analysis result
        const sessionResult = await ELICITATION_TOOL_HANDLERS.create_elicitation_session({
            analysisResult: analysisResult,  // Pass the FULL result
            context: {
                userMessage: "migrate my Kong configuration",
                deckFiles: [],
                deckConfigs: []
            }
        }, {});
        
        console.log("✅ Session created:", sessionResult.sessionId);
        console.log("📋 Requests to user:", sessionResult.requests?.length || 0);
        
        return sessionResult;
    }
}

testFullWorkflow().catch(error => {
    console.error("❌ Workflow failed:", error.message);
    console.error("Stack:", error.stack);
});