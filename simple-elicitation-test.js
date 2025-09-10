#!/usr/bin/env node

/**
 * VERY SIMPLE MCP Elicitation Test
 * Tests the basic elicitation API without any complex imports
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "elicitation-test",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "test_elicit",
      description: "Test MCP elicitation",
      inputSchema: {
        type: "object",
        properties: {}
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  console.error("=== ELICITATION TEST ===");
  console.error(`Tool: ${request.params.name}`);
  console.error(`Extra keys: ${Object.keys(extra || {})}`);
  console.error(`Has elicitation API: ${!!extra?.elicitation}`);
  console.error(`requestInput available: ${!!extra?.elicitation?.requestInput}`);

  if (request.params.name === "test_elicit") {
    if (extra?.elicitation?.requestInput) {
      console.error("Attempting elicitation...");
      
      try {
        const result = await extra.elicitation.requestInput({
          message: "Test elicitation - please provide info:",
          schema: {
            type: "object", 
            properties: {
              name: {
                type: "string",
                description: "Your name"
              },
              environment: {
                type: "string",
                enum: ["dev", "staging", "prod"],
                description: "Environment"
              }
            },
            required: ["name"]
          }
        });
        
        console.error(`Elicitation SUCCESS: ${JSON.stringify(result)}`);
        
        return {
          content: [{
            type: "text",
            text: `SUCCESS! Got: ${JSON.stringify(result)}`
          }]
        };
      } catch (error) {
        console.error(`Elicitation ERROR: ${error.message}`);
        return {
          content: [{
            type: "text", 
            text: `FAILED: ${error.message}`
          }]
        };
      }
    } else {
      console.error("No elicitation API available");
      return {
        content: [{
          type: "text",
          text: "NO ELICITATION API AVAILABLE"
        }]
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Elicitation test server ready");
}

main().catch(console.error);