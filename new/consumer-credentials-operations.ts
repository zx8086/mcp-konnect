import { KongApi } from "../api.js";

/**
 * List API keys for a specific consumer with security analysis
 */
export async function listConsumerKeys(
  api: KongApi,
  controlPlaneId: string,
  consumerId: string,
  size = 100,
  offset?: string
) {
  try {
    const result = await api.listConsumerKeys(controlPlaneId, consumerId, size, offset);

    const now = Date.now() / 1000;

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        consumerId: consumerId,
        size: size,
        offset: offset || null,
        nextOffset: result.offset,
        totalCount: result.total
      },
      apiKeys: result.data.map((key: any) => {
        const createdAgo = key.created_at ? now - key.created_at : null;
        const ageInDays = createdAgo ? Math.floor(createdAgo / (24 * 60 * 60)) : null;
        
        return {
          keyId: key.id,
          key: key.key ? `${key.key.substring(0, 8)}...` : null, // Partially redacted for security
          ttl: key.ttl,
          tags: key.tags,
          security: {
            ageInDays: ageInDays,
            needsRotation: ageInDays ? ageInDays > 90 : false,
            hasExpiration: !!key.ttl,
            expiresAt: key.ttl ? new Date((key.created_at + key.ttl) * 1000).toISOString() : null
          },
          metadata: {
            createdAt: key.created_at,
            updatedAt: key.updated_at
          }
        };
      }),
      securityAnalysis: {
        totalKeys: result.data.length,
        keysNeedingRotation: result.data.filter((key: any) => {
          const ageInDays = key.created_at ? Math.floor((now - key.created_at) / (24 * 60 * 60)) : 0;
          return ageInDays > 90;
        }).length,
        keysWithExpiration: result.data.filter((key: any) => !!key.ttl).length,
        recommendations: [
          "Rotate API keys older than 90 days",
          "Consider setting TTL for automatic key expiration",
          "Monitor key usage patterns for suspicious activity",
          "Use strong, random key generation"
        ]
      },
      relatedTools: [
        "Use create-consumer-key to generate new API keys",
        "Use delete-consumer-key to remove compromised keys",
        "Use get-consumer-requests to analyze key usage patterns"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new API key for a consumer with security best practices
 */
export async function createConsumerKey(
  api: KongApi,
  controlPlaneId: string,
  consumerId: string,
  key?: string,
  ttl?: number,
  tags?: string[]
) {
  try {
    // Security validations
    if (key) {
      if (key.length < 32) {
        throw new Error("Custom API key should be at least 32 characters long for security");
      }
      
      // Check for common weak patterns
      const weakPatterns = [
        /^[a-z]+$/i,  // Only letters
        /^[0-9]+$/,   // Only numbers
        /(.)\1{3,}/,  // Repeated characters
        /^(test|demo|sample|example)/i  // Common test patterns
      ];
      
      if (weakPatterns.some(pattern => pattern.test(key))) {
        throw new Error("API key appears to use a weak pattern. Use a strong, random key.");
      }
    }

    // Recommend TTL if not provided
    const recommendedTtl = ttl || (90 * 24 * 60 * 60); // 90 days in seconds

    const keyData = {
      ...(key && { key }),
      ...(ttl && { ttl }),
      ...(tags && { tags })
    };

    const result = await api.createConsumerKey(controlPlaneId, consumerId, keyData);

    return {
      success: true,
      apiKey: {
        keyId: result.data.id,
        key: result.data.key,
        ttl: result.data.ttl,
        expiresAt: result.data.ttl ? 
          new Date((result.data.created_at + result.data.ttl) * 1000).toISOString() : null,
        tags: result.data.tags,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      securityRecommendations: [
        "Store the API key securely and never expose it in client-side code",
        "Rotate this key regularly (recommended every 90 days)",
        "Monitor key usage for any suspicious activity",
        !ttl ? "Consider setting TTL for automatic expiration" : "Key will expire automatically",
        "Use HTTPS when transmitting the API key"
      ],
      nextSteps: [
        "Test the new API key with your application",
        "Update your application configuration",
        "Document the key rotation schedule"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete an API key with security confirmation
 */
export async function deleteConsumerKey(
  api: KongApi,
  controlPlaneId: string,
  consumerId: string,
  keyId: string
) {
  try {
    await api.deleteConsumerKey(controlPlaneId, consumerId, keyId);

    return {
      success: true,
      message: "API key deleted successfully",
      securityNote: "The deleted key can no longer be used for authentication",
      recommendations: [
        "Verify the key is no longer in use by applications",
        "Update client applications to use alternative keys",
        "Monitor for any authentication failures",
        "Consider creating a replacement key if needed"
      ],
      relatedTools: [
        "Use create-consumer-key to generate a replacement key",
        "Use list-consumer-keys to see remaining keys",
        "Use get-consumer-requests to monitor authentication activity"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * List SNIs for a control plane with SSL/TLS analysis
 */
export async function listSNIs(
  api: KongApi,
  controlPlaneId: string,
  size = 100,
  offset?: string
) {
  try {
    const result = await api.listSNIs(controlPlaneId, size, offset);

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        size: size,
        offset: offset || null,
        nextOffset: result.offset,
        totalCount: result.total
      },
      snis: result.data.map((sni: any) => ({
        sniId: sni.id,
        name: sni.name,
        certificateId: sni.certificate?.id,
        tags: sni.tags,
        sslAnalysis: {
          isWildcard: sni.name.startsWith("*."),
          domain: sni.name.replace(/^\*\./, ""),
          certificateAssociated: !!sni.certificate?.id
        },
        metadata: {
          createdAt: sni.created_at,
          updatedAt: sni.updated_at
        }
      })),
      sslSummary: {
        totalSNIs: result.data.length,
        wildcardSNIs: result.data.filter((sni: any) => sni.name.startsWith("*.")).length,
        uniqueDomains: [...new Set(result.data.map((sni: any) => 
          sni.name.replace(/^\*\./, "")))].length,
        recommendations: [
          "Use wildcard certificates for subdomains when possible",
          "Ensure all SNIs have associated certificates",
          "Monitor certificate expiration dates",
          "Test SSL/TLS configuration regularly"
        ]
      },
      relatedTools: [
        "Use list-certificates to manage SSL certificates",
        "Use create-sni to associate hostnames with certificates",
        "Use create-certificate to upload new certificates"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new SNI with validation
 */
export async function createSNI(
  api: KongApi,
  controlPlaneId: string,
  name: string,
  certificateId: string,
  tags?: string[]
) {
  try {
    // Validation
    if (!name) {
      throw new Error("SNI name (hostname) is required");
    }

    if (!certificateId) {
      throw new Error("Certificate ID is required");
    }

    // Basic hostname validation
    const hostnameRegex = /^(\*\.)?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.?[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    if (!hostnameRegex.test(name) && name !== "localhost") {
      throw new Error("Invalid hostname format");
    }

    const sniData = {
      name,
      certificate: { id: certificateId },
      ...(tags && { tags })
    };

    const result = await api.createSNI(controlPlaneId, sniData);

    return {
      success: true,
      sni: {
        sniId: result.data.id,
        name: result.data.name,
        certificateId: result.data.certificate?.id,
        tags: result.data.tags,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      sslConfiguration: {
        hostname: result.data.name,
        isWildcard: result.data.name.startsWith("*."),
        certificateAssociated: true
      },
      recommendations: [
        "Test SSL/TLS connection to verify configuration",
        "Update DNS records to point to Kong Gateway",
        "Monitor certificate expiration dates",
        "Test with multiple client applications"
      ],
      nextSteps: [
        "Configure routes to use this hostname",
        "Test HTTPS connectivity",
        "Update application configuration"
      ]
    };
  } catch (error) {
    throw error;
  }
}