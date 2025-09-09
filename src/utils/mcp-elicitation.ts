/**
 * MCP-Native Elicitation Implementation
 * 
 * Based on best practices from elicitation.md - uses MCP's built-in context.elicit()
 * instead of complex enforcement layers.
 */

import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export interface KongDeploymentContext {
  domain?: string;
  environment?: string;
  team?: string;
  [key: string]: any;
}

export interface ElicitationRequest {
  message: string;
  schema: any;
  timeout?: number;
}

/**
 * Progressive Context Gatherer using MCP's native elicitation
 */
export class MCPElicitationManager {
  private contextCache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();

  /**
   * Gather required Kong deployment context using progressive disclosure
   */
  async gatherKongContext(
    provided: Partial<KongDeploymentContext>,
    mcpContext: any
  ): Promise<KongDeploymentContext | null> {
    const missing = this.identifyMissingContext(provided);
    
    if (missing.length === 0) {
      return provided as KongDeploymentContext;
    }

    // Phase 1: Essential information (mandatory fields)
    const essentialResult = await this.elicitEssentialContext(missing, mcpContext);
    if (!essentialResult) return null;

    const completeContext = { ...provided, ...essentialResult };
    
    // Phase 2: Additional context if needed (optional fields)
    if (this.shouldGatherAdditionalContext(completeContext)) {
      const additionalResult = await this.elicitAdditionalContext(completeContext, mcpContext);
      if (additionalResult) {
        Object.assign(completeContext, additionalResult);
      }
    }

    // Cache the result for future use
    this.cacheContext('kong-deployment', completeContext, 3600); // 1 hour TTL
    
    return completeContext;
  }

  /**
   * Get cached context or elicit new information
   */
  async getCachedOrElicit<T>(
    key: string,
    elicitFunc: () => Promise<T>,
    ttlSeconds: number = 3600
  ): Promise<T | null> {
    const cached = this.contextCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < cached.ttl * 1000) {
      return cached.data as T;
    }

    try {
      const data = await elicitFunc();
      this.cacheContext(key, data, ttlSeconds);
      return data;
    } catch (error) {
      console.error(`Elicitation failed for ${key}:`, error);
      return null;
    }
  }

  private identifyMissingContext(provided: Partial<KongDeploymentContext>): string[] {
    const required = ['domain', 'environment', 'team'];
    return required.filter(field => !provided[field]);
  }

  private async elicitEssentialContext(
    missingFields: string[],
    mcpContext: any
  ): Promise<Partial<KongDeploymentContext> | null> {
    if (!mcpContext || !mcpContext.elicit) {
      // Fallback for environments without MCP elicitation
      console.warn('MCP elicitation not available, context required but cannot be gathered');
      return null;
    }

    const schema = this.buildEssentialSchema(missingFields);
    
    try {
      const result = await mcpContext.elicit({
        message: `🚨 Kong Deployment Context Required

Missing essential information for production-grade deployment:
${missingFields.map(field => `• ${this.getFieldDescription(field)}`).join('\n')}

Please provide this information to proceed with deployment.`,
        schema,
        timeout: 30000 // 30 seconds
      });

      if (result.action === 'accept') {
        return this.validateAndNormalizeContext(result.data);
      } else if (result.action === 'decline') {
        console.warn('User declined to provide essential context');
        return null;
      } else {
        console.warn('Elicitation cancelled by user');
        return null;
      }
    } catch (error) {
      console.error('Essential context elicitation failed:', error);
      return null;
    }
  }

  private async elicitAdditionalContext(
    baseContext: KongDeploymentContext,
    mcpContext: any
  ): Promise<Partial<KongDeploymentContext> | null> {
    const additionalSchema = {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Optional description for this deployment"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Additional tags for entities"
        },
        criticality: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Criticality level for this deployment"
        }
      },
      additionalProperties: false
    };

    try {
      const result = await mcpContext.elicit({
        message: `📋 Optional Deployment Context

You're deploying to: ${baseContext.environment} environment, ${baseContext.domain} domain, ${baseContext.team} team

Would you like to provide additional context? (You can skip this step)`,
        schema: additionalSchema,
        timeout: 20000 // 20 seconds
      });

      if (result.action === 'accept') {
        return result.data;
      }
    } catch (error) {
      // Additional context is optional, so failures are not critical
      console.log('Additional context elicitation skipped or failed:', error.message);
    }

    return null;
  }

  private buildEssentialSchema(missingFields: string[]): any {
    const properties: any = {};
    const required: string[] = [];

    missingFields.forEach(field => {
      switch (field) {
        case 'domain':
          properties.domain = {
            type: "string",
            enum: ["api", "platform", "backend", "demo", "development", "infrastructure"],
            description: "Domain classification for service organization"
          };
          required.push('domain');
          break;
          
        case 'environment':
          properties.environment = {
            type: "string",
            enum: ["production", "staging", "development", "test"],
            description: "Target deployment environment"
          };
          required.push('environment');
          break;
          
        case 'team':
          properties.team = {
            type: "string",
            description: "Team responsible for this service (e.g., platform, devops, api, backend)"
          };
          required.push('team');
          break;
      }
    });

    return {
      type: "object",
      properties,
      required,
      additionalProperties: false
    };
  }

  private getFieldDescription(field: string): string {
    const descriptions = {
      domain: "Domain (api, platform, backend, etc.)",
      environment: "Environment (production, staging, development, test)",
      team: "Team ownership (platform, devops, api, etc.)"
    };
    return descriptions[field as keyof typeof descriptions] || field;
  }

  private validateAndNormalizeContext(data: any): Partial<KongDeploymentContext> {
    const normalized: Partial<KongDeploymentContext> = {};

    if (data.domain) {
      normalized.domain = data.domain.toLowerCase().trim();
    }

    if (data.environment) {
      normalized.environment = data.environment.toLowerCase().trim();
    }

    if (data.team) {
      normalized.team = data.team.toLowerCase().trim();
    }

    return normalized;
  }

  private shouldGatherAdditionalContext(context: KongDeploymentContext): boolean {
    // Gather additional context for production or high-priority deployments
    return context.environment === 'production' || context.domain === 'api';
  }

  private cacheContext(key: string, data: any, ttlSeconds: number): void {
    this.contextCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  /**
   * Generate production-ready tags from context
   */
  generateTags(context: KongDeploymentContext, entityType: string, entityName?: string): string[] {
    const tags: string[] = [];

    // Mandatory tags (3)
    tags.push(`env-${context.environment}`);
    tags.push(`domain-${context.domain}`);
    tags.push(`team-${context.team}`);

    // Contextual tags based on entity type (2)
    switch (entityType) {
      case 'service':
        tags.push('function-api-gateway');
        tags.push('type-external-api');
        break;
      case 'route':
        tags.push('function-routing');
        tags.push('access-public');
        break;
      case 'consumer':
        tags.push('function-authentication');
        tags.push('access-external');
        break;
      case 'plugin':
        tags.push('function-security');
        tags.push('criticality-high');
        break;
      default:
        tags.push(`function-${entityType}`);
        tags.push('type-component');
    }

    // Additional tags from context
    if (context.criticality) {
      tags[tags.length - 1] = `criticality-${context.criticality}`;
    }

    return tags.slice(0, 5); // Kong's recommended limit
  }
}

/**
 * Global elicitation manager instance
 */
export const mcpElicitationManager = new MCPElicitationManager();