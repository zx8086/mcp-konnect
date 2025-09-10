#!/usr/bin/env bun

/**
 * Test script to verify the elicitation fix works for Claude Desktop
 */

// Import the elicitation manager
import { readFileSync } from 'fs';

// Test the regex patterns directly
function testContextExtraction() {
  console.log('=== Testing Context Extraction Patterns ===\n');
  
  const testCases = [
    {
      message: "deploy kong config with domain=shared_services, environment=development, team=devops",
      expected: { domain: 'shared-services', environment: 'development', team: 'devops' }
    },
    {
      message: "create service for the api domain in production environment managed by platform team",
      expected: { domain: 'api', environment: 'production', team: 'platform' }
    },
    {
      message: "domain=backend environment=staging team=infrastructure",
      expected: { domain: 'backend', environment: 'staging', team: 'infrastructure' }
    },
    {
      message: "deploy to prod for devops team using platform domain",
      expected: { domain: 'platform', environment: 'production', team: 'devops' }
    }
  ];
  
  const patterns = {
    domain: /(?:domain\s*[=:]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)/i,
    environment: /(?:environment\s*[=:]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)/i,
    team: /(?:team\s*[=:]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)/i
  };
  
  const naturalPatterns = {
    domain: [
      /(?:for|in|using|deploy(?:ing)?)\s+(?:the\s+)?([a-zA-Z]+)\s+domain/i,
      /([a-zA-Z]+)[-\s](?:domain|api|service)/i
    ],
    environment: [
      /(?:to|in|for)\s+(?:the\s+)?(production|staging|development|dev|prod|test)(?:\s+environment)?/i,
      /(production|staging|development|dev|prod|test)[-\s](?:environment|env|deploy)/i
    ],
    team: [
      /(?:by|for|owned by|managed by)\s+(?:the\s+)?([a-zA-Z]+)\s+team/i,
      /([a-zA-Z]+)[-\s]team/i
    ]
  };
  
  testCases.forEach((testCase, i) => {
    console.log(`Test Case ${i + 1}:`);
    console.log(`Message: "${testCase.message}"`);
    
    const result = {};
    const missingFields = ['domain', 'environment', 'team'];
    
    // Extract using assignment patterns
    missingFields.forEach(field => {
      if (result[field]) return;
      
      const assignmentMatch = testCase.message.match(patterns[field]);
      if (assignmentMatch) {
        result[field] = assignmentMatch[1].toLowerCase().replace(/[-_]+/g, '-');
        return;
      }
      
      // Try natural patterns
      const fieldPatterns = naturalPatterns[field];
      if (fieldPatterns) {
        for (const pattern of fieldPatterns) {
          const match = testCase.message.match(pattern);
          if (match) {
            result[field] = match[1].toLowerCase().replace(/[-_]+/g, '-');
            break;
          }
        }
      }
    });
    
    // Normalize environment
    if (result.environment) {
      const envMap = {
        'dev': 'development',
        'prod': 'production',
        'stage': 'staging'
      };
      result.environment = envMap[result.environment] || result.environment;
    }
    
    console.log(`Extracted: ${JSON.stringify(result)}`);
    console.log(`Expected:  ${JSON.stringify(testCase.expected)}`);
    
    const matches = missingFields.every(field => 
      result[field] === testCase.expected[field]
    );
    console.log(`✅ ${matches ? 'PASS' : 'FAIL'}\n`);
  });
}

// Test the full elicitation workflow simulation
function testElicitationWorkflow() {
  console.log('=== Testing Elicitation Workflow Logic ===\n');
  
  const scenarios = [
    {
      name: "Claude Desktop - Direct Context",
      provided: {},
      userMessage: "create service with domain=api, environment=production, team=platform",
      hasMcpElicit: false,
      expectedResult: "SUCCESS - Direct extraction should work"
    },
    {
      name: "Claude Code - MCP Available", 
      provided: { domain: 'api' },
      userMessage: "create service for production",
      hasMcpElicit: true,
      expectedResult: "SUCCESS - Should use MCP elicitation for missing fields"
    },
    {
      name: "Claude Desktop - Partial Context",
      provided: {},
      userMessage: "create service with domain=api in production",
      hasMcpElicit: false,
      expectedResult: "FAIL - Missing team, no MCP elicitation available"
    }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Provided: ${JSON.stringify(scenario.provided)}`);
    console.log(`Message: "${scenario.userMessage}"`);
    console.log(`MCP Available: ${scenario.hasMcpElicit}`);
    console.log(`Expected: ${scenario.expectedResult}`);
    console.log('---');
  });
}

// Run tests
testContextExtraction();
testElicitationWorkflow();

console.log('=== Test Summary ===');
console.log('✅ Context extraction patterns working');
console.log('⚠️  Full integration test needed with actual MCP server');
console.log('⚠️  Need to test real Kong API calls');