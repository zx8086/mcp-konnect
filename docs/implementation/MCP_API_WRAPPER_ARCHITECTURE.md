# MCP API Wrapper Architecture Implementation Guide

This guide explains the architectural patterns used in the Kong Konnect MCP Server, focusing on API wrapper design and prompt-driven development. These patterns provide clean separation of concerns, maintainability, and scalability.

> **Kong Konnect implementation**: See the [Kong Konnect Implementation Mapping](#kong-konnect-implementation-mapping) section at the end of this document for how these generic patterns map to actual source files.

## Overview

This architecture enables building robust MCP servers that integrate with external APIs while maintaining clean code organization, comprehensive error handling, and excellent developer experience.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Five-Layer Architecture Pattern](#five-layer-architecture-pattern)
3. [Modular Tool Organization](#modular-tool-organization)
4. [API Wrapper Pattern](#api-wrapper-pattern)
5. [Prompt-Driven Development](#prompt-driven-development)
6. [Implementation Guide](#implementation-guide)
7. [Code Templates](#code-templates)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

### Core Philosophy

The architecture is built on three fundamental principles:

1. **Separation of Concerns**: Each layer has a single, well-defined responsibility
2. **Prompt-Driven Contracts**: Tool behavior is defined through documented contracts
3. **Centralized API Management**: All external API interactions flow through a single wrapper

### Data Flow

```
MCP Request → Tool Handler → Operations Layer → API Wrapper → External API
     ↑              ↑              ↑              ↑              ↑
  Prompts      Parameters    Business Logic   HTTP Client   Target System
(Documentation) (Validation)   (Processing)  (Transport)   (Data Source)
```

### Architecture Benefits

✅ **Maintainability**: Clear separation makes debugging and updates easier
✅ **Testability**: Each layer can be tested independently
✅ **Reusability**: API wrapper and operations can be shared across tools
✅ **Documentation**: Prompts serve as living documentation
✅ **Type Safety**: Full TypeScript support with compile-time validation
✅ **Error Handling**: Centralized error management and recovery

---

## Five-Layer Architecture Pattern

### Layer 1: MCP Server Registration

**Purpose**: Register tools and handle MCP protocol
**Location**: `src/index.ts` (main server file)

```typescript
// Example MCP Server setup
class YourMcpServer extends McpServer {
  private apiClient: YourApiClient;

  constructor(options: ServerOptions) {
    super({ name: "your-mcp", version: "1.0.0" });
    this.apiClient = new YourApiClient(options);
    this.registerTools();
  }

  private registerTools() {
    const allTools = getAllTools();
    
    allTools.forEach(tool => {
      this.setRequestHandler(CallToolRequestSchema, tool.name, 
        async (request, extra) => {
          const args = tool.parameters.parse(request.params.arguments);
          
          // Route to appropriate operation
          switch (tool.method) {
            case "create_resource":
              return await resourceOps.createResource(this.apiClient, args);
            case "list_resources":
              return await resourceOps.listResources(this.apiClient, args);
            // ... other operations
          }
        }
      );
    });
  }
}
```

### Layer 2: Tool Definitions

**Purpose**: Combine prompts, parameters, and metadata
**Location**: `src/tools/{category}/tools.ts`

```typescript
import * as prompts from "./prompts.js";
import * as parameters from "./parameters.js";

export type ResourceTool = {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  category: string;
};

export const resourceTools = (): ResourceTool[] => [
  {
    method: "create_resource",
    name: "Create Resource",
    description: prompts.createResourcePrompt(),
    parameters: parameters.createResourceParameters(),
    category: "resources"
  },
  {
    method: "list_resources", 
    name: "List Resources",
    description: prompts.listResourcesPrompt(),
    parameters: parameters.listResourcesParameters(),
    category: "resources"
  }
];
```

### Layer 3: Prompt Contracts

**Purpose**: Define tool documentation and behavior contracts
**Location**: `src/tools/{category}/prompts.ts`

```typescript
export const createResourcePrompt = () => `
Create a new resource in the system.

INPUT:
  - name: String - Resource name (must be unique)
  - description: String (optional) - Resource description
  - category: String - Resource category (business, technical, etc.)
  - tags: Array (optional) - Tags to associate with the resource
  - enabled: Boolean - Whether the resource is active (default: true)

OUTPUT:
  - success: Boolean - Whether the creation succeeded
  - resource: Object - Created resource details including:
    - resourceId: String - Unique identifier
    - name: String - Resource name
    - category: String - Resource category
    - status: String - Current status
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - Suggested next steps and related operations
`;

export const listResourcesPrompt = () => `
List all resources with optional filtering.

INPUT:
  - category: String (optional) - Filter by resource category
  - status: String (optional) - Filter by status (active, inactive, pending)
  - tags: Array (optional) - Filter by tags
  - limit: Number - Maximum results to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset from previous response

OUTPUT:
  - metadata: Object - Contains total count, pagination info, and applied filters
  - resources: Array - List of resources with full details
  - relatedTools: Array - Related operations for resource management
`;
```

### Layer 4: Parameter Validation

**Purpose**: Input validation and type safety using Zod
**Location**: `src/tools/{category}/parameters.ts`

```typescript
import { z } from "zod";

export const createResourceParameters = () => z.object({
  name: z.string()
    .min(1)
    .max(100)
    .describe("Resource name (must be unique within category)"),
  description: z.string()
    .optional()
    .describe("Optional description of the resource"),
  category: z.enum(["business", "technical", "operational"])
    .describe("Resource category for organization"),
  tags: z.array(z.string())
    .optional()
    .describe("Optional tags for resource classification"),
  enabled: z.boolean()
    .default(true)
    .describe("Whether the resource is active")
});

export const listResourcesParameters = () => z.object({
  category: z.string()
    .optional()
    .describe("Filter resources by category"),
  status: z.enum(["active", "inactive", "pending"])
    .optional()
    .describe("Filter by resource status"),
  tags: z.array(z.string())
    .optional()
    .describe("Filter by tags (any matching tag)"),
  limit: z.number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Maximum number of results to return"),
  offset: z.string()
    .optional()
    .describe("Pagination offset token from previous response")
});
```

### Layer 5: Operations & API Wrapper

**Purpose**: Business logic and external API communication
**Locations**: 
- `src/tools/{category}/operations.ts` (business logic)
- `src/api/client.ts` (API wrapper)

```typescript
// Operations Layer
import { YourApiClient } from "../../api/client.js";

export async function createResource(
  apiClient: YourApiClient,
  params: {
    name: string;
    description?: string;
    category: string;
    tags?: string[];
    enabled?: boolean;
  }
) {
  try {
    const requestData = {
      name: params.name,
      description: params.description,
      category: params.category,
      tags: params.tags || [],
      enabled: params.enabled !== false
    };

    const result = await apiClient.createResource(requestData);

    return {
      success: true,
      resource: {
        resourceId: result.id,
        name: result.name,
        category: result.category,
        status: result.status,
        metadata: {
          createdAt: result.created_at,
          updatedAt: result.updated_at
        }
      },
      relatedTools: [
        "Use 'get_resource' to view detailed resource information",
        "Use 'list_resources' to see all resources in this category"
      ]
    };
  } catch (error) {
    throw new Error(`Failed to create resource: ${error.message}`);
  }
}

export async function listResources(
  apiClient: YourApiClient,
  params: {
    category?: string;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: string;
  }
) {
  try {
    const filters = {
      category: params.category,
      status: params.status,
      tags: params.tags
    };

    const result = await apiClient.listResources(
      filters, 
      params.limit || 100, 
      params.offset
    );

    return {
      metadata: {
        totalCount: result.total,
        returnedCount: result.data.length,
        limit: params.limit || 100,
        offset: params.offset,
        nextOffset: result.nextOffset,
        appliedFilters: filters
      },
      resources: result.data.map(resource => ({
        resourceId: resource.id,
        name: resource.name,
        category: resource.category,
        status: resource.status,
        tags: resource.tags,
        metadata: {
          createdAt: resource.created_at,
          updatedAt: resource.updated_at
        }
      })),
      relatedTools: [
        "Use 'get_resource' with resourceId for detailed information",
        "Use 'create_resource' to add new resources"
      ]
    };
  } catch (error) {
    throw new Error(`Failed to list resources: ${error.message}`);
  }
}
```

---

## Modular Tool Organization

### Directory Structure Pattern

```
src/
├── index.ts                    # MCP Server registration
├── api/
│   └── client.ts              # Centralized API wrapper
├── tools/
│   ├── registry.ts            # Tool registration
│   ├── resources/             # Resource management tools
│   │   ├── prompts.ts         # Tool documentation
│   │   ├── parameters.ts      # Input validation
│   │   ├── operations.ts      # Business logic
│   │   └── tools.ts           # Tool definitions
│   ├── analytics/             # Analytics tools
│   │   ├── prompts.ts
│   │   ├── parameters.ts
│   │   ├── operations.ts
│   │   └── tools.ts
│   └── users/                 # User management tools
│       ├── prompts.ts
│       ├── parameters.ts
│       ├── operations.ts
│       └── tools.ts
└── utils/
    ├── error-handling.ts      # Error utilities
    ├── validation.ts          # Validation helpers
    └── formatting.ts          # Response formatting
```

### Four-File Pattern Benefits

#### 1. **prompts.ts** - Documentation as Code
- Serves as living documentation
- Defines INPUT/OUTPUT contracts
- Provides usage examples
- Enables automated documentation generation

#### 2. **parameters.ts** - Type Safety & Validation
- Runtime input validation using Zod
- Compile-time type safety
- Default value management  
- Clear parameter descriptions

#### 3. **operations.ts** - Business Logic
- Pure business logic functions
- API client abstraction
- Error handling and transformation
- Response formatting

#### 4. **tools.ts** - Assembly & Registration
- Combines prompts, parameters, operations
- Tool metadata management
- Category organization
- Method name mapping

### Tool Registry Pattern

```typescript
// src/tools/registry.ts
import { resourceTools } from "./resources/tools.js";
import { analyticsTools } from "./analytics/tools.js";
import { userTools } from "./users/tools.js";

export interface MCPTool {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  category: string;
}

export function getAllTools(): MCPTool[] {
  return [
    ...resourceTools(),
    ...analyticsTools(), 
    ...userTools(),
  ];
}

export function getToolsByCategory(category: string): MCPTool[] {
  return getAllTools().filter(tool => tool.category === category);
}

export function validateToolRegistry(): { isValid: boolean; errors: string[] } {
  const tools = getAllTools();
  const methods = new Set<string>();
  const errors: string[] = [];

  for (const tool of tools) {
    if (methods.has(tool.method)) {
      errors.push(`Duplicate method: ${tool.method}`);
    }
    methods.add(tool.method);

    if (!tool.method || !tool.name || !tool.description || !tool.parameters) {
      errors.push(`Invalid tool structure: ${tool.method}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}
```

---

## API Wrapper Pattern

### Core API Client Architecture

```typescript
// src/api/client.ts
export interface ApiClientOptions {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export class YourApiClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(options: ApiClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
  }

  // Generic HTTP request method
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...headers
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}. ${errorBody}`
          );
        }

        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.retries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw this.enhanceError(lastError, endpoint, method);
      }
    }
    
    throw lastError!;
  }

  private enhanceError(error: Error, endpoint: string, method: string): Error {
    const enhancedError = new Error(
      `API request failed: ${method} ${endpoint} - ${error.message}`
    );
    enhancedError.stack = error.stack;
    return enhancedError;
  }

  // Domain-specific API methods
  async createResource(data: {
    name: string;
    description?: string;
    category: string;
    tags?: string[];
    enabled?: boolean;
  }): Promise<any> {
    return this.makeRequest('/resources', 'POST', data);
  }

  async listResources(
    filters: Record<string, any> = {}, 
    limit = 100, 
    offset?: string
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
    
    queryParams.append('limit', String(limit));
    if (offset) queryParams.append('offset', offset);

    return this.makeRequest(`/resources?${queryParams.toString()}`);
  }

  async getResource(resourceId: string): Promise<any> {
    return this.makeRequest(`/resources/${resourceId}`);
  }

  async updateResource(resourceId: string, data: Partial<any>): Promise<any> {
    return this.makeRequest(`/resources/${resourceId}`, 'PUT', data);
  }

  async deleteResource(resourceId: string): Promise<any> {
    return this.makeRequest(`/resources/${resourceId}`, 'DELETE');
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest('/health');
  }
}
```

### API Wrapper Benefits

#### 1. **Centralized Configuration**
- Single place for API credentials
- Consistent timeout and retry policies
- Unified error handling

#### 2. **Request/Response Transformation**
- Consistent data formatting
- Field name standardization
- Response envelope handling

#### 3. **Error Management**
- Automatic retry with exponential backoff
- Enhanced error messages with context
- Structured error responses

#### 4. **Performance Optimization**
- Connection pooling
- Request deduplication
- Caching strategies

#### 5. **Monitoring & Observability**
- Request/response logging
- Performance metrics
- Error tracking

---

## Prompt-Driven Development

### Philosophy

Prompts serve as the **interface contract** between the MCP agent and your tools. They define:

1. **What the tool does** - Clear description
2. **What input it expects** - Parameter specifications
3. **What output it provides** - Response format
4. **How to use it** - Usage patterns and examples

### Prompt Structure Standards

#### Template Format

```typescript
export const toolNamePrompt = () => `
[Tool Description] - Brief explanation of what this tool does.

INPUT:
  - parameter1: Type - Description with constraints
  - parameter2: Type (optional) - Description with default value
  - parameter3: Array - Description with examples

OUTPUT:
  - field1: Type - Description of what this contains
  - field2: Object - Nested object structure:
    - subfield1: Type - Description
    - subfield2: Type - Description
  - relatedTools: Array - Suggested follow-up operations

EXAMPLES:
  Basic usage: [example scenario]
  Advanced usage: [complex scenario]

NOTES:
  - Important constraints or limitations
  - Best practices for this tool
  - Common error scenarios and solutions
`;
```

#### Real Example

```typescript
export const searchResourcesPrompt = () => `
Search and filter resources across the entire system with advanced criteria.

INPUT:
  - query: String (optional) - Free text search across name and description
  - categories: Array (optional) - Filter by categories ["business", "technical", "operational"]  
  - status: String (optional) - Filter by status (active, inactive, pending, archived)
  - tags: Array (optional) - Filter by tags (resources matching ANY tag)
  - createdAfter: String (optional) - ISO date to filter by creation date
  - createdBefore: String (optional) - ISO date to filter by creation date
  - limit: Number - Maximum results (1-1000, default: 100)
  - sortBy: String (optional) - Sort field (name, created_at, updated_at, category)
  - sortOrder: String (optional) - Sort direction (asc, desc, default: desc)

OUTPUT:
  - metadata: Object - Search metadata including:
    - totalMatches: Number - Total resources matching criteria
    - returnedCount: Number - Number of resources in this response
    - searchQuery: String - The search query that was applied
    - appliedFilters: Object - All filters that were applied
    - executionTime: Number - Search execution time in milliseconds
  - resources: Array - Matching resources with complete details:
    - resourceId: String - Unique identifier
    - name: String - Resource name
    - description: String - Resource description
    - category: String - Resource category
    - status: String - Current status
    - tags: Array - Associated tags
    - metadata: Object - Creation/update timestamps and other metadata
  - relatedTools: Array - Suggested follow-up operations based on results

EXAMPLES:
  Basic search: Use query="user management" to find all resources related to users
  Category filter: Use categories=["business"] to find business-related resources
  Complex filter: Combine query, categories, and date range for precise results

NOTES:
  - Text search is case-insensitive and matches partial words
  - Date filters use ISO 8601 format (2023-12-01T00:00:00Z)
  - Large result sets are automatically paginated
  - Empty query with filters performs filtered browsing
`;
```

### Prompt Best Practices

#### 1. **Clear Parameter Specifications**
```typescript
// ✅ Good - Clear type, constraints, and purpose
- name: String - Resource name (1-100 characters, must be unique)
- priority: Number - Priority level (1-10, where 1 is highest priority)
- tags: Array - Classification tags (max 5 tags, each 1-50 characters)

// ❌ Poor - Vague and incomplete
- name: String - The name
- priority: Number - Priority
- tags: Array - Tags
```

#### 2. **Structured Output Documentation**
```typescript
// ✅ Good - Clear hierarchy and purpose
OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - resource: Object - Created resource details:
    - resourceId: String - Unique identifier for future operations
    - name: String - Confirmed resource name
    - status: String - Initial status (usually "pending")
    - metadata: Object - System-generated data:
      - createdAt: String - Creation timestamp (ISO 8601)
      - version: Number - Resource version for optimistic locking
  - relatedTools: Array - Suggested next operations

// ❌ Poor - Flat and unclear
OUTPUT:
  - Various fields returned
  - Check the response for details
```

#### 3. **Usage Examples and Context**
```typescript
export const batchUpdateResourcesPrompt = () => `
Update multiple resources simultaneously with the same changes.

INPUT:
  - resourceIds: Array - List of resource IDs to update (max 50 per batch)
  - updates: Object - Changes to apply to all resources:
    - status: String (optional) - New status for all resources
    - tags: Array (optional) - Tags to add to all resources  
    - category: String (optional) - New category for all resources
  - mode: String - Update mode ("merge" or "replace", default: "merge")

OUTPUT:
  - batchResult: Object - Batch operation summary:
    - totalRequested: Number - Number of resources in the batch
    - successCount: Number - Number of successfully updated resources
    - failureCount: Number - Number of failed updates
    - executionTime: Number - Total time in milliseconds
  - results: Array - Per-resource results:
    - resourceId: String - Resource that was processed
    - success: Boolean - Whether this resource was updated
    - error: String (optional) - Error message if update failed
  - relatedTools: Array - Tools for managing the updated resources

EXAMPLES:
  Status change: Update mode="replace", updates={ status: "active" } to activate resources
  Tag addition: Update mode="merge", updates={ tags: ["urgent"] } to add urgent tag
  Category migration: Use to move resources between categories efficiently

NOTES:
  - Batch operations are atomic per resource but not across the batch
  - Failed individual updates don't affect successful ones
  - Use smaller batches (10-20 resources) for better error handling
  - Large batches may time out - consider splitting into multiple calls
`;
```

### Prompt Integration Patterns

#### 1. **Tool Registration Integration**
```typescript
// tools.ts
import * as prompts from "./prompts.js";

export const resourceTools = () => [
  {
    method: "search_resources",
    name: "Search Resources",
    description: prompts.searchResourcesPrompt(), // ← Prompt becomes tool description
    parameters: parameters.searchResourcesParameters(),
    category: "resources"
  }
];
```

#### 2. **Documentation Generation**
```typescript
// utils/docs-generator.ts
export function generateToolDocs(tools: MCPTool[]): string {
  return tools.map(tool => {
    return `## ${tool.name}\n\n${tool.description}\n\n`;
  }).join('\n');
}
```

#### 3. **Validation Integration**
```typescript
// operations.ts
export async function searchResources(apiClient: ApiClient, params: SearchParams) {
  // The prompt contract guarantees these parameters are validated
  // Business logic can focus on implementation
  
  const filters = {
    query: params.query,
    categories: params.categories,
    status: params.status,
    // ... other filters from prompt contract
  };
  
  return await apiClient.searchResources(filters);
}
```

---

## Implementation Guide

### Step 1: Project Setup

```bash
# Create project structure
mkdir your-mcp-server
cd your-mcp-server

# Initialize with package manager of choice
npm init -y  # or yarn init, pnpm init, bun init

# Install core dependencies
npm install @modelcontextprotocol/sdk zod

# Install development dependencies  
npm install -D typescript @types/node tsx

# Create directory structure
mkdir -p src/{api,tools,utils}
mkdir -p src/tools/{resources,analytics,users}
```

### Step 2: Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Environment Configuration

```typescript
// src/utils/env.ts
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getEnvVarWithDefault(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export interface ServerConfig {
  apiKey: string;
  apiUrl: string;
  timeout?: number;
  retries?: number;
}

export function loadConfig(): ServerConfig {
  return {
    apiKey: getEnvVar('YOUR_API_KEY'),
    apiUrl: getEnvVarWithDefault('YOUR_API_URL', 'https://api.yourservice.com'),
    timeout: parseInt(getEnvVarWithDefault('API_TIMEOUT', '30000')),
    retries: parseInt(getEnvVarWithDefault('API_RETRIES', '3'))
  };
}
```

### Step 4: Create API Client

```typescript
// src/api/client.ts
import { ServerConfig } from '../utils/env.js';

export class YourApiClient {
  private config: ServerConfig;
  
  constructor(config: ServerConfig) {
    this.config = config;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    // Implementation from earlier example
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Domain-specific methods
  async createResource(data: any): Promise<any> {
    return this.makeRequest('/resources', 'POST', data);
  }

  async listResources(filters: any, limit: number, offset?: string): Promise<any> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    params.append('limit', String(limit));
    if (offset) params.append('offset', offset);
    
    return this.makeRequest(`/resources?${params.toString()}`);
  }
}
```

### Step 5: Create Tool Module

```typescript
// src/tools/resources/prompts.ts
export const createResourcePrompt = () => `
Create a new resource in the system.

INPUT:
  - name: String - Resource name (must be unique)
  - category: String - Resource category  
  - description: String (optional) - Resource description
  - enabled: Boolean - Whether resource is active (default: true)

OUTPUT:
  - success: Boolean - Whether creation succeeded
  - resource: Object - Created resource with ID and metadata
  - relatedTools: Array - Suggested next steps
`;

// src/tools/resources/parameters.ts  
import { z } from "zod";

export const createResourceParameters = () => z.object({
  name: z.string().min(1).max(100).describe("Resource name"),
  category: z.string().describe("Resource category"),
  description: z.string().optional().describe("Optional description"),
  enabled: z.boolean().default(true).describe("Whether resource is active")
});

// src/tools/resources/operations.ts
import { YourApiClient } from '../../api/client.js';

export async function createResource(
  apiClient: YourApiClient,
  params: {
    name: string;
    category: string;
    description?: string;
    enabled?: boolean;
  }
) {
  try {
    const result = await apiClient.createResource({
      name: params.name,
      category: params.category,
      description: params.description,
      enabled: params.enabled !== false
    });

    return {
      success: true,
      resource: {
        resourceId: result.id,
        name: result.name,
        category: result.category,
        status: result.status
      },
      relatedTools: [
        "Use 'get_resource' to view detailed information",
        "Use 'list_resources' to see all resources"
      ]
    };
  } catch (error) {
    throw new Error(`Resource creation failed: ${error.message}`);
  }
}

// src/tools/resources/tools.ts
import { z } from "zod";
import * as prompts from "./prompts.js";
import * as parameters from "./parameters.js";

export interface ResourceTool {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  category: string;
}

export const resourceTools = (): ResourceTool[] => [
  {
    method: "create_resource",
    name: "Create Resource",
    description: prompts.createResourcePrompt(),
    parameters: parameters.createResourceParameters(),
    category: "resources"
  }
];
```

### Step 6: Registry and Main Server

```typescript
// src/tools/registry.ts
import { resourceTools } from "./resources/tools.js";
import { z } from "zod";

export interface MCPTool {
  method: string;
  name: string; 
  description: string;
  parameters: z.ZodObject<any>;
  category: string;
}

export function getAllTools(): MCPTool[] {
  return [
    ...resourceTools(),
    // Add other tool categories here
  ];
}

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { getAllTools } from "./tools/registry.js";
import { YourApiClient } from "./api/client.js";
import { loadConfig } from "./utils/env.js";
import * as resourceOps from "./tools/resources/operations.js";

class YourMcpServer extends McpServer {
  private apiClient: YourApiClient;

  constructor() {
    super({
      name: "your-mcp-server",
      version: "1.0.0",
      description: "Your MCP server description"
    });

    const config = loadConfig();
    this.apiClient = new YourApiClient(config);
    this.registerTools();
  }

  private registerTools() {
    const allTools = getAllTools();

    allTools.forEach(tool => {
      this.setRequestHandler(CallToolRequestSchema, tool.name, async (request) => {
        const args = tool.parameters.parse(request.params.arguments);

        switch (tool.method) {
          case "create_resource":
            return await resourceOps.createResource(this.apiClient, args);
          default:
            throw new Error(`Unknown tool method: ${tool.method}`);
        }
      });
    });
  }
}

// Start server
const server = new YourMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Code Templates

### Tool Category Template

Create this template in `templates/tool-category/`:

```typescript
// prompts.ts
export const createEntityPrompt = () => `
Create a new entity in the system.

INPUT:
  - name: String - Entity name (must be unique)
  - // Add your parameters here

OUTPUT:
  - success: Boolean - Whether creation succeeded  
  - entity: Object - Created entity details
  - relatedTools: Array - Suggested next steps
`;

export const listEntitiesPrompt = () => `
List entities with optional filtering.

INPUT:
  - // Add your filter parameters
  - limit: Number - Maximum results (default: 100)

OUTPUT:
  - metadata: Object - Count and pagination info
  - entities: Array - List of entities
  - relatedTools: Array - Related operations
`;

// parameters.ts
import { z } from "zod";

export const createEntityParameters = () => z.object({
  name: z.string().min(1).describe("Entity name"),
  // Add your parameter validations
});

export const listEntitiesParameters = () => z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe("Max results"),
  // Add your filter parameters
});

// operations.ts
import { YourApiClient } from '../../api/client.js';

export async function createEntity(
  apiClient: YourApiClient,
  params: {
    name: string;
    // Add your parameter types
  }
) {
  try {
    const result = await apiClient.createEntity(params);
    
    return {
      success: true,
      entity: {
        // Transform response
      },
      relatedTools: [
        // Add related tool suggestions
      ]
    };
  } catch (error) {
    throw new Error(`Entity creation failed: ${error.message}`);
  }
}

export async function listEntities(
  apiClient: YourApiClient, 
  params: {
    limit?: number;
    // Add your filter types
  }
) {
  try {
    const result = await apiClient.listEntities(params.limit || 100);
    
    return {
      metadata: {
        totalCount: result.total,
        returnedCount: result.data.length
      },
      entities: result.data.map(entity => ({
        // Transform each entity
      })),
      relatedTools: [
        // Add related tools
      ]
    };
  } catch (error) {
    throw new Error(`Entity listing failed: ${error.message}`);
  }
}

// tools.ts
import { z } from "zod";
import * as prompts from "./prompts.js";
import * as parameters from "./parameters.js";

export interface EntityTool {
  method: string;
  name: string;
  description: string; 
  parameters: z.ZodObject<any>;
  category: string;
}

export const entityTools = (): EntityTool[] => [
  {
    method: "create_entity",
    name: "Create Entity",
    description: prompts.createEntityPrompt(),
    parameters: parameters.createEntityParameters(),
    category: "entities" // Change to your category
  },
  {
    method: "list_entities", 
    name: "List Entities",
    description: prompts.listEntitiesPrompt(),
    parameters: parameters.listEntitiesParameters(),
    category: "entities"
  }
];
```

### API Client Extension Template

```typescript
// Add to your API client class
export class YourApiClient {
  // ... existing methods

  // CRUD template for new entity type
  async createEntity(data: EntityCreateData): Promise<EntityResponse> {
    return this.makeRequest('/entities', 'POST', data);
  }

  async getEntity(entityId: string): Promise<EntityResponse> {
    return this.makeRequest(`/entities/${entityId}`);
  }

  async listEntities(
    filters: EntityFilters = {},
    limit = 100,
    offset?: string
  ): Promise<EntityListResponse> {
    const params = new URLSearchParams();
    
    // Add filters to query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, String(v)));
        } else {
          params.append(key, String(value));
        }
      }
    });
    
    params.append('limit', String(limit));
    if (offset) params.append('offset', offset);

    return this.makeRequest(`/entities?${params.toString()}`);
  }

  async updateEntity(entityId: string, data: EntityUpdateData): Promise<EntityResponse> {
    return this.makeRequest(`/entities/${entityId}`, 'PUT', data);
  }

  async deleteEntity(entityId: string): Promise<void> {
    return this.makeRequest(`/entities/${entityId}`, 'DELETE');
  }

  // Batch operations template
  async batchUpdateEntities(
    entityIds: string[], 
    updates: EntityUpdateData
  ): Promise<BatchOperationResponse> {
    return this.makeRequest('/entities/batch', 'PUT', {
      entityIds,
      updates
    });
  }

  // Search template
  async searchEntities(
    query: string,
    filters: EntityFilters = {},
    limit = 100
  ): Promise<EntitySearchResponse> {
    return this.makeRequest('/entities/search', 'POST', {
      query,
      filters,
      limit
    });
  }
}
```

---

## Best Practices

### 1. Error Handling Patterns

```typescript
// Comprehensive error handling in operations
export async function createResource(apiClient: YourApiClient, params: any) {
  try {
    const result = await apiClient.createResource(params);
    return { success: true, resource: result };
    
  } catch (error) {
    // Different error types require different handling
    if (error.message.includes('already exists')) {
      throw new Error(
        `Resource '${params.name}' already exists. ` +
        `Use 'list_resources' to see existing resources or ` +
        `choose a different name.`
      );
    }
    
    if (error.message.includes('invalid category')) {
      throw new Error(
        `Invalid category '${params.category}'. ` +
        `Valid categories are: business, technical, operational. ` +
        `Use 'list_categories' to see all available options.`
      );
    }
    
    if (error.message.includes('rate limit')) {
      throw new Error(
        `Rate limit exceeded. Please wait a moment and try again. ` +
        `Use 'get_rate_limits' to check current usage.`
      );
    }
    
    // Generic error with helpful context
    throw new Error(
      `Failed to create resource: ${error.message}. ` +
      `Check that all required fields are provided and values are valid.`
    );
  }
}
```

### 2. Response Formatting Standards

```typescript
// Consistent response structure across all operations
interface StandardResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata: {
    timestamp: string;
    operationType: string;
    resourceType: string;
  };
  relatedTools: string[];
}

export function formatResponse<T>(
  data: T,
  operationType: string,
  resourceType: string,
  relatedTools: string[] = []
): StandardResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      operationType,
      resourceType
    },
    relatedTools
  };
}

export function formatError(
  error: Error,
  operationType: string,
  resourceType: string,
  relatedTools: string[] = []
): StandardResponse<null> {
  return {
    success: false,
    error: error.message,
    metadata: {
      timestamp: new Date().toISOString(),
      operationType,
      resourceType  
    },
    relatedTools
  };
}
```

### 3. Validation Helpers

```typescript
// src/utils/validation.ts
import { z } from "zod";

// Common validation schemas
export const uuidSchema = z.string().uuid().describe("Valid UUID identifier");

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.string().optional()
});

export const timestampSchema = z.string().datetime().describe("ISO 8601 timestamp");

export const tagSchema = z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/);

export const tagsArraySchema = z.array(tagSchema).max(10).describe("Up to 10 tags");

// Validation utilities
export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(input: string, maxLength = 255): string {
  return input.trim().slice(0, maxLength);
}
```

### 4. Testing Patterns

```typescript
// tests/operations/resources.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createResource } from '../../src/tools/resources/operations.js';
import { YourApiClient } from '../../src/api/client.js';

describe('Resource Operations', () => {
  let mockApiClient: YourApiClient;

  beforeEach(() => {
    mockApiClient = {
      createResource: vi.fn(),
      listResources: vi.fn(),
      getResource: vi.fn(),
    } as any;
  });

  describe('createResource', () => {
    it('should create resource successfully', async () => {
      const mockResponse = {
        id: 'resource-123',
        name: 'Test Resource',
        category: 'business',
        status: 'active'
      };

      vi.mocked(mockApiClient.createResource).mockResolvedValue(mockResponse);

      const params = {
        name: 'Test Resource',
        category: 'business',
        description: 'A test resource',
        enabled: true
      };

      const result = await createResource(mockApiClient, params);

      expect(result.success).toBe(true);
      expect(result.resource.resourceId).toBe('resource-123');
      expect(result.resource.name).toBe('Test Resource');
      expect(mockApiClient.createResource).toHaveBeenCalledWith({
        name: 'Test Resource',
        category: 'business', 
        description: 'A test resource',
        enabled: true
      });
    });

    it('should handle creation errors gracefully', async () => {
      vi.mocked(mockApiClient.createResource).mockRejectedValue(
        new Error('Resource already exists')
      );

      const params = {
        name: 'Duplicate Resource',
        category: 'business'
      };

      await expect(createResource(mockApiClient, params))
        .rejects.toThrow('Resource creation failed: Resource already exists');
    });
  });
});
```

### 5. Documentation Generation

```typescript
// utils/docs-generator.ts
import { getAllTools } from '../tools/registry.js';

export function generateMarkdownDocs(): string {
  const tools = getAllTools();
  const categories = [...new Set(tools.map(t => t.category))];
  
  let markdown = '# API Tools Documentation\n\n';
  markdown += `Generated on ${new Date().toISOString()}\n\n`;
  markdown += `Total tools: ${tools.length}\n\n`;
  
  categories.forEach(category => {
    const categoryTools = tools.filter(t => t.category === category);
    
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tools\n\n`;
    
    categoryTools.forEach(tool => {
      markdown += `### ${tool.name}\n\n`;
      markdown += `**Method**: \`${tool.method}\`\n\n`;
      markdown += `${tool.description}\n\n`;
      markdown += '---\n\n';
    });
  });
  
  return markdown;
}

export function generateOpenAPISpec(): any {
  const tools = getAllTools();
  
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'MCP Tools API',
      version: '1.0.0',
      description: 'Auto-generated API specification from MCP tools'
    },
    paths: {}
  };
  
  tools.forEach(tool => {
    spec.paths[`/tools/${tool.method}`] = {
      post: {
        summary: tool.name,
        description: tool.description,
        requestBody: {
          content: {
            'application/json': {
              schema: zodToJsonSchema(tool.parameters)
            }
          }
        }
      }
    };
  });
  
  return spec;
}

function zodToJsonSchema(zodSchema: any): any {
  // Convert Zod schema to JSON Schema
  // Implementation depends on your specific needs
  return {};
}
```

---

## Common Patterns

### 1. Pagination Handling

```typescript
// Consistent pagination across all list operations
export interface PaginationParams {
  limit?: number;
  offset?: string;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalCount?: number;
    returnedCount: number;
    limit: number;
    offset?: string;
    nextOffset?: string;
    hasMore: boolean;
  };
}

export async function listResourcesPaginated(
  apiClient: YourApiClient,
  filters: any = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResponse<Resource>> {
  
  const limit = Math.min(pagination.limit || 100, 1000);
  const result = await apiClient.listResources(filters, limit, pagination.offset);
  
  return {
    data: result.data,
    pagination: {
      totalCount: result.total,
      returnedCount: result.data.length,
      limit,
      offset: pagination.offset,
      nextOffset: result.nextOffset,
      hasMore: result.data.length === limit && Boolean(result.nextOffset)
    }
  };
}
```

### 2. Batch Operations

```typescript
// Generic batch operation pattern
export interface BatchOperation<T, R> {
  items: T[];
  operation: (item: T) => Promise<R>;
  batchSize?: number;
  concurrency?: number;
}

export interface BatchResult<T, R> {
  totalItems: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    item: T;
    success: boolean;
    result?: R;
    error?: string;
  }>;
  executionTime: number;
}

export async function executeBatch<T, R>(
  operation: BatchOperation<T, R>
): Promise<BatchResult<T, R>> {
  const startTime = Date.now();
  const results: BatchResult<T, R>['results'] = [];
  const batchSize = operation.batchSize || 10;
  const concurrency = operation.concurrency || 3;

  // Process items in batches
  for (let i = 0; i < operation.items.length; i += batchSize) {
    const batch = operation.items.slice(i, i + batchSize);
    
    // Process batch items with concurrency limit
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await operation.operation(item);
        return { item, success: true, result };
      } catch (error) {
        return { 
          item, 
          success: false, 
          error: error.message 
        };
      }
    });

    // Wait for batch completion
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return {
    totalItems: operation.items.length,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    results,
    executionTime: Date.now() - startTime
  };
}

// Usage in operations
export async function batchCreateResources(
  apiClient: YourApiClient,
  resources: ResourceCreateData[]
): Promise<BatchResult<ResourceCreateData, Resource>> {
  
  return executeBatch({
    items: resources,
    operation: async (resourceData) => {
      return await apiClient.createResource(resourceData);
    },
    batchSize: 5,
    concurrency: 2
  });
}
```

### 3. Caching Layer

```typescript
// Simple memory cache for API responses
export class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Enhanced API client with caching
export class CachedApiClient extends YourApiClient {
  private cache = new ResponseCache();

  async getResource(resourceId: string): Promise<any> {
    const cacheKey = `resource:${resourceId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = await super.getResource(resourceId);
    this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
    
    return result;
  }

  async listResources(filters: any, limit: number): Promise<any> {
    // Create cache key from filters and limit
    const cacheKey = `resources:${JSON.stringify({ filters, limit })}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = await super.listResources(filters, limit);
    this.cache.set(cacheKey, result, 60); // Cache for 1 minute
    
    return result;
  }
}
```

### 4. Health Monitoring

```typescript
// Health check and monitoring utilities
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    apiConnection: boolean;
    responseTime: number;
    lastError?: string;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}

export class HealthMonitor {
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0, 
    failedRequests: 0,
    responseTimes: [] as number[]
  };

  recordRequest(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
  }

  async checkHealth(apiClient: YourApiClient): Promise<HealthStatus> {
    let apiConnection = false;
    let responseTime = 0;
    let lastError: string | undefined;

    try {
      const startTime = Date.now();
      await apiClient.healthCheck();
      responseTime = Date.now() - startTime;
      apiConnection = true;
    } catch (error) {
      lastError = error.message;
      responseTime = -1;
    }

    const averageResponseTime = this.metrics.responseTimes.length > 0
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? this.metrics.successfulRequests / this.metrics.totalRequests
      : 1;

    let status: HealthStatus['status'] = 'healthy';
    
    if (!apiConnection || successRate < 0.5) {
      status = 'unhealthy';
    } else if (successRate < 0.9 || averageResponseTime > 5000) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        apiConnection,
        responseTime,
        lastError
      },
      metrics: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        failedRequests: this.metrics.failedRequests,
        averageResponseTime
      }
    };
  }
}

// Integration with API client
export class MonitoredApiClient extends YourApiClient {
  private healthMonitor = new HealthMonitor();

  protected async makeRequest<T>(...args: any[]): Promise<T> {
    const startTime = Date.now();
    let success = false;
    
    try {
      const result = await super.makeRequest(...args);
      success = true;
      return result;
    } catch (error) {
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      this.healthMonitor.recordRequest(success, responseTime);
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return this.healthMonitor.checkHealth(this);
  }
}
```

---

## Performance Considerations

### 1. Connection Pooling

```typescript
// HTTP client with connection pooling
import { Agent } from 'http';
import { Agent as HttpsAgent } from 'https';

export class OptimizedApiClient extends YourApiClient {
  private httpAgent: Agent;
  private httpsAgent: HttpsAgent;

  constructor(config: ServerConfig) {
    super(config);
    
    // Configure connection pooling
    this.httpAgent = new Agent({
      keepAlive: true,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketTimeout: 30000
    });
    
    this.httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 50, 
      maxFreeSockets: 10,
      timeout: 60000,
      freeSocketTimeout: 30000
    });
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = new URL(endpoint, this.config.apiUrl);
    const agent = url.protocol === 'https:' ? this.httpsAgent : this.httpAgent;
    
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined,
      // @ts-ignore - agent not in fetch types but supported in Node.js
      agent
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  cleanup(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}
```

### 2. Request Deduplication

```typescript
// Prevent duplicate concurrent requests
export class DeduplicatedApiClient extends YourApiClient {
  private pendingRequests = new Map<string, Promise<any>>();

  protected async makeRequest<T>(
    endpoint: string,
    method: string = 'GET', 
    body?: any
  ): Promise<T> {
    // Only deduplicate GET requests
    if (method !== 'GET') {
      return super.makeRequest(endpoint, method, body);
    }

    const requestKey = `${method}:${endpoint}`;
    
    // Return existing promise if request is in flight
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)!;
    }

    // Create new request promise
    const requestPromise = super.makeRequest<T>(endpoint, method, body);
    
    this.pendingRequests.set(requestKey, requestPromise);

    // Clean up completed request
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }
}
```

### 3. Response Streaming

```typescript
// Handle large responses with streaming
export class StreamingApiClient extends YourApiClient {
  async *streamResources(
    filters: any = {},
    batchSize = 100
  ): AsyncGenerator<Resource[], void, unknown> {
    let offset: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.listResources(filters, batchSize, offset);
      
      if (result.data.length === 0) {
        break;
      }

      yield result.data;
      
      offset = result.nextOffset;
      hasMore = result.data.length === batchSize && Boolean(offset);
    }
  }

  // Usage in operations
  async function* getAllResourcesStream(
    apiClient: StreamingApiClient,
    filters: any = {}
  ): AsyncGenerator<Resource[], void, unknown> {
    for await (const batch of apiClient.streamResources(filters)) {
      yield batch;
    }
  }
}
```

### 4. Memory Management

```typescript
// Efficient memory usage patterns
export class MemoryEfficientOperations {
  // Process large datasets in chunks
  static async processLargeDataset<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize = 100
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Allow garbage collection between batches
      if (i % (batchSize * 10) === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return results;
  }

  // Streaming JSON parser for large responses
  static async parseJsonStream(response: Response): Promise<any[]> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    const results: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.trim()) {
            try {
              results.push(JSON.parse(line));
            } catch (error) {
              console.warn('Failed to parse JSON line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return results;
  }
}
```

---

This implementation guide provides a comprehensive foundation for building production-ready MCP servers using the API wrapper and prompt-driven architecture patterns. The modular design ensures maintainability, the centralized API client provides reliability, and the prompt-driven approach creates clear documentation and contracts for all tools.

## Kong Konnect Implementation Mapping

The Kong Konnect MCP Server implements this architecture with the following concrete file mapping:

### Layer Mapping

| Architecture Layer | Pattern Role | Kong Konnect File(s) |
|---|---|---|
| Server Registration | Entry point, tool routing | `src/index.ts` (`KongKonnectMcpServer` class) |
| Tool Definitions | Method names, descriptions, categories | `src/tools/{category}/tools.ts` |
| Parameter Schemas | Zod validation for inputs | `src/tools/{category}/parameters.ts` |
| Prompt Documentation | AI-facing tool descriptions | `src/tools/{category}/prompts.ts` |
| Operations Layer | Business logic | `src/tools/{category}/operations.ts` |
| API Wrapper | Authenticated HTTP client | `src/api/kong-api.ts` (primary), `src/api/portal-api.ts` |
| Tool Registry | Aggregation and validation | `src/tools/registry.ts` |

### The 4-File-Per-Category Pattern

Each of the 7 tool categories follows the modular pattern described in this guide:

```
src/tools/
  analytics/          (2 tools)   -- tools.ts, parameters.ts, prompts.ts, operations.ts
  certificates/       (5 tools)   -- tools.ts, parameters.ts, prompts.ts, operations.ts
  configuration/      (21 tools)  -- tools.ts, parameters.ts, prompts.ts, operations.ts
  control-planes/     (14 tools)  -- tools.ts, parameters.ts, prompts.ts, operations.ts
  portal/             (24 tools)  -- tools.ts, parameters.ts, prompts.ts, operations.ts
  portal-management/  (8 tools)   -- tools.ts, parameters.ts, prompts.ts, operations.ts
  elicitation-tool.ts (4 tools)   -- standalone (combined tool + operations)
```

**Total: 78 tools** across 7 categories.

### Cross-Cutting Concerns (Universal Tool Wrapping)

The `registerTools()` method in `src/index.ts` wraps every tool handler with:

- **Session context**: `runWithSession()` from `src/utils/session-manager.ts`
- **Tracing**: `UniversalTracingManager` from `src/utils/tracing.ts`
- **Performance metrics**: `ToolPerformanceCollector` from `src/utils/tool-tracer.ts`
- **Error formatting**: `formatError()` from `src/utils/error-handling.ts`
- **Enforcement gates**: Mandatory tagging validation from `src/enforcement/`

This ensures all 78 tools get consistent observability, error handling, and governance without any per-tool boilerplate.

### Further Reading

- [System Overview](../architecture/SYSTEM_OVERVIEW.md) -- full architecture and data flow
- [Tool Module Pattern](../architecture/TOOL_MODULE_PATTERN.md) -- detailed guide to the 4-file pattern
- [Elicitation System](../architecture/ELICITATION_SYSTEM.md) -- context gathering and enforcement