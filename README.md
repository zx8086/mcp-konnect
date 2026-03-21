# Kong Konnect MCP Server

![Static Badge](https://img.shields.io/badge/Release-Tech%20Preview-FFA500?style=plastic)

A Model Context Protocol (MCP) server for interacting with Kong Konnect APIs, allowing AI assistants to query and analyze Kong Gateway configurations, traffic, and analytics.


https://github.com/user-attachments/assets/19c2f716-49b5-46c3-9457-65b3784e2111


## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage with Claude](#usage-with-claude)
- [Testing](#testing)
- [Example Workflows](#example-workflows)
- [Development](#development)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

## Overview

This project provides a Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Kong Konnect's API Gateway. It offers a set of tools to query analytics data, inspect configuration details, and manage control planes through natural language conversation.

Key features:
- 78 MCP tools across 7 categories for complete Kong Gateway management
- **AI-guided workflow chaining** -- every tool response includes `relatedTools` suggestions that guide the AI to the next logical action, plus prompt-level `NEXT STEPS` and `SETUP WORKFLOW` sections that teach multi-step procedures
- **Dynamic prompt architecture** -- tool prompts are functions, enabling runtime composition based on context
- Query API request analytics with customizable filters
- Full CRUD for services, routes, consumers, plugins, and certificates
- Manage control planes, data plane nodes, and tokens
- Developer portal management with applications, registrations, and credentials
- Intelligent elicitation system for context gathering and mandatory tagging
- LangSmith tracing integration for observability
- MCP-compliant structured logging (stderr-only, JSON-RPC safe)

Konnect MCP is a **work in progress** and we will be adding additional functionality and improvements with each release.

## Project Structure

```
src/
├── index.ts                    # MCP server class, tool registration, request routing
├── types.ts                    # TypeScript interfaces
├── api/
│   ├── kong-api.ts             # Kong API client with regional endpoints
│   └── portal-api.ts           # Developer portal API client
├── config/
│   └── index.ts                # Zod-validated configuration management
├── tools/
│   ├── registry.ts             # Central tool registry (78 tools)
│   ├── analytics/              # 2 tools  -- API request analytics
│   ├── certificates/           # 5 tools  -- SSL/TLS certificate management
│   ├── configuration/          # 21 tools -- Services, routes, consumers, plugins
│   ├── control-planes/         # 14 tools -- Control planes, data planes, tokens
│   ├── portal/                 # 24 tools -- Developer portal operations
│   ├── portal-management/      # 8 tools  -- Portal lifecycle, API publishing
│   ├── elicitation-tool.ts     # 4 tools  -- Context gathering for migrations
│   └── enhanced-kong-tools.ts  # Enhanced operations with native elicitation
├── enforcement/                # Mandatory tagging gates
├── operations/                 # Legacy operation modules
├── utils/                      # Logging, tracing, session, elicitation utilities
└── tests/                      # Comprehensive test suite
```

Each tool category follows a 4-file pattern: `tools.ts`, `parameters.ts`, `prompts.ts`, `operations.ts`. See [Tool Module Pattern](docs/architecture/TOOL_MODULE_PATTERN.md) for details.

## Installation

### Prerequisites
- [Bun](https://bun.sh/) 1.0+ (recommended) or Node.js 20+
- A Kong Konnect account with API access
- A client with MCP capabilities (e.g. Claude Desktop, Claude Code, Cursor)

### Setup

```bash
# Clone the repository
git clone https://github.com/Kong/mcp-konnect.git
cd mcp-konnect

# Install dependencies
bun install

# Build the project
bun run build
```

## Configuration

Set the following environment variables to configure the MCP server:

```bash
# Required: Your Kong Konnect API key
export KONNECT_ACCESS_TOKEN=kpat_api_key_here

# Optional: The API region to use (defaults to US)
# Possible values: US, EU, AU, ME, IN
export KONNECT_REGION=us
```

## Available Tools

The server provides 78 tools organized in 7 categories:

### Analytics (2 tools)
- **query_api_requests** -- Query and analyze API Gateway requests with time range, status code, HTTP method, and consumer/service/route filters
- **get_consumer_requests** -- Analyze API requests made by a specific consumer

### Configuration (21 tools)
Full CRUD operations for core Kong Gateway entities:
- **Services**: list, get, create, update, delete
- **Routes**: list, get, create, update, delete
- **Consumers**: list, get, create, update, delete
- **Plugins**: list, get, create, update, delete, list_plugin_schemas

### Control Planes (14 tools)
- **Control planes**: list, get, create, update, delete
- **Data plane nodes**: list, get
- **Data plane tokens**: list, create, revoke
- **Configuration**: get, update
- **Groups**: list memberships, check membership

### Certificates (5 tools)
- SSL/TLS certificate management: list, get, create, update, delete

### Portal (24 tools)
Developer portal operations:
- **APIs**: list, fetch, fetch document, list documents, get actions
- **Applications**: list, get, create, update, delete, regenerate secret
- **Registrations**: list, get, create, delete
- **Credentials**: list, create, update, delete
- **Developer auth**: register, authenticate, get profile, logout
- **Analytics**: query application analytics

### Portal Management (8 tools)
- **Portals**: list, get, create, update, delete
- **Products**: list, publish, unpublish

### Elicitation (4 tools)
Intelligent context gathering for Kong migrations:
- **analyze_migration_context** -- Detect domain/environment/team from user input
- **create_elicitation_session** -- Generate prompts for missing information
- **process_elicitation_response** -- Validate and normalize user responses
- **get_session_status** -- Track elicitation progress

## Usage with Claude

To use this MCP server with Claude for Desktop:

1. Install [Claude for Desktop](https://claude.ai/download)
2. Create or edit the Claude Desktop configuration file:
   - MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add the following configuration:

```json
{
  "mcpServers": {
    "kong-konnect": {
      "command": "bun",
      "args": [
        "run",
        "/absolute/path/to/mcp-konnect/dist/index.js"
      ],
      "env": {
        "KONNECT_ACCESS_TOKEN": "kpat_api_key_here",
        "KONNECT_REGION": "us"
      }
    }
  }
}
```

4. Restart Claude for Desktop
5. The Kong Konnect tools will now be available for Claude to use

## Testing

### Comprehensive Flight API Test Suite

The project includes a **comprehensive test suite** that demonstrates all 78 Kong Konnect MCP tools using a realistic flight booking API scenario.

Complete Documentation: [`docs/testing/FLIGHT_API_TEST_SUITE.md`](docs/testing/FLIGHT_API_TEST_SUITE.md)

#### Quick Start
```bash
# Set up environment
export KONNECT_ACCESS_TOKEN=your_token_here
export KONNECT_REGION=eu

# Run all tests
bun run test:flight-api
```

#### Test Categories
- **Integration Tests** -- End-to-end workflows with real Kong API calls
- **Unit Tests** -- Individual operations with mocked dependencies
- **Performance Tests** -- Load testing and security validation
- **Elicitation Tests** -- Context gathering and enforcement validation

#### Key Achievements
- **100% Tool Coverage** (78/78 MCP tools tested)
- **12,115+ RPS** throughput achieved
- **Security Validated** (SQL injection, XSS, rate limiting)
- **Auto Cleanup** of all test resources

#### Available Commands
```bash
# Specific test types
bun run test:flight-api:unit         # Unit tests only
bun run test:flight-api:integration  # Integration tests only
bun run test:flight-api:performance  # Performance & security tests

# Development
bun run test:flight-api:watch        # Watch mode
bun run test:flight-api:coverage     # Coverage report
```

## Example Workflows

### Analyzing API Traffic

1. First, list all control planes:
   ```
   Please list all control planes in my Kong Konnect organization.
   ```

2. Then, list services for a specific control plane:
   ```
   List all services for control plane [CONTROL_PLANE_NAME/ID].
   ```
   
3. Query API requests for a specific service:
   ```
   Show me all API requests for service [SERVICE_NAME/ID] in the last hour that had 5xx status codes.
   ```

### Troubleshooting Consumer Issues

1. List consumers for a control plane:
   ```
   List all consumers for control plane [CONTROL_PLANE_NAME/ID].
   ```

2. Analyze requests for a specific consumer:
   ```
   Show me all requests made by consumer [CONSUMER_NAME/ID] in the last 24 hours.
   ```

3. Check for common errors or patterns:
   ```
   What are the most common errors experienced by this consumer?
   ```

## Development

### Adding New Tools

Each tool category follows a 4-file pattern under `src/tools/{category}/`:

1. Define the Zod parameter schema in `parameters.ts`
2. Add the tool definition in `tools.ts` (method, name, description, parameters, category)
3. Add AI-facing documentation in `prompts.ts`
4. Implement the operation logic in `operations.ts`
5. Add the handler case in `src/index.ts` within `registerTools()`

For a new category, also register it in `src/tools/registry.ts`. See [Tool Module Pattern](docs/architecture/TOOL_MODULE_PATTERN.md) for the full guide.

## Documentation

Comprehensive documentation is in [`docs/`](docs/README.md):

- **Architecture**: [System Overview](docs/architecture/SYSTEM_OVERVIEW.md), [Tool Module Pattern](docs/architecture/TOOL_MODULE_PATTERN.md), [Elicitation System](docs/architecture/ELICITATION_SYSTEM.md)
- **Guides**: [Configuration](docs/guides/CONFIGURATION.md), [MCP Compliance](docs/guides/MCP_SCHEMA_COMPLIANCE.md), [Logging](docs/guides/MCP_LOGGING_COMPLIANCE.md)
- **Testing**: [Flight API Test Suite](docs/testing/FLIGHT_API_TEST_SUITE.md), [Best Practices](docs/testing/TESTING_BEST_PRACTICES.md)
- **Implementation**: [LangSmith Tracing](docs/implementation/LANGSMITH_TRACE_GROUPING_GUIDE.md), [API Architecture](docs/implementation/MCP_API_WRAPPER_ARCHITECTURE.md)

## Troubleshooting

### Common Issues

**Connection Errors**
- Verify your API key is valid and has the necessary permissions
- Check that the API region is correctly specified
- Ensure your network can connect to the Kong Konnect API

**Authentication Errors**
- Regenerate your API key in the Kong Konnect portal
- Check that environment variables are correctly set

**Data Not Found**
- Verify the IDs used in requests are correct
- Check that the resources exist in the specified control plane
- Ensure time ranges are valid for analytics queries

## Credits

Built by Kong. Inspired by Stripe's [Agent Toolkit](https://github.com/stripe/agent-toolkit).
