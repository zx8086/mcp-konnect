# Elicitation System Architecture

The elicitation system ensures that every Kong entity is created with complete context -- domain, environment, team ownership, and contextual tags. It gathers missing information from users before allowing deployments to proceed.

## Purpose

Kong Konnect entities require mandatory tagging for governance and observability:

- 3 mandatory tags: `env-{environment}`, `domain-{domain}`, `team-{team}`
- 2 contextual tags: selected from entity analysis (function, type, criticality, access, protocol, purpose)
- 5 tags total per entity (Kong's recommended limit)

When a user requests a Kong operation without providing all required context, the elicitation system detects the gaps and gathers the missing information before proceeding.

## Architecture

```
User Request
     |
     v
Context Detection (src/utils/context-detection.ts)
     |-- Pattern matching on service names, file paths, plugin configs
     |-- Confidence scoring (0.0 - 1.0 per field)
     |
     v
Migration Analyzer (src/operations/migration-analyzer.ts)
     |-- Gap analysis: which fields are missing?
     |-- Confidence thresholds:
     |     >= 0.8  high    -> proceed with detected values
     |     0.5-0.79 medium -> partial elicitation for gaps
     |     < 0.5   low     -> full elicitation required
     |
     v
Elicitation Manager (src/utils/elicitation.ts)
     |-- Session creation and state tracking
     |-- Progressive disclosure (only ask for what is needed)
     |-- Smart suggestions based on analysis
     |
     v
+--[Claude Code?]-----> MCP Elicitation (src/utils/mcp-elicitation.ts)
|                        Uses MCP native context.elicit() for interactive Q&A
|
+--[Claude Desktop?]---> Elicitation Bridge (src/utils/elicitation-bridge.ts)
                         Returns structured prompts for direct provision
     |
     v
Tag Engine (src/utils/tag-elicitation.ts)
     |-- Entity-specific tag recommendations
     |-- Contextual analysis per entity
     |-- Ensures 5-tag compliance
     |
     v
Enforcement Gates (src/enforcement/)
     |-- Final validation before API calls
     |-- Blocks if any mandatory tag is missing
     |
     v
Kong API Operation (create service, route, consumer, plugin)
```

## Components

### Context Detection

**`src/utils/context-detection.ts`** -- `ContextDetector` class

Extracts implicit information from user requests using pattern matching:

| Signal Source | What It Detects | Example |
|---------------|-----------------|---------|
| User message phrases | Domain, environment, team | "for the devops domain" -> domain=devops |
| Service names | Domain inference | "auth-service" -> domain=auth |
| File paths | Environment | `/config/production/` -> env=production |
| Plugin configurations | Contextual tags | JWT plugin -> access-authenticated |

Each detection produces a `ContextSignal` with a confidence score (0.0-1.0).

### Migration Analyzer

**`src/operations/migration-analyzer.ts`** -- `MigrationAnalyzer` class

Performs gap analysis on detected context:
- Aggregates confidence scores from context detection
- Identifies which mandatory fields need user input
- Determines the elicitation strategy (none, partial, or full)

### Elicitation Manager

**`src/utils/elicitation.ts`** -- `ElicitationManager` class

Manages elicitation sessions:
- Creates sessions with structured questions for missing fields
- Tracks session state across multiple interactions
- Validates user responses (format checking, normalization)
- Supports decline/cancel (blocks deployment if mandatory fields are missing)

### Tag Engine

**`src/utils/tag-elicitation.ts`** -- `TagElicitationEngine` class

Generates entity-specific tags:
- Analyzes each entity's function, type, and criticality
- Selects the 2 most relevant contextual tags from: function, type, criticality, access, protocol, purpose
- Produces the complete 5-tag set per entity

### MCP Tools

**`src/tools/elicitation-tool.ts`** -- 4 MCP tools exposed to AI assistants:

| Tool | Purpose |
|------|---------|
| `analyze_migration_context` | Detect context from user message and files, return confidence scores |
| `create_elicitation_session` | Generate structured prompts for missing information |
| `process_elicitation_response` | Handle user responses with validation and normalization |
| `get_session_status` | Track elicitation progress |

### Enhanced Kong Tools

**`src/tools/enhanced-kong-tools.ts`** -- Native MCP elicitation integration

Wraps standard create operations (service, route, consumer, plugin) with automatic elicitation:
- Uses MCP's built-in `context.elicit()` for progressive context gathering
- Falls back gracefully when elicitation is not available
- Generates complete tag sets from elicited information

## Enforcement Layer

The enforcement layer in `src/enforcement/` ensures that elicitation cannot be bypassed:

| File | Purpose |
|------|---------|
| `mandatory-elicitation-gate.ts` | Singleton gate that blocks Kong operations without complete context |
| `kong-tool-blockers.ts` | Wraps Kong tools with mandatory tag validation |
| `elicitation-validation-gates.ts` | Validates elicitation session state and completeness |
| `unified-elicitation-bridge.ts` | Bridges elicitation across Claude Code and Claude Desktop |
| `mcp-server-integration.ts` | Integrates enforcement hooks into the MCP server |
| `bypass-prevention-tests.ts` | Test suite verifying gates cannot be circumvented |

### Validation Rules

Before any Kong entity creation, enforcement gates verify:

- All 3 mandatory tags present (env-*, domain-*, team-*)
- Exactly 2 contextual tags selected
- Total of 5 tags per entity
- Tags follow lowercase-with-hyphens format
- Contextual analysis completed (entity purpose can be explained)

If validation fails, the operation is blocked and the user is prompted for the missing information.

## Dual Environment Support

The system adapts its behavior based on the detected client environment:

### Claude Code (Interactive)

- Uses MCP native `context.elicit()` for step-by-step Q&A
- Real-time session state management
- Managed by `src/utils/mcp-elicitation.ts`

### Claude Desktop (Direct Provision)

- Detects direct information patterns: `domain=api, environment=production, team=platform`
- Returns structured prompts when information is missing
- Falls back to manual input mode
- Managed by `src/utils/elicitation-bridge.ts`

Client detection is handled by `src/utils/client-detection.ts` which identifies the environment from transport metadata and WebSocket behavior.

## Related Documentation

- [Elicitation Examples](../guides/ELICITATION_EXAMPLES.md) -- real-world workflow examples at different confidence levels
- [System Overview](./SYSTEM_OVERVIEW.md) -- how elicitation fits into the overall architecture
- [Tool Module Pattern](./TOOL_MODULE_PATTERN.md) -- how elicitation tools are registered
