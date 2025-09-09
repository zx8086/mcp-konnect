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

## 🤖 INTELLIGENT ELICITATION FRAMEWORK

### ⚡ MCP-STYLE INFORMATION GATHERING

**CRITICAL**: When users provide ambiguous or incomplete information for Kong migrations, use the intelligent elicitation system to gather missing context while respecting user autonomy.

#### 🧠 Smart Context Analysis

Before any Kong deployment, perform intelligent analysis:

```yaml
CONTEXT_ANALYSIS_PROTOCOL:
  step_1: "Analyze user message for explicit domain/environment/team"
  step_2: "Extract implicit signals from file paths and configurations"
  step_3: "Calculate confidence scores (0-1 scale)"
  step_4: "Determine what information needs elicitation"
  step_5: "Create progressive disclosure plan"

CONFIDENCE_THRESHOLDS:
  high_confidence: ">= 0.8 (proceed with detected information)"
  medium_confidence: "0.5-0.79 (partial elicitation for gaps)"
  low_confidence: "< 0.5 (comprehensive elicitation required)"
```

#### 🎯 Progressive Information Gathering

**ELICITATION PRINCIPLES**:
- **User Autonomy**: Always allow decline/cancel - deployment blocks if mandatory fields missing
- **Progressive Disclosure**: Only ask for truly needed information
- **Smart Suggestions**: Provide context-aware recommendations
- **Session Management**: Track elicitation state across interactions
- **Zero Fallbacks**: Production deployments require explicit user input for all critical fields

```yaml
ELICITATION_PATTERNS:
  domain_detection:
    explicit_phrases: "for the devops domain", "migrate to api domain"
    file_path_hints: "/config/production/devops/", "/api-gateway/"
    service_name_patterns: "auth-service", "payment-api"
    
  environment_detection:
    explicit_mentions: "production", "staging", "development"
    path_segments: "/prod/", "/staging/", "/dev/"
    no_fallbacks: "User must explicitly specify environment"
    
  team_detection:
    ownership_phrases: "platform team manages", "owned by devops"
    git_context: commit authors, team member lists
    no_fallbacks: "User must explicitly specify team ownership"
```

#### 🔍 Elicitation Tools Available

The framework provides these MCP tools for intelligent information gathering:

- `analyze_migration_context` - Detect context and confidence scores
- `create_elicitation_session` - Generate smart prompts for missing info
- `process_elicitation_response` - Handle user responses with validation
- `get_session_status` - Track elicitation progress

#### 📋 Elicitation Workflow Example

```yaml
USER_REQUEST: "Please migrate this Kong configuration"

ANALYSIS_RESULT:
  domain: null (confidence: 0.0)
  environment: null (confidence: 0.0, no fallbacks)
  team: null (confidence: 0.0, no fallbacks)
  overall_confidence: 0.0
  elicitation_required: true

ELICITATION_SESSION:
  request_1: "🏷️ Domain Classification (high priority)"
  suggestions: ["api", "backend", "platform"] # from service analysis
  user_autonomy: "decline blocks deployment if mandatory field"
  
  request_2: "🌍 Environment Specification (critical)"
  no_assumptions: "User must explicitly specify environment"
  validation_options: ["production", "staging", "development"]
```

#### 🚨 Zero-Fallback Production Policy

When users decline or don't provide mandatory information:

```yaml
PRODUCTION_DEPLOYMENT_POLICY:
  no_fallbacks: "Deployment BLOCKS if mandatory fields missing"
  mandatory_fields: ["domain", "environment", "team"]
  user_must_provide: "Explicit specification required for production deployments"
  
VALIDATION_REQUIREMENTS:
  minimum_tags: 5 # Ensure rich metadata for all entities
  mandatory_categories: ["env-*", "domain-*", "team-*"]
  contextual_analysis: "REQUIRED for all entities"
  deployment_gate: "BLOCKS until all mandatory fields provided"
```

## 🚨 CRITICAL: Tool-First Thinking Protocol

### ⚡ IMMEDIATE RECOGNITION TRIGGERS

**BEFORE** any task, ask: "What MCP tools do I have available for this?"

#### 🔧 Tool Recognition Patterns

When you see these request patterns, **IMMEDIATELY** use direct MCP tools:

```yaml
Kong/API Gateway Tasks:
  - "migrate deck configuration" → mcp__kong-konnect__* tools
  - "create service/route/consumer" → mcp__kong-konnect__create_* tools
  - "update Kong configuration" → mcp__kong-konnect__update_* tools
  - "@kong-konnect-engineer" mentioned → USE MCP TOOLS DIRECTLY

Performance Testing:
  - "performance test" → k6 tools via testing-specialist
  - "load test API" → k6 tools via testing-specialist

GraphQL Tasks:  
  - "GraphQL schema/resolver" → graphql-specialist tools
  - "Houdini/GraphQL Yoga" → graphql-specialist tools
  
Other Specialist Tools:
  - Database issues → couchbase-capella-specialist tools
  - Observability → observability-engineer tools
  - Configuration → config-manager tools
```

#### 🚫 ANTI-PATTERN RECOGNITION

**NEVER** do these when MCP tools are available:

```yaml
❌ WRONG_PATTERNS:
  - See "Kong" + immediately think "use Task tool"
  - See "@agent-name" + immediately invoke agent
  - Complex task + default to agent delegation
  - Specialist mention + agent invocation reflex

✅ CORRECT_PATTERNS:  
  - See "Kong" + scan available mcp__kong-konnect__* tools
  - See "@agent-name" + check what tools that agent uses directly
  - Complex task + break down into available tool operations
  - Specialist mention + use specialist's tools directly
```

#### 🎯 Decision Tree Protocol

```yaml
TASK_ANALYSIS:
  step_1: "What MCP tools are available for this domain?"
  step_2: "Can I accomplish this with direct tool calls?"
  step_3_if_yes: "Use MCP tools directly"
  step_3_if_no: "Only then consider agent invocation"
  
TOOL_AVAILABILITY_CHECK:
  kong_tasks: "66+ mcp__kong-konnect__* tools available"
  testing_tasks: "k6 performance tools available" 
  graphql_tasks: "GraphQL specialist tools available"
  config_tasks: "Configuration management tools available"
  observability: "OpenTelemetry tools available"
```

#### 📋 Pre-Task Verification

**MANDATORY** checklist before ANY task:

1. ✅ "Have I checked what MCP tools are available?"
2. ✅ "Can I use direct tool calls instead of agents?"  
3. ✅ "Am I falling into the agent invocation reflex?"
4. ✅ "Is this a Kong task? (Use mcp__kong-konnect__* tools directly)"

#### 🔄 Behavioral Override Protocol

**When you catch yourself about to invoke an agent:**

1. **STOP** - "Wait, what tools do I have available?"
2. **SCAN** - Review available MCP tools for this domain
3. **EXECUTE** - Use direct tools instead of agent invocation
4. **VALIDATE** - Did I accomplish the task with direct tools?

This protocol prevents the recurring issue of defaulting to agent invocation when direct tools are available and more effective.

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

### 🧠 Elicitation Framework Architecture

The elicitation system is built with these components:

#### Core Framework (`src/utils/elicitation.ts`)
- **ElicitationManager**: Session management and response processing
- **KongElicitationPatterns**: Pre-built patterns for Kong migrations
- **ElicitationRequest/Response**: Typed data structures

#### Context Detection (`src/utils/context-detection.ts`)
- **ContextDetector**: Pattern matching for implicit information
- **DetectionPattern**: Configurable detection rules
- **ContextSignal**: Confidence-scored detection results

#### Migration Analysis (`src/operations/migration-analyzer.ts`)
- **MigrationAnalyzer**: Confidence scoring and gap analysis
- **MigrationContext/Analysis**: Structured analysis results

#### Tag Elicitation (`src/utils/tag-elicitation.ts`)
- **TagElicitationEngine**: Entity-specific tagging intelligence
- **TaggingPlan**: Contextual tag recommendations

#### Elicitation Tools (`src/tools/elicitation-tool.ts`)
- **ElicitationOperations**: MCP tool implementations
- **Tool Registration**: Integration with MCP server

#### Framework Integration
```typescript
// Example usage in Kong operations
const contextAnalysis = await elicitationOps.analyzeContext(
  userMessage, deckFiles, deckConfigs, gitContext
);

if (contextAnalysis.elicitationRequired) {
  const session = await elicitationOps.createElicitationSession(
    contextAnalysis, context
  );
  // Present elicitation requests to user
  // Process responses and generate tag assignments
}
```

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

## Agent MCP Tool Access and Kong Konnect Rules

### 🔧 Agent Direct MCP Tool Access
ALL specialized agents have DIRECT access to MCP tools and should use them instead of invoking other agents:

```yaml
AGENT_MCP_ACCESS_RULES:
  all_agents_have_access: "66+ mcp__kong-konnect__* tools available"
  preferred_approach: "Use MCP tools directly in agent operations"
  avoid: "Agent-to-agent invocation when MCP tools sufficient"
  
AGENT_EFFICIENCY:
  direct_mcp_usage: "Faster execution, clearer troubleshooting"
  agent_invocation: "Only when complex orchestration needed"
```

### 🏷️ Kong Konnect Mandatory Tagging Rules

When working with Kong configurations, **ALL entities MUST be tagged**:

```yaml
MANDATORY_KONG_TAGS:
  required_tags: ["env-{environment}", "domain-{domain-name}", "team-{team}"]  # 3 mandatory tags
  optional_tags: 2  # Entity-specific requirements (function, type, etc.)
  maximum_tag_count: 5  # Kong's recommended limit for optimal performance
  tag_structure: "3 mandatory + 2 optional = 5 tags maximum"
  extraction_priority: "ALWAYS extract domain from user context first"
  format_requirement: "lowercase-with-hyphens"
  validation: "BLOCK deployment if any mandatory tag missing OR total tags > 5"
  
CONTEXTUAL_ANALYSIS_REQUIRED:
  optional_tag_selection: "Choose 2 most relevant from contextual analysis"
  available_options:
    - "What function does this entity serve?" → function-{purpose}
    - "What type/classification is this?" → type-{classification} 
    - "How critical/important is this?" → criticality-{level}
    - "What access scope?" → access-{scope}
    - "What protocol/technology?" → protocol-{type}
    - "What purpose/intent?" → purpose-{intent}
  
  validation_gate:
    if_cannot_answer_contextual_questions: "BLOCK deployment until analysis complete"
    required_optional_tags: 2  # Must select exactly 2 from available options
    total_entity_tags: 5  # 3 mandatory + 2 optional = 5 maximum

DOMAIN_EXTRACTION_PATTERNS:
  user_phrases:
    - "for the devops domain" → domain=devops
    - "migrate to api domain" → domain=api
    - "using finance domain" → domain=finance
  mandatory_action: "BLOCK deployment and ask user to specify domain"
```

### ✅ Kong Agent Usage Examples

**CORRECT Kong Konnect Engineer usage:**
```yaml
# User: "migrate deck config for devops domain"
agent_should_do:
  1. extract_domain: "devops" 
  2. use_mcp_tools: "mcp__kong-konnect__create_service"
  3. apply_tags: ["env-production", "domain-devops", "team-platform"]
  4. validate_deployment: "all entities properly tagged"
```

**INCORRECT approach:**
```yaml
agent_should_NOT_do:
  1. invoke_task_tool: "Task with subagent_type"
  2. skip_domain_extraction: "ignore domain from user request"
  3. deploy_without_tags: "create entities without mandatory tags"
  4. use_placeholders: "domain-{USER_SPECIFIED}" instead of extracted domain
```

### 🚨 Kong Deployment Validation Gates

Before ANY Kong entity creation, agents must verify:

```yaml
PRE_DEPLOYMENT_CHECKLIST:
  ✅ Domain extracted from user request?
  ✅ Control plane identified with mcp__kong-konnect__list_control_planes?
  ✅ All entities will include ["env-*", "domain-*", "team-*"] tags (3 mandatory)?
  ✅ CONTEXTUAL ANALYSIS completed for each entity?
  ✅ Each entity has exactly 5 total tags (3 mandatory + 2 optional)?
  ✅ Two most relevant optional tags selected for each entity?
  ✅ Using mcp__kong-konnect__* tools directly (not Task tool)?
  ✅ Tag format follows lowercase-with-hyphens?

BLOCKING_CONDITIONS:
  - Any entity with != 5 total tags (must be exactly 5)
  - Missing any of 3 mandatory tags: env-*, domain-*, team-*
  - Missing exactly 2 optional contextual tags
  - Cannot explain entity purpose in contextual terms
  - Deployment MUST be halted until complete tagging analysis
```

## Documentation Structure

All project documentation is organized in the `docs/` directory:

- **`docs/guides/`**: Configuration guides and setup instructions
  - `CONFIGURATION.md`: Environment setup and configuration management
  - `ELICITATION_EXAMPLES.md`: Comprehensive elicitation examples and test scenarios
- **`docs/testing/`**: Testing documentation and frameworks
  - `FLIGHT_API_TEST_SUITE.md`: Comprehensive test suite documentation
  - `flight-api-readme.md`: Quick testing guide
- **`docs/api-specs/`**: OpenAPI specifications for Kong Konnect APIs
- **`docs/architecture/`**: System architecture and design documents
- **`docs/implementation/`**: Implementation guides and patterns

### 🤖 Elicitation Framework Documentation

**Complete Documentation**: `docs/guides/ELICITATION_EXAMPLES.md`

The elicitation framework includes comprehensive documentation with:

#### Example Scenarios
- **High-Confidence Migration**: Minimal elicitation needed (>90% confidence)
- **Medium-Confidence Migration**: Partial elicitation for gaps (43-79% confidence)  
- **Low-Confidence Migration**: Full elicitation required (<50% confidence)

#### Testing Scenarios
- **Service Name Pattern Detection**: Domain inference from service naming
- **File Path Analysis**: Environment detection from configuration paths
- **Plugin Configuration Analysis**: Contextual tags from plugin types
- **Control Plane Name Analysis**: Multi-source information extraction

#### User Experience Patterns
- **Progressive Disclosure**: Only ask for truly needed information
- **Smart Suggestions**: Context-aware recommendations based on analysis
- **User Autonomy**: Decline/cancel options block deployment if mandatory fields missing
- **Session Management**: Resume interrupted elicitation workflows

#### Validation Examples
- **Input Validation**: Format checking and normalization
- **Tag Compliance**: Minimum 5 tags with mandatory categories
- **Error Recovery**: Graceful handling of incomplete sessions

**Important**: All new guides, implementation guides, architecture docs, and reference materials should be created in the appropriate `docs/` subdirectory to maintain organized project documentation.