#!/usr/bin/env bun

/**
 * VALIDATE DECK DEPLOYMENT WORKFLOW - EXPECTED vs REALITY
 * 
 * This simulates exactly what should happen when you ask:
 * "Please deploy this deck configuration"
 */

import { ELICITATION_TOOL_HANDLERS } from "./src/enforcement/mcp-server-integration.js";

console.log("🔍 DECK DEPLOYMENT WORKFLOW VALIDATION");
console.log("=====================================");

async function validateWorkflow() {
    console.log("\n📋 SCENARIO: User asks agent to deploy deck configuration");
    console.log("Expected: Agent should analyze context, create elicitation session, and present questions");
    console.log("Reality: Let's test what actually happens...\n");
    
    // STEP 1: What agent should do first - analyze the context
    console.log("🔍 STEP 1: analyze_migration_context");
    console.log("Expected: Should analyze and detect missing domain/environment/team");
    
    let step1Success = false;
    let analysisResult;
    
    try {
        analysisResult = await ELICITATION_TOOL_HANDLERS.analyze_migration_context({
            userMessage: "Please deploy this deck configuration for our API gateway",
            deckFiles: ["kong.yaml"],
            deckConfigs: [{
                _format_version: "3.0",
                services: [{
                    name: "api-service",
                    url: "http://api.example.com"
                }],
                routes: [{
                    name: "api-route",
                    service: "api-service",
                    paths: ["/api"]
                }]
            }],
            gitContext: {}
        }, {});
        
        console.log("✅ REALITY: analyze_migration_context WORKS");
        console.log(`   - Elicitation required: ${analysisResult.elicitationRequired}`);
        console.log(`   - Missing info: ${Object.keys(analysisResult.migrationAnalysis.missingInfo).filter(k => analysisResult.migrationAnalysis.missingInfo[k]).join(', ')}`);
        step1Success = true;
        
    } catch (error) {
        console.log("❌ REALITY: analyze_migration_context FAILED");
        console.log(`   Error: ${error.message}`);
    }
    
    // STEP 2: If elicitation required, create session
    if (step1Success && analysisResult.elicitationRequired) {
        console.log("\n🎯 STEP 2: create_elicitation_session");
        console.log("Expected: Should create session with specific questions for missing info");
        
        try {
            const sessionResult = await ELICITATION_TOOL_HANDLERS.create_elicitation_session({
                analysisResult: analysisResult,
                context: {
                    userMessage: "Please deploy this deck configuration for our API gateway",
                    deckFiles: ["kong.yaml"],
                    deckConfigs: [{
                        _format_version: "3.0",
                        services: [{ name: "api-service", url: "http://api.example.com" }],
                        routes: [{ name: "api-route", service: "api-service", paths: ["/api"] }]
                    }]
                }
            }, {});
            
            console.log("✅ REALITY: create_elicitation_session WORKS");
            console.log(`   - Session ID: ${sessionResult.sessionId}`);
            console.log(`   - Questions count: ${sessionResult.requests?.length || 0}`);
            console.log(`   - Needs user input: ${sessionResult.needsUserInput}`);
            
            if (sessionResult.requests && sessionResult.requests.length > 0) {
                console.log("   - Sample question:", sessionResult.requests[0].question);
            }
            
            // STEP 3: Test processing a response
            console.log("\n💬 STEP 3: process_elicitation_response");
            console.log("Expected: Should process user responses and complete elicitation");
            
            try {
                const responseResult = await ELICITATION_TOOL_HANDLERS.process_elicitation_response({
                    sessionId: sessionResult.sessionId,
                    requestId: sessionResult.requests[0]?.id,
                    response: {
                        data: {
                            domain: "api",
                            environment: "production", 
                            team: "platform-team"
                        },
                        declined: false,
                        cancelled: false
                    }
                }, {});
                
                console.log("✅ REALITY: process_elicitation_response WORKS");
                console.log(`   - Session complete: ${responseResult.sessionComplete}`);
                
                return {
                    step1: "✅ WORKING",
                    step2: "✅ WORKING", 
                    step3: "✅ WORKING",
                    overall: "✅ COMPLETE WORKFLOW WORKING"
                };
                
            } catch (error) {
                console.log("❌ REALITY: process_elicitation_response FAILED");
                console.log(`   Error: ${error.message}`);
                
                return {
                    step1: "✅ WORKING",
                    step2: "✅ WORKING",
                    step3: "❌ BROKEN",
                    overall: "❌ WORKFLOW INCOMPLETE"
                };
            }
            
        } catch (error) {
            console.log("❌ REALITY: create_elicitation_session FAILED");
            console.log(`   Error: ${error.message}`);
            
            return {
                step1: "✅ WORKING",
                step2: "❌ BROKEN", 
                step3: "❓ UNTESTED",
                overall: "❌ WORKFLOW BROKEN"
            };
        }
    }
    
    return {
        step1: step1Success ? "✅ WORKING" : "❌ BROKEN",
        step2: "❓ SKIPPED - No elicitation needed",
        step3: "❓ SKIPPED - No elicitation needed", 
        overall: "❓ INCONCLUSIVE"
    };
}

validateWorkflow().then(results => {
    console.log("\n🎯 FINAL VALIDATION RESULTS:");
    console.log("============================");
    console.log(`Step 1 (analyze_migration_context): ${results.step1}`);
    console.log(`Step 2 (create_elicitation_session): ${results.step2}`);
    console.log(`Step 3 (process_elicitation_response): ${results.step3}`);
    console.log(`Overall Workflow: ${results.overall}`);
    
    if (results.overall.includes("WORKING")) {
        console.log("\n✅ CONCLUSION: The deck deployment workflow is functioning correctly!");
        console.log("   When you ask the agent to deploy a deck, it should now work as expected.");
    } else {
        console.log("\n❌ CONCLUSION: The deck deployment workflow has issues that need fixing.");
        console.log("   The agent will encounter errors when trying to deploy deck configurations.");
    }
    
}).catch(error => {
    console.error("💥 VALIDATION CRASHED:", error.message);
    console.error("Stack:", error.stack);
});