import { KongApi } from "../api.js";

/**
 * List data plane nodes with comprehensive status analysis
 */
export async function listDataPlaneNodes(
  api: KongApi,
  controlPlaneId: string,
  pageSize = 100,
  pageAfter?: string
) {
  try {
    const result = await api.listDataPlaneNodes(controlPlaneId, pageSize, pageAfter);

    const nodes = result.items || [];
    const now = Date.now() / 1000;

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        pageSize: pageSize,
        pageAfter: pageAfter || null,
        nextPageAfter: result.page?.next,
        totalCount: result.page?.total || nodes.length
      },
      nodes: nodes.map((node: any) => {
        const lastPingAgo = node.last_ping ? now - node.last_ping : null;
        const isStale = lastPingAgo ? lastPingAgo > 300 : true; // 5 minutes
        
        return {
          nodeId: node.id,
          hostname: node.hostname,
          version: node.version,
          type: node.type,
          lastPing: node.last_ping,
          lastPingAgo: lastPingAgo,
          configHash: node.config_hash,
          compatibilityStatus: node.compatibility_status,
          status: {
            connectivity: isStale ? "disconnected" : "connected",
            healthStatus: !isStale ? "healthy" : "unhealthy",
            warnings: isStale ? ["Node hasn't pinged in over 5 minutes"] : []
          },
          metadata: {
            createdAt: node.created_at,
            updatedAt: node.updated_at
          }
        };
      }),
      clusterHealth: {
        totalNodes: nodes.length,
        connectedNodes: nodes.filter((node: any) => 
          node.last_ping && (now - node.last_ping) < 300).length,
        disconnectedNodes: nodes.filter((node: any) => 
          !node.last_ping || (now - node.last_ping) >= 300).length,
        versions: [...new Set(nodes.map((node: any) => node.version))],
        configHashMatch: nodes.filter((node: any) => 
          node.config_hash === nodes[0]?.config_hash).length === nodes.length,
        compatibilityIssues: nodes.filter((node: any) => 
          node.compatibility_status?.state !== "OK").length
      },
      recommendations: [
        "Investigate any disconnected nodes immediately",
        "Ensure all nodes have matching config hashes",
        "Monitor version compatibility across the cluster",
        "Set up alerting for node connectivity issues"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get detailed information about a specific data plane node
 */
export async function getDataPlaneNode(
  api: KongApi,
  controlPlaneId: string,
  nodeId: string
) {
  try {
    const result = await api.getDataPlaneNode(controlPlaneId, nodeId);
    const node = result.item;

    const now = Date.now() / 1000;
    const lastPingAgo = node.last_ping ? now - node.last_ping : null;
    const isStale = lastPingAgo ? lastPingAgo > 300 : true;

    return {
      nodeDetails: {
        nodeId: node.id,
        hostname: node.hostname,
        version: node.version,
        type: node.type,
        lastPing: node.last_ping,
        lastPingAgo: lastPingAgo,
        configHash: node.config_hash,
        compatibilityStatus: node.compatibility_status,
        metadata: {
          createdAt: node.created_at,
          updatedAt: node.updated_at
        }
      },
      healthAnalysis: {
        connectivity: isStale ? "disconnected" : "connected",
        timeSinceLastPing: lastPingAgo ? `${Math.floor(lastPingAgo)} seconds` : "Never",
        configSync: "check with get-expected-config-hash",
        warnings: [
          ...(isStale ? ["Node appears disconnected"] : []),
          ...(node.compatibility_status?.state !== "OK" ? 
            [`Compatibility issue: ${node.compatibility_status?.state}`] : [])
        ]
      },
      troubleshooting: {
        commonIssues: [
          "Network connectivity between control plane and data plane",
          "Certificate authentication issues",
          "Firewall blocking required ports",
          "Data plane configuration errors"
        ],
        diagnosticSteps: [
          "Check data plane logs for connection errors",
          "Verify control plane endpoint accessibility",
          "Validate certificates and authentication",
          "Compare config hash with expected hash"
        ]
      },
      relatedTools: [
        "Use get-expected-config-hash to verify configuration sync",
        "Use delete-data-plane-node to remove stale nodes",
        "Use list-data-plane-nodes to see cluster-wide status"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a data plane node record
 */
export async function deleteDataPlaneNode(
  api: KongApi,
  controlPlaneId: string,
  nodeId: string
) {
  try {
    await api.deleteDataPlaneNode(controlPlaneId, nodeId);

    return {
      success: true,
      message: "Data plane node record deleted successfully",
      important: "This only removes the record - the actual data plane node will reconnect if it's still running",
      recommendations: [
        "Verify the node doesn't reconnect if it was intentionally decommissioned",
        "Check cluster health after removal",
        "Update load balancer configuration if necessary"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get expected configuration hash for the control plane
 */
export async function getExpectedConfigHash(
  api: KongApi,
  controlPlaneId: string
) {
  try {
    const result = await api.getExpectedConfigHash(controlPlaneId);

    return {
      controlPlaneId: controlPlaneId,
      expectedConfigHash: result.expected_hash,
      configMetadata: {
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      usage: {
        purpose: "Compare this hash with data plane node config hashes to verify synchronization",
        interpretation: [
          "Matching hashes indicate nodes are synchronized",
          "Different hashes suggest configuration drift",
          "Use this for troubleshooting connectivity issues"
        ]
      },
      relatedTools: [
        "Use list-data-plane-nodes to compare individual node hashes",
        "Use get-data-plane-node for detailed node status"
      ]
    };
  } catch (error) {
    throw error;
  }
}