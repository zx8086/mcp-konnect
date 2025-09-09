#!/usr/bin/env node

// Direct test of elicitation tools
import { getAllTools } from './dist/tools/registry.js';

console.log('Testing elicitation tools registration...');

try {
  const allTools = getAllTools();
  console.log(`Total tools found: ${allTools.length}`);
  
  const elicitationTools = allTools.filter(tool => tool.category === 'elicitation');
  console.log(`Elicitation tools found: ${elicitationTools.length}`);
  
  if (elicitationTools.length > 0) {
    console.log('Elicitation tools:');
    elicitationTools.forEach(tool => {
      console.log(`  - ${tool.method}: ${tool.name}`);
    });
  } else {
    console.log('❌ No elicitation tools found!');
  }
  
  // Test specific tool lookup
  const analyzeTool = allTools.find(tool => tool.method === 'analyze_migration_context');
  if (analyzeTool) {
    console.log(`✅ analyze_migration_context tool found: ${analyzeTool.name}`);
  } else {
    console.log('❌ analyze_migration_context tool NOT found!');
  }
  
} catch (error) {
  console.error('Error testing tools:', error.message);
}