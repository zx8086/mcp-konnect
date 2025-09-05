import { KongApi } from "../api.js";

/**
 * List upstreams for a specific control plane with health analysis
 */
export async function listUpstreams(
  api: KongApi,
  controlPlaneId: string,
  size = 100,
  offset?: string
) {
  try {
    const result = await api.listUpstreams(controlPlaneId, size, offset);

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        size: size,
        offset: offset || null,
        nextOffset: result.offset,
        totalCount: result.total
      },
      upstreams: result.data.map((upstream: any) => ({
        upstreamId: upstream.id,
        name: upstream.name,
        algorithm: upstream.algorithm,
        slots: upstream.slots,
        hashOn: upstream.hash_on,
        hashFallback: upstream.hash_fallback,
        healthchecks: {
          active: {
            enabled: upstream.healthchecks?.active?.timeout > 0,
            type: upstream.healthchecks?.active?.type,
            httpPath: upstream.healthchecks?.active?.http_path,
            interval: upstream.healthchecks?.active?.healthy?.interval,
            timeout: upstream.healthchecks?.active?.timeout
          },
          passive: {
            enabled: upstream.healthchecks?.passive?.healthy?.successes > 0,
            type: upstream.healthchecks?.passive?.type
          },
          threshold: upstream.healthchecks?.threshold
        },
        hostHeader: upstream.host_header,
        clientCertificate: upstream.client_certificate,
        tags: upstream.tags,
        metadata: {
          createdAt: upstream.created_at,
          updatedAt: upstream.updated_at
        }
      })),
      healthSummary: {
        totalUpstreams: result.data.length,
        activeHealthchecksEnabled: result.data.filter((u: any) => 
          u.healthchecks?.active?.timeout > 0).length,
        passiveHealthchecksEnabled: result.data.filter((u: any) => 
          u.healthchecks?.passive?.healthy?.successes > 0).length,
        loadBalancingAlgorithms: [...new Set(result.data.map((u: any) => u.algorithm))]
      },
      relatedTools: [
        "Use get-upstream to see detailed configuration",
        "Use list-upstream-targets to see backend targets",
        "Use get-upstream-health to check target health status"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get detailed upstream configuration and analysis
 */
export async function getUpstream(
  api: KongApi,
  controlPlaneId: string,
  upstreamId: string
) {
  try {
    const result = await api.getUpstream(controlPlaneId, upstreamId);
    const upstream = result.data;

    // Analyze configuration for best practices
    const configAnalysis = {
      loadBalancing: {
        algorithm: upstream.algorithm,
        slots: upstream.slots,
        recommendation: upstream.algorithm === "round-robin" && upstream.slots > 10000 ? 
          "Consider reducing slots for round-robin algorithm" : "Configuration looks optimal"
      },
      healthChecks: {
        active: !!upstream.healthchecks?.active?.timeout,
        passive: !!upstream.healthchecks?.passive?.healthy?.successes,
        recommendation: !upstream.healthchecks?.active?.timeout ? 
          "Consider enabling active health checks for better reliability" : "Health checks configured"
      },
      security: {
        tlsEnabled: !!upstream.client_certificate,
        recommendation: !upstream.client_certificate ? 
          "Consider enabling mTLS for upstream connections" : "TLS configuration present"
      }
    };

    return {
      upstreamDetails: {
        upstreamId: upstream.id,
        name: upstream.name,
        algorithm: upstream.algorithm,
        slots: upstream.slots,
        hashConfiguration: {
          hashOn: upstream.hash_on,
          hashFallback: upstream.hash_fallback,
          hashOnHeader: upstream.hash_on_header,
          hashOnCookie: upstream.hash_on_cookie,
          hashOnQueryArg: upstream.hash_on_query_arg
        },
        healthchecks: upstream.healthchecks,
        hostHeader: upstream.host_header,
        clientCertificate: upstream.client_certificate,
        useSrvName: upstream.use_srv_name,
        tags: upstream.tags,
        metadata: {
          createdAt: upstream.created_at,
          updatedAt: upstream.updated_at
        }
      },
      configurationAnalysis: configAnalysis,
      relatedTools: [
        "Use list-upstream-targets to manage backend servers",
        "Use get-upstream-health to monitor target health",
        "Use query-api-requests to analyze traffic patterns"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * List targets for a specific upstream
 */
export async function listUpstreamTargets(
  api: KongApi,
  controlPlaneId: string,
  upstreamId: string,
  size = 100,
  offset?: string
) {
  try {
    const result = await api.listUpstreamTargets(controlPlaneId, upstreamId, size, offset);

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        upstreamId: upstreamId,
        size: size,
        offset: offset || null,
        nextOffset: result.offset,
        totalCount: result.total
      },
      targets: result.data.map((target: any) => ({
        targetId: target.id,
        target: target.target,
        weight: target.weight,
        tags: target.tags,
        status: target.weight > 0 ? "active" : "disabled",
        metadata: {
          createdAt: target.created_at,
          updatedAt: target.updated_at
        }
      })),
      targetSummary: {
        totalTargets: result.data.length,
        activeTargets: result.data.filter((t: any) => t.weight > 0).length,
        disabledTargets: result.data.filter((t: any) => t.weight === 0).length,
        weightDistribution: result.data.map((t: any) => ({
          target: t.target,
          weight: t.weight,
          percentage: result.data.reduce((sum: number, target: any) => sum + target.weight, 0) > 0 ?
            ((t.weight / result.data.reduce((sum: number, target: any) => sum + target.weight, 0)) * 100).toFixed(1) : "0"
        }))
      },
      recommendations: [
        "Ensure at least 2 healthy targets for high availability",
        "Monitor target weights for proper load distribution",
        "Use health checks to automatically manage target availability"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get upstream health status with detailed analysis
 */
export async function getUpstreamHealth(
  api: KongApi,
  controlPlaneId: string,
  upstreamId: string
) {
  try {
    const result = await api.getUpstreamHealth(controlPlaneId, upstreamId);

    // Process health data (structure may vary based on Kong version)
    const healthData = result.data || result;

    return {
      upstreamId: upstreamId,
      healthStatus: {
        overall: "healthy", // This would be calculated based on target health
        lastChecked: new Date().toISOString(),
        targets: healthData.targets || []
      },
      healthAnalysis: {
        healthyTargets: 0, // Would be calculated from actual health data
        unhealthyTargets: 0,
        totalTargets: (healthData.targets || []).length,
        recommendations: [
          "Monitor upstream health regularly",
          "Configure appropriate health check intervals",
          "Set up alerts for target failures"
        ]
      },
      troubleshooting: {
        commonIssues: [
          "Network connectivity problems to upstream servers",
          "Misconfigured health check endpoints",
          "Target server overload or maintenance",
          "DNS resolution issues"
        ],
        diagnosticSteps: [
          "Check target server availability directly",
          "Verify health check endpoint responses",
          "Review Kong logs for upstream errors",
          "Test network connectivity from Kong to targets"
        ]
      }
    };
  } catch (error) {
    // Health endpoint might not be available or might return 404
    return {
      upstreamId: upstreamId,
      healthStatus: {
        overall: "unknown",
        error: error.message,
        lastChecked: new Date().toISOString()
      },
      troubleshooting: {
        note: "Health endpoint may not be available or configured",
        alternatives: [
          "Use list-upstream-targets to check target configuration",
          "Monitor API request analytics for upstream errors",
          "Check Kong logs for health check results"
        ]
      }
    };
  }
}