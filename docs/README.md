# Kong Konnect MCP Server -- Documentation

## Architecture

How the MCP server is built and how its components fit together.

| Document | Description |
|----------|-------------|
| [System Overview](./architecture/SYSTEM_OVERVIEW.md) | Server architecture, data flow, component map, and request lifecycle |
| [Tool Module Pattern](./architecture/TOOL_MODULE_PATTERN.md) | The 4-file pattern, registry aggregation, and how to add new tools |
| [Elicitation System](./architecture/ELICITATION_SYSTEM.md) | Context detection, enforcement gates, mandatory tagging, dual environment support |

## Guides

Setup, configuration, and compliance.

| Document | Description |
|----------|-------------|
| [Configuration](./guides/CONFIGURATION.md) | Environment setup, health monitoring, and production deployment |
| [Elicitation Examples](./guides/ELICITATION_EXAMPLES.md) | Real-world elicitation workflows at high, medium, and low confidence |
| [MCP Logging Compliance](./guides/MCP_LOGGING_COMPLIANCE.md) | RFC 5424 log levels, structured logging, and JSON-RPC compliance |
| [MCP Pagination](./guides/MCP_PAGINATION_IMPLEMENTATION.md) | Cursor-based pagination for tools/list (73% payload reduction) |
| [MCP Schema Compliance](./guides/MCP_SCHEMA_COMPLIANCE.md) | 100% MCP schema compliance verification |
| [MCP Server Development Guide](./guides/MCP_SERVER_DEVELOPMENT_GUIDE.md) | Comprehensive patterns for building production MCP servers |

## Implementation

Deep technical guides on specific subsystems.

| Document | Description |
|----------|-------------|
| [LangSmith Trace Grouping](./implementation/LANGSMITH_TRACE_GROUPING_GUIDE.md) | Three-tier trace hierarchy, session grouping, and LangSmith dashboard organization |
| [API Wrapper Architecture](./implementation/MCP_API_WRAPPER_ARCHITECTURE.md) | Five-layer architecture pattern with Kong Konnect implementation mapping |
| [Filtering System](./implementation/MCP_FILTERING_SYSTEM.md) | Reusable multi-layer filtering architecture with 8 operators |
| [Zod Integration](./implementation/MCP_ZOD_INTEGRATION_GUIDE.md) | MCP SDK + Zod compatibility, the .shape bridge, and validation patterns |

## Testing

Test suite documentation and best practices.

| Document | Description |
|----------|-------------|
| [Flight API Test Suite](./testing/FLIGHT_API_TEST_SUITE.md) | Comprehensive test suite covering all 78 MCP tools with flight booking scenario |
| [Flight API Quick Reference](./testing/flight-api-readme.md) | Quick start, test structure, and utilities reference |
| [Testing Best Practices](./testing/TESTING_BEST_PRACTICES.md) | Lessons learned from discovering hidden API bugs through testing |

## Specifications

Protocol and API reference specifications.

| Document | Description |
|----------|-------------|
| [MCP Logging Spec](./mcp-specs/logging.md) | Official MCP specification for logging (RFC 5424, revision 2025-06-18) |
| [MCP Pagination Spec](./mcp-specs/pagination.md) | Official MCP specification for cursor-based pagination |
| [Kong API Specs](./api-specs/) | OpenAPI specifications for Kong Konnect APIs (analytics, control planes, consumers, portal) |

## Quick Start

1. **Setup**: [Configuration Guide](./guides/CONFIGURATION.md)
2. **Understand the architecture**: [System Overview](./architecture/SYSTEM_OVERVIEW.md)
3. **Run tests**: `bun run test:flight-api`
4. **Add a tool**: [Tool Module Pattern](./architecture/TOOL_MODULE_PATTERN.md)
5. **API reference**: [Kong API Specs](./api-specs/)
