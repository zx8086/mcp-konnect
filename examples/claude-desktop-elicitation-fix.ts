/**
 * Claude Desktop Compatible Elicitation Implementation
 * 
 * This shows how to modify the elicitation system to work with Claude Desktop
 * by returning prompts directly instead of relying on MCP context.elicit()
 */

export interface ElicitationPrompt {
  field: string;
  question: string;
  required: boolean;
  suggestions: string[];
  description: string;
}

export interface ElicitationResult {
  needsUserInput: boolean;
  questions: ElicitationPrompt[];
  message: string;
  canProceedWithDefaults?: boolean;
  defaults?: Record<string, string>;
}

/**
 * Modified version of elicitEssentialContext that works with Claude Desktop
 */
private async elicitEssentialContext(
  missingFields: string[],
  mcpContext: any
): Promise<Partial<KongDeploymentContext> | ElicitationResult | null> {
  
  // Try MCP elicitation first (for Claude Code)
  if (mcpContext && mcpContext.elicit) {
    const schema = this.buildEssentialSchema(missingFields);
    
    try {
      const result = await mcpContext.elicit({
        message: `🚨 Kong Deployment Context Required...`,
        schema,
        timeout: 30000
      });

      if (result.action === 'accept') {
        return this.validateAndNormalizeContext(result.data);
      } else {
        return null;
      }
    } catch (error) {
      console.error('MCP elicitation failed:', error);
      // Fall through to Claude Desktop approach
    }
  }

  // Fallback for Claude Desktop - return questions for user to answer
  console.warn('MCP elicitation not available, using direct prompt approach');
  
  const questions: ElicitationPrompt[] = missingFields.map(field => {
    switch (field) {
      case 'domain':
        return {
          field: 'domain',
          question: 'What domain should this configuration be tagged with?',
          required: true,
          suggestions: ['api', 'platform', 'backend', 'demo', 'foundation', 'services'],
          description: 'Domain classification helps organize services by functional area'
        };
      
      case 'environment':
        return {
          field: 'environment', 
          question: 'What environment is this deployment for?',
          required: true,
          suggestions: ['production', 'staging', 'development', 'test'],
          description: 'Environment specification is critical for deployment safety'
        };
        
      case 'team':
        return {
          field: 'team',
          question: 'Which team owns this configuration?', 
          required: true,
          suggestions: ['platform-team', 'devops', 'backend', 'api-team', 'infrastructure'],
          description: 'Team ownership for operational responsibility'
        };
        
      default:
        return {
          field,
          question: `What ${field} should be used?`,
          required: true, 
          suggestions: [],
          description: `Specify the ${field} for this deployment`
        };
    }
  });

  return {
    needsUserInput: true,
    questions,
    message: `🚨 **Missing Required Information**

To deploy this configuration safely, I need the following information:

${questions.map(q => `• **${q.field.toUpperCase()}**: ${q.question}`).join('\n')}

Please provide these values so I can proceed with the deployment with proper tagging and organization.`,
    canProceedWithDefaults: false
  };
}

/**
 * Modified service creation that handles elicitation results
 */
export async function createServiceWithElicitation(
  api: KongApi,
  args: any,
  extra: RequestHandlerExtra
): Promise<any> {
  try {
    // Extract provided context
    const providedContext: Partial<KongDeploymentContext> = {
      domain: extractFromTags(args.tags, 'domain'),
      environment: extractFromTags(args.tags, 'env'),
      team: extractFromTags(args.tags, 'team')
    };

    // Gather missing context
    const mcpContext = (extra as any).context;
    const contextResult = await mcpElicitationManager.gatherKongContext(
      providedContext,
      mcpContext
    );

    // Handle different result types
    if (!contextResult) {
      return {
        error: "DEPLOYMENT_CANCELLED",
        message: "Service creation cancelled - required deployment context not provided",
        reason: "User declined to provide mandatory information (domain, environment, team)"
      };
    }

    // Check if this is an elicitation request (Claude Desktop)
    if ('needsUserInput' in contextResult) {
      return {
        error: "CONTEXT_REQUIRED",
        elicitation: contextResult,
        message: "Please provide the required context to proceed with service creation",
        nextStep: "After providing the context, call create_service again with the tags parameter containing your responses"
      };
    }

    // Proceed with service creation if we have complete context
    const completeContext = contextResult as KongDeploymentContext;
    const tags = mcpElicitationManager.generateTags(completeContext, 'service', args.name);

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

    return {
      ...result,
      deploymentContext: completeContext,
      appliedTags: tags,
      message: `Service '${args.name}' created successfully with complete deployment context`
    };

  } catch (error) {
    return {
      error: "SERVICE_CREATION_FAILED",
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Example of how Claude Desktop would handle the response
 */
export function handleElicitationInClaudeDesktop(serviceResult: any) {
  if (serviceResult.error === "CONTEXT_REQUIRED" && serviceResult.elicitation) {
    const { questions } = serviceResult.elicitation;
    
    // Claude Desktop would present this to user:
    console.log("I need some information to proceed:");
    
    questions.forEach((q: ElicitationPrompt) => {
      console.log(`\n**${q.question}**`);
      console.log(`Suggestions: ${q.suggestions.join(', ')}`);
      console.log(`Description: ${q.description}`);
    });
    
    console.log("\nOnce you provide these values, I'll create the service with proper tags like:");
    console.log("- env-production");
    console.log("- domain-api");  
    console.log("- team-platform");
    console.log("- function-gateway");
    console.log("- type-service");
    
    // User would then say something like:
    // "domain=api, environment=production, team=platform"
    // 
    // Then Claude Desktop calls create_service again with tags:
    // tags: ["env-production", "domain-api", "team-platform", "function-gateway", "type-service"]
  }
}