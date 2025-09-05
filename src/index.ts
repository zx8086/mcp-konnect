import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

// Import the new modular architecture
import { getAllTools, validateToolRegistry } from "./tools/registry.js";
import { KongApi, API_REGIONS } from "./api/kong-api.js";
import { formatError } from "./utils/error-handling.js";
import { UniversalTracingManager } from "./utils/tracing.js";
import { ToolPerformanceCollector } from "./utils/tool-tracer.js";
import { 
  createSessionContext, 
  generateSessionId, 
  detectClient, 
  runWithSession, 
  logSessionInfo,
  getCurrentSession 
} from "./utils/session-manager.js";
import { getEnvVar, getEnvVarWithDefault, initializeEnvironment, getRuntimeInfo } from "./utils/env.js";
import { loadConfiguration } from "./config/index.js";

// Import operations
import * as analyticsOps from "./tools/analytics/operations.js";
import * as controlPlanesOps from "./tools/control-planes/operations.js";
import * as certificatesOps from "./tools/certificates/operations.js";

/**
 * Enhanced MCP server class for Kong Konnect integration with modular architecture
 */
class KongKonnectMcpServer extends McpServer {
  private api: KongApi;
  public tracingManager: UniversalTracingManager;
  private performanceCollector: ToolPerformanceCollector;

  constructor(options: { apiKey?: string; apiRegion?: string } = {}) {
    super({
      name: "kong-konnect-mcp",
      version: "2.0.0",
      description: "Comprehensive Kong Konnect API Gateway management with analytics, configuration, certificates, and more"
    });

    // Initialize the API client with universal environment access
    this.api = new KongApi({
      apiKey: options.apiKey || getEnvVar('KONNECT_ACCESS_TOKEN'),
      apiRegion: options.apiRegion || getEnvVarWithDefault('KONNECT_REGION', API_REGIONS.US)
    });

    // Initialize tracing and performance monitoring
    this.tracingManager = new UniversalTracingManager();
    this.performanceCollector = new ToolPerformanceCollector();

    // Log session information for tracing
    this.logMCPSessionInfo();

    // Validate tool registry
    const validation = validateToolRegistry();
    if (!validation.isValid) {
      console.error("Tool registry validation failed:", validation.errors);
      throw new Error(`Invalid tool registry: ${validation.errors.join(", ")}`);
    }

    // Log tracing status to stderr (never stdout for MCP servers!)
    // Note: getStats() is async, so we'll log this after server startup
    this.tracingManager.getStats().then(stats => {
      console.error(`Tracing: ${stats.enabled ? 'ENABLED' : 'DISABLED'} | Project: ${stats.project} | Session: ${stats.sessionId}`);
    }).catch(() => {
      console.error(`Tracing: INITIALIZING...`);
    });

    // Register all tools
    this.registerTools();
  }

  private registerTools() {
    const allTools = getAllTools();
    console.error(`Registering ${allTools.length} tools across categories:`, 
      [...new Set(allTools.map(t => t.category))].join(", "));

    allTools.forEach(tool => {
      // Create the original handler logic
      const originalHandler = async (args: any, _extra: RequestHandlerExtra) => {
        const startTime = Date.now();
        let success = true;
        
        try {
          let result;

            // Route to appropriate handler based on method
            switch (tool.method) {
              // ===========================
              // Analytics Tools
              // ===========================
              case "query_api_requests":
                result = await analyticsOps.queryApiRequests(
                  this.api,
                  args.timeRange,
                  args.statusCodes,
                  args.excludeStatusCodes,
                  args.httpMethods,
                  args.consumerIds,
                  args.serviceIds,
                  args.routeIds,
                  args.maxResults
                );
                break;

              case "get_consumer_requests":
                result = await analyticsOps.getConsumerRequests(
                  this.api,
                  args.consumerId,
                  args.timeRange,
                  args.successOnly,
                  args.failureOnly,
                  args.maxResults
                );
                break;

              // ===========================
              // Control Planes Tools
              // ===========================
              case "list_control_planes":
                result = await controlPlanesOps.listControlPlanes(
                  this.api,
                  args.pageSize,
                  args.pageNumber,
                  args.filterName,
                  args.filterClusterType,
                  args.filterCloudGateway,
                  args.labels,
                  args.sort
                );
                break;

              case "get_control_plane":
                result = await controlPlanesOps.getControlPlane(
                  this.api,
                  args.controlPlaneId
                );
                break;

              case "list_control_plane_group_memberships":
                result = await controlPlanesOps.listControlPlaneGroupMemberships(
                  this.api,
                  args.groupId,
                  args.pageSize,
                  args.pageAfter
                );
                break;

              case "check_control_plane_group_membership":
                result = await controlPlanesOps.checkControlPlaneGroupMembership(
                  this.api,
                  args.controlPlaneId
                );
                break;

              // ===========================
              // Certificate Management Tools
              // ===========================
              case "list_certificates":
                result = await certificatesOps.listCertificates(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_certificate":
                result = await certificatesOps.getCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.certificateId
                );
                break;

              case "create_certificate":
                result = await certificatesOps.createCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.cert,
                  args.key,
                  args.certAlt,
                  args.keyAlt,
                  args.tags
                );
                break;

              case "update_certificate":
                result = await certificatesOps.updateCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.certificateId,
                  args.cert,
                  args.key,
                  args.certAlt,
                  args.keyAlt,
                  args.tags
                );
                break;

              case "delete_certificate":
                result = await certificatesOps.deleteCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.certificateId
                );
                break;

              // ===========================
              // TODO: Add remaining tool categories
              // ===========================
              // Configuration Tools (Enhanced CRUD for services, routes, consumers, plugins)
              // Upstream Management Tools
              // Data Plane Tools
              // Credentials Management Tools

              default:
                throw new Error(`Unknown tool method: ${tool.method}`);
            }

          // Record performance metrics
          const duration = Date.now() - startTime;
          this.performanceCollector.recordToolExecution(tool.method, duration, success);

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2)
              }
            ]
          };

        } catch (error: any) {
          success = false;
          const duration = Date.now() - startTime;
          this.performanceCollector.recordToolExecution(tool.method, duration, success);
          
          const formattedError = formatError(error);
          
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: ${formattedError}`
              }
            ],
            isError: true
          };
        }
      };

      // Create dynamic tool tracer for this specific tool
      const toolTracer = this.tracingManager.createToolTracer(tool.method);

      // Create traced handler using dynamic tool tracer
      const tracedHandler = async (args: any, extra: RequestHandlerExtra): Promise<any> => {
        const result = await toolTracer(
          async () => originalHandler(args, extra),
          { 
            category: tool.category || 'unknown',
            toolName: tool.method
          }
        );
        return result;
      };

      // Register the traced tool
      this.tool(
        tool.method,
        tool.description,
        tool.parameters.shape,
        tracedHandler
      );
    });
  }

  /**
   * Get performance statistics for all tools
   */
  getPerformanceStats() {
    return this.performanceCollector.getAllStats();
  }

  /**
   * Get tracing statistics
   */
  getTracingStats() {
    return this.tracingManager.getStats();
  }

  /**
   * Log session information for this MCP server instance
   */
  private logMCPSessionInfo() {
    this.tracingManager.logSessionInfo({
      serverVersion: '2.0.0',
      runtime: 'bun',
      apiRegion: this.api.region || 'us',
      toolCount: 11,
      capabilities: [
        'analytics',
        'control-planes', 
        'certificates',
        'configuration'
      ]
    });
  }
}

/**
 * Main entry point for the Kong Konnect MCP server with centralized configuration
 */
async function main() {
  try {
    // Load and validate configuration with health checks
    console.error('Loading configuration...');
    const config = await loadConfiguration();
    
    // Show runtime information
    const runtimeInfo = getRuntimeInfo();
    console.error(`Runtime: ${runtimeInfo.runtime} ${runtimeInfo.version} (env source: ${runtimeInfo.envSource})`);
    
    // Initialize server with validated configuration
    const server = new KongKonnectMcpServer({
      apiKey: config.kong.accessToken,
      apiRegion: config.kong.region
    });
    const transport = new StdioServerTransport();
    
    console.error("Kong Konnect MCP Server starting...");
    console.error("Available regions:", Object.values(API_REGIONS));
    console.error("Using region:", config.kong.region);
    console.error(`Environment: ${config.application.environment} | Log Level: ${config.application.logLevel}`);
    console.error(`Tracing: ${config.tracing.enabled ? 'ENABLED' : 'DISABLED'} | Monitoring: ${config.monitoring.enabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Create session context for connection (implementing AsyncLocalStorage pattern from guide)
    const connectionId = `conn-${Date.now()}`;
    const clientInfo = detectClient("stdio");
    const sessionId = generateSessionId(connectionId, clientInfo);
    const sessionContext = createSessionContext(connectionId, "stdio", sessionId, clientInfo);
    
    console.error("Session context created:", {
      sessionId,
      connectionId,
      clientName: clientInfo.name,
      transportMode: "stdio"
    });
    
    // Wrap server connection in session context (critical for session grouping)
    await runWithSession(sessionContext, async () => {
      // All tool calls within this scope inherit session context
      await server.connect(transport);
      console.error("Kong Konnect MCP Server running successfully");
      
      // Log session info for debugging
      logSessionInfo("MCP Server Session Established");
    });
    
  } catch (error: any) {
    console.error("ERROR: Failed to start Kong Konnect MCP Server:");
    console.error(`   Error: ${error.message}`);
    
    // Provide helpful error context
    if (error.message.includes('KONNECT_ACCESS_TOKEN')) {
      console.error('\nTo fix this:');
      console.error('   1. Get your Kong Konnect access token from: https://cloud.konghq.com/');
      console.error('   2. Set it in your .env file: KONNECT_ACCESS_TOKEN=your-token-here');
      console.error('   3. Run: bun run config:health to validate your configuration');
    }
    
    if (error.message.includes('LANGSMITH_API_KEY')) {
      console.error('\nTo fix this:');
      console.error('   1. Set LANGSMITH_API_KEY in your .env file');
      console.error('   2. Or disable tracing: LANGSMITH_TRACING=false');
    }
    
    console.error('\nRun configuration health check: bun run config:health');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error("Kong Konnect MCP Server shutting down...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error("Kong Konnect MCP Server terminating...");
  process.exit(0);
});

// Check if this module is being run directly (ES module compatible)
const isMainModule = process.argv[1] && import.meta.url.includes(process.argv[1]);

if (isMainModule) {
  main().catch((error) => {
    console.error("Failed to start Kong Konnect MCP Server:", error);
    process.exit(1);
  });
}