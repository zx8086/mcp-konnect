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

## Production Deployment Examples

### Enterprise Deployment Validation
The MCP server has been successfully validated with real-world enterprise deployments. A comprehensive enterprise shared services architecture was deployed including:

**Enterprise Architecture Deployed**:
- **Multiple Services**: Authentication, user management, product catalog, inventory, orders, payments, shipping, support, analytics, notifications, and file storage
- **Complete Routes**: REST API routing with proper HTTP method and path matching
- **Security Plugins**: Global JWT with anonymous fallback, CORS, service-specific JWT on critical services, backend system integration via request-transformer
- **Production Patterns**: Anonymous consumer fallback, enterprise security layers, backend system integration

**Deployment Results**:
- ✅ **100% Success Rate**: All entities deployed successfully
- ⚡ **High Performance**: Parallel service creation, efficient route configuration
- 🔒 **Enterprise Security**: JWT authentication with graceful fallback, comprehensive CORS
- 🔧 **Backend Integration**: Request transformation for inventory and order sync
- 📊 **Full Observability**: Ready for analytics and monitoring integration

### Direct MCP Tools vs Kong Konnect Engineer Agent

**When to use Direct MCP Tools**:
- Simple, well-understood deployments
- Maximum performance and transparency needed
- Straightforward entity relationships
- Direct control over each step preferred

**When to use Kong Konnect Engineer Agent**:
- Complex deck configurations requiring orchestration
- Advanced error recovery and fallback strategies
- Production validation and health checking
- Best practice enforcement and optimization
- Multi-environment deployment coordination

Enterprise deployment validation has demonstrated that **direct MCP tool usage can be equally effective** when relationships and dependencies are understood, making the agent most valuable for complex orchestration scenarios.

### ⚠️ CRITICAL DECK DEPLOYMENT REQUIREMENT ⚠️

**ALWAYS DEPLOY THE EXACT DECK CONFIGURATION - NO SIMPLIFICATIONS OR MODIFICATIONS**

When working with deck YAML configurations:

1. **🎯 Deploy EXACTLY what is specified** - Never simplify, modify, or create "demo versions"
2. **🔒 Preserve ALL parameters** - Keep parameter references, timeouts, hostnames, and paths exactly as written
3. **📊 Match entity counts** - Services, routes, plugins, and consumers must match the deck specification
4. **🏗️ Maintain structure** - Plugin scoping, route methods, and service configurations must be identical
5. **🔧 Keep parameter references intact** - Template variables and references are resolved at runtime in target environment

**Production deployments require production-grade fidelity. The deck configuration IS the requirement.**

### 🗑️ DECK CONFIGURATION REMOVAL PROCEDURE

**Critical Order for Safe Removal:**

When removing deck configurations, follow this exact sequence to avoid dependency conflicts:

1. **🎯 Identify ALL deck entities** - Services, routes, plugins (global + scoped), consumers from YAML
2. **🔗 Delete routes FIRST** - Routes reference services, must be removed before services  
3. **⚙️ Delete services** - After routes are removed, services can be safely deleted
4. **🔌 Delete scoped plugins** - Service/route-specific plugins auto-delete with parent entities
5. **🌐 Delete global plugins** - Remove global plugins that are part of deck configuration
6. **👤 Delete consumers** - Remove any consumers defined in deck (if applicable)

**Common Mistakes to Avoid:**
- ❌ Trying to delete services before routes (foreign key constraint error)
- ❌ Forgetting global plugins are part of deck configuration  
- ❌ Leaving orphaned entities from incomplete removals
- ❌ Not identifying ALL entities in deck before starting deletion

**Validation After Removal:**
- ✅ Verify all deck services removed
- ✅ Verify all deck routes removed  
- ✅ Verify all deck plugins removed (including global ones)
- ✅ Check for any orphaned entities
- ✅ Confirm non-deck entities preserved

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