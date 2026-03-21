# Tool Module Pattern

Every tool category in the Kong Konnect MCP Server follows a consistent 4-file pattern. This document explains the pattern, how the registry aggregates categories, and how to add new tools.

## The 4-File Pattern

Each tool category lives in its own directory under `src/tools/` with four files:

```
src/tools/{category}/
  tools.ts        -- Tool definitions (method, name, description, parameters, category)
  parameters.ts   -- Zod validation schemas for tool inputs
  prompts.ts      -- Detailed descriptions and usage examples for AI context
  operations.ts   -- Business logic that calls the Kong API client
```

### tools.ts -- Tool Definitions

Exports a function that returns an array of `MCPTool` objects:

```typescript
import { MCPTool } from "../registry.js";
import { listServicesParams, createServiceParams } from "./parameters.js";

export function configurationTools(): MCPTool[] {
  return [
    {
      method: "list_services",
      name: "List Services",
      description: "List all services associated with a control plane",
      parameters: listServicesParams,
      category: "configuration",
    },
    // ...more tools
  ];
}
```

### parameters.ts -- Zod Schemas

Defines Zod schemas for parameter validation. Every tool parameter is validated before execution:

```typescript
import { z } from "zod";

export const listServicesParams = z.object({
  controlPlaneId: z.string().describe("ID of the control plane"),
  size: z.number().optional().describe("Number of services to return"),
  offset: z.string().optional().describe("Pagination offset token"),
});
```

### prompts.ts -- AI-Facing Documentation

Provides detailed descriptions that help AI assistants understand when and how to use each tool. Prompts are exported as **functions** (not static strings), enabling dynamic composition at runtime:

```typescript
export const createServicePrompt = () => `
Create a new service in a Kong control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - name: String - Service name (must be unique)
  ...

OUTPUT:
  - service: Object - Created service details
  - relatedTools: Array - Suggested next steps and related tools
`;

export const getControlPlanePrompt = () => `
...
NEXT STEPS:
  - Use list-services to explore services in this control plane
  - Use list-routes to see routing configuration
  - Use list-certificates to view SSL/TLS certificates
`;
```

Prompts include structured guidance sections (`NEXT STEPS`, `USAGE TIPS`, `SETUP WORKFLOW`) that teach the AI how to chain tool calls. See [AI-Guided Workflow System](./SYSTEM_OVERVIEW.md#ai-guided-workflow-system) for details.

### operations.ts -- Business Logic

Contains the functions that execute tool operations by calling the Kong API client:

```typescript
import { KongApi } from "../../api/kong-api.js";

export async function createService(api: KongApi, params: { ... }) {
  const result = await api.createService(params.controlPlaneId, serviceData);
  return {
    service: { serviceId: result.id, name: result.name, ... },
    message: `Service '${result.name}' created successfully`,
    relatedTools: [
      "Use create-route to create routes that point to this service",
      "Use list-services to see all services in this control plane",
      "Use create-plugin to add plugins to this service"
    ]
  };
}
```

Every operation response includes a `relatedTools` array that guides the AI to the next logical action. This creates a tool-chaining system where each response teaches the AI what to do next. See [AI-Guided Workflow System](./SYSTEM_OVERVIEW.md#ai-guided-workflow-system).

## Registry Aggregation

`src/tools/registry.ts` imports all category modules and aggregates them into a single flat list:

```typescript
import { analyticsTools } from "./analytics/tools.js";
import { controlPlanesTools } from "./control-planes/tools.js";
import { certificatesTools } from "./certificates/tools.js";
import { configurationTools } from "./configuration/tools.js";
import { portalTools } from "./portal/tools.js";
import { portalManagementTools } from "./portal-management/tools.js";
import { elicitationTools } from "./elicitation-tool.js";

export function getAllTools(): MCPTool[] {
  return [
    ...analyticsTools(),
    ...controlPlanesTools(),
    ...certificatesTools(),
    ...configurationTools(),
    ...portalTools(),
    ...portalManagementTools(),
    ...elicitationTools,
  ];
}
```

The registry also provides lookup helpers: `getToolByMethod()`, `getToolsByCategory()`, `getAllCategories()`, and `getToolStats()`.

At startup, `validateToolRegistry()` ensures all method names are unique and all tool objects have the required fields. The server fails fast if validation fails.

## Current Categories

| Category | Tools | Directory | Description |
|----------|-------|-----------|-------------|
| analytics | 2 | `src/tools/analytics/` | API request querying, consumer traffic analysis |
| control_planes | 14 | `src/tools/control-planes/` | Control plane CRUD, data plane nodes/tokens, config |
| certificates | 5 | `src/tools/certificates/` | SSL/TLS certificate lifecycle management |
| configuration | 21 | `src/tools/configuration/` | Services, routes, consumers, plugins CRUD |
| portal | 24 | `src/tools/portal/` | Developer portal, applications, registrations |
| portal-management | 8 | `src/tools/portal-management/` | Portal lifecycle, API publishing |
| elicitation | 4 | `src/tools/elicitation-tool.ts` | Context gathering for migrations |

**Total: 78 tools**

### Standalone Tool Files

Two tool files exist outside the 4-file pattern:

- **`src/tools/elicitation-tool.ts`** -- Elicitation tools with `ElicitationOperations` class. Contains tool definitions and operations in a single file because the elicitation system has its own complex internal architecture.

- **`src/tools/enhanced-kong-tools.ts`** -- Enhanced Kong operations that integrate native MCP elicitation (`context.elicit()`) directly into service/route/consumer/plugin creation flows.

### Planned Categories (empty directories)

These directories exist but have no tools yet:

- `src/tools/credentials/` -- Consumer credentials and SNI management
- `src/tools/data-planes/` -- Data plane management (currently in control_planes)
- `src/tools/upstreams/` -- Upstream and target management

## How to Add a New Tool

### Adding to an existing category

1. **Define the schema** in `src/tools/{category}/parameters.ts`:
   ```typescript
   export const myNewToolParams = z.object({
     controlPlaneId: z.string().describe("ID of the control plane"),
     // ...parameters
   });
   ```

2. **Add the tool definition** in `src/tools/{category}/tools.ts`:
   ```typescript
   {
     method: "my_new_tool",
     name: "My New Tool",
     description: "What this tool does",
     parameters: myNewToolParams,
     category: "configuration",
   }
   ```

3. **Add the prompt** in `src/tools/{category}/prompts.ts`

4. **Implement the operation** in `src/tools/{category}/operations.ts`

5. **Add the handler case** in `src/index.ts` within `registerTools()`:
   ```typescript
   case "my_new_tool":
     return configurationOps.myNewTool(this.api, args);
   ```

### Adding a new category

1. Create directory `src/tools/{new-category}/`
2. Create the 4 files: `tools.ts`, `parameters.ts`, `prompts.ts`, `operations.ts`
3. Import and spread in `src/tools/registry.ts`:
   ```typescript
   import { newCategoryTools } from "./{new-category}/tools.js";
   // In getAllTools():
   ...newCategoryTools(),
   ```
4. Import operations in `src/index.ts` and add handler cases

## How Tools Are Registered with the MCP SDK

In `src/index.ts`, the `registerTools()` method iterates over all tools from the registry and calls `this.tool()` (from the MCP SDK's `McpServer` class) for each one:

```
getAllTools() -> for each tool -> this.tool(method, description, schema, handler)
```

Each handler is wrapped with:
- **Session context** via `runWithSession()` (AsyncLocalStorage)
- **Tracing** via `UniversalTracingManager` (LangSmith spans)
- **Performance collection** via `ToolPerformanceCollector`
- **Error formatting** via `formatError()`

This ensures every tool call is traced, timed, and error-handled consistently without individual tools needing to implement these concerns.
