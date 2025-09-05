#!/usr/bin/env node

// Simple test to verify LangSmith tracing is working
// This creates a direct tool call to test the tracing functionality

import { exec } from 'child_process';

console.log('Testing LangSmith tracing with tool call...');

// Create a JSON-RPC request to test a tool call
const testRequest = {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "list_control_planes",
    arguments: {
      pageSize: 3
    }
  },
  id: 1
};

// Spawn the MCP server and send a test request
const child = exec('node build/index.js', (error, stdout, stderr) => {
  if (error) {
    console.error('Server error:', error);
    return;
  }
  
  console.log('Server output:', stdout);
  if (stderr) {
    console.error('Server stderr:', stderr);
  }
});

// Send the test request
setTimeout(() => {
  console.log('Sending test request:', JSON.stringify(testRequest));
  child.stdin.write(JSON.stringify(testRequest) + '\n');
  
  // Wait for response then kill
  setTimeout(() => {
    child.kill();
    console.log('Test completed - check LangSmith dashboard for traces');
  }, 3000);
}, 1000);

child.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
});

child.stderr.on('data', (data) => {
  console.error('Server log:', data.toString());
});