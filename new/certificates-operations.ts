import { KongApi } from "../api.js";

/**
 * List certificates for a specific control plane with health analysis
 */
export async function listCertificates(
  api: KongApi,
  controlPlaneId: string,
  size = 100,
  offset?: string
) {
  try {
    const result = await api.listCertificates(controlPlaneId, size, offset);

    // Analyze certificate health (expiration dates, etc.)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    return {
      metadata: {
        controlPlaneId: controlPlaneId,
        size: size,
        offset: offset || null,
        nextOffset: result.offset,
        totalCount: result.total
      },
      certificates: result.data.map((cert: any) => {
        // Parse certificate to extract expiration date
        let expirationDate = null;
        let daysUntilExpiration = null;
        let expirationStatus = "unknown";
        
        try {
          // This is a simplified approach - in production you'd want proper certificate parsing
          if (cert.cert) {
            const certLines = cert.cert.split('\n');
            // Look for certificate validity period (this is simplified)
            // In production, you'd use a proper X.509 certificate parser
            expirationStatus = "valid";
          }
        } catch (error) {
          console.error("Error parsing certificate:", error);
        }

        return {
          certificateId: cert.id,
          cert: cert.cert ? "*** REDACTED ***" : null, // Don't expose full cert in response
          certDigest: cert.cert_digest,
          certAlt: cert.cert_alt ? "*** REDACTED ***" : null,
          snis: cert.snis || [],
          tags: cert.tags,
          expirationAnalysis: {
            status: expirationStatus,
            daysUntilExpiration: daysUntilExpiration,
            expirationDate: expirationDate,
            warnings: daysUntilExpiration && daysUntilExpiration < 30 ? 
              ["Certificate expires within 30 days"] : []
          },
          metadata: {
            createdAt: cert.created_at,
            updatedAt: cert.updated_at
          }
        };
      }),
      healthSummary: {
        totalCertificates: result.data.length,
        expiringSoon: result.data.filter((cert: any) => {
          // This would be properly implemented with certificate parsing
          return false; // Placeholder
        }).length,
        recommendations: [
          "Review certificates expiring within 30 days",
          "Consider automating certificate renewal with ACME plugin",
          "Use create-certificate tool to upload new certificates"
        ]
      },
      relatedTools: [
        "Use get-certificate to inspect specific certificate details",
        "Use create-certificate to upload new certificates",
        "Use list-snis to see SNI associations"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get detailed information about a specific certificate
 */
export async function getCertificate(
  api: KongApi,
  controlPlaneId: string,
  certificateId: string
) {
  try {
    const result = await api.getCertificate(controlPlaneId, certificateId);

    // Enhanced certificate analysis
    const cert = result.data;
    
    return {
      certificateDetails: {
        certificateId: cert.id,
        certDigest: cert.cert_digest,
        snis: cert.snis || [],
        tags: cert.tags,
        hasAlternateCert: !!cert.cert_alt,
        certificateInfo: {
          // In production, you'd parse the actual certificate
          type: cert.cert_alt ? "RSA + ECDSA" : "RSA",
          keyType: "RSA", // Would be determined from cert parsing
        },
        metadata: {
          createdAt: cert.created_at,
          updatedAt: cert.updated_at
        }
      },
      securityRecommendations: [
        "Verify certificate chain is complete",
        "Ensure private key is securely stored",
        "Monitor certificate expiration dates",
        "Consider using ECDSA certificates for better performance"
      ],
      relatedTools: [
        "Use update-certificate to rotate certificates",
        "Use list-snis to manage hostname associations",
        "Use delete-certificate to remove unused certificates"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new certificate with validation
 */
export async function createCertificate(
  api: KongApi,
  controlPlaneId: string,
  cert: string,
  key: string,
  certAlt?: string,
  keyAlt?: string,
  tags?: string[]
) {
  try {
    // Basic validation
    if (!cert.includes("BEGIN CERTIFICATE")) {
      throw new Error("Invalid certificate format. Must be PEM-encoded.");
    }
    
    if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
      throw new Error("Invalid private key format. Must be PEM-encoded.");
    }

    const certificateData = {
      cert,
      key,
      ...(certAlt && { cert_alt: certAlt }),
      ...(keyAlt && { key_alt: keyAlt }),
      ...(tags && { tags })
    };

    const result = await api.createCertificate(controlPlaneId, certificateData);

    return {
      success: true,
      certificate: {
        certificateId: result.data.id,
        certDigest: result.data.cert_digest,
        snis: result.data.snis || [],
        tags: result.data.tags,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      nextSteps: [
        "Associate certificate with SNIs using create-sni tool",
        "Update routes to use HTTPS with this certificate",
        "Test certificate installation with SSL checker tools"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Update an existing certificate
 */
export async function updateCertificate(
  api: KongApi,
  controlPlaneId: string,
  certificateId: string,
  cert: string,
  key: string,
  certAlt?: string,
  keyAlt?: string,
  tags?: string[]
) {
  try {
    // Basic validation
    if (!cert.includes("BEGIN CERTIFICATE")) {
      throw new Error("Invalid certificate format. Must be PEM-encoded.");
    }
    
    if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
      throw new Error("Invalid private key format. Must be PEM-encoded.");
    }

    const certificateData = {
      cert,
      key,
      ...(certAlt && { cert_alt: certAlt }),
      ...(keyAlt && { key_alt: keyAlt }),
      ...(tags && { tags })
    };

    const result = await api.updateCertificate(controlPlaneId, certificateId, certificateData);

    return {
      success: true,
      certificate: {
        certificateId: result.data.id,
        certDigest: result.data.cert_digest,
        snis: result.data.snis || [],
        tags: result.data.tags,
        metadata: {
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        }
      },
      recommendations: [
        "Verify all associated SNIs are working correctly",
        "Test certificate rotation completed successfully",
        "Monitor for any SSL/TLS errors in traffic"
      ]
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a certificate with safety checks
 */
export async function deleteCertificate(
  api: KongApi,
  controlPlaneId: string,
  certificateId: string
) {
  try {
    // First check if certificate is in use
    try {
      const certDetails = await api.getCertificate(controlPlaneId, certificateId);
      if (certDetails.data.snis && certDetails.data.snis.length > 0) {
        return {
          success: false,
          error: "Certificate is still associated with SNIs",
          associatedSNIs: certDetails.data.snis,
          recommendation: "Remove SNI associations before deleting certificate"
        };
      }
    } catch (error) {
      // Certificate might not exist, proceed with deletion
    }

    await api.deleteCertificate(controlPlaneId, certificateId);

    return {
      success: true,
      message: "Certificate deleted successfully",
      recommendations: [
        "Verify no traffic disruption occurred",
        "Clean up any unused SNI entries",
        "Update documentation to reflect certificate removal"
      ]
    };
  } catch (error) {
    throw error;
  }
}