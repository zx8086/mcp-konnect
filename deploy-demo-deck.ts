#!/usr/bin/env bun

/**
 * Kong Demo Deck Deployment Script
 * 
 * Deploys the Kong deck configuration from demo/dECK/kong_demo.yaml
 * using direct Kong Konnect API calls with mandatory 5-tag policy.
 * 
 * Context gathered via elicitation:
 * - Domain: demo
 * - Environment: development
 * - Team: platform
 */

import { KongApi } from "./src/api.js";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

// Deployment configuration from elicitation
const DEPLOYMENT_CONFIG = {
  domain: "demo",
  environment: "development", 
  team: "platform",
  controlPlaneId: "1379aab0-2351-4e68-bff9-64e091173c82"
};

// Mandatory tags (3) + Contextual tags (2) = 5 total per entity
const MANDATORY_TAGS = [
  `env-${DEPLOYMENT_CONFIG.environment}`,
  `domain-${DEPLOYMENT_CONFIG.domain}`, 
  `team-${DEPLOYMENT_CONFIG.team}`
];

async function deployKongDeck() {
  console.error("STARTING Kong Demo Deck Deployment");
  console.error("=====================================");
  console.error(`Target Control Plane: ${DEPLOYMENT_CONFIG.controlPlaneId}`);
  console.error(`Domain: ${DEPLOYMENT_CONFIG.domain}`);
  console.error(`Environment: ${DEPLOYMENT_CONFIG.environment}`);
  console.error(`Team: ${DEPLOYMENT_CONFIG.team}`);
  console.error("");

  // Initialize Kong API client
  const api = new KongApi({
    apiKey: process.env.KONNECT_ACCESS_TOKEN,
    apiRegion: process.env.KONNECT_REGION || "eu"
  });

  // Read and parse deck configuration
  const deckPath = path.join(process.cwd(), "demo/dECK/kong_demo.yaml");
  const deckContent = fs.readFileSync(deckPath, "utf8");
  const deckConfig = yaml.load(deckContent) as any;

  console.error("SUCCESS: Deck configuration loaded");
  console.error(`Entities found: Services(${deckConfig.services?.length || 0}), Consumers(${deckConfig.consumers?.length || 0}), Plugins(${deckConfig.plugins?.length || 0})`);
  console.error("");

  const deployedEntities: any = {
    services: [],
    routes: [],
    consumers: [],
    plugins: []
  };

  // STEP 1: Deploy Service (Simple-API-Service)
  console.error("STEP 1: Creating Service - Simple-API-Service");
  console.error("==============================================");
  
  if (deckConfig.services && deckConfig.services.length > 0) {
    const serviceConfig = deckConfig.services[0];
    
    // CONTEXTUAL ANALYSIS for Service:
    // Function: API Gateway - serves HTTP API requests → function-api-gateway
    // Type: External-facing API service → type-external-api
    const serviceData = {
      name: serviceConfig.name,
      host: serviceConfig.host,
      port: serviceConfig.port,
      protocol: serviceConfig.protocol,
      path: serviceConfig.path,
      connect_timeout: serviceConfig.connect_timeout,
      read_timeout: serviceConfig.read_timeout,
      write_timeout: serviceConfig.write_timeout,
      retries: serviceConfig.retries,
      enabled: serviceConfig.enabled,
      tags: [
        ...MANDATORY_TAGS,
        "function-api-gateway",  // What it does - serves API requests
        "type-external-api"      // External-facing service
      ]
    };

    const createdService = await api.createService(DEPLOYMENT_CONFIG.controlPlaneId, serviceData);
    deployedEntities.services.push(createdService);
    
    console.error(`SUCCESS: Service '${createdService.name}' created with ID: ${createdService.id}`);
    console.error(`Tags applied: ${JSON.stringify(serviceData.tags)}`);
    console.error("");

    // STEP 2: Deploy Route (Simple-API-Route)
    console.error("STEP 2: Creating Route - Simple-API-Route");
    console.error("==========================================");
    
    if (serviceConfig.routes && serviceConfig.routes.length > 0) {
      const routeConfig = serviceConfig.routes[0];
      
      // CONTEXTUAL ANALYSIS for Route:
      // Function: Routes API traffic to service → function-routing
      // Access: Public web access → access-public
      const routeData = {
        name: routeConfig.name,
        protocols: routeConfig.protocols,
        methods: routeConfig.methods,
        paths: routeConfig.paths,
        https_redirect_status_code: routeConfig.https_redirect_status_code,
        path_handling: routeConfig.path_handling,
        preserve_host: routeConfig.preserve_host,
        request_buffering: routeConfig.request_buffering,
        response_buffering: routeConfig.response_buffering,
        strip_path: routeConfig.strip_path,
        regex_priority: routeConfig.regex_priority,
        service: {
          id: createdService.id
        },
        tags: [
          ...MANDATORY_TAGS,
          "function-routing",     // Routes traffic
          "access-public"        // Public web access
        ]
      };

      const createdRoute = await api.createRoute(DEPLOYMENT_CONFIG.controlPlaneId, routeData);
      deployedEntities.routes.push(createdRoute);
      
      console.error(`SUCCESS: Route '${createdRoute.name}' created with ID: ${createdRoute.id}`);
      console.error(`Tags applied: ${JSON.stringify(routeData.tags)}`);
      console.error("");

      // STEP 2b: Deploy Route Plugin (response-transformer-advanced)
      if (routeConfig.plugins && routeConfig.plugins.length > 0) {
        console.error("STEP 2b: Creating Route Plugin - response-transformer-advanced");
        console.error("==============================================================");
        
        const routePluginConfig = routeConfig.plugins[0];
        
        // CONTEXTUAL ANALYSIS for Route Plugin:
        // Function: Response transformation → function-transformation
        // Criticality: Medium importance → criticality-medium
        const routePluginData = {
          name: routePluginConfig.name,
          enabled: routePluginConfig.enabled,
          config: routePluginConfig.config,
          protocols: routePluginConfig.protocols,
          route: {
            id: createdRoute.id
          },
          tags: [
            ...MANDATORY_TAGS,
            "function-transformation", // Transforms responses
            "criticality-medium"       // Supporting functionality
          ]
        };

        const createdRoutePlugin = await api.createPlugin(DEPLOYMENT_CONFIG.controlPlaneId, routePluginData);
        deployedEntities.plugins.push(createdRoutePlugin);
        
        console.error(`SUCCESS: Route plugin '${createdRoutePlugin.name}' created with ID: ${createdRoutePlugin.id}`);
        console.error(`Tags applied: ${JSON.stringify(routePluginData.tags)}`);
        console.error("");
      }
    }
  }

  // STEP 3: Deploy Consumer (demo_user)
  console.error("STEP 3: Creating Consumer - demo_user");
  console.error("====================================");
  
  if (deckConfig.consumers && deckConfig.consumers.length > 0) {
    const consumerConfig = deckConfig.consumers[0];
    
    // CONTEXTUAL ANALYSIS for Consumer:
    // Function: Authentication consumer → function-authentication
    // Access: External API consumer → access-external
    const consumerData = {
      username: consumerConfig.username,
      tags: [
        ...MANDATORY_TAGS,
        "function-authentication", // Authentication consumer
        "access-external"          // External API consumer
      ]
    };

    const createdConsumer = await api.createConsumer(DEPLOYMENT_CONFIG.controlPlaneId, consumerData);
    deployedEntities.consumers.push(createdConsumer);
    
    console.error(`SUCCESS: Consumer '${createdConsumer.username}' created with ID: ${createdConsumer.id}`);
    console.error(`Tags applied: ${JSON.stringify(consumerData.tags)}`);
    console.error("");
  }

  // STEP 4: Deploy Global Plugins
  console.error("STEP 4: Creating Global Plugins");
  console.error("===============================");
  
  if (deckConfig.plugins && deckConfig.plugins.length > 0) {
    for (let i = 0; i < deckConfig.plugins.length; i++) {
      const pluginConfig = deckConfig.plugins[i];
      
      console.error(`STEP 4${String.fromCharCode(97 + i)}: Creating plugin - ${pluginConfig.name}`);
      
      let pluginData: any = {
        name: pluginConfig.name,
        enabled: pluginConfig.enabled,
        config: pluginConfig.config,
        protocols: pluginConfig.protocols,
        tags: [...MANDATORY_TAGS] // Start with mandatory tags
      };

      // CONTEXTUAL ANALYSIS per plugin type:
      if (pluginConfig.name === "correlation-id") {
        // Function: Observability - request tracing → function-observability
        // Criticality: High - essential for debugging → criticality-high
        pluginData.tags.push("function-observability", "criticality-high");
      } else if (pluginConfig.name === "key-auth") {
        // Function: Authentication - validates API keys → function-authentication
        // Criticality: High - security critical → criticality-high
        pluginData.tags.push("function-authentication", "criticality-high");
      } else if (pluginConfig.name === "rate-limiting") {
        // Function: Security - controls request rate → function-security
        // Criticality: High - prevents abuse → criticality-high
        pluginData.tags.push("function-security", "criticality-high");
        
        // Handle scoped rate-limiting plugin (service + route scoped)
        if (pluginConfig.service && pluginConfig.route) {
          const service = deployedEntities.services.find((s: any) => s.name === pluginConfig.service);
          const route = deployedEntities.routes.find((r: any) => r.name === pluginConfig.route);
          
          if (service && route) {
            pluginData.service = { id: service.id };
            pluginData.route = { id: route.id };
            console.error(`  Scoping to Service: ${service.name} (${service.id}) and Route: ${route.name} (${route.id})`);
          }
        }
      }

      const createdPlugin = await api.createPlugin(DEPLOYMENT_CONFIG.controlPlaneId, pluginData);
      deployedEntities.plugins.push(createdPlugin);
      
      console.error(`SUCCESS: Plugin '${createdPlugin.name}' created with ID: ${createdPlugin.id}`);
      console.error(`Enabled: ${createdPlugin.enabled}, Scope: ${pluginData.service ? 'Service+Route' : 'Global'}`);
      console.error(`Tags applied: ${JSON.stringify(pluginData.tags)}`);
      console.error("");
    }
  }

  // FINAL VALIDATION
  console.error("DEPLOYMENT COMPLETE - FINAL VALIDATION");
  console.error("=====================================");
  console.error(`Services deployed: ${deployedEntities.services.length}`);
  console.error(`Routes deployed: ${deployedEntities.routes.length}`);
  console.error(`Consumers deployed: ${deployedEntities.consumers.length}`);
  console.error(`Plugins deployed: ${deployedEntities.plugins.length}`);
  console.error("");
  
  // Verify all entities have exactly 5 tags
  let allEntitiesTagged = true;
  const allEntities = [
    ...deployedEntities.services,
    ...deployedEntities.routes,
    ...deployedEntities.consumers,
    ...deployedEntities.plugins
  ];
  
  for (const entity of allEntities) {
    if (!entity.tags || entity.tags.length !== 5) {
      console.error(`ERROR: Entity ${entity.id} has ${entity.tags?.length || 0} tags (expected 5)`);
      allEntitiesTagged = false;
    }
  }
  
  if (allEntitiesTagged) {
    console.error("SUCCESS: All entities have exactly 5 tags as required");
    console.error("SUCCESS: Mandatory tagging policy enforced: env-development, domain-demo, team-platform");
    console.error("SUCCESS: Contextual analysis completed for all entities");
  }
  
  console.error("");
  console.error("Kong Demo Deck Deployment - COMPLETED SUCCESSFULLY");
  console.error("==================================================");
  
  return deployedEntities;
}

// Run deployment
if (import.meta.main) {
  deployKongDeck()
    .then(() => {
      console.error("Deployment script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Deployment failed:", error.message);
      process.exit(1);
    });
}