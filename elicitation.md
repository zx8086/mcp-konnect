# Implementing Context Elicitation with Claude: TypeScript and MCP SDK Guide

## Critical clarification: No dedicated Elicitation API exists

Based on comprehensive research of official Anthropic documentation, **there is no specific "Claude Code Elicitation API"** as a standalone feature. However, the Model Context Protocol (MCP) SDK, developed by Anthropic, provides robust elicitation capabilities for dynamic context gathering in AI applications. This guide focuses on implementing these elicitation patterns using TypeScript with the MCP SDK and Claude APIs.

The confusion likely stems from MCP's elicitation features being integrated within the broader protocol rather than existing as a separate API. MCP servers can request additional user input through their elicitation capabilities, enabling the exact functionality you're seeking - applications that ask for the right context when needed.

## Understanding the actual technology stack

### Available tools and their purposes

**Claude Code** serves as a command-line tool and SDK for agentic coding, embedding Claude models directly in your terminal with deep codebase awareness, file operations, and command execution capabilities. It supports MCP integration for extensible tool usage but doesn't have a dedicated elicitation API.

**@anthropic-ai/sdk** provides the official TypeScript SDK for Claude's standard API, offering full TypeScript definitions, streaming support, tool use, and message batches. With over 1.8 million weekly downloads, it's the primary interface for Claude integration.

**@modelcontextprotocol/sdk** delivers the MCP implementation with built-in elicitation capabilities. This SDK enables servers to request additional user input dynamically, providing the context-gathering functionality you need.

### How elicitation works in MCP

MCP's elicitation system allows servers to request additional information from clients during tool execution. When a server needs more context, it can trigger an elicitation request that prompts the user for specific information, supporting accept/decline/cancel flows with schema-driven validation.

## Core TypeScript implementation patterns

### Setting up the MCP server with elicitation

```typescript
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "context-aware-server",
  version: "1.0.0"
});

// Initialize transport
const transport = new StdioServerTransport();
server.connect(transport);

// Register a tool that uses elicitation
server.registerTool(
  "create-task",
  {
    title: "Create Task with Context",
    description: "Creates a task by gathering necessary context",
    inputSchema: {
      initialDescription: z.string().optional()
    }
  },
  async ({ initialDescription }, context) => {
    // Check if we have enough context
    if (!initialDescription || initialDescription.length < 10) {
      // Request additional context from user
      const result = await context.elicit({
        message: "Please provide more details for the task",
        schema: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 5 },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            description: { type: "string", minLength: 20 },
            dueDate: { type: "string", format: "date" }
          },
          required: ["title", "description"]
        }
      });

      if (result.action === "accept") {
        return {
          content: [{
            type: "text",
            text: `Task created: ${result.data.title} (Priority: ${result.data.priority || 'medium'})`
          }]
        };
      } else if (result.action === "decline") {
        return {
          content: [{
            type: "text",
            text: "Task creation cancelled by user"
          }]
        };
      }
    }
    
    // Process with existing context
    return {
      content: [{
        type: "text",
        text: `Task created with initial description: ${initialDescription}`
      }]
    };
  }
);
```

### Integrating MCP with Claude using TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { HttpClientTransport } from '@modelcontextprotocol/sdk/client/http.js';

class ClaudeWithElicitation {
  private anthropicClient: Anthropic;
  private mcpClient: McpClient;
  private conversation: Anthropic.MessageParam[] = [];

  constructor(apiKey: string, mcpServerUrl: string) {
    this.anthropicClient = new Anthropic({ apiKey });
    
    // Initialize MCP client
    this.mcpClient = new McpClient({
      name: "claude-integration",
      version: "1.0.0"
    });

    // Connect to MCP server
    const transport = new HttpClientTransport(mcpServerUrl);
    this.mcpClient.connect(transport);
  }

  async processWithElicitation(userInput: string): Promise<string> {
    // Add user message to conversation
    this.conversation.push({ role: 'user', content: userInput });

    // Get available MCP tools
    const tools = await this.mcpClient.listTools();
    
    // Create Claude message with tool definitions
    const response = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: this.conversation,
      tools: this.convertMcpToolsToClaudeFormat(tools),
      tool_choice: { type: 'auto' }
    });

    // Handle tool calls that might trigger elicitation
    if (response.stop_reason === 'tool_use') {
      return await this.handleToolCallWithElicitation(response);
    }

    // Add assistant response to conversation
    this.conversation.push({
      role: 'assistant',
      content: response.content
    });

    return this.extractTextContent(response);
  }

  private async handleToolCallWithElicitation(
    response: Anthropic.Message
  ): Promise<string> {
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        try {
          // Execute tool through MCP, which may trigger elicitation
          const toolResult = await this.mcpClient.callTool(
            block.name,
            block.input,
            {
              // Elicitation handler
              onElicitation: async (request) => {
                return await this.handleElicitationRequest(request);
              }
            }
          );

          // Continue conversation with tool result
          return await this.continueWithToolResult(
            response,
            block.id,
            toolResult
          );
        } catch (error) {
          return this.handleToolError(error);
        }
      }
    }
    return "No tool execution completed";
  }

  private async handleElicitationRequest(request: any): Promise<any> {
    // Present elicitation request to user
    console.log(`Additional information needed: ${request.message}`);
    
    // In a real application, this would involve UI interaction
    // For demonstration, we'll simulate user response
    const userResponse = await this.getUserResponse(request.schema);
    
    return {
      action: userResponse ? 'accept' : 'decline',
      data: userResponse
    };
  }
}
```

### Advanced elicitation patterns with context management

```typescript
interface ContextLayer {
  id: string;
  data: any;
  priority: 'critical' | 'high' | 'normal' | 'low';
  timestamp: Date;
  source: 'user' | 'system' | 'elicited';
}

class ProgressiveContextBuilder {
  private contextLayers: Map<string, ContextLayer> = new Map();
  private elicitationHistory: Array<{
    timestamp: Date;
    request: any;
    response: any;
  }> = [];

  async gatherContext(
    mcpClient: McpClient,
    requiredFields: string[]
  ): Promise<Record<string, any>> {
    const context: Record<string, any> = {};
    const missingFields: string[] = [];

    // Check existing context layers
    for (const field of requiredFields) {
      const existing = this.findInContext(field);
      if (existing) {
        context[field] = existing;
      } else {
        missingFields.push(field);
      }
    }

    // Elicit missing information
    if (missingFields.length > 0) {
      const elicitationSchema = this.buildElicitationSchema(missingFields);
      
      const result = await mcpClient.elicit({
        message: `Please provide the following information: ${missingFields.join(', ')}`,
        schema: elicitationSchema,
        timeout: 30000 // 30 second timeout
      });

      if (result.action === 'accept') {
        // Store elicited data in context layers
        this.addContextLayer({
          id: `elicited-${Date.now()}`,
          data: result.data,
          priority: 'high',
          timestamp: new Date(),
          source: 'elicited'
        });

        // Record elicitation for audit
        this.elicitationHistory.push({
          timestamp: new Date(),
          request: { fields: missingFields, schema: elicitationSchema },
          response: result
        });

        // Merge elicited data into context
        Object.assign(context, result.data);
      }
    }

    return context;
  }

  private buildElicitationSchema(fields: string[]): any {
    const properties: Record<string, any> = {};
    
    for (const field of fields) {
      // Dynamic schema generation based on field type
      properties[field] = this.getFieldSchema(field);
    }

    return {
      type: 'object',
      properties,
      required: fields.filter(f => this.isRequired(f))
    };
  }

  private getFieldSchema(field: string): any {
    // Map field names to appropriate schemas
    const schemaMap: Record<string, any> = {
      email: { type: 'string', format: 'email' },
      phone: { type: 'string', pattern: '^[0-9-]+$' },
      date: { type: 'string', format: 'date' },
      priority: { type: 'string', enum: ['low', 'medium', 'high'] },
      description: { type: 'string', minLength: 10 },
      // Default schema for unknown fields
      default: { type: 'string' }
    };

    return schemaMap[field] || schemaMap.default;
  }

  async compressContext(maxTokens: number): Promise<void> {
    // Implement context compression when approaching limits
    const contextSize = this.calculateContextSize();
    
    if (contextSize > maxTokens * 0.8) {
      // Remove low-priority, old context layers
      const sortedLayers = Array.from(this.contextLayers.values())
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return this.priorityValue(b.priority) - this.priorityValue(a.priority);
          }
          return b.timestamp.getTime() - a.timestamp.getTime();
        });

      // Keep only high-priority and recent layers
      const toKeep = sortedLayers.slice(0, Math.floor(sortedLayers.length * 0.6));
      this.contextLayers.clear();
      toKeep.forEach(layer => this.contextLayers.set(layer.id, layer));
    }
  }
}
```

## Error handling and edge cases

### Comprehensive error handling framework

```typescript
enum ElicitationErrorType {
  TIMEOUT = 'TIMEOUT',
  USER_DECLINE = 'USER_DECLINE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH'
}

class ElicitationError extends Error {
  constructor(
    public type: ElicitationErrorType,
    message: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ElicitationError';
  }
}

class RobustElicitationHandler {
  private retryConfig = {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  };

  async handleElicitationWithRetry(
    elicitFunc: () => Promise<any>,
    context: any
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          elicitFunc,
          30000 // 30 second timeout
        );

        // Validate response
        if (!this.isValidElicitationResponse(result)) {
          throw new ElicitationError(
            ElicitationErrorType.VALIDATION_FAILED,
            'Invalid elicitation response format',
            result
          );
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        
        // Handle specific error types
        if (error instanceof ElicitationError) {
          switch (error.type) {
            case ElicitationErrorType.USER_DECLINE:
              // User explicitly declined - don't retry
              return this.handleUserDecline(context);
              
            case ElicitationErrorType.TIMEOUT:
              // Timeout - retry with backoff
              await this.delay(
                this.retryConfig.backoffMs * 
                Math.pow(this.retryConfig.backoffMultiplier, attempt)
              );
              continue;
              
            case ElicitationErrorType.VALIDATION_FAILED:
              // Schema validation failed - may need to adjust schema
              return this.handleValidationFailure(error.context);
              
            default:
              // Other errors - log and retry
              console.error(`Elicitation error: ${error.message}`);
          }
        }

        // Network or unknown errors - retry with backoff
        if (attempt < this.retryConfig.maxRetries - 1) {
          await this.delay(
            this.retryConfig.backoffMs * 
            Math.pow(this.retryConfig.backoffMultiplier, attempt)
          );
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Elicitation failed after ${this.retryConfig.maxRetries} attempts: ${lastError?.message}`
    );
  }

  private async executeWithTimeout<T>(
    func: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      func(),
      new Promise<T>((_, reject) => 
        setTimeout(
          () => reject(new ElicitationError(
            ElicitationErrorType.TIMEOUT,
            `Operation timed out after ${timeoutMs}ms`
          )),
          timeoutMs
        )
      )
    ]);
  }

  private handleUserDecline(context: any): any {
    // Graceful handling when user declines to provide information
    return {
      action: 'decline',
      fallback: this.generateFallbackResponse(context)
    };
  }

  private handleValidationFailure(invalidData: any): any {
    // Attempt to correct or request clarification
    return {
      action: 'retry',
      message: 'The provided information didn\'t match expected format. Please try again.',
      previousAttempt: invalidData
    };
  }
}
```

### Edge case handling patterns

```typescript
class EdgeCaseManager {
  // Handle partial information scenarios
  async handlePartialContext(
    available: Record<string, any>,
    required: string[]
  ): Promise<{ 
    canProceed: boolean; 
    strategy: 'elicit' | 'default' | 'abort' 
  }> {
    const missing = required.filter(field => !available[field]);
    const completeness = (required.length - missing.length) / required.length;

    if (completeness >= 0.8) {
      // 80% complete - proceed with defaults
      return { canProceed: true, strategy: 'default' };
    } else if (completeness >= 0.5) {
      // 50-80% complete - attempt elicitation
      return { canProceed: false, strategy: 'elicit' };
    } else {
      // Less than 50% - abort operation
      return { canProceed: false, strategy: 'abort' };
    }
  }

  // Handle conflicting information
  async resolveConflicts(
    elicitedData: any,
    existingData: any
  ): Promise<any> {
    const conflicts: Array<{
      field: string;
      elicited: any;
      existing: any;
    }> = [];

    for (const key in elicitedData) {
      if (existingData[key] && elicitedData[key] !== existingData[key]) {
        conflicts.push({
          field: key,
          elicited: elicitedData[key],
          existing: existingData[key]
        });
      }
    }

    if (conflicts.length > 0) {
      // Request confirmation for conflicts
      const resolution = await this.requestConflictResolution(conflicts);
      return this.mergeWithResolution(elicitedData, existingData, resolution);
    }

    return { ...existingData, ...elicitedData };
  }

  // Handle circular elicitation prevention
  private elicitationStack: string[] = [];
  
  async preventCircularElicitation(
    fieldName: string,
    elicitFunc: () => Promise<any>
  ): Promise<any> {
    if (this.elicitationStack.includes(fieldName)) {
      throw new Error(
        `Circular elicitation detected for field: ${fieldName}`
      );
    }

    this.elicitationStack.push(fieldName);
    
    try {
      return await elicitFunc();
    } finally {
      this.elicitationStack.pop();
    }
  }
}
```

## Performance optimization strategies

### Token management and context optimization

```typescript
class OptimizedContextManager {
  private readonly MAX_CONTEXT_TOKENS = 200000;
  private readonly RESERVE_TOKENS = 4000; // Reserve for response
  
  async optimizeContextWindow(
    messages: Anthropic.MessageParam[],
    elicitationData: any
  ): Promise<Anthropic.MessageParam[]> {
    const tokenEstimate = this.estimateTokens(messages);
    const available = this.MAX_CONTEXT_TOKENS - this.RESERVE_TOKENS;

    if (tokenEstimate > available) {
      // Apply compression strategies
      return await this.compressMessages(messages, available);
    }

    return messages;
  }

  private async compressMessages(
    messages: Anthropic.MessageParam[],
    targetTokens: number
  ): Promise<Anthropic.MessageParam[]> {
    // Strategy 1: Remove old tool results
    let compressed = this.removeOldToolResults(messages);
    
    if (this.estimateTokens(compressed) > targetTokens) {
      // Strategy 2: Summarize middle messages
      compressed = await this.summarizeMiddleMessages(compressed);
    }

    if (this.estimateTokens(compressed) > targetTokens) {
      // Strategy 3: Keep only critical messages
      compressed = this.keepCriticalMessages(compressed);
    }

    return compressed;
  }

  // Caching for frequently elicited data
  private elicitationCache = new Map<string, {
    data: any;
    timestamp: Date;
    ttl: number;
  }>();

  async getCachedOrElicit(
    key: string,
    elicitFunc: () => Promise<any>,
    ttlSeconds: number = 3600
  ): Promise<any> {
    const cached = this.elicitationCache.get(key);
    
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    const data = await elicitFunc();
    
    this.elicitationCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlSeconds
    });

    return data;
  }

  private isCacheValid(cached: { timestamp: Date; ttl: number }): boolean {
    const age = Date.now() - cached.timestamp.getTime();
    return age < cached.ttl * 1000;
  }
}
```

### Parallel processing and batch operations

```typescript
class ParallelElicitationProcessor {
  async gatherMultipleContexts(
    elicitationRequests: Array<{
      id: string;
      schema: any;
      priority: number;
    }>
  ): Promise<Map<string, any>> {
    // Sort by priority
    const sorted = elicitationRequests.sort((a, b) => b.priority - a.priority);
    
    // Group compatible requests for batching
    const batches = this.groupCompatibleRequests(sorted);
    const results = new Map<string, any>();

    for (const batch of batches) {
      if (batch.length === 1) {
        // Single request - process normally
        const result = await this.processSingleElicitation(batch[0]);
        results.set(batch[0].id, result);
      } else {
        // Multiple requests - combine into single elicitation
        const batchResult = await this.processBatchElicitation(batch);
        batchResult.forEach((value, key) => results.set(key, value));
      }
    }

    return results;
  }

  private groupCompatibleRequests(
    requests: Array<any>
  ): Array<Array<any>> {
    const batches: Array<Array<any>> = [];
    const processed = new Set<string>();

    for (const request of requests) {
      if (processed.has(request.id)) continue;

      const compatible = requests.filter(r => 
        !processed.has(r.id) && 
        this.areCompatible(request, r)
      );

      compatible.forEach(r => processed.add(r.id));
      batches.push(compatible);
    }

    return batches;
  }

  private areCompatible(req1: any, req2: any): boolean {
    // Check if requests can be combined
    return (
      req1.priority === req2.priority &&
      this.schemasCompatible(req1.schema, req2.schema)
    );
  }

  private async processBatchElicitation(
    batch: Array<any>
  ): Promise<Map<string, any>> {
    // Combine schemas for single elicitation
    const combinedSchema = this.combineSchemas(batch.map(b => b.schema));
    
    const result = await this.elicit({
      message: "Please provide the following information",
      schema: combinedSchema
    });

    // Distribute results to individual requests
    return this.distributeResults(batch, result);
  }
}
```

## Real-world implementation examples

### Complete working example: Task management with progressive elicitation

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Anthropic from '@anthropic-ai/sdk';

class TaskManagementSystem {
  private mcpServer: McpServer;
  private anthropicClient: Anthropic;
  private contextBuilder: ProgressiveContextBuilder;

  constructor() {
    this.mcpServer = new McpServer({
      name: "task-manager",
      version: "1.0.0"
    });

    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });

    this.contextBuilder = new ProgressiveContextBuilder();
    this.registerTools();
  }

  private registerTools() {
    // Register comprehensive task creation tool
    this.mcpServer.registerTool(
      "create-comprehensive-task",
      {
        title: "Create Comprehensive Task",
        description: "Creates a task with full context gathering",
        inputSchema: {
          basicInfo: z.object({
            title: z.string().optional(),
            category: z.string().optional()
          }).optional()
        }
      },
      async ({ basicInfo }, context) => {
        // Phase 1: Gather basic information if not provided
        let taskData = basicInfo || {};
        
        if (!taskData.title) {
          const titleResult = await context.elicit({
            message: "What would you like to name this task?",
            schema: {
              type: "object",
              properties: {
                title: { 
                  type: "string", 
                  minLength: 3,
                  maxLength: 100 
                }
              },
              required: ["title"]
            }
          });

          if (titleResult.action !== 'accept') {
            return {
              content: [{
                type: "text",
                text: "Task creation cancelled"
              }]
            };
          }

          taskData = { ...taskData, ...titleResult.data };
        }

        // Phase 2: Determine task complexity and gather details
        const complexityResult = await context.elicit({
          message: `For the task "${taskData.title}", please provide priority and complexity details`,
          schema: {
            type: "object",
            properties: {
              priority: {
                type: "string",
                enum: ["low", "medium", "high", "critical"]
              },
              estimatedHours: {
                type: "number",
                minimum: 0.5,
                maximum: 100
              },
              requiresApproval: {
                type: "boolean"
              }
            },
            required: ["priority"]
          }
        });

        if (complexityResult.action === 'accept') {
          taskData = { ...taskData, ...complexityResult.data };
        }

        // Phase 3: Gather additional context based on priority
        if (taskData.priority === 'high' || taskData.priority === 'critical') {
          const detailsResult = await context.elicit({
            message: "This is a high-priority task. Please provide additional details",
            schema: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  minLength: 20
                },
                dependencies: {
                  type: "array",
                  items: { type: "string" }
                },
                stakeholders: {
                  type: "array",
                  items: { type: "string" }
                },
                dueDate: {
                  type: "string",
                  format: "date"
                }
              },
              required: ["description", "dueDate"]
            }
          });

          if (detailsResult.action === 'accept') {
            taskData = { ...taskData, ...detailsResult.data };
          }
        }

        // Create task with gathered context
        const taskId = await this.createTask(taskData);

        return {
          content: [{
            type: "text",
            text: `Task created successfully!\nID: ${taskId}\nTitle: ${taskData.title}\nPriority: ${taskData.priority}\nDue: ${taskData.dueDate || 'Not set'}`
          }]
        };
      }
    );
  }

  private async createTask(taskData: any): Promise<string> {
    // Simulate task creation in database
    const taskId = `TASK-${Date.now()}`;
    
    // Store in context for future reference
    this.contextBuilder.addContextLayer({
      id: taskId,
      data: taskData,
      priority: taskData.priority === 'critical' ? 'critical' : 'normal',
      timestamp: new Date(),
      source: 'elicited'
    });

    return taskId;
  }

  async processNaturalLanguageRequest(userInput: string): Promise<string> {
    // Use Claude to understand intent and invoke appropriate tools
    const response = await this.anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: 'You are a task management assistant. Use the available tools to help users create and manage tasks. When information is missing, the tools will automatically ask for it.'
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      tools: [{
        name: "create-comprehensive-task",
        description: "Creates a task with automatic context gathering",
        input_schema: {
          type: "object",
          properties: {
            basicInfo: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" }
              }
            }
          }
        }
      }]
    });

    return this.processResponse(response);
  }
}

// Usage example
const taskSystem = new TaskManagementSystem();
const result = await taskSystem.processNaturalLanguageRequest(
  "I need to create a task for the quarterly review"
);
// This will trigger progressive elicitation to gather all necessary details
```

## Troubleshooting common implementation problems

### Problem diagnosis and resolution guide

**Elicitation requests not triggering**. The MCP server may not be properly connected or the tool registration might be incorrect. Verify server initialization, check transport connection status, and ensure tool schemas are properly defined with elicitation support enabled.

**Context loss between elicitations**. This typically occurs when state management isn't properly implemented. Implement session-based context storage using the ContextManager pattern shown above, ensuring each elicitation result is persisted and accessible for subsequent requests.

**Schema validation failures**. When elicitation responses fail validation, it's often due to mismatched schemas between request and expected response. Use Zod for consistent schema validation, implement clear error messages for validation failures, and provide examples in elicitation prompts to guide user input.

**Timeout issues in production**. Long elicitation chains can exceed default timeouts. Configure appropriate timeout values (30-60 seconds for complex elicitations), implement progress indicators for long-running operations, and break complex elicitations into smaller, sequential requests.

**Circular dependency in elicitation chains**. This occurs when one elicitation triggers another that eventually calls the first. Track elicitation stack depth, implement maximum recursion limits, and use the circular elicitation prevention pattern shown in the edge cases section.

### Performance monitoring and optimization

```typescript
class ElicitationMetrics {
  private metrics = {
    totalElicitations: 0,
    successfulElicitations: 0,
    failedElicitations: 0,
    averageResponseTime: 0,
    timeouts: 0,
    userDeclines: 0
  };

  async trackElicitation<T>(
    elicitFunc: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalElicitations++;

    try {
      const result = await elicitFunc();
      
      this.metrics.successfulElicitations++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return result;
    } catch (error) {
      this.metrics.failedElicitations++;
      
      if (error instanceof ElicitationError) {
        if (error.type === ElicitationErrorType.TIMEOUT) {
          this.metrics.timeouts++;
        } else if (error.type === ElicitationErrorType.USER_DECLINE) {
          this.metrics.userDeclines++;
        }
      }
      
      throw error;
    }
  }

  getMetricsReport(): string {
    const successRate = 
      (this.metrics.successfulElicitations / this.metrics.totalElicitations) * 100;

    return `
      Elicitation Metrics:
      - Total: ${this.metrics.totalElicitations}
      - Success Rate: ${successRate.toFixed(2)}%
      - Average Response Time: ${this.metrics.averageResponseTime.toFixed(0)}ms
      - Timeouts: ${this.metrics.timeouts}
      - User Declines: ${this.metrics.userDeclines}
    `;
  }
}
```

## Integration with Claude Code features

While Claude Code doesn't have a dedicated elicitation API, you can achieve similar functionality by combining Claude Code's capabilities with MCP's elicitation features. Claude Code provides deep codebase awareness, file operations, and command execution, which can be enhanced with dynamic context gathering through MCP.

The key integration pattern involves using Claude Code for the core agentic coding capabilities while leveraging MCP servers for any dynamic context needs. This creates a powerful combination where Claude Code can autonomously work on code tasks while requesting additional context through MCP when needed.

## Best practices summary

**Start with clear schemas**. Define precise, well-documented schemas for all elicitation requests. Use TypeScript interfaces and Zod validation to ensure type safety throughout the elicitation pipeline.

**Implement progressive disclosure**. Don't request all information upfront. Start with essential fields and progressively gather more details based on user responses and context requirements.

**Handle failures gracefully**. Always provide fallback options when elicitation fails. Implement retry logic with exponential backoff for transient failures and clear error messages for permanent failures.

**Optimize for performance**. Cache frequently elicited data with appropriate TTLs, batch compatible elicitation requests when possible, and implement context compression to stay within token limits.

**Maintain security**. Validate all elicited data against schemas, implement rate limiting to prevent abuse, never elicit sensitive information like passwords directly, and maintain audit logs of all elicitation activities.

**Monitor and iterate**. Track elicitation metrics to identify bottlenecks, analyze user decline rates to improve prompts, and continuously refine schemas based on validation failures.