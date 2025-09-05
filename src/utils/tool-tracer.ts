/**
 * MCP tool tracer wrapper for comprehensive tool execution tracing
 */

import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { UniversalTracingManager } from "./tracing.js";
import { getToolByMethod } from "../tools/registry.js";

interface ToolExecutionContext {
  toolName: string;
  category: string;
  parameters: any;
  region?: string;
  timestamp: string;
}

/**
 * Create a traced tool handler that wraps the original handler with LangSmith tracing
 */
export function createTracedToolHandler(
  originalHandler: (args: any, extra: RequestHandlerExtra) => Promise<any>,
  toolName: string,
  tracingManager: UniversalTracingManager
) {
  return async (args: any, extra: RequestHandlerExtra) => {
    // Get tool information for context
    const toolInfo = getToolByMethod(toolName);
    const category = toolInfo?.category || 'unknown';

    // Extract contextual metadata from arguments
    const metadata = extractToolMetadata(toolName, args);

    // Create execution context
    const context: ToolExecutionContext = {
      toolName,
      category,
      parameters: sanitizeParameters(args),
      region: process.env.KONNECT_REGION || 'us',
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Execute with tracing
    const { result, traceContext } = await tracingManager.traceToolExecution(
      toolName,
      () => originalHandler(args, extra),
      context
    );

    // Enhance result with trace context if available
    if (traceContext && await tracingManager.isEnabled()) {
      return {
        ...result,
        _trace: {
          runId: traceContext.runId,
          traceUrl: traceContext.traceUrl,
          sessionId: traceContext.sessionId
        }
      };
    }

    return result;
  };
}

/**
 * Extract relevant metadata from tool arguments for better tracing context
 */
function extractToolMetadata(toolName: string, args: any): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Common fields across tools
  if (args.controlPlaneId) {
    metadata.controlPlaneId = args.controlPlaneId;
  }

  // Tool-specific metadata extraction
  switch (toolName) {
    case 'query_api_requests':
      metadata.timeRange = args.timeRange;
      metadata.maxResults = args.maxResults;
      metadata.filterCount = [
        args.statusCodes,
        args.excludeStatusCodes,
        args.httpMethods,
        args.consumerIds,
        args.serviceIds,
        args.routeIds
      ].filter(f => f && f.length > 0).length;
      break;

    case 'get_consumer_requests':
      metadata.timeRange = args.timeRange;
      metadata.consumerId = args.consumerId;
      metadata.successOnly = args.successOnly;
      metadata.failureOnly = args.failureOnly;
      break;

    case 'list_control_planes':
      metadata.pageSize = args.pageSize;
      metadata.hasFilters = !!(args.filterName || args.filterClusterType || args.filterCloudGateway);
      break;

    case 'list_certificates':
      metadata.size = args.size;
      metadata.hasOffset = !!args.offset;
      break;

    case 'create_certificate':
      metadata.hasAlternativeCert = !!(args.certAlt || args.keyAlt);
      metadata.tagCount = args.tags?.length || 0;
      break;

    case 'update_certificate':
      metadata.certificateId = args.certificateId;
      metadata.updateFields = [
        args.cert && 'cert',
        args.key && 'key',
        args.certAlt && 'certAlt',
        args.keyAlt && 'keyAlt',
        args.tags && 'tags'
      ].filter(Boolean);
      break;

    case 'delete_certificate':
      metadata.certificateId = args.certificateId;
      break;

    default:
      // Generic metadata for unknown tools
      metadata.argumentCount = Object.keys(args).length;
      break;
  }

  return metadata;
}

/**
 * Sanitize tool parameters for tracing (remove sensitive data)
 */
function sanitizeParameters(args: any): any {
  if (!args || typeof args !== 'object') {
    return args;
  }

  const sanitized = { ...args };
  
  // List of sensitive parameter names to redact
  const sensitiveParams = [
    'cert', 'certificate',
    'key', 'privateKey', 'private_key',
    'certAlt', 'keyAlt',
    'secret', 'token', 'password',
    'apiKey', 'api_key'
  ];

  for (const param of sensitiveParams) {
    if (param in sanitized) {
      sanitized[param] = '*** REDACTED FOR SECURITY ***';
    }
  }

  return sanitized;
}

/**
 * Create a batch tracer for multiple related tool executions
 */
export class BatchToolTracer {
  private tracingManager: UniversalTracingManager;
  private sessionName: string;
  private session: any = null;

  constructor(tracingManager: UniversalTracingManager, sessionName: string) {
    this.tracingManager = tracingManager;
    this.sessionName = sessionName;
  }

  async startSession(metadata: Record<string, any> = {}) {
    this.session = await this.tracingManager.createTracedSession(this.sessionName, metadata);
    return this.session;
  }

  async traceToolBatch<T>(
    toolName: string,
    operations: Array<() => Promise<T>>,
    batchMetadata: Record<string, any> = {}
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const metadata = {
        category: 'batch',
        ...batchMetadata,
        batchIndex: i,
        batchSize: operations.length,
        sessionName: this.sessionName
      };

      const { result } = await this.tracingManager.traceToolExecution(
        `${toolName}_batch_${i}`,
        operation,
        metadata
      );

      results.push(result);
    }

    return results;
  }
}

/**
 * Tool performance metrics collector
 */
export class ToolPerformanceCollector {
  private metrics = new Map<string, {
    callCount: number;
    totalDuration: number;
    errorCount: number;
    lastCalled: string;
  }>();

  recordToolExecution(toolName: string, duration: number, success: boolean) {
    const existing = this.metrics.get(toolName) || {
      callCount: 0,
      totalDuration: 0,
      errorCount: 0,
      lastCalled: ''
    };

    existing.callCount++;
    existing.totalDuration += duration;
    existing.lastCalled = new Date().toISOString();
    
    if (!success) {
      existing.errorCount++;
    }

    this.metrics.set(toolName, existing);
  }

  getToolStats(toolName: string) {
    const stats = this.metrics.get(toolName);
    if (!stats) return null;

    return {
      ...stats,
      averageDuration: stats.totalDuration / stats.callCount,
      successRate: (stats.callCount - stats.errorCount) / stats.callCount,
      errorRate: stats.errorCount / stats.callCount
    };
  }

  getAllStats() {
    const result: Record<string, any> = {};
    
    for (const [toolName, stats] of this.metrics) {
      result[toolName] = {
        ...stats,
        averageDuration: stats.totalDuration / stats.callCount,
        successRate: (stats.callCount - stats.errorCount) / stats.callCount,
        errorRate: stats.errorCount / stats.callCount
      };
    }

    return result;
  }

  reset() {
    this.metrics.clear();
  }
}