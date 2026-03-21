# System Architecture Overview

The Kong Konnect MCP Server is a Model Context Protocol (MCP) server that enables AI assistants to manage Kong Konnect API Gateway through natural language. It exposes 78 tools across 7 categories via the MCP protocol over stdio transport.

## How the MCP Server Works

```
MCP Client (Claude Desktop / Claude Code / Cursor)
       |
       | JSON-RPC over stdio
       v
KongKonnectMcpServer (src/index.ts)
       |
       |--- Tool Registry (src/tools/registry.ts) --- 78 tools, 7 categories
       |--- Session Manager (src/utils/session-manager.ts)
       |--- Tracing Manager (src/utils/tracing.ts) --- LangSmith integration
       |--- Performance Collector (src/utils/tool-tracer.ts)
       |
       v
Tool Handler (src/tools/{category}/operations.ts)
       |
       |--- Parameter Validation (Zod schemas)
       |--- Enforcement Gates (src/enforcement/)
       |
       v
API Client (src/api/kong-api.ts, src/api/portal-api.ts)
       |
       | HTTPS with Bearer token auth
       v
Kong Konnect API (region-specific: us/eu/au/me/in)
```

## Component Map

### Entry Point

**`src/index.ts`** -- `KongKonnectMcpServer` class (extends `McpServer` from `@modelcontextprotocol/sdk`)

Responsibilities:
- Initializes API client, tracing, performance monitoring, and elicitation
- Validates the tool registry at startup (fails fast on duplicate method names)
- Registers all 78 tools with traced handler wrappers
- Routes incoming JSON-RPC tool calls to the correct operation module
- Runs over stdio transport (`StdioServerTransport`)

### Tool Registry

**`src/tools/registry.ts`** -- Aggregates tools from all category modules

Key functions:
- `getAllTools()` -- returns all 78 `MCPTool` definitions
- `getToolsByCategory(category)` -- filter by category
- `getToolByMethod(method)` -- lookup by method name
- `validateToolRegistry()` -- ensures unique method names and valid structure
- `getToolStats()` -- tool count per category

### API Clients

**`src/api/kong-api.ts`** -- `KongApi` class (primary)
- Authenticated HTTP client for Kong Konnect APIs
- Regional endpoint support (us, eu, au, me, in)
- Bearer token authentication via `KONNECT_ACCESS_TOKEN`
- Consistent error handling with troubleshooting tips

**`src/api/portal-api.ts`** -- `PortalApi` class
- Developer portal-specific API operations
- Application management, credentials, analytics

### Configuration

**`src/config/index.ts`** -- Centralized configuration with Zod validation
- Loads from environment variables (Bun auto-loads `.env`)
- Health checks for API credentials, tracing setup
- Typed configuration object with defaults

**`src/config/tracing-config.ts`** -- LangSmith tracing configuration

### Logging

**`src/utils/mcp-logger.ts`** -- MCP-compliant structured logger
- All output to stderr only (stdout reserved for JSON-RPC)
- RFC 5424 log levels (debug through emergency)
- Structured JSON format: `[LEVEL] category: message { data }`
- Rate limiting (100 logs/second threshold)
- Automatic redaction of sensitive data (tokens, keys, credentials)
- Categories: config, server, api, tracing, session, enforcement, elicitation, certificates

### Tracing

**`src/utils/tracing.ts`** -- `UniversalTracingManager`
- LangSmith integration for observability
- Three-tier hierarchy: session -> conversation -> tool execution
- Configurable sampling rate
- Tool-level performance metrics

**`src/utils/tool-tracer.ts`** -- `ToolPerformanceCollector`
- Per-tool execution timing and success/failure tracking

### Session Management

**`src/utils/session-manager.ts`** -- Session context via `AsyncLocalStorage`
- Generates unique session IDs
- Detects client type (Claude Code vs Claude Desktop)
- Propagates session context through async operations

## Tool Categories

| Category | Tools | Location | Purpose |
|----------|-------|----------|---------|
| analytics | 2 | `src/tools/analytics/` | API request querying, consumer traffic analysis |
| control_planes | 14 | `src/tools/control-planes/` | Control plane CRUD, data plane nodes, tokens, config |
| certificates | 5 | `src/tools/certificates/` | SSL/TLS certificate management |
| configuration | 21 | `src/tools/configuration/` | Services, routes, consumers, plugins CRUD |
| portal | 24 | `src/tools/portal/` | Developer portal, apps, registrations, credentials |
| portal-management | 8 | `src/tools/portal-management/` | Portal lifecycle, API publishing |
| elicitation | 4 | `src/tools/elicitation-tool.ts` | Context gathering for migrations |
| **Total** | **78** | | |

## AI-Guided Workflow System

Two features work together to turn the MCP server from a collection of isolated tools into a guided workflow engine that teaches AI assistants how to chain operations.

### Tool Chaining via `relatedTools`

Every tool response includes a `relatedTools` array -- natural-language suggestions that tell the AI what to call next. This is embedded in the operation output, not the prompt.

Examples from `src/tools/configuration/operations.ts`:

```
create_service response:
  relatedTools: [
    "Use create-route to create routes that point to this service",
    "Use list-services to see all services in this control plane",
    "Use create-plugin to add plugins to this service"
  ]

list_services response:
  relatedTools: [
    "Use list-routes to find routes that point to these services",
    "Use list-plugins to see plugins configured for these services"
  ]

delete_service response:
  relatedTools: [
    "Recommended cleanup actions for orphaned routes"
  ]
```

This creates a directed graph of tool relationships. After any tool call, the AI knows what logical next step to take without needing to understand the full Kong entity model.

### Prompt-Driven Workflow Guidance

Tool prompts (`src/tools/{category}/prompts.ts`) include structured guidance sections that are sent to the AI as tool descriptions:

- **`NEXT STEPS`** -- Specific tools to call after this one, with context on why
- **`USAGE TIPS`** -- How to use the output (e.g., "Use the controlPlaneId from results with other tools")
- **`SETUP WORKFLOW`** -- Numbered multi-step procedures for complex operations

Example from `src/tools/control-planes/prompts.ts`:

```
get_control_plane prompt:
  NEXT STEPS:
    - Use list-services to explore services in this control plane
    - Use list-routes to see routing configuration
    - Use list-certificates to view SSL/TLS certificates
    - Use list-data-plane-nodes to see connected data plane nodes
    - Use query-api-requests to analyze traffic patterns

create_control_plane prompt:
  SETUP WORKFLOW:
    1. Create control plane with desired configuration
    2. Generate data plane tokens for node authentication
    3. Configure services, routes, and plugins
    4. Connect data plane nodes using provided credentials
```

### Dynamic Prompt Architecture

Prompts are exported as functions (e.g., `export const createServicePrompt = () => ...`), not static strings. This means prompts can accept runtime parameters and compose guidance dynamically based on:

- Available plugins in the control plane
- Detected environment context
- Elicitation state
- User permissions or role

The function signature enables future context-aware prompt generation without changing the registration architecture.

### How These Work Together

```
AI calls create_service
     |
     v
Response includes relatedTools:
  "Use create-route to create routes that point to this service"
     |
     v
AI calls create_route (guided by relatedTools)
     |
     v
Prompt for create_route includes NEXT STEPS:
  "Use create-plugin to add rate limiting to this route"
     |
     v
AI follows the chain: service -> route -> plugin -> consumer
```

The result: an AI assistant with no prior Kong knowledge can perform complete gateway configurations by following the tool chain.

## Cross-Cutting Concerns

### Enforcement Gates (`src/enforcement/`)

Mandatory validation before Kong entity creation:
- `mandatory-elicitation-gate.ts` -- blocks operations without domain/environment/team context
- `kong-tool-blockers.ts` -- enforces 5-tag requirement on all entities
- `elicitation-validation-gates.ts` -- validates elicitation session state
- `unified-elicitation-bridge.ts` -- bridges Claude Code and Claude Desktop environments

See [Elicitation System](./ELICITATION_SYSTEM.md) for full details.

### Error Handling (`src/utils/error-handling.ts`)

Centralized error formatting that transforms API errors into user-friendly messages with troubleshooting guidance.

### Pagination (`src/utils/pagination.ts`)

MCP-compliant cursor-based pagination for `tools/list` operations. See [Pagination Guide](../guides/MCP_PAGINATION_IMPLEMENTATION.md).

## Request Lifecycle

A typical tool call flows through these stages:

1. **MCP Client** sends a JSON-RPC `tools/call` request over stdio
2. **KongKonnectMcpServer** receives the request and matches the tool method
3. **Session context** is created/retrieved via `AsyncLocalStorage`
4. **Tracing wrapper** starts a LangSmith span for the tool execution
5. **Parameter validation** runs the input through the tool's Zod schema
6. **Enforcement gates** check for mandatory context (domain, environment, team tags)
7. **Operation function** executes the business logic (e.g., `configurationOps.createService()`)
8. **API client** makes the authenticated HTTP request to Kong Konnect
9. **Response** is formatted as a JSON-RPC result with structured content
10. **Tracing wrapper** records execution time, success/failure, and metadata
11. **MCP Client** receives the response

## Related Documentation

- [Tool Module Pattern](./TOOL_MODULE_PATTERN.md) -- how tool categories are structured
- [Elicitation System](./ELICITATION_SYSTEM.md) -- context gathering and enforcement
- [Configuration Guide](../guides/CONFIGURATION.md) -- environment setup
- [LangSmith Tracing](../implementation/LANGSMITH_TRACE_GROUPING_GUIDE.md) -- observability
