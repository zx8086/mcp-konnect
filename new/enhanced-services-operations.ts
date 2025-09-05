import { KongApi } from "../api.js";

/**
 * Get detailed service configuration with analysis
 */
export async function getService(
  api: KongApi,
  controlPlaneId: string,
  serviceId: string
) {
  try {
    const result = await api.getService(controlPlaneId, serviceId);
    const service = result.data;

    // Analyze service configuration for best practices
    const configAnalysis = {
      connectivity: {
        protocol: service.protocol,
        isSecure: service.protocol === "https" || service.protocol === "grpcs",
        recommendation: service.protocol === "http" ? 
          "Consider using HTTPS for better security" : "Using secure protocol"
      },
      resilience: {
        retries: service.retries,
        timeouts: {
          connect: service.connect_timeout,
          write: service.write_timeout,
          read: service.read_timeout
        },
        recommendation: service.retries < 3 ? 
          "Consider increasing retries for better resilience" : "Retry configuration looks good"
      },
      security: {
        tlsVerification: service.tls_verify,
        clientCertificate: !!service.client_certificate,
        recommendation: !service.tls_verify && service.protocol === "https" ? 
          "Consider enabling TLS verification" : "TLS configuration appropriate"
      }
    };

    return {
      serviceDetails: {
        serviceId: service.id,
        name: service.name,
        host: service.host,
        port: service.port,
        protocol: service.protocol,
        path: service.path,
        retries: service.retries,
        timeouts: {
          connectTimeout: service.connect_timeout,
          writeTimeout: service.write_timeout,
          readTimeout: service.read_timeout
        },
        security: {
          tlsVerify: service.tls_verify,
          tlsVerifyDepth: service.tls_verify_depth,
          clientCertificate: service.client_certificate,
          caCertificates: service.ca_certificates
        },
        tags: service.tags,
        enabled: service.enabled,
        metadata: {
          createdAt: service.created_at,
          updatedAt: service.updated_at
        }
      },
      configurationAnalysis: configAnalysis,
      relatedTools: [
        "Use list-routes to see routes pointing to this service",
        "Use update-service to modify configuration",
        "Use query-api-requests to analyze traffic patterns"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new service with validation and best practices
 */
export async function createService(
  api: KongApi,
  controlPlaneId: string,
  name: string | undefined,
  host: string,
  port = 80,
  protocol = "http",
  path?: string,
  retries = 5,
  connectTimeout = 60000,
  writeTimeout = 60000,
  readTimeout = 60000,
  tags?: string[],
  enabled = true
) {
  try {
    // Validation
    if (!host) {
      throw new Error("Host is required for service creation");
    }

    if (port < 1 || port > 65535) {
      throw new Error("Port must be between 1 and 65535");
    }

    const serviceData = {
      ...(name && { name }),
      host,
      port,
      protocol,
      ...(path && { path }),
      retries,
      connect_timeout: connectTimeout,
      write_timeout: writeTimeout,
      read_timeout: readTimeout,
      ...(tags && { tags }),
      enabled
    };

    const result = await api.createService(controlPlaneId, serviceData);

    return {
      success: true,
      service: {
        serviceId: result.data.id,
        name: result.data.name,
        host: result.data.host,
        port: result.data.port,
        protocol: result.data.protocol,
        enabled: result.data.enabled,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Create routes to expose this service to clients",
        "Consider adding authentication plugins",
        "Set up monitoring and logging plugins",
        protocol === "http" ? "Consider upgrading to HTTPS for security" : null
      ].filter(Boolean),
      nextSteps: [
        "Use create-route to create routes for this service",
        "Use create-plugin to add functionality like authentication",
        "Test service connectivity from Kong to upstream"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update an existing service with validation
 */
export async function updateService(
  api: KongApi,
  controlPlaneId: string,
  serviceId: string,
  name?: string,
  host?: string,
  port?: number,
  protocol?: string,
  path?: string,
  retries?: number,
  connectTimeout?: number,
  writeTimeout?: number,
  readTimeout?: number,
  tags?: string[],
  enabled?: boolean
) {
  try {
    // Build update payload with only provided fields
    const serviceData: any = {};
    
    if (name !== undefined) serviceData.name = name;
    if (host !== undefined) serviceData.host = host;
    if (port !== undefined) {
      if (port < 1 || port > 65535) {
        throw new Error("Port must be between 1 and 65535");
      }
      serviceData.port = port;
    }
    if (protocol !== undefined) serviceData.protocol = protocol;
    if (path !== undefined) serviceData.path = path;
    if (retries !== undefined) serviceData.retries = retries;
    if (connectTimeout !== undefined) serviceData.connect_timeout = connectTimeout;
    if (writeTimeout !== undefined) serviceData.write_timeout = writeTimeout;
    if (readTimeout !== undefined) serviceData.read_timeout = readTimeout;
    if (tags !== undefined) serviceData.tags = tags;
    if (enabled !== undefined) serviceData.enabled = enabled;

    const result = await api.updateService(controlPlaneId, serviceId, serviceData);

    return {
      success: true,
      service: {
        serviceId: result.data.id,
        name: result.data.name,
        host: result.data.host,
        port: result.data.port,
        protocol: result.data.protocol,
        enabled: result.data.enabled,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Verify all routes are still functioning correctly",
        "Monitor traffic for any connectivity issues",
        "Update any dependent configuration if host/port changed"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a service with safety checks
 */
export async function deleteService(
  api: KongApi,
  controlPlaneId: string,
  serviceId: string
) {
  try {
    // Check for associated routes first
    try {
      const routes = await api.listRoutes(controlPlaneId, 100);
      const associatedRoutes = routes.data.filter((route: any) => 
        route.service?.id === serviceId);
      
      if (associatedRoutes.length > 0) {
        return {
          success: false,
          error: "Service has associated routes",
          associatedRoutes: associatedRoutes.map((route: any) => ({
            routeId: route.id,
            name: route.name
          })),
          recommendation: "Delete or reassign routes before deleting service"
        };
      }
    } catch (error) {
      // If we can't check routes, proceed with caution
      console.warn("Could not check for associated routes:", error);
    }

    await api.deleteService(controlPlaneId, serviceId);

    return {
      success: true,
      message: "Service deleted successfully",
      recommendations: [
        "Verify no traffic disruption occurred",
        "Clean up any unused plugins",
        "Update documentation to reflect service removal"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get detailed route configuration with analysis
 */
export async function getRoute(
  api: KongApi,
  controlPlaneId: string,
  routeId: string
) {
  try {
    const result = await api.getRoute(controlPlaneId, routeId);
    const route = result.data;

    // Analyze route configuration
    const configAnalysis = {
      routing: {
        hasHost: !!(route.hosts && route.hosts.length > 0),
        hasPath: !!(route.paths && route.paths.length > 0),
        hasMethods: !!(route.methods && route.methods.length > 0),
        recommendation: (!route.hosts && !route.paths && !route.methods) ? 
          "Route should have at least one matching condition" : "Routing conditions configured"
      },
      security: {
        httpsOnly: route.protocols?.every((p: string) => ["https", "grpcs", "wss"].includes(p)),
        httpsRedirect: route.https_redirect_status_code,
        recommendation: route.protocols?.includes("http") ? 
          "Consider using HTTPS-only for better security" : "Using secure protocols"
      },
      performance: {
        stripPath: route.strip_path,
        preserveHost: route.preserve_host,
        buffering: {
          request: route.request_buffering,
          response: route.response_buffering
        }
      }
    };

    return {
      routeDetails: {
        routeId: route.id,
        name: route.name,
        protocols: route.protocols,
        methods: route.methods,
        hosts: route.hosts,
        paths: route.paths,
        serviceId: route.service?.id,
        configuration: {
          stripPath: route.strip_path,
          preserveHost: route.preserve_host,
          regexPriority: route.regex_priority,
          httpsRedirectStatus: route.https_redirect_status_code,
          requestBuffering: route.request_buffering,
          responseBuffering: route.response_buffering
        },
        tags: route.tags,
        metadata: {
          createdAt: route.created_at,
          updatedAt: route.updated_at
        }
      },
      configurationAnalysis: configAnalysis,
      relatedTools: [
        "Use get-service to see the upstream service details",
        "Use list-plugins to see plugins applied to this route",
        "Use query-api-requests to analyze traffic for this route"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new route with validation
 */
export async function createRoute(
  api: KongApi,
  controlPlaneId: string,
  serviceId: string,
  name?: string,
  protocols = ["http", "https"],
  methods?: string[],
  hosts?: string[],
  paths?: string[],
  stripPath = true,
  preserveHost = false,
  tags?: string[]
) {
  try {
    // Validation
    if (!serviceId) {
      throw new Error("Service ID is required for route creation");
    }

    if (!methods && !hosts && !paths) {
      throw new Error("Route must have at least one matching condition (methods, hosts, or paths)");
    }

    const routeData = {
      ...(name && { name }),
      protocols,
      ...(methods && { methods }),
      ...(hosts && { hosts }),
      ...(paths && { paths }),
      service: { id: serviceId },
      strip_path: stripPath,
      preserve_host: preserveHost,
      ...(tags && { tags })
    };

    const result = await api.createRoute(controlPlaneId, routeData);

    return {
      success: true,
      route: {
        routeId: result.data.id,
        name: result.data.name,
        protocols: result.data.protocols,
        methods: result.data.methods,
        hosts: result.data.hosts,
        paths: result.data.paths,
        serviceId: result.data.service?.id,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Test route accessibility from client applications",
        "Consider adding authentication plugins if needed",
        "Set up rate limiting to protect against abuse",
        protocols.includes("http") ? "Consider HTTPS-only for security" : null
      ].filter(Boolean),
      nextSteps: [
        "Use create-plugin to add authentication or rate limiting",
        "Test the route with curl or other HTTP clients",
        "Monitor route performance with query-api-requests"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update an existing route
 */
export async function updateRoute(
  api: KongApi,
  controlPlaneId: string,
  routeId: string,
  name?: string,
  protocols?: string[],
  methods?: string[],
  hosts?: string[],
  paths?: string[],
  serviceId?: string,
  stripPath?: boolean,
  preserveHost?: boolean,
  tags?: string[]
) {
  try {
    const routeData: any = {};
    
    if (name !== undefined) routeData.name = name;
    if (protocols !== undefined) routeData.protocols = protocols;
    if (methods !== undefined) routeData.methods = methods;
    if (hosts !== undefined) routeData.hosts = hosts;
    if (paths !== undefined) routeData.paths = paths;
    if (serviceId !== undefined) routeData.service = { id: serviceId };
    if (stripPath !== undefined) routeData.strip_path = stripPath;
    if (preserveHost !== undefined) routeData.preserve_host = preserveHost;
    if (tags !== undefined) routeData.tags = tags;

    const result = await api.updateRoute(controlPlaneId, routeId, routeData);

    return {
      success: true,
      route: {
        routeId: result.data.id,
        name: result.data.name,
        protocols: result.data.protocols,
        methods: result.data.methods,
        hosts: result.data.hosts,
        paths: result.data.paths,
        serviceId: result.data.service?.id,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Test route changes with client applications",
        "Monitor for any traffic routing issues",
        "Update any dependent configuration or documentation"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a route with safety checks
 */
export async function deleteRoute(
  api: KongApi,
  controlPlaneId: string,
  routeId: string
) {
  try {
    await api.deleteRoute(controlPlaneId, routeId);

    return {
      success: true,
      message: "Route deleted successfully",
      important: "Ensure client applications are updated to use alternative routes",
      recommendations: [
        "Verify no traffic is still being sent to this route",
        "Update client applications and documentation",
        "Clean up any route-specific plugins"
      ]
    };
  } catch (error) {
    throw error;
  }
}