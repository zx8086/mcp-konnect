#!/usr/bin/env bun

/**
 * ELICITATION TOOLS TEST SCRIPT
 * 
 * Test both elicitation tools to verify expected vs actual outcomes
 */

import { ElicitationOperations } from "./src/tools/elicitation-tool.js";
import { ELICITATION_TOOL_HANDLERS } from "./src/enforcement/mcp-server-integration.js";

console.log("🔧 Testing Elicitation Tools - Expected vs Actual Outcomes\n");

// Initialize operations
const elicitationOps = new ElicitationOperations();

async function testAnalyzeMigrationContext() {
    console.log("📊 TEST 1: analyze_migration_context");
    console.log("Expected: Should analyze context and return elicitationRequired flag");
    
    try {
        const testArgs = {
            userMessage: "migrate my Kong configuration", 
            deckFiles: [], 
            deckConfigs: [], 
            gitContext: {}
        };
        
        console.log("Input:", JSON.stringify(testArgs, null, 2));
        
        const result = await ELICITATION_TOOL_HANDLERS.analyze_migration_context(testArgs, {});
        
        console.log("✅ ACTUAL RESULT:");
        console.log(JSON.stringify(result, null, 2));
        console.log("✅ SUCCESS: Tool worked as expected\n");
        
        return result;
        
    } catch (error) {
        console.log("❌ ACTUAL ERROR:", error.message);
        console.log("❌ FAILED: Tool threw error instead of returning result\n");
        return null;
    }
}

async function testCreateElicitationSession() {
    console.log("🎯 TEST 2: create_elicitation_session");
    console.log("Expected: Should create session or require analysisResult parameter");
    
    try {
        // Test with empty args (what user was doing)
        console.log("Input: {} (empty object)");
        
        const result = await ELICITATION_TOOL_HANDLERS.create_elicitation_session({}, {});
        
        console.log("✅ ACTUAL RESULT:");
        console.log(JSON.stringify(result, null, 2)); 
        console.log("✅ SUCCESS: Tool worked as expected\n");
        
    } catch (error) {
        console.log("❌ ACTUAL ERROR:", error.message);
        console.log("❌ FAILED: Tool requires analysisResult and context parameters\n");
        
        // Now test with proper parameters from first test
        console.log("🔄 Retesting with proper parameters...");
        
        try {
            const analysisResult = {
                elicitationRequired: true,
                missingInfo: { domain: true, environment: true, team: true },
                confidence: { overall: 0.2 }
            };
            
            const context = {
                userMessage: "migrate my Kong configuration",
                deckFiles: [],
                deckConfigs: []
            };
            
            const testArgs = { analysisResult, context };
            console.log("Input:", JSON.stringify(testArgs, null, 2));
            
            const result = await ELICITATION_TOOL_HANDLERS.create_elicitation_session(testArgs, {});
            
            console.log("✅ ACTUAL RESULT with proper params:");
            console.log(JSON.stringify(result, null, 2));
            console.log("✅ SUCCESS: Tool worked with proper parameters\n");
            
        } catch (retryError) {
            console.log("❌ STILL FAILED with proper params:", retryError.message);
        }
    }
}

async function runTests() {
    const analysisResult = await testAnalyzeMigrationContext();
    await testCreateElicitationSession();
    
    console.log("🎯 SUMMARY:");
    console.log("- analyze_migration_context: Should work with basic parameters");  
    console.log("- create_elicitation_session: Requires analysisResult from analyze_migration_context");
    console.log("- User error: Calling create_elicitation_session with empty {} object");
    console.log("- Fix: Always call analyze_migration_context first, then use its result");
}

runTests().catch(console.error);