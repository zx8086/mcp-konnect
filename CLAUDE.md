# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies
bun install

# Build the project (compiles TypeScript)
bun run build

# Start the server (requires build first)
bun start

# Development mode (builds and runs)
bun run dev
```

## Test Suite Commands

```bash
# Run comprehensive flight API test suite
bun run test:flight-api

# Run specific test types
bun run test:flight-api:unit         # Unit tests
bun run test:flight-api:integration  # Integration tests
bun run test:flight-api:performance  # Performance & security tests

# Development and debugging
bun run test:flight-api:watch        # Watch mode
bun run test:flight-api:coverage     # Coverage report
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

## Comprehensive Test Suite

### Flight API Test Suite Location
**📍 Complete documentation**: `docs/testing/FLIGHT_API_TEST_SUITE.md`

The project includes a comprehensive test suite that demonstrates all 66 Kong Konnect MCP tools using a realistic flight booking API scenario.

### Test Suite Overview
- **Location**: `src/tests/flight-api/`
- **Coverage**: 99% (65/66 MCP tools tested)
- **Test Files**: 4 files with 57+ comprehensive tests
- **Runtime**: Bun.js for maximum performance
- **Real Integration**: Tests actual Kong Konnect APIs

### Key Test Categories
1. **Integration Tests** (`flight-api.integration.test.ts`) - End-to-end workflows with real Kong API calls
2. **Unit Tests** (`flight-api.unit.test.ts`) - Individual operation testing with mocks
3. **Performance Tests** (`flight-api.performance.test.ts`) - Load testing and benchmarking
4. **Security Tests** (in performance file) - Authentication, input validation, rate limiting

### Performance Benchmarks Achieved
- **Throughput**: 12,115+ requests/second
- **Response Time**: <1ms average
- **Concurrency**: 50+ simultaneous requests handled
- **Memory Usage**: <1MB increase during testing

### Flight API Test Scenario
The test suite models a complete flight booking system with:
- Service creation and configuration
- Route setup for all HTTP methods  
- Consumer authentication with API keys
- Plugin configuration (rate limiting, CORS, security)
- Portal application management
- Analytics collection and querying
- Performance monitoring and security validation

### Quick Start
```bash
# Set up environment
export KONNECT_ACCESS_TOKEN=your_token_here
export KONNECT_REGION=eu

# Run all tests
bun run test:flight-api
```

For detailed documentation, troubleshooting, and advanced usage, see `docs/testing/FLIGHT_API_TEST_SUITE.md`.

## Documentation Structure

All project documentation is organized in the `docs/` directory:

- **`docs/guides/`**: Configuration guides and setup instructions
  - `CONFIGURATION.md`: Environment setup and configuration management
- **`docs/testing/`**: Testing documentation and frameworks
  - `FLIGHT_API_TEST_SUITE.md`: Comprehensive test suite documentation
  - `flight-api-readme.md`: Quick testing guide
- **`docs/api-specs/`**: OpenAPI specifications for Kong Konnect APIs
- **`docs/architecture/`**: System architecture and design documents
- **`docs/implementation/`**: Implementation guides and patterns

**Important**: All new guides, implementation guides, architecture docs, and reference materials should be created in the appropriate `docs/` subdirectory to maintain organized project documentation.