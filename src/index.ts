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
import * as configurationOps from "./tools/configuration/operations.js";
import * as portalOps from "./tools/portal/operations.js";
import * as portalManagementOps from "./tools/portal-management/operations.js";

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

              // Control Plane CRUD Operations
              case "create_control_plane":
                result = await controlPlanesOps.createControlPlane(
                  this.api,
                  {
                    name: args.name,
                    description: args.description,
                    clusterType: args.clusterType,
                    cloudGateway: args.cloudGateway,
                    authType: args.authType,
                    proxyUrls: args.proxyUrls,
                    labels: args.labels
                  }
                );
                break;

              case "update_control_plane":
                result = await controlPlanesOps.updateControlPlane(
                  this.api,
                  args.controlPlaneId,
                  {
                    name: args.name,
                    description: args.description,
                    labels: args.labels
                  }
                );
                break;

              case "delete_control_plane":
                result = await controlPlanesOps.deleteControlPlane(
                  this.api,
                  args.controlPlaneId
                );
                break;

              // Data Plane Node Management
              case "list_data_plane_nodes":
                result = await controlPlanesOps.listDataPlaneNodes(
                  this.api,
                  args.controlPlaneId,
                  args.pageSize,
                  args.pageNumber,
                  args.filterStatus,
                  args.filterHostname
                );
                break;

              case "get_data_plane_node":
                result = await controlPlanesOps.getDataPlaneNode(
                  this.api,
                  args.controlPlaneId,
                  args.nodeId
                );
                break;

              // Data Plane Token Management
              case "create_data_plane_token":
                result = await controlPlanesOps.createDataPlaneToken(
                  this.api,
                  args.controlPlaneId,
                  args.name,
                  args.expiresAt
                );
                break;

              case "list_data_plane_tokens":
                result = await controlPlanesOps.listDataPlaneTokens(
                  this.api,
                  args.controlPlaneId,
                  args.pageSize,
                  args.pageNumber
                );
                break;

              case "revoke_data_plane_token":
                result = await controlPlanesOps.revokeDataPlaneToken(
                  this.api,
                  args.controlPlaneId,
                  args.tokenId
                );
                break;

              // Control Plane Configuration
              case "get_control_plane_config":
                result = await controlPlanesOps.getControlPlaneConfig(
                  this.api,
                  args.controlPlaneId
                );
                break;

              case "update_control_plane_config":
                result = await controlPlanesOps.updateControlPlaneConfig(
                  this.api,
                  args.controlPlaneId,
                  {
                    proxyUrl: args.proxyUrl,
                    telemetryUrl: args.telemetryUrl,
                    authType: args.authType,
                    cloudGateway: args.cloudGateway,
                    analyticsEnabled: args.analyticsEnabled
                  }
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
              // Configuration Management Tools
              // ===========================
              // Legacy list operations (backward compatibility)
              case "list_services":
                result = await configurationOps.listServices(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "list_routes":
                result = await configurationOps.listRoutes(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "list_consumers":
                result = await configurationOps.listConsumers(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "list_plugins":
                result = await configurationOps.listPlugins(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              // Service CRUD operations
              case "create_service":
                result = await configurationOps.createService(
                  this.api,
                  args.controlPlaneId,
                  {
                    name: args.name,
                    host: args.host,
                    port: args.port,
                    protocol: args.protocol,
                    path: args.path,
                    retries: args.retries,
                    connectTimeout: args.connectTimeout,
                    writeTimeout: args.writeTimeout,
                    readTimeout: args.readTimeout,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "get_service":
                result = await configurationOps.getService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId
                );
                break;

              case "update_service":
                result = await configurationOps.updateService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId,
                  {
                    name: args.name,
                    host: args.host,
                    port: args.port,
                    protocol: args.protocol,
                    path: args.path,
                    retries: args.retries,
                    connectTimeout: args.connectTimeout,
                    writeTimeout: args.writeTimeout,
                    readTimeout: args.readTimeout,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "delete_service":
                result = await configurationOps.deleteService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId
                );
                break;

              // Route CRUD operations
              case "create_route":
                result = await configurationOps.createRoute(
                  this.api,
                  args.controlPlaneId,
                  {
                    name: args.name,
                    protocols: args.protocols,
                    methods: args.methods,
                    hosts: args.hosts,
                    paths: args.paths,
                    serviceId: args.serviceId,
                    stripPath: args.stripPath,
                    preserveHost: args.preserveHost,
                    regexPriority: args.regexPriority,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "get_route":
                result = await configurationOps.getRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId
                );
                break;

              case "update_route":
                result = await configurationOps.updateRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId,
                  {
                    name: args.name,
                    protocols: args.protocols,
                    methods: args.methods,
                    hosts: args.hosts,
                    paths: args.paths,
                    serviceId: args.serviceId,
                    stripPath: args.stripPath,
                    preserveHost: args.preserveHost,
                    regexPriority: args.regexPriority,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "delete_route":
                result = await configurationOps.deleteRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId
                );
                break;

              // Consumer CRUD operations
              case "create_consumer":
                result = await configurationOps.createConsumer(
                  this.api,
                  args.controlPlaneId,
                  {
                    username: args.username,
                    customId: args.customId,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "get_consumer":
                result = await configurationOps.getConsumer(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId
                );
                break;

              case "update_consumer":
                result = await configurationOps.updateConsumer(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId,
                  {
                    username: args.username,
                    customId: args.customId,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "delete_consumer":
                result = await configurationOps.deleteConsumer(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId
                );
                break;

              // Plugin CRUD operations
              case "create_plugin":
                result = await configurationOps.createPlugin(
                  this.api,
                  args.controlPlaneId,
                  {
                    name: args.name,
                    config: args.config,
                    protocols: args.protocols,
                    consumerId: args.consumerId,
                    serviceId: args.serviceId,
                    routeId: args.routeId,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "get_plugin":
                result = await configurationOps.getPlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId
                );
                break;

              case "update_plugin":
                result = await configurationOps.updatePlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId,
                  {
                    name: args.name,
                    config: args.config,
                    protocols: args.protocols,
                    consumerId: args.consumerId,
                    serviceId: args.serviceId,
                    routeId: args.routeId,
                    tags: args.tags,
                    enabled: args.enabled
                  }
                );
                break;

              case "delete_plugin":
                result = await configurationOps.deletePlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId
                );
                break;

              case "list_plugin_schemas":
                result = await configurationOps.listPluginSchemas(
                  this.api,
                  args.controlPlaneId
                );
                break;

              // ===========================
              // Portal Management Tools
              // ===========================
              // Portal API Operations
              case "list_portal_apis":
                result = await portalOps.listApis(
                  this.api,
                  args.pageSize,
                  args.pageNumber,
                  args.filterName,
                  args.filterStatus,
                  args.sort
                );
                break;

              case "fetch_portal_api":
                result = await portalOps.fetchApi(
                  this.api,
                  args.apiIdOrSlug
                );
                break;

              case "get_portal_api_actions":
                result = await portalOps.getApiActions(
                  this.api,
                  args.apiIdOrSlug
                );
                break;

              case "list_portal_api_documents":
                result = await portalOps.listApiDocuments(
                  this.api,
                  args.apiIdOrSlug
                );
                break;

              case "fetch_portal_api_document":
                result = await portalOps.fetchApiDocument(
                  this.api,
                  args.apiIdOrSlug,
                  args.documentIdOrSlug,
                  args.format
                );
                break;

              // Application Management Operations
              case "list_portal_applications":
                result = await portalOps.listApplications(
                  this.api,
                  args.pageSize,
                  args.pageNumber,
                  args.filterName,
                  args.filterAuthStrategy
                );
                break;

              case "create_portal_application":
                result = await portalOps.createApplication(
                  this.api,
                  {
                    name: args.name,
                    description: args.description,
                    clientId: args.clientId,
                    redirectUri: args.redirectUri,
                    authStrategyId: args.authStrategyId,
                    scopes: args.scopes
                  }
                );
                break;

              case "get_portal_application":
                result = await portalOps.getApplication(
                  this.api,
                  args.applicationId
                );
                break;

              case "update_portal_application":
                result = await portalOps.updateApplication(
                  this.api,
                  args.applicationId,
                  {
                    name: args.name,
                    description: args.description,
                    redirectUri: args.redirectUri,
                    scopes: args.scopes
                  }
                );
                break;

              case "delete_portal_application":
                result = await portalOps.deleteApplication(
                  this.api,
                  args.applicationId
                );
                break;

              // Application Registration Operations
              case "list_portal_application_registrations":
                result = await portalOps.listApplicationRegistrations(
                  this.api,
                  args.applicationId,
                  args.pageSize,
                  args.pageNumber,
                  args.filterStatus,
                  args.filterApiName
                );
                break;

              case "create_portal_application_registration":
                result = await portalOps.createApplicationRegistration(
                  this.api,
                  args.applicationId,
                  {
                    apiId: args.apiId,
                    apiProductVersionId: args.apiProductVersionId,
                    requestReason: args.requestReason
                  }
                );
                break;

              case "get_portal_application_registration":
                result = await portalOps.getApplicationRegistration(
                  this.api,
                  args.applicationId,
                  args.registrationId
                );
                break;

              case "delete_portal_application_registration":
                result = await portalOps.deleteApplicationRegistration(
                  this.api,
                  args.applicationId,
                  args.registrationId
                );
                break;

              // Credential Management Operations
              case "list_portal_credentials":
                result = await portalOps.listCredentials(
                  this.api,
                  args.applicationId,
                  args.pageSize,
                  args.pageNumber
                );
                break;

              case "create_portal_credential":
                result = await portalOps.createCredential(
                  this.api,
                  args.applicationId,
                  {
                    credentialType: args.credentialType,
                    name: args.name,
                    scopes: args.scopes,
                    expiresAt: args.expiresAt
                  }
                );
                break;

              case "update_portal_credential":
                result = await portalOps.updateCredential(
                  this.api,
                  args.applicationId,
                  args.credentialId,
                  {
                    name: args.name,
                    scopes: args.scopes,
                    expiresAt: args.expiresAt
                  }
                );
                break;

              case "delete_portal_credential":
                result = await portalOps.deleteCredential(
                  this.api,
                  args.applicationId,
                  args.credentialId
                );
                break;

              case "regenerate_portal_application_secret":
                result = await portalOps.regenerateApplicationSecret(
                  this.api,
                  args.applicationId
                );
                break;

              // Developer Authentication Operations
              case "register_portal_developer":
                result = await portalOps.registerDeveloper(
                  this.api,
                  {
                    email: args.email,
                    fullName: args.fullName,
                    password: args.password,
                    organization: args.organization,
                    customAttributes: args.customAttributes
                  }
                );
                break;

              case "authenticate_portal_developer":
                result = await portalOps.authenticate(
                  this.api,
                  args.username,
                  args.password
                );
                break;

              case "get_portal_developer_me":
                result = await portalOps.getDeveloperMe(this.api);
                break;

              case "logout_portal_developer":
                result = await portalOps.logout(this.api);
                break;

              // Application Analytics Operations
              case "query_portal_application_analytics":
                result = await portalOps.queryApplicationAnalytics(
                  this.api,
                  args.applicationId,
                  {
                    metrics: args.metrics,
                    dimensions: args.dimensions,
                    timeRange: args.timeRange,
                    granularity: args.granularity
                  }
                );
                break;

              // ===========================
              // Portal Management Tools
              // ===========================
              case "list_portals":
                result = await portalManagementOps.listPortals(api, args.pageSize, args.pageNumber);
                break;

              case "create_portal":
                result = await portalManagementOps.createPortal(api, args);
                break;

              case "get_portal":
                result = await portalManagementOps.getPortal(api, args.portalId);
                break;

              case "update_portal":
                result = await portalManagementOps.updatePortal(api, args.portalId, args);
                break;

              case "delete_portal":
                result = await portalManagementOps.deletePortal(api, args.portalId);
                break;

              case "list_portal_products":
                result = await portalManagementOps.listPortalProducts(api, args.portalId, args.pageSize, args.pageNumber);
                break;

              case "publish_portal_product":
                result = await portalManagementOps.publishPortalProduct(api, args.portalId, args);
                break;

              case "unpublish_portal_product":
                result = await portalManagementOps.unpublishPortalProduct(api, args.portalId, args.productId);
                break;

              // ===========================
              // TODO: Add remaining tool categories
              // ===========================
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