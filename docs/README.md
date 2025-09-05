# Kong Konnect MCP Server Documentation

Welcome to the comprehensive documentation for the Kong Konnect Model Context Protocol (MCP) server. This directory contains all guides, specifications, and implementation details.

## 📚 Documentation Structure

### 🎯 [Guides](./guides/)
Configuration guides and setup instructions:
- **[CONFIGURATION.md](./guides/CONFIGURATION.md)**: Environment setup and configuration management

### 🧪 [Testing](./testing/)
Testing documentation and frameworks:
- **[FLIGHT_API_TEST_SUITE.md](./testing/FLIGHT_API_TEST_SUITE.md)**: Comprehensive test suite documentation
- **[flight-api-readme.md](./testing/flight-api-readme.md)**: Quick testing guide

### 📋 [API Specifications](./api-specs/)
OpenAPI specifications for Kong Konnect APIs:
- `konnect-api-request-analytics.yaml`: Analytics API specification
- `konnect-consumers-admin-api.yaml`: Consumer management API
- `konnect-control-planes-configuration.yaml`: Control plane configuration API
- `konnect-control-planes.yaml`: Control plane management API
- `portal-api.yaml`: Developer portal API specification

### 🏗️ [Architecture](./architecture/)
System architecture and design documents:
- *Architecture documentation will be added here as the system evolves*

### 🛠️ [Implementation](./implementation/)
Implementation guides and patterns:
- *Implementation guides will be added here for specific development patterns*

## 🚀 Quick Start

1. **Setup**: Begin with [Configuration Guide](./guides/CONFIGURATION.md)
2. **Testing**: Explore the [Flight API Test Suite](./testing/FLIGHT_API_TEST_SUITE.md)
3. **API Reference**: Check [API Specifications](./api-specs/) for endpoint details

## 📖 Key Resources

- **Main Project**: [README.md](../README.md) - Project overview and quick start
- **Development Guide**: [CLAUDE.md](../CLAUDE.md) - Development instructions and architecture
- **Test Suite**: Run `bun run test:flight-api` for comprehensive testing

## 📝 Contributing Documentation

When adding new documentation:

1. **Guides**: General setup and configuration instructions → `guides/`
2. **Testing**: Test frameworks, documentation, and examples → `testing/`
3. **APIs**: OpenAPI specs and API references → `api-specs/`
4. **Architecture**: System design and architectural decisions → `architecture/`
5. **Implementation**: Code patterns, development guides → `implementation/`

All documentation should be in Markdown format and follow the project's documentation standards.