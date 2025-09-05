import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { tools } from "./tools.js";
import { KongApi, API_REGIONS } from "./api.js";
import * as analytics from "./operations/analytics.js";
import * as configuration from "./operations/configuration.js";
import * as controlPlanes from "./operations/controlPlanes.js";
import * as certificates from "./operations/certificates.js";
import * as upstreams from "./operations/upstreams.js";
import * as dataPlanes from "./operations/dataPlanes.js";
import * as enhancedServices from "./operations/enhancedServices.js";
import * as plugins from "./operations/plugins.js";
import * as consumerCredentials from "./operations/consumerCredentials.js";

/**
 * Main MCP server class for Kong Konnect integration
 */
class KongKonnectMcpServer extends McpServer {
  private api: KongApi;

  constructor(options: { apiKey?: string; apiRegion?: string } = {}) {
    super({
      name: "kong-konnect-mcp",
      version: "2.0.0",
      description: "Comprehensive tools for managing and analyzing Kong Konnect API Gateway configurations, certificates, traffic, and operations"
    });

    // Initialize the API client
    this.api = new KongApi({
      apiKey: options.apiKey || process.env.KONNECT_ACCESS_TOKEN,
      apiRegion: options.apiRegion || process.env.KONNECT_REGION || API_REGIONS.US
    });

    // Register all tools
    this.registerTools();
  }

  private registerTools() {
    const allTools = tools();

    allTools.forEach(tool => {
      this.tool(
        tool.method,
        tool.description,
        tool.parameters.shape,
        async (args: any, _extra: RequestHandlerExtra) => {
          try {
            let result;

            // Route to appropriate handler based on method
            switch (tool.method) {
              // Analytics tools
              case "query_api_requests":
                result = await analytics.queryApiRequests(
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
                result = await analytics.getConsumerRequests(
                  this.api,
                  args.consumerId,
                  args.timeRange,
                  args.successOnly,
                  args.failureOnly,
                  args.maxResults
                );
                break;

              // Certificate management tools
              case "list_certificates":
                result = await certificates.listCertificates(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_certificate":
                result = await certificates.getCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.certificateId
                );
                break;

              case "create_certificate":
                result = await certificates.createCertificate(
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
                result = await certificates.updateCertificate(
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
                result = await certificates.deleteCertificate(
                  this.api,
                  args.controlPlaneId,
                  args.certificateId
                );
                break;

              // Enhanced service management tools
              case "list_services":
                result = await configuration.listServices(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_service":
                result = await enhancedServices.getService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId
                );
                break;

              case "create_service":
                result = await enhancedServices.createService(
                  this.api,
                  args.controlPlaneId,
                  args.name,
                  args.host,
                  args.port,
                  args.protocol,
                  args.path,
                  args.retries,
                  args.connectTimeout,
                  args.writeTimeout,
                  args.readTimeout,
                  args.tags,
                  args.enabled
                );
                break;

              case "update_service":
                result = await enhancedServices.updateService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId,
                  args.name,
                  args.host,
                  args.port,
                  args.protocol,
                  args.path,
                  args.retries,
                  args.connectTimeout,
                  args.writeTimeout,
                  args.readTimeout,
                  args.tags,
                  args.enabled
                );
                break;

              case "delete_service":
                result = await enhancedServices.deleteService(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId
                );
                break;

              // Enhanced route management tools
              case "list_routes":
                result = await configuration.listRoutes(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_route":
                result = await enhancedServices.getRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId
                );
                break;

              case "create_route":
                result = await enhancedServices.createRoute(
                  this.api,
                  args.controlPlaneId,
                  args.serviceId,
                  args.name,
                  args.protocols,
                  args.methods,
                  args.hosts,
                  args.paths,
                  args.stripPath,
                  args.preserveHost,
                  args.tags
                );
                break;

              case "update_route":
                result = await enhancedServices.updateRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId,
                  args.name,
                  args.protocols,
                  args.methods,
                  args.hosts,
                  args.paths,
                  args.serviceId,
                  args.stripPath,
                  args.preserveHost,
                  args.tags
                );
                break;

              case "delete_route":
                result = await enhancedServices.deleteRoute(
                  this.api,
                  args.controlPlaneId,
                  args.routeId
                );
                break;

              // Upstreams and health checks
              case "list_upstreams":
                result = await upstreams.listUpstreams(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_upstream":
                result = await upstreams.getUpstream(
                  this.api,
                  args.controlPlaneId,
                  args.upstreamId
                );
                break;

              case "list_upstream_targets":
                result = await upstreams.listUpstreamTargets(
                  this.api,
                  args.controlPlaneId,
                  args.upstreamId,
                  args.size,
                  args.offset
                );
                break;

              case "get_upstream_health":
                result = await upstreams.getUpstreamHealth(
                  this.api,
                  args.controlPlaneId,
                  args.upstreamId
                );
                break;

              // Data plane node management
              case "list_data_plane_nodes":
                result = await dataPlanes.listDataPlaneNodes(
                  this.api,
                  args.controlPlaneId,
                  args.pageSize,
                  args.pageAfter
                );
                break;

              case "get_data_plane_node":
                result = await dataPlanes.getDataPlaneNode(
                  this.api,
                  args.controlPlaneId,
                  args.nodeId
                );
                break;

              case "delete_data_plane_node":
                result = await dataPlanes.deleteDataPlaneNode(
                  this.api,
                  args.controlPlaneId,
                  args.nodeId
                );
                break;

              case "get_expected_config_hash":
                result = await dataPlanes.getExpectedConfigHash(
                  this.api,
                  args.controlPlaneId
                );
                break;

              // Enhanced plugin management
              case "list_plugins":
                result = await configuration.listPlugins(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "get_plugin":
                result = await plugins.getPlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId
                );
                break;

              case "create_plugin":
                result = await plugins.createPlugin(
                  this.api,
                  args.controlPlaneId,
                  args.name,
                  args.config,
                  args.enabled,
                  args.protocols,
                  args.serviceId,
                  args.routeId,
                  args.consumerId,
                  args.tags
                );
                break;

              case "update_plugin":
                result = await plugins.updatePlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId,
                  args.name,
                  args.config,
                  args.enabled,
                  args.protocols,
                  args.serviceId,
                  args.routeId,
                  args.consumerId,
                  args.tags
                );
                break;

              case "delete_plugin":
                result = await plugins.deletePlugin(
                  this.api,
                  args.controlPlaneId,
                  args.pluginId
                );
                break;

              // Consumer management
              case "list_consumers":
                result = await configuration.listConsumers(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              // Consumer credential management
              case "list_consumer_keys":
                result = await consumerCredentials.listConsumerKeys(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId,
                  args.size,
                  args.offset
                );
                break;

              case "create_consumer_key":
                result = await consumerCredentials.createConsumerKey(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId,
                  args.key,
                  args.ttl,
                  args.tags
                );
                break;

              case "delete_consumer_key":
                result = await consumerCredentials.deleteConsumerKey(
                  this.api,
                  args.controlPlaneId,
                  args.consumerId,
                  args.keyId
                );
                break;

              // SNI management
              case "list_snis":
                result = await consumerCredentials.listSNIs(
                  this.api,
                  args.controlPlaneId,
                  args.size,
                  args.offset
                );
                break;

              case "create_sni":
                result = await consumerCredentials.createSNI(
                  this.api,
                  args.controlPlaneId,
                  args.name,
                  args.certificateId,
                  args.tags
                );
                break;

              // Control Planes tools
              case "list_control_planes":
                result = await controlPlanes.listControlPlanes(
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
                result = await controlPlanes.getControlPlane(
                  this.api,
                  args.controlPlaneId
                );
                break;

              case "list_control_plane_group_memberships":
                result = await controlPlanes.listControlPlaneGroupMemberships(
                  this.api,
                  args.groupId,
                  args.pageSize,
                  args.pageAfter
                );
                break;

              case "check_control_plane_group_membership":
                result = await controlPlanes.checkControlPlaneGroupMembership(
                  this.api,
                  args.controlPlaneId
                );
                break;
                
              default:
                throw new Error(`Unknown tool method: ${tool.method}`);
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: ${error.message}\n\nTroubleshooting tips:\n1. Verify your API key is valid and has sufficient permissions\n2. Check that the parameters provided are valid\n3. Ensure your network connection to the Kong API is working properly\n4. For certificate operations, verify PEM format is correct\n5. For service/route operations, ensure required fields are provided`
                }
              ],
              isError: true
            };
          }
        }
      );
    });
  }
}

/**
 * Main function to run the server
 */
async function main() {
  // Get API key and region from environment if not provided
  const apiKey = process.env.KONNECT_ACCESS_TOKEN;
  const apiRegion = process.env.KONNECT_REGION || API_REGIONS.US;

  // Create server instance
  const server = new KongKonnectMcpServer({
    apiKey,
    apiRegion
  });

  // Create transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kong Konnect MCP Server v2.0.0 is running...");
  console.error("Now includes comprehensive certificate management, enhanced service/route operations, upstreams health checks, data plane monitoring, and consumer credential management.");
}

// Run the server
main().catch((error) => {
  console.error("Initialization error:", error);
  process.exit(1);
});