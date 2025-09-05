import { KongApi } from "../api.js";

/**
 * Get detailed plugin configuration with analysis
 */
export async function getPlugin(
  api: KongApi,
  controlPlaneId: string,
  pluginId: string
) {
  try {
    const result = await api.getPlugin(controlPlaneId, pluginId);
    const plugin = result.data;

    // Analyze plugin configuration for common issues
    const configAnalysis = {
      scope: {
        level: plugin.consumer ? "consumer" : 
               plugin.service ? "service" : 
               plugin.route ? "route" : "global",
        entityId: plugin.consumer?.id || plugin.service?.id || plugin.route?.id,
        recommendation: plugin.consumer && plugin.service ? 
          "Plugin applied to both consumer and service - verify this is intended" : "Scope looks appropriate"
      },
      security: {
        pluginType: plugin.name,
        isSecurityPlugin: ["key-auth", "jwt", "oauth2", "basic-auth", "hmac-auth", "mtls-auth", "acl"].includes(plugin.name),
        recommendation: plugin.name === "key-auth" && !plugin.config?.hide_credentials ? 
          "Consider enabling hide_credentials for better security" : "Configuration looks secure"
      },
      performance: {
        enabled: plugin.enabled,
        protocols: plugin.protocols,
        recommendation: plugin.protocols?.includes("tcp") && ["http", "https"].some(p => plugin.protocols?.includes(p)) ? 
          "Mixed TCP and HTTP protocols - verify this is correct" : "Protocol configuration appropriate"
      }
    };

    return {
      pluginDetails: {
        pluginId: plugin.id,
        name: plugin.name,
        enabled: plugin.enabled,
        config: plugin.config,
        protocols: plugin.protocols,
        scoping: {
          consumerId: plugin.consumer?.id,
          serviceId: plugin.service?.id,
          routeId: plugin.route?.id,
          global: !plugin.consumer && !plugin.service && !plugin.route
        },
        tags: plugin.tags,
        metadata: {
          createdAt: plugin.created_at,
          updatedAt: plugin.updated_at
        }
      },
      configurationAnalysis: configAnalysis,
      commonConfigurations: getCommonConfigurationsForPlugin(plugin.name),
      relatedTools: [
        "Use update-plugin to modify configuration",
        "Use delete-plugin to remove if no longer needed",
        "Use query-api-requests to analyze plugin impact on traffic"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new plugin with validation and best practices
 */
export async function createPlugin(
  api: KongApi,
  controlPlaneId: string,
  name: string,
  config?: Record<string, any>,
  enabled = true,
  protocols?: string[],
  serviceId?: string,
  routeId?: string,
  consumerId?: string,
  tags?: string[]
) {
  try {
    // Validation
    if (!name) {
      throw new Error("Plugin name is required");
    }

    // Validate scoping
    const scopeCount = [serviceId, routeId, consumerId].filter(Boolean).length;
    if (scopeCount > 1) {
      throw new Error("Plugin can only be scoped to one entity (service, route, or consumer)");
    }

    // Plugin-specific validations
    const validationResult = validatePluginConfig(name, config);
    if (!validationResult.valid) {
      throw new Error(`Plugin configuration error: ${validationResult.error}`);
    }

    const pluginData = {
      name,
      ...(config && { config }),
      enabled,
      ...(protocols && { protocols }),
      ...(serviceId && { service: { id: serviceId } }),
      ...(routeId && { route: { id: routeId } }),
      ...(consumerId && { consumer: { id: consumerId } }),
      ...(tags && { tags })
    };

    const result = await api.createPlugin(controlPlaneId, pluginData);

    return {
      success: true,
      plugin: {
        pluginId: result.data.id,
        name: result.data.name,
        enabled: result.data.enabled,
        scoping: {
          level: consumerId ? "consumer" : serviceId ? "service" : routeId ? "route" : "global",
          entityId: consumerId || serviceId || routeId
        },
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: getPluginRecommendations(name, config),
      nextSteps: [
        "Test plugin functionality with sample requests",
        "Monitor plugin performance impact",
        "Review plugin logs for any issues"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update an existing plugin
 */
export async function updatePlugin(
  api: KongApi,
  controlPlaneId: string,
  pluginId: string,
  name?: string,
  config?: Record<string, any>,
  enabled?: boolean,
  protocols?: string[],
  serviceId?: string,
  routeId?: string,
  consumerId?: string,
  tags?: string[]
) {
  try {
    const pluginData: any = {};
    
    if (name !== undefined) pluginData.name = name;
    if (config !== undefined) pluginData.config = config;
    if (enabled !== undefined) pluginData.enabled = enabled;
    if (protocols !== undefined) pluginData.protocols = protocols;
    if (serviceId !== undefined) pluginData.service = { id: serviceId };
    if (routeId !== undefined) pluginData.route = { id: routeId };
    if (consumerId !== undefined) pluginData.consumer = { id: consumerId };
    if (tags !== undefined) pluginData.tags = tags;

    // Validate configuration if provided
    if (config && name) {
      const validationResult = validatePluginConfig(name, config);
      if (!validationResult.valid) {
        throw new Error(`Plugin configuration error: ${validationResult.error}`);
      }
    }

    const result = await api.updatePlugin(controlPlaneId, pluginId, pluginData);

    return {
      success: true,
      plugin: {
        pluginId: result.data.id,
        name: result.data.name,
        enabled: result.data.enabled,
        scoping: {
          level: result.data.consumer ? "consumer" : 
                 result.data.service ? "service" : 
                 result.data.route ? "route" : "global",
          entityId: result.data.consumer?.id || result.data.service?.id || result.data.route?.id
        },
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Test plugin changes with sample requests",
        "Monitor for any unexpected behavior",
        "Verify plugin configuration meets requirements"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a plugin
 */
export async function deletePlugin(
  api: KongApi,
  controlPlaneId: string,
  pluginId: string
) {
  try {
    await api.deletePlugin(controlPlaneId, pluginId);

    return {
      success: true,
      message: "Plugin deleted successfully",
      recommendations: [
        "Verify functionality still works without the plugin",
        "Update any dependent configuration",
        "Monitor traffic for any issues"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Helper function to provide common configurations for different plugins
 */
function getCommonConfigurationsForPlugin(pluginName: string) {
  const configurations: Record<string, any> = {
    "rate-limiting": {
      basic: {
        minute: 100,
        hour: 1000,
        policy: "local"
      },
      redis: {
        minute: 100,
        hour: 1000,
        policy: "redis",
        redis_host: "localhost",
        redis_port: 6379
      }
    },
    "key-auth": {
      basic: {
        key_names: ["apikey"],
        hide_credentials: true
      },
      enhanced: {
        key_names: ["apikey", "x-api-key"],
        key_in_header: true,
        key_in_query: false,
        hide_credentials: true
      }
    },
    "cors": {
      permissive: {
        origins: ["*"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        headers: ["Accept", "Content-Type", "Authorization"],
        credentials: true
      },
      restricted: {
        origins: ["https://myapp.com"],
        methods: ["GET", "POST"],
        headers: ["Accept", "Content-Type", "Authorization"],
        credentials: true
      }
    },
    "jwt": {
      basic: {
        secret_is_base64: false,
        claims_to_verify: ["exp"]
      }
    }
  };

  return configurations[pluginName] || {};
}

/**
 * Helper function to validate plugin configurations
 */
function validatePluginConfig(pluginName: string, config?: Record<string, any>) {
  if (!config) {
    return { valid: true };
  }

  switch (pluginName) {
    case "rate-limiting":
      if (!config.minute && !config.hour && !config.day && !config.month && !config.year) {
        return { 
          valid: false, 
          error: "Rate limiting plugin requires at least one time period limit (minute, hour, day, month, or year)" 
        };
      }
      break;
    
    case "key-auth":
      if (config.key_names && (!Array.isArray(config.key_names) || config.key_names.length === 0)) {
        return { 
          valid: false, 
          error: "key_names must be a non-empty array" 
        };
      }
      break;
    
    case "cors":
      if (config.origins && !Array.isArray(config.origins)) {
        return { 
          valid: false, 
          error: "origins must be an array" 
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Helper function to provide plugin-specific recommendations
 */
function getPluginRecommendations(pluginName: string, config?: Record<string, any>) {
  const recommendations: string[] = [];

  switch (pluginName) {
    case "rate-limiting":
      recommendations.push("Monitor rate limit hit rates to optimize thresholds");
      recommendations.push("Consider using Redis for distributed rate limiting");
      if (config?.policy === "local") {
        recommendations.push("Local policy may not work well in multi-node deployments");
      }
      break;
    
    case "key-auth":
      recommendations.push("Regularly rotate API keys for security");
      recommendations.push("Use strong, random API keys");
      if (!config?.hide_credentials) {
        recommendations.push("Enable hide_credentials to prevent key exposure in logs");
      }
      break;
    
    case "cors":
      if (config?.origins?.includes("*")) {
        recommendations.push("Consider restricting origins instead of using wildcard");
      }
      recommendations.push("Test CORS configuration with your frontend applications");
      break;
    
    case "jwt":
      recommendations.push("Use strong JWT secrets and rotate them regularly");
      recommendations.push("Verify JWT expiration claims are properly validated");
      break;
    
    default:
      recommendations.push("Refer to Kong plugin documentation for best practices");
  }

  return recommendations;
}