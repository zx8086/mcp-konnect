# MCP Filtering System Implementation Guide

This document provides a comprehensive, reusable filtering system architecture for MCP (Model Context Protocol) servers. The patterns and code examples are designed to be adapted to any MCP implementation.

## Overview

This guide presents a **multi-layer filtering system** that provides sophisticated query capabilities for analytics and data retrieval operations. The system is designed to be **composable**, **type-safe**, and **reusable** across different MCP implementations.

## Architecture Layers

### 1. Type Definition Layer

Define the core filter interface that serves as the foundation for all filtering operations:

```typescript
// Core filter interface - adapt field names to your domain
export interface Filter {
  field: string;     // The field to filter on
  operator: string;  // The operator (in, not_in, eq, etc.)
  value: any;        // The value(s) to filter by
}
```

**Additional supporting types:**

```typescript
// Generic query interface - adapt to your use case
export interface FilteredQuery {
  filters: Filter[];
  timeRange?: string;
  limit?: number;
  offset?: number;
}

// Generic response interface - customize for your data
export interface FilteredResponse<T> {
  metadata: {
    total: number;
    filtered: number;
    appliedFilters: Filter[];
    timeRange?: {
      start: string;
      end: string;
    };
  };
  results: T[];
}
```

### 2. Operation Layer

This layer contains the business logic for building and applying filters:

```typescript
// Example operation function - adapt parameters to your domain
export async function queryEntities(
  apiClient: YourApiClient,
  timeRange: string,
  statusCodes?: number[],
  excludeStatusCodes?: number[],
  methods?: string[],
  entityIds?: string[],
  categories?: string[],
  tags?: string[],
  maxResults = 100
) {
  try {
    // Build filters array dynamically
    const filters: Filter[] = [];

    // Status code filtering
    if (statusCodes && statusCodes.length > 0) {
      filters.push({
        field: "status_code",
        operator: "in",
        value: statusCodes
      });
    }

    // Exclusion filtering
    if (excludeStatusCodes && excludeStatusCodes.length > 0) {
      filters.push({
        field: "status_code",
        operator: "not_in",
        value: excludeStatusCodes
      });
    }

    // Method filtering (adapt field name to your domain)
    if (methods && methods.length > 0) {
      filters.push({
        field: "method", // or "http_method", "action", etc.
        operator: "in",
        value: methods
      });
    }

    // Entity ID filtering
    if (entityIds && entityIds.length > 0) {
      filters.push({
        field: "entity_id", // or "user_id", "resource_id", etc.
        operator: "in",
        value: entityIds
      });
    }

    // Category filtering
    if (categories && categories.length > 0) {
      filters.push({
        field: "category", // or "type", "service_type", etc.
        operator: "in",
        value: categories
      });
    }

    // Tag filtering
    if (tags && tags.length > 0) {
      filters.push({
        field: "tags",
        operator: "in",
        value: tags
      });
    }

    const result = await apiClient.queryWithFilters(timeRange, filters, maxResults);

    // Return formatted response with metadata
    return {
      metadata: {
        totalRequests: result.meta.size,
        timeRange: {
          start: result.meta.time_range.start,
          end: result.meta.time_range.end,
        },
        filters: filters
      },
      requests: result.results.map(req => ({
        // ... formatted request data
      }))
    };
  } catch (error) {
    throw error;
  }
}
```

### 3. API Client Layer

This layer handles the actual HTTP requests with filter payloads:

```typescript
class YourApiClient {
  async queryWithFilters(
    timeRange: string, 
    filters: Filter[] = [], 
    maxResults = 100
  ): Promise<FilteredResponse<YourEntityType>> {
    
    const requestBody = {
      timeRange: {
        type: "relative",
        range: timeRange  // "15M", "1H", "24H" - adapt to your API
      },
      filters: filters,  // Array of filter objects
      limit: maxResults
    };

    return this.makeRequest<FilteredResponse<YourEntityType>>(
      "/search", // Adapt endpoint to your API
      "POST", 
      requestBody
    );
  }

  private async makeRequest<T>(endpoint: string, method: string, body?: any): Promise<T> {
    // Implement your HTTP client logic
    const response = await fetch(this.baseUrl + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
```

## Supported Filter Configuration

### Common Filter Fields (Adapt to Your Domain)

```yaml
example_filter_fields:
  # Identity & Tracking
  - field: "id"                 # Unique entity identifier
  - field: "trace_id"          # Distributed tracing ID
  - field: "session_id"        # Session identifier
  
  # Status & State  
  - field: "status"            # Entity status (active, inactive, pending)
  - field: "status_code"       # HTTP status codes (200, 404, 500)
  - field: "state"             # Processing state
  
  # Classification
  - field: "type"              # Entity type or category
  - field: "category"          # Business category
  - field: "tags"              # Associated tags
  - field: "labels"            # Key-value labels
  
  # User & Access
  - field: "user_id"           # User identifier
  - field: "account_id"        # Account identifier
  - field: "role"              # User role or permission level
  - field: "auth_type"         # Authentication method
  
  # Time & Location
  - field: "created_at"        # Creation timestamp
  - field: "updated_at"        # Last modified timestamp
  - field: "region"            # Geographic region
  - field: "zone"              # Availability zone
  
  # Technical Attributes
  - field: "method"            # HTTP method, operation type
  - field: "protocol"          # Communication protocol
  - field: "version"           # API or schema version
  - field: "environment"       # Environment (dev, staging, prod)
```

### Available Operators

```yaml
supported_operators:
  - operator: "in"       # Value exists in array
    example: ["GET", "POST"]
    
  - operator: "not_in"   # Value does not exist in array  
    example: [400, 500]
    
  - operator: "eq"       # Equals exact value
    example: "GET"
    
  - operator: "ne"       # Not equals value
    example: "POST"
    
  - operator: "gt"       # Greater than (numeric)
    example: 200
    
  - operator: "lt"       # Less than (numeric)
    example: 400
    
  - operator: "contains" # String contains substring
    example: "api/v1"
```

## Real-World Usage Examples

### Example 1: Error Analysis

```typescript
// Find all error states in the last hour
const errorFilters = [
  {
    field: "status",
    operator: "in",
    value: ["error", "failed", "timeout"]
  }
];

const result = await queryEntities(apiClient, "1H", undefined, undefined, undefined, undefined, undefined, undefined, 1000);
```

### Example 2: User-Specific Analysis

```typescript
// Analyze specific user's POST operations
const userFilters = [
  {
    field: "user_id",
    operator: "in",
    value: ["user-123"]
  },
  {
    field: "method",
    operator: "in",
    value: ["POST", "PUT"]
  }
];
```

### Example 3: Service Monitoring

```typescript
// Monitor specific service excluding health checks
const serviceFilters = [
  {
    field: "category",
    operator: "in",
    value: ["payment-service"]
  },
  {
    field: "type",
    operator: "not_in",
    value: ["health-check", "metrics"]
  }
];
```

### Example 4: Complex Multi-Criteria Filtering

```typescript
// Production analysis: successful operations from authenticated users
const productionFilters = [
  {
    field: "status",
    operator: "in",
    value: ["success", "completed"]
  },
  {
    field: "auth_type",
    operator: "ne",
    value: "anonymous"
  },
  {
    field: "environment",
    operator: "eq",
    value: "production"
  }
];
```

## Implementation Guide for Other MCP Servers

### Step 1: Define Filter Interface

```typescript
// Define your domain-specific filter interface
interface DomainFilter {
  field: string;
  operator: 'eq' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt';
  value: any;
}

// Define request/response interfaces for your use case
interface DomainQuery {
  filters: DomainFilter[];
  timeRange?: string;
  limit?: number;
  offset?: number;
}

interface DomainResponse<T> {
  metadata: {
    total: number;
    filtered: number;
    appliedFilters: DomainFilter[];
    executionTime?: number;
  };
  results: T[];
}
```

### Step 2: Create Filter Builder

```typescript
// Generic filter builder utility
class FilterBuilder<T extends { field: string; operator: string; value: any }> {
  private filters: T[] = [];

  addFilter(field: string, operator: string, value: any): FilterBuilder<T> {
    this.filters.push({ field, operator, value } as T);
    return this;
  }

  addEqualsFilter(field: string, value: any): FilterBuilder<T> {
    return this.addFilter(field, 'eq', value);
  }

  addInFilter(field: string, values: any[]): FilterBuilder<T> {
    return this.addFilter(field, 'in', values);
  }

  addNotInFilter(field: string, values: any[]): FilterBuilder<T> {
    return this.addFilter(field, 'not_in', values);
  }

  addContainsFilter(field: string, substring: string): FilterBuilder<T> {
    return this.addFilter(field, 'contains', substring);
  }

  addRangeFilter(field: string, min?: any, max?: any): FilterBuilder<T> {
    if (min !== undefined) {
      this.addFilter(field, 'gt', min);
    }
    if (max !== undefined) {
      this.addFilter(field, 'lt', max);
    }
    return this;
  }

  build(): T[] {
    return [...this.filters];
  }

  clear(): FilterBuilder<T> {
    this.filters = [];
    return this;
  }
}

// Type-safe usage
type MyDomainFilter = DomainFilter;
const builder = new FilterBuilder<MyDomainFilter>();
```

### Step 3: Implement Operation Layer

```typescript
// Operation with filter support
export async function searchEntities(
  api: MyApiClient,
  entityType: string,
  tags?: string[],
  statuses?: string[],
  createdAfter?: string,
  limit = 100
): Promise<FilteredResponse<Entity>> {
  
  // Build filters dynamically
  const filterBuilder = new FilterBuilder();

  if (tags && tags.length > 0) {
    filterBuilder.addInFilter('tags', tags);
  }

  if (statuses && statuses.length > 0) {
    filterBuilder.addInFilter('status', statuses);
  }

  if (createdAfter) {
    filterBuilder.addFilter('created_at', 'gt', createdAfter);
  }

  const filters = filterBuilder.build();
  
  const result = await api.queryWithFilters(entityType, filters, limit);

  return {
    metadata: {
      total: result.total,
      filtered: result.results.length,
      appliedFilters: filters
    },
    results: result.results
  };
}
```

### Step 4: Implement API Client Layer

```typescript
// API client with filter support
class MyApiClient {
  async queryWithFilters<T>(
    endpoint: string, 
    filters: MyFilter[], 
    limit = 100
  ): Promise<FilteredResponse<T>> {
    
    const requestBody = {
      filters: filters,
      limit: limit,
      // Add other query parameters as needed
    };

    return this.makeRequest<FilteredResponse<T>>(
      `/search/${endpoint}`, 
      "POST", 
      requestBody
    );
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: string, 
    body?: any
  ): Promise<T> {
    // Implement your HTTP request logic
    const response = await fetch(this.baseUrl + endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }
}
```

### Step 5: MCP Tool Integration

```typescript
// MCP tool handler with filters
export async function handleSearchTool(args: any): Promise<any> {
  try {
    const {
      entityType,
      tags,
      statuses,
      createdAfter,
      limit = 100
    } = args;

    const result = await searchEntities(
      api,
      entityType,
      tags,
      statuses,
      createdAfter,
      limit
    );

    return {
      success: true,
      data: result,
      message: `Found ${result.results.length} entities matching criteria`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      troubleshooting: [
        "Check that entity type is supported",
        "Verify filter values are in correct format",
        "Ensure API credentials have search permissions"
      ]
    };
  }
}
```

## Advanced Filtering Patterns

### 1. Conditional Filter Application

```typescript
// Apply filters only when conditions are met
function buildConditionalFilters(params: QueryParams): MyFilter[] {
  const filters: MyFilter[] = [];

  // Always apply active status filter
  filters.push({
    field: 'status',
    operator: 'eq',
    value: 'active'
  });

  // Apply tag filter only if tags provided
  if (params.tags?.length) {
    filters.push({
      field: 'tags',
      operator: 'in',
      value: params.tags
    });
  }

  // Apply date filter only for recent queries
  if (params.includeRecent) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    filters.push({
      field: 'created_at',
      operator: 'gt',
      value: oneWeekAgo
    });
  }

  return filters;
}
```

### 2. Filter Validation

```typescript
// Validate filters before applying
function validateFilters(filters: MyFilter[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const supportedFields = ['status', 'tags', 'created_at', 'name'];
  const supportedOperators = ['eq', 'in', 'not_in', 'contains', 'gt', 'lt'];

  for (const filter of filters) {
    if (!supportedFields.includes(filter.field)) {
      errors.push(`Unsupported field: ${filter.field}`);
    }

    if (!supportedOperators.includes(filter.operator)) {
      errors.push(`Unsupported operator: ${filter.operator}`);
    }

    if (filter.value === undefined || filter.value === null) {
      errors.push(`Filter value cannot be null or undefined for field: ${filter.field}`);
    }

    // Validate array operators
    if (['in', 'not_in'].includes(filter.operator) && !Array.isArray(filter.value)) {
      errors.push(`Operator ${filter.operator} requires array value for field: ${filter.field}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 3. Filter Composition Helpers

```typescript
// Compose filters with logical operations
class FilterComposer {
  static and(...filterGroups: MyFilter[][]): MyFilter[] {
    return filterGroups.flat();
  }

  static or(field: string, values: any[]): MyFilter {
    return {
      field,
      operator: 'in',
      value: values
    };
  }

  static not(field: string, values: any[]): MyFilter {
    return {
      field,
      operator: 'not_in', 
      value: values
    };
  }

  static range(field: string, min?: any, max?: any): MyFilter[] {
    const filters: MyFilter[] = [];

    if (min !== undefined) {
      filters.push({ field, operator: 'gt', value: min });
    }

    if (max !== undefined) {
      filters.push({ field, operator: 'lt', value: max });
    }

    return filters;
  }
}

// Usage example
const filters = FilterComposer.and(
  [FilterComposer.or('status', ['active', 'pending'])],
  FilterComposer.not('tags', ['internal', 'deprecated']),
  FilterComposer.range('created_at', '2023-01-01', '2023-12-31')
);
```

## Key Benefits

✅ **Composable**: Build complex filters by combining multiple criteria
✅ **Type-Safe**: Full TypeScript support with comprehensive interfaces
✅ **Extensible**: Easy to add new fields and operators
✅ **Consistent**: Same pattern across all filtering operations
✅ **Reusable**: Filter logic separated from API calls and MCP tools
✅ **Flexible**: Support for multiple operators and data types
✅ **Maintainable**: Clear separation of concerns across architecture layers
✅ **Production-Ready**: Includes validation, error handling, and performance considerations

## Performance Considerations

### 1. Filter Optimization

- **Index Usage**: Ensure filtered fields are indexed in your data store
- **Filter Order**: Place most selective filters first
- **Limit Results**: Always apply reasonable limits to prevent large result sets

### 2. Caching Strategies

```typescript
// Cache frequently used filter combinations
const filterCache = new Map<string, MyFilter[]>();

function getCachedFilters(key: string, builder: () => MyFilter[]): MyFilter[] {
  if (!filterCache.has(key)) {
    filterCache.set(key, builder());
  }
  return filterCache.get(key)!;
}
```

### 3. Pagination Support

```typescript
interface PaginatedQuery extends FilteredQuery {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

interface PaginatedResponse<T> extends FilteredResponse<T> {
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
  };
}
```

This filtering system provides a robust foundation for sophisticated query capabilities in any MCP implementation while maintaining clean architecture and excellent developer experience.