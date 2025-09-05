# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript)
npm run build

# Start the server (requires build first)
npm start

# Development mode (builds and runs)
npm run dev
```

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides AI assistants with tools to interact with Kong Konnect API Gateway. The codebase follows a modular architecture:

### Core Components

- **Entry Point** (`src/index.ts`): Main MCP server class that registers tools and handles routing
- **API Client** (`src/api.ts`): Central HTTP client for Kong Konnect APIs with authentication and error handling
- **Tool Registry** (`src/tools.ts`): Definitions of all available MCP tools
- **Parameter Schemas** (`src/parameters.ts`): Zod validation schemas for tool inputs
- **Documentation** (`src/prompts.ts`): Detailed tool descriptions and usage examples

### Operations Modules

The business logic is organized into three main operation categories:

- **Analytics** (`src/operations/analytics.ts`): API request querying and consumer analysis
- **Configuration** (`src/operations/configuration.ts`): Gateway entity management (services, routes, consumers, plugins)
- **Control Planes** (`src/operations/controlPlanes.ts`): Control plane and group management

### Key Design Patterns

- **Centralized API Client**: All Kong API interactions go through the `KongApi` class for consistent error handling and authentication
- **Tool-Operation Separation**: Tool definitions are separate from business logic, making it easy to add new tools
- **Zod Validation**: All tool parameters are validated using Zod schemas before processing
- **Comprehensive Error Handling**: API errors include troubleshooting tips and context

## Environment Configuration

Required environment variables:
- `KONNECT_ACCESS_TOKEN`: Kong Konnect API key (required)
- `KONNECT_REGION`: API region (optional, defaults to "us")

Supported regions: us, eu, au, me, in

## Tool Architecture

When adding new tools:

1. Define parameter schema in `src/parameters.ts`
2. Add tool definition to `src/tools.ts` 
3. Create operation logic in appropriate `src/operations/` file
4. Add case handler in `src/index.ts` tool router
5. Document tool in `src/prompts.ts`

## API Client Usage

The `KongApi` class provides:
- Automatic authentication with Bearer tokens
- Regional endpoint support
- Consistent error handling with user-friendly messages
- Request logging for debugging

All operations should use the centralized API client rather than making direct HTTP calls.

## Common Patterns

- **Pagination**: Most list endpoints support size/offset or page-based pagination
- **Filtering**: Analytics endpoints use POST requests with filter arrays
- **Time Ranges**: Analytics queries use relative time ranges (15M, 1H, 6H, 12H, 24H, 7D)
- **Error Responses**: Include troubleshooting tips and context for common failure scenarios