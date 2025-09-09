/**
 * Enhanced Kong Tools with Native MCP Elicitation
 * 
 * Uses MCP's built-in context.elicit() for progressive context gathering
 * following best practices from elicitation.md
 */

import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { KongApi } from "../api/kong-api.js";
import { mcpElicitationManager, KongDeploymentContext } from "../utils/mcp-elicitation.js";
import { elicitationBridge } from "../utils/elicitation-bridge.js";
import * as configOps from "./configuration/operations.js";

/**
 * Enhanced Create Service with Native MCP Elicitation
 */
export async function createServiceWithElicitation(
  api: KongApi,
  args: any,
  extra: RequestHandlerExtra
): Promise<any> {
  try {
    // Step 1: Extract any provided context
    const providedContext: Partial<KongDeploymentContext> = {
      domain: extractFromTags(args.tags, 'domain'),
      environment: extractFromTags(args.tags, 'env'),
      team: extractFromTags(args.tags, 'team')
    };

    // Step 2: Use hybrid elicitation (bridge + native MCP)
    const mcpContext = (extra as any).context;
    const completeContext = await mcpElicitationManager.gatherKongContext(
      providedContext,
      mcpContext
    );

    if (!completeContext) {
      const bridgeStatus = elicitationBridge.getBridgeStatus();
      
      return {
        error: "DEPLOYMENT_CANCELLED",
        message: "Service creation cancelled - required deployment context not provided",
        reason: "User declined to provide mandatory information (domain, environment, team)",
        debugging: {
          providedContext,
          bridgeStatus,
          mcpAvailable: !!mcpContext?.elicit,
          suggestion: bridgeStatus.validSessions > 0 
            ? "Completed elicitation session found but context extraction failed"
            : "No elicitation sessions completed. Run elicitation tools first."
        }
      };
    }

    // Step 3: Generate production-ready tags
    const tags = mcpElicitationManager.generateTags(completeContext, 'service', args.name);

    // Step 4: Create service with complete context
    const serviceData = {
      name: args.name,
      host: args.host,
      port: args.port,
      protocol: args.protocol,
      path: args.path,
      retries: args.retries,
      connectTimeout: args.connectTimeout,
      writeTimeout: args.writeTimeout,
      readTimeout: args.readTimeout,
      tags: tags,
      enabled: args.enabled
    };

    const result = await configOps.createService(api, args.controlPlaneId, serviceData);

    // Determine context source before clearing
    const usedBridge = elicitationBridge.hasValidCompletedSession();
    
    // Clear the session from bridge after successful use
    if (usedBridge) {
      elicitationBridge.clearLatestSession();
    }

    return {
      ...result,
      deploymentContext: completeContext,
      appliedTags: tags,
      message: `Service '${args.name}' created successfully with complete deployment context`,
      contextGathering: {
        source: usedBridge ? 'elicitation-bridge' : 'native-mcp',
        elicitationUsed: Object.keys(providedContext).filter(k => !providedContext[k as keyof KongDeploymentContext]).length > 0,
        finalContext: completeContext
      }
    };

  } catch (error) {
    return {
      error: "SERVICE_CREATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error occurred",
      troubleshooting: [
        "Ensure the control plane ID is valid",
        "Verify the service host is accessible",
        "Check that all required context was provided"
      ]
    };
  }
}

/**
 * Enhanced Create Route with Native MCP Elicitation
 */
export async function createRouteWithElicitation(
  api: KongApi,
  args: any,
  extra: RequestHandlerExtra
): Promise<any> {
  try {
    // Step 1: Extract any provided context
    const providedContext: Partial<KongDeploymentContext> = {
      domain: extractFromTags(args.tags, 'domain'),
      environment: extractFromTags(args.tags, 'env'),
      team: extractFromTags(args.tags, 'team')
    };

    // Step 2: Use cached context if available, or elicit new context
    const cacheKey = `route-context-${args.controlPlaneId}`;
    const completeContext = await mcpElicitationManager.getCachedOrElicit(
      cacheKey,
      async () => {
        const mcpContext = (extra as any).context;
        return await mcpElicitationManager.gatherKongContext(providedContext, mcpContext);
      },
      1800 // 30 minutes cache
    );

    if (!completeContext) {
      return {
        error: "DEPLOYMENT_CANCELLED",
        message: "Route creation cancelled - required deployment context not provided"
      };
    }

    // Step 3: Generate tags and create route
    const tags = mcpElicitationManager.generateTags(completeContext, 'route', args.name);

    const routeData = {
      name: args.name,
      protocols: args.protocols,
      methods: args.methods,
      hosts: args.hosts,
      paths: args.paths,
      serviceId: args.serviceId,
      stripPath: args.stripPath,
      preserveHost: args.preserveHost,
      regexPriority: args.regexPriority,
      tags: tags,
      enabled: args.enabled
    };

    const result = await configOps.createRoute(api, args.controlPlaneId, routeData);

    return {
      ...result,
      deploymentContext: completeContext,
      appliedTags: tags,
      contextSource: providedContext ? 'cached' : 'elicited'
    };

  } catch (error) {
    return {
      error: "ROUTE_CREATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Enhanced Create Consumer with Native MCP Elicitation
 */
export async function createConsumerWithElicitation(
  api: KongApi,
  args: any,
  extra: RequestHandlerExtra
): Promise<any> {
  try {
    const providedContext: Partial<KongDeploymentContext> = {
      domain: extractFromTags(args.tags, 'domain'),
      environment: extractFromTags(args.tags, 'env'),
      team: extractFromTags(args.tags, 'team')
    };

    const mcpContext = (extra as any).context;
    const completeContext = await mcpElicitationManager.gatherKongContext(
      providedContext,
      mcpContext
    );

    if (!completeContext) {
      return {
        error: "DEPLOYMENT_CANCELLED",
        message: "Consumer creation cancelled - required deployment context not provided"
      };
    }

    const tags = mcpElicitationManager.generateTags(completeContext, 'consumer', args.username);

    const consumerData = {
      username: args.username,
      customId: args.customId,
      tags: tags,
      enabled: args.enabled
    };

    const result = await configOps.createConsumer(api, args.controlPlaneId, consumerData);

    return {
      ...result,
      deploymentContext: completeContext,
      appliedTags: tags
    };

  } catch (error) {
    return {
      error: "CONSUMER_CREATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Enhanced Create Plugin with Native MCP Elicitation
 */
export async function createPluginWithElicitation(
  api: KongApi,
  args: any,
  extra: RequestHandlerExtra
): Promise<any> {
  try {
    const providedContext: Partial<KongDeploymentContext> = {
      domain: extractFromTags(args.tags, 'domain'),
      environment: extractFromTags(args.tags, 'env'),
      team: extractFromTags(args.tags, 'team')
    };

    // Use cached context for plugins (often created in batches)
    const cacheKey = `plugin-context-${args.controlPlaneId}`;
    const completeContext = await mcpElicitationManager.getCachedOrElicit(
      cacheKey,
      async () => {
        const mcpContext = (extra as any).context;
        return await mcpElicitationManager.gatherKongContext(providedContext, mcpContext);
      },
      600 // 10 minutes cache for plugins
    );

    if (!completeContext) {
      return {
        error: "DEPLOYMENT_CANCELLED",
        message: "Plugin creation cancelled - required deployment context not provided"
      };
    }

    const tags = mcpElicitationManager.generateTags(completeContext, 'plugin', args.name);

    const pluginData = {
      name: args.name,
      config: args.config,
      protocols: args.protocols,
      consumerId: args.consumerId,
      serviceId: args.serviceId,
      routeId: args.routeId,
      tags: tags,
      enabled: args.enabled
    };

    const result = await configOps.createPlugin(api, args.controlPlaneId, pluginData);

    return {
      ...result,
      deploymentContext: completeContext,
      appliedTags: tags,
      scope: args.serviceId ? 'service' : args.routeId ? 'route' : 'global'
    };

  } catch (error) {
    return {
      error: "PLUGIN_CREATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Utility function to extract values from tags
 */
function extractFromTags(tags: string[] | undefined, prefix: string): string | undefined {
  if (!tags) return undefined;
  
  const tag = tags.find(tag => tag.startsWith(`${prefix}-`));
  return tag ? tag.substring(prefix.length + 1) : undefined;
}

/**
 * Tool registry for enhanced Kong tools
 */
export const enhancedKongTools = {
  createServiceWithElicitation,
  createRouteWithElicitation,
  createConsumerWithElicitation,
  createPluginWithElicitation
};