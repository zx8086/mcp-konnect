/**
 * Universal LangSmith tracing manager with auto-detection and graceful degradation
 * Using the proven traceable pattern from the implementation guide
 */

import { loadTracingConfig, validateTracingConfig, initializeEnvironment, getRuntimeInfo, type TracingConfig } from '../config/tracing-config.js';

interface TraceMetadata {
  category: string;
  region?: string;
  controlPlaneId?: string;
  duration?: number;
  success?: boolean;
  errorType?: string;
  toolVersion?: string;
  [key: string]: any;
}

interface TraceContext {
  runId?: string;
  traceUrl?: string;
  sessionId?: string;
}

// Import traceable function for the proven pattern
let traceable: any = null;
let getCurrentRunTree: any = null;

export class UniversalTracingManager {
  private client: any = null;
  private config: TracingConfig;
  private enabled = false;
  private sessionId: string;
  private initialized = false;

  constructor() {
    this.config = {} as TracingConfig; // Initialize with empty config, will be loaded async
    this.sessionId = `mcp-session-${Date.now()}`;
    // Initialize asynchronously - graceful degradation if it fails
    this.initialize().catch(() => {
      this.enabled = false;
      console.warn('LangSmith initialization failed during construction - graceful degradation active');
    });
  }

  /**
   * Initialize environment and tracing with universal runtime support
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize environment loading (handles Bun vs Node.js differences)
      await initializeEnvironment();
      
      // Load configuration after environment is initialized
      this.config = loadTracingConfig();
      
      // Show runtime info for debugging
      const runtimeInfo = await getRuntimeInfo();
      console.error(`Runtime: ${runtimeInfo.runtime} ${runtimeInfo.version} (env source: ${runtimeInfo.envSource})`);
      
      // Initialize LangSmith
      await this.initializeLangSmith();
      
      this.initialized = true;
    } catch (error: any) {
      console.warn('Tracing initialization failed:', error.message);
      this.enabled = false;
      this.initialized = true;
    }
  }

  /**
   * Initialize LangSmith with auto-detection and graceful degradation
   */
  private async initializeLangSmith(): Promise<void> {
    try {
      // Validate configuration
      const validation = validateTracingConfig(this.config);
      if (!validation.isValid) {
        console.warn('LangSmith tracing configuration invalid:', validation.errors);
        return;
      }

      if (!this.config.enabled) {
        console.error('LangSmith tracing disabled (LANGSMITH_TRACING=false)');
        return;
      }

      // Try to import LangSmith SDK - both Client and traceable
      const langsmithImport = await import('langsmith');
      const { Client } = langsmithImport;
      
      // Try to import traceable from correct path (as per implementation guide)
      try {
        const traceableImport = await import('langsmith/traceable');
        
        if ('traceable' in traceableImport) {
          traceable = traceableImport.traceable;
        }
        
        if ('getCurrentRunTree' in traceableImport) {
          getCurrentRunTree = traceableImport.getCurrentRunTree;
        }
      } catch (traceableError: any) {
        console.warn('Failed to import traceable functions:', traceableError.message);
      }
      
      // Set up environment variables for LangSmith SDK
      process.env.LANGSMITH_TRACING = 'true';
      process.env.LANGCHAIN_TRACING_V2 = 'true';
      process.env.LANGSMITH_API_KEY = this.config.apiKey;
      if (this.config.project) {
        process.env.LANGSMITH_PROJECT = this.config.project;
      }
      
      this.client = new Client({
        apiKey: this.config.apiKey,
        apiUrl: this.config.endpoint,
        metadata: {
          project: this.config.project
        }
      });

      this.enabled = true;
      console.error(`LangSmith tracing enabled for project: ${this.config.project}`);
      console.error(`Dashboard: ${this.config.endpoint?.replace('api.', '')}/p/${this.config.project}`);
      
    } catch (error: any) {
      console.warn('WARNING: LangSmith initialization failed - graceful degradation active');
      console.warn('Error:', error.message);
      this.enabled = false;
    }
  }

  /**
   * Wait for initialization to complete
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    // Wait up to 5 seconds for initialization
    const timeout = 5000;
    const startTime = Date.now();
    
    while (!this.initialized && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Check if tracing is enabled and available
   */
  async isEnabled(): Promise<boolean> {
    await this.ensureInitialized();
    return this.enabled && this.client !== null;
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<TracingConfig> {
    await this.ensureInitialized();
    return { ...this.config };
  }

  /**
   * Trace a tool execution using the proven traceable pattern
   */
  async traceToolExecution<T>(
    toolName: string,
    operation: () => Promise<T>,
    metadata: TraceMetadata = { category: 'unknown' }
  ): Promise<{ result: T; traceContext?: TraceContext }> {
    // Ensure initialization is complete
    await this.ensureInitialized();

    // If tracing is disabled, execute directly (graceful degradation)
    if (!this.enabled || !traceable) {
      const result = await operation();
      return { result };
    }

    try {
      // Apply sampling rate
      if (Math.random() > this.config.samplingRate) {
        const result = await operation();
        return { result };
      }

      // Create traceable function with dynamic tool name (proven pattern from guide)
      const toolTracer = traceable(
        async () => {
          const startTime = Date.now();
          const currentRun = getCurrentRunTree ? getCurrentRunTree() : null;

          try {
            const result = await operation();

            const executionTime = Date.now() - startTime;

            // Return result with trace metadata (as per guide pattern)
            return {
              ...result,
              _trace: {
                runId: currentRun?.id,
                executionTime,
                sessionId: this.sessionId,
                toolName
              },
            };
          } catch (error: any) {
            const executionTime = Date.now() - startTime;
            
            // Log error with context (as per guide)
            console.error(`Tool execution failed: ${toolName}`, {
              executionTime,
              error: error instanceof Error ? error.message : String(error),
            });
            
            throw error; // Re-throw to maintain error propagation
          }
        },
        {
          name: toolName, // Dynamic - uses the actual tool name (CRITICAL)
          run_type: "tool",
          project_name: this.config.project, // Ensure correct project
        }
      );

      const result = await toolTracer();
      
      return { 
        result, 
        traceContext: { 
          sessionId: this.sessionId,
          runId: result._trace?.runId 
        } 
      };

    } catch (tracingError: any) {
      // If tracing fails, still execute the operation
      console.warn('LangSmith tracing error:', tracingError.message);
      const result = await operation();
      return { result };
    }
  }

  /**
   * Create a traced session for related operations
   */
  async createTracedSession(sessionName: string, metadata: Record<string, any> = {}) {
    await this.ensureInitialized();
    
    if (!this.enabled) {
      return null;
    }

    try {
      const session = await this.client.createSession({
        name: sessionName,
        description: 'Kong Konnect MCP Tool Session',
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          version: '2.0.0'
        }
      });

      return session;
    } catch (error: any) {
      console.warn('Failed to create traced session:', error.message);
      return null;
    }
  }

  /**
   * Sanitize output data for tracing (remove sensitive information)
   */
  private sanitizeOutput(output: any): any {
    if (!output || typeof output !== 'object') {
      return output;
    }

    const sanitized = JSON.parse(JSON.stringify(output));
    
    // Remove or redact sensitive fields
    const sensitiveFields = ['key', 'cert', 'certificate', 'private_key', 'secret', 'token', 'password'];
    
    function redactSensitive(obj: any): any {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(redactSensitive);
      }

      const result = { ...obj };
      for (const [key, value] of Object.entries(result)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '*** REDACTED FOR SECURITY ***';
        } else if (typeof value === 'object') {
          result[key] = redactSensitive(value);
        }
      }
      
      return result;
    }

    return redactSensitive(sanitized);
  }

  /**
   * Create a dynamically named traceable function for a specific tool
   * This enables proper tool-specific naming in LangSmith traces
   */
  createToolTracer<T extends any[], R>(toolName: string): (operation: (...args: T) => Promise<R>, metadata?: TraceMetadata) => Promise<R> {
    return async (operation: (...args: T) => Promise<R>, metadata: TraceMetadata = { category: 'tool' }): Promise<R> => {
      const { result } = await this.traceToolExecution(toolName, operation, metadata);
      return result;
    };
  }

  /**
   * Get tracing statistics
   */
  async getStats(): Promise<{
    enabled: boolean;
    initialized: boolean;
    project: string;
    sessionId: string;
    samplingRate: number;
    runtime: string;
  }> {
    await this.ensureInitialized();
    const runtimeInfo = await getRuntimeInfo();
    
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      project: this.config.project || 'unknown',
      sessionId: this.sessionId,
      samplingRate: this.config.samplingRate,
      runtime: `${runtimeInfo.runtime} ${runtimeInfo.version}`
    };
  }
}