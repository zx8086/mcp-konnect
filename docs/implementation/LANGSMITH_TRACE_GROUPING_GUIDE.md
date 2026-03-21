# LangSmith Trace Grouping Implementation Guide

This guide explains how LangSmith tracing is implemented in the Kong Konnect MCP Server with a focus on how traces and runs are organized and grouped for optimal observability.

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Trace Grouping Mechanisms](#trace-grouping-mechanisms)
3. [Implementation Details](#implementation-details)
4. [Key Patterns](#key-patterns)
5. [Practical Examples](#practical-examples)
6. [Configuration](#configuration)
7. [Dashboard Organization](#dashboard-organization)
8. [Troubleshooting](#troubleshooting)

## Core Architecture

### Overview

The Kong Konnect MCP Server implements a sophisticated three-tier trace hierarchy that provides comprehensive observability for MCP tool execution:

```
📊 LangSmith Project
├── 🔗 Session Trace (Chain Type)
│   ├── 💬 Conversation Context
│   │   ├── 🔧 Tool Execution 1 (Tool Type)
│   │   ├── 🔧 Tool Execution 2 (Tool Type)
│   │   └── 🔧 Tool Execution N (Tool Type)
│   └── 💬 Next Conversation Context
│       ├── 🔧 Tool Execution...
│       └── 🔧 Tool Execution...
└── 🔗 Next Session Trace...
```

### Key Components

#### 1. Universal Tracing Manager (`src/utils/tracing.ts`)
- Central orchestrator for all tracing operations
- Manages LangSmith client initialization
- Handles graceful degradation when tracing is unavailable
- Provides dynamic tool tracer creation

#### 2. Session Manager (`src/utils/session-manager.ts`)
- Implements AsyncLocalStorage for context propagation
- Creates session-level parent traces
- Manages session lifecycle and metadata
- Provides client detection and identification

#### 3. Conversation Tracker (`src/utils/conversation-tracker.ts`)
- Tracks tool sequences within conversations
- Detects conversation boundaries and transitions
- Provides conversation-aware trace naming
- Manages conversation quality metrics

## Trace Grouping Mechanisms

### 1. Session-Level Grouping

All tool executions within an MCP session are automatically grouped under a parent session trace.

**Implementation Location**: `src/index.ts:1108-1115`

```typescript
await runWithSession(sessionContext, async () => {
  // Create session-level parent trace that contains all tool calls
  await server.tracingManager.createSessionTrace(sessionContext, async () => {
    // All tool calls within this scope inherit session context AND nest under session trace
    await server.connect(transport);
  });
});
```

**Key Features:**
- **Trace Type**: `chain` (indicates this is a parent/workflow trace)
- **Naming Pattern**: `"Claude Desktop (STDIO)"` or `"Web Client (SSE)"`
- **Metadata**: Includes transport mode, client info, session ID
- **Duration**: Tracks entire session lifetime

### 2. Conversation Context Grouping

Within each session, tool executions are grouped by conversation context to track logical workflows.

**Implementation Location**: `src/utils/tracing.ts:219-248`

```typescript
if (session?.sessionId) {
  // Get or create conversation context
  conversation = getOrCreateConversation(session.sessionId, toolName);

  // Track conversation flow before execution
  trackConversationFlow(toolName);

  // Detect user intent
  userIntent = detectIntent(toolName, metadata, conversation.toolSequence);

  // Create conversation-aware trace name
  conversationAwareTraceName = createConversationAwareTraceName(toolName, conversation);
}
```

**Key Features:**
- **Conversation ID**: Unique identifier for each conversation thread
- **Tool Sequence Tracking**: Maintains history of tools used in sequence
- **Intent Detection**: Identifies user goals (e.g., 'migrate', 'configure', 'analyze')
- **Context Switches**: Tracks when conversations change topics

### 3. Tool Execution Nesting

Individual tool executions nest under their conversation and session context.

**Implementation Location**: `src/utils/tracing.ts:254-416`

```typescript
const toolTracer = traceable(
  async (toolInput: any) => {
    // Tool execution logic with comprehensive context
    const result = await operation();
    return {
      ...result,
      _trace: {
        runId: currentRun?.id,
        sessionId: session?.sessionId,
        conversationId: conversation?.conversationId,
        // ... comprehensive metadata
      }
    };
  },
  {
    name: conversationAwareTraceName, // e.g., "list_services [Configuration Task]"
    run_type: "tool",
    project_name: this.config.project,
    metadata: {
      // Rich metadata for filtering and analysis
      tool_name: toolName,
      session_id: session?.sessionId,
      conversation_id: conversation?.conversationId,
      user_intent_primary: userIntent?.primary,
      conversation_flow_type: conversationStats?.flow?.type,
      // ... 20+ metadata fields
    }
  }
);
```

## Implementation Details

### AsyncLocalStorage Pattern

The implementation uses Node.js AsyncLocalStorage to propagate session context without explicit parameter passing:

**File**: `src/utils/session-manager.ts:36-44`

```typescript
// Global session storage using AsyncLocalStorage
const sessionStorage = new AsyncLocalStorage<SessionContext>();

export function runWithSession<T>(context: SessionContext, fn: () => T | Promise<T>): T | Promise<T> {
  return sessionStorage.run(context, fn);
}

export function getCurrentSession(): SessionContext | undefined {
  return sessionStorage.getStore();
}
```

**Benefits:**
- No need to pass session context through every function call
- Automatic context inheritance for all nested operations
- Clean separation of business logic from tracing concerns

### Dynamic Tool Naming

Tools are dynamically named based on conversation context:

**File**: `src/utils/conversation-tracker.ts:237-267`

```typescript
export function createConversationAwareTraceName(toolName: string, conversation: ConversationInfo): string {
  if (conversation.isNewConversation) {
    return `${toolName} [New Conversation]`;
  }

  if (conversation.currentTopic) {
    return `${toolName} [${conversation.currentTopic}]`;
  }

  if (conversation.messageCount > 10) {
    return `${toolName} [Extended Session]`;
  }

  return `${toolName} [Continuing]`;
}
```

### Automatic Tool Instrumentation

All 78 MCP tools are automatically instrumented without individual configuration:

**File**: `src/index.ts:999-1001`

```typescript
// Create dynamic tool tracer for this specific tool
const toolTracer = this.tracingManager.createToolTracer(tool.method);

// Create traced handler using dynamic tool tracer
```

This pattern ensures:
- Zero manual configuration per tool
- Consistent tracing across all operations
- Dynamic trace naming based on actual tool names
- Automatic metadata collection

## Key Patterns

### 1. Three-Tier Hierarchy

```
Session (Chain) → Conversation (Context) → Tool (Tool)
```

**Session Trace Properties:**
- **Type**: `chain`
- **Name**: Client-based (e.g., "Claude Desktop (STDIO)")
- **Purpose**: Groups all activity in a single MCP connection
- **Metadata**: Transport, client info, session duration

**Tool Trace Properties:**
- **Type**: `tool`
- **Name**: Context-aware (e.g., "list_services [Configuration Task]")
- **Purpose**: Individual tool execution with full context
- **Metadata**: Tool parameters, execution time, conversation context

### 2. Context Propagation Flow

```typescript
// 1. Session context created at connection
const sessionContext = createSessionContext(connectionId, transportMode);

// 2. AsyncLocalStorage provides context to all nested operations
await runWithSession(sessionContext, async () => {

  // 3. Session trace wraps entire session
  await tracingManager.createSessionTrace(sessionContext, async () => {

    // 4. Tool executions automatically inherit context
    await tracingManager.traceToolExecution(toolName, operation, metadata);

  });
});
```

### 3. Graceful Degradation

The implementation provides graceful degradation when LangSmith is unavailable:

```typescript
// If tracing is disabled, execute directly (graceful degradation)
if (!this.enabled || !traceable) {
  const result = await operation();
  return { result };
}
```

## Practical Examples

### Example 1: Basic Session Trace

When a Claude Desktop session starts:

```
📊 LangSmith Project: konnect-mcp-server
└── 🔗 Claude Desktop (STDIO) [Chain]
    ├── Duration: 45 minutes
    ├── Transport: stdio
    ├── Client: Claude Desktop v1.2.3
    └── Tool Count: 12
```

### Example 2: Conversation-Aware Tool Grouping

Within the session, tools are grouped by conversation:

```
🔗 Claude Desktop (STDIO) [Chain]
├── 🔧 list_control_planes [New Conversation] [Tool]
├── 🔧 list_services [Configuration Task] [Tool]
├── 🔧 create_service [Configuration Task] [Tool]
├── 🔧 create_route [Configuration Task] [Tool]
└── 🔧 query_api_requests [Analytics Review] [Tool]
```

### Example 3: Rich Metadata Context

Each tool trace includes comprehensive metadata:

```json
{
  "tool_name": "create_service",
  "category": "configuration",
  "session_id": "claude-desktop-1708123456-abc123",
  "conversation_id": "claude_1708123456_xyz789",
  "user_intent_primary": "migrate",
  "conversation_flow_type": "progressive_configuration",
  "message_count": 5,
  "execution_time": 245,
  "success": true
}
```

## Configuration

### Environment Variables

**Required for LangSmith:**

```bash
# Enable tracing
LANGSMITH_TRACING=true

# Authentication
LANGSMITH_API_KEY=lsv2_sk_your_api_key_here

# Project configuration
LANGSMITH_PROJECT=konnect-mcp-server

# Optional: Custom endpoint
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

**Optional Configuration:**

```bash
# Session naming
LANGSMITH_SESSION=mcp-session

# Tags for filtering
LANGSMITH_TAGS=mcp-server,kong-konnect,production

# Sampling rate (0.0 to 1.0)
LANGSMITH_SAMPLING_RATE=1.0
```

### Configuration Validation

The system validates configuration on startup:

**File**: `src/config/tracing-config.ts:46-67`

```typescript
export function validateTracingConfig(config: TracingConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.enabled) {
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('LANGSMITH_API_KEY is required when tracing is enabled');
    }

    if (!config.project || config.project.trim() === '') {
      errors.push('LANGSMITH_PROJECT is required when tracing is enabled');
    }

    if (config.samplingRate < 0 || config.samplingRate > 1) {
      errors.push('LANGSMITH_SAMPLING_RATE must be between 0.0 and 1.0');
    }
  }

  return { isValid: errors.length === 0, errors };
}
```

## Dashboard Organization

### LangSmith Dashboard View

When properly configured, traces appear in LangSmith organized as follows:

1. **Project Level**: `konnect-mcp-server`
2. **Session Traces**: Named by client (e.g., "Claude Desktop (STDIO)")
3. **Tool Traces**: Nested under sessions with conversation context

### Filtering and Analysis

Use these metadata fields for filtering in LangSmith:

- **`session_id`**: Group by MCP session
- **`conversation_id`**: Group by conversation thread
- **`tool_name`**: Filter by specific tools
- **`user_intent_primary`**: Filter by user goals
- **`category`**: Filter by operation type (configuration, analytics, etc.)
- **`client_name`**: Filter by client type

### Performance Analysis

Track these metrics:

- **Session Duration**: How long sessions last
- **Tool Execution Time**: Performance per tool
- **Conversation Length**: Tools per conversation
- **Error Rates**: Success/failure patterns
- **User Patterns**: Common tool sequences

## Troubleshooting

### Common Issues

#### 1. Traces Not Appearing

**Symptoms**: No traces in LangSmith dashboard

**Solutions**:
1. Check environment variables:
   ```bash
   echo $LANGSMITH_API_KEY
   echo $LANGSMITH_PROJECT
   echo $LANGSMITH_TRACING
   ```

2. Verify project name in LangSmith client:
   ```typescript
   const client = new LangSmithClient({
     apiKey: apiKey,
     projectName: projectName, // Must match dashboard project
   });
   ```

3. Check logs for initialization errors:
   ```bash
   bun start 2>&1 | grep -i langsmith
   ```

#### 2. Split/Orphaned Traces

**Symptoms**: Tool traces not grouped under session traces

**Cause**: Inconsistent project naming between client and traceable functions

**Solution**: Ensure project name consistency:
```typescript
// Both must use the same project name
const client = new LangSmithClient({ projectName: "project-name" });
const tracer = traceable(fn, { project_name: "project-name" });
```

#### 3. Missing Session Context

**Symptoms**: Tools execute but lack session metadata

**Cause**: Tool execution outside of session context

**Solution**: Ensure all tool calls happen within session scope:
```typescript
await runWithSession(sessionContext, async () => {
  // All tool calls here will have session context
  await toolExecution();
});
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
LOG_LEVEL=debug bun start
```

Look for these log patterns:
- `[INFO] tracing: LangSmith tracing enabled for project: konnect-mcp-server`
- `[DEBUG] tracing: Executing tool with enhanced session context`
- `[ERROR] tracing: LangSmith tracing error`

### Verification Checklist

- [ ] Environment variables set correctly
- [ ] API key has proper permissions
- [ ] Project exists in LangSmith dashboard
- [ ] No network connectivity issues
- [ ] Session context properly propagated
- [ ] Tool instrumentation working

## Advanced Features

### Conversation Quality Scoring

The system analyzes conversation quality:

**File**: `src/utils/conversation-metrics.ts`

```typescript
export interface ConversationQuality {
  coherenceScore: number;      // How well tools relate to each other
  efficiencyScore: number;     // How efficiently goals are achieved
  userExperienceScore: number; // Overall user experience rating
  conversationCompleteness: 'incomplete' | 'partial' | 'complete';
}
```

### Intent Detection

Automatic detection of user intentions:

**File**: `src/utils/intent-detector.ts`

```typescript
export interface UserIntent {
  primary: string;    // Main intent (e.g., 'migrate', 'configure')
  secondary?: string; // Secondary intent
  confidence: number; // Confidence score 0-1
  context: string[];  // Supporting context clues
}
```

### Session Resumption Detection

Detects when users resume previous sessions:

```typescript
const resumption = detectSessionResumption(session.sessionId);
if (resumption.isResumption) {
  // Handle session resumption with context restoration
  mcpLogger.info('tracing', 'Session resumption detected', {
    gapDuration: resumption.gapDuration,
    contextLoss: resumption.contextLoss
  });
}
```

## Best Practices

### 1. Project Naming

Use consistent, descriptive project names:
- `konnect-mcp-server` (production)
- `konnect-mcp-server-dev` (development)
- `konnect-mcp-server-staging` (staging)

### 2. Tag Strategy

Use meaningful tags for filtering:
```bash
LANGSMITH_TAGS=mcp-server,kong-konnect,production,v2.0.0
```

### 3. Sampling for Production

Use sampling in high-traffic production environments:
```bash
LANGSMITH_SAMPLING_RATE=0.1  # 10% sampling
```

### 4. Monitoring

Monitor trace health with these queries:
- Error rate by tool
- Average session duration
- Tool usage patterns
- Performance degradation

### 5. Privacy

The system automatically redacts sensitive data:
```typescript
const sensitiveFields = ['key', 'cert', 'certificate', 'private_key', 'secret', 'token', 'password'];
```

## Integration Examples

### Custom Tool Tracing

For new tools, the system automatically provides tracing:

```typescript
// No manual tracing code needed - automatically instrumented
case "my_new_tool":
  result = await myNewToolOperation(args);
  break;
```

### Advanced Metadata

Add custom metadata to traces:

```typescript
await tracingManager.traceToolExecution(
  toolName,
  operation,
  {
    category: 'custom',
    customField: 'customValue',
    parameters: args // Captured automatically
  }
);
```

### Trace Analysis

Query traces programmatically:

```typescript
const stats = await tracingManager.getStats();
const insights = await tracingManager.getConversationInsights();
```

This comprehensive trace grouping implementation provides powerful observability for MCP tool execution while maintaining clean separation of concerns and automatic instrumentation.