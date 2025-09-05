import { z } from "zod";
import * as prompts from "./prompts.js";
import * as parameters from "./parameters.js";

export type Tool = {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any, any, any, any>;
  category: string;
};

export const tools = (): Tool[] => [
  // =========================
  // API Requests Analytics Tools (Tier 1)
  // =========================
  {
    method: "query_api_requests",
    name: "Query API Requests",
    description: prompts.queryApiRequestsPrompt(),
    parameters: parameters.queryApiRequestsParameters(),
    category: "analytics"
  },
  {
    method: "get_consumer_requests",
    name: "Get Consumer Requests",
    description: prompts.getConsumerRequestsPrompt(),
    parameters: parameters.getConsumerRequestsParameters(),
    category: "analytics"
  },

  // =========================
  // Certificate Management Tools (Tier 1 - High Priority)
  // =========================
  {
    method: "list_certificates",
    name: "List Certificates",
    description: prompts.listCertificatesPrompt(),
    parameters: parameters.listCertificatesParameters(),
    category: "certificates"
  },
  {
    method: "get_certificate",
    name: "Get Certificate",
    description: prompts.getCertificatePrompt(),
    parameters: parameters.getCertificateParameters(),
    category: "certificates"
  },
  {
    method: "create_certificate",
    name: "Create Certificate",
    description: prompts.createCertificatePrompt(),
    parameters: parameters.createCertificateParameters(),
    category: "certificates"
  },
  {
    method: "update_certificate",
    name: "Update Certificate",
    description: prompts.updateCertificatePrompt(),
    parameters: parameters.updateCertificateParameters(),
    category: "certificates"
  },
  {
    method: "delete_certificate",
    name: "Delete Certificate",
    description: prompts.deleteCertificatePrompt(),
    parameters: parameters.deleteCertificateParameters(),
    category: "certificates"
  },

  // =========================
  // Enhanced Service Management Tools (Tier 1)
  // =========================
  {
    method: "list_services",
    name: "List Services",
    description: prompts.listServicesPrompt(),
    parameters: parameters.listServicesParameters(),
    category: "configuration"
  },
  {
    method: "get_service",
    name: "Get Service",
    description: prompts.getServicePrompt(),
    parameters: parameters.getServiceParameters(),
    category: "configuration"
  },
  {
    method: "create_service",
    name: "Create Service",
    description: prompts.createServicePrompt(),
    parameters: parameters.createServiceParameters(),
    category: "configuration"
  },
  {
    method: "update_service",
    name: "Update Service",
    description: prompts.updateServicePrompt(),
    parameters: parameters.updateServiceParameters(),
    category: "configuration"
  },
  {
    method: "delete_service",
    name: "Delete Service",
    description: prompts.deleteServicePrompt(),
    parameters: parameters.deleteServiceParameters(),
    category: "configuration"
  },

  // =========================
  // Enhanced Route Management Tools (Tier 1)
  // =========================
  {
    method: "list_routes",
    name: "List Routes",
    description: prompts.listRoutesPrompt(),
    parameters: parameters.listRoutesParameters(),
    category: "configuration"
  },
  {
    method: "get_route",
    name: "Get Route",
    description: prompts.getRoutePrompt(),
    parameters: parameters.getRouteParameters(),
    category: "configuration"
  },
  {
    method: "create_route",
    name: "Create Route",
    description: prompts.createRoutePrompt(),
    parameters: parameters.createRouteParameters(),
    category: "configuration"
  },
  {
    method: "update_route",
    name: "Update Route",
    description: prompts.updateRoutePrompt(),
    parameters: parameters.updateRouteParameters(),
    category: "configuration"
  },
  {
    method: "delete_route",
    name: "Delete Route",
    description: prompts.deleteRoutePrompt(),
    parameters: parameters.deleteRouteParameters(),
    category: "configuration"
  },

  // =========================
  // Upstreams and Health Checks (Tier 1)
  // =========================
  {
    method: "list_upstreams",
    name: "List Upstreams",
    description: prompts.listUpstreamsPrompt(),
    parameters: parameters.listUpstreamsParameters(),
    category: "upstreams"
  },
  {
    method: "get_upstream",
    name: "Get Upstream",
    description: prompts.getUpstreamPrompt(),
    parameters: parameters.getUpstreamParameters(),
    category: "upstreams"
  },
  {
    method: "list_upstream_targets",
    name: "List Upstream Targets",
    description: prompts.listUpstreamTargetsPrompt(),
    parameters: parameters.listUpstreamTargetsParameters(),
    category: "upstreams"
  },
  {
    method: "get_upstream_health",
    name: "Get Upstream Health",
    description: prompts.getUpstreamHealthPrompt(),
    parameters: parameters.getUpstreamHealthParameters(),
    category: "upstreams"
  },

  // =========================
  // Data Plane Node Management (Tier 2)
  // =========================
  {
    method: "list_data_plane_nodes",
    name: "List Data Plane Nodes",
    description: prompts.listDataPlaneNodesPrompt(),
    parameters: parameters.listDataPlaneNodesParameters(),
    category: "data_planes"
  },
  {
    method: "get_data_plane_node",
    name: "Get Data Plane Node",
    description: prompts.getDataPlaneNodePrompt(),
    parameters: parameters.getDataPlaneNodeParameters(),
    category: "data_planes"
  },
  {
    method: "delete_data_plane_node",
    name: "Delete Data Plane Node",
    description: prompts.deleteDataPlaneNodePrompt(),
    parameters: parameters.deleteDataPlaneNodeParameters(),
    category: "data_planes"
  },
  {
    method: "get_expected_config_hash",
    name: "Get Expected Config Hash",
    description: prompts.getExpectedConfigHashPrompt(),
    parameters: parameters.getExpectedConfigHashParameters(),
    category: "data_planes"
  },

  // =========================
  // Enhanced Plugin Management (Tier 2)
  // =========================
  {
    method: "list_plugins",
    name: "List Plugins",
    description: prompts.listPluginsPrompt(),
    parameters: parameters.listPluginsParameters(),
    category: "configuration"
  },
  {
    method: "get_plugin",
    name: "Get Plugin",
    description: prompts.getPluginPrompt(),
    parameters: parameters.getPluginParameters(),
    category: "configuration"
  },
  {
    method: "create_plugin",
    name: "Create Plugin",
    description: prompts.createPluginPrompt(),
    parameters: parameters.createPluginParameters(),
    category: "configuration"
  },
  {
    method: "update_plugin",
    name: "Update Plugin",
    description: prompts.updatePluginPrompt(),
    parameters: parameters.updatePluginParameters(),
    category: "configuration"
  },
  {
    method: "delete_plugin",
    name: "Delete Plugin",
    description: prompts.deletePluginPrompt(),
    parameters: parameters.deletePluginParameters(),
    category: "configuration"
  },

  // =========================
  // Consumer Credential Management (Tier 2)
  // =========================
  {
    method: "list_consumers",
    name: "List Consumers",
    description: prompts.listConsumersPrompt(),
    parameters: parameters.listConsumersParameters(),
    category: "configuration"
  },
  {
    method: "list_consumer_keys",
    name: "List Consumer API Keys",
    description: prompts.listConsumerKeysPrompt(),
    parameters: parameters.listConsumerKeysParameters(),
    category: "credentials"
  },
  {
    method: "create_consumer_key",
    name: "Create Consumer API Key",
    description: prompts.createConsumerKeyPrompt(),
    parameters: parameters.createConsumerKeyParameters(),
    category: "credentials"
  },
  {
    method: "delete_consumer_key",
    name: "Delete Consumer API Key",
    description: prompts.deleteConsumerKeyPrompt(),
    parameters: parameters.deleteConsumerKeyParameters(),
    category: "credentials"
  },

  // =========================
  // SNI Management (Tier 2)
  // =========================
  {
    method: "list_snis",
    name: "List SNIs",
    description: prompts.listSNIsPrompt(),
    parameters: parameters.listSNIsParameters(),
    category: "certificates"
  },
  {
    method: "create_sni",
    name: "Create SNI",
    description: prompts.createSNIPrompt(),
    parameters: parameters.createSNIParameters(),
    category: "certificates"
  },

  // =========================
  // Control Planes Tools
  // =========================
  {
    method: "list_control_planes",
    name: "List Control Planes",
    description: prompts.listControlPlanesPrompt(),
    parameters: parameters.listControlPlanesParameters(),
    category: "control_planes"
  },
  {
    method: "get_control_plane",
    name: "Get Control Plane",
    description: prompts.getControlPlanePrompt(),
    parameters: parameters.getControlPlaneParameters(),
    category: "control_planes"
  },
  {
    method: "list_control_plane_group_memberships",
    name: "List Control Plane Group Memberships",
    description: prompts.listControlPlaneGroupMembershipsPrompt(),
    parameters: parameters.listControlPlaneGroupMembershipsParameters(),
    category: "control_planes"
  },
  {
    method: "check_control_plane_group_membership",
    name: "Check Control Plane Group Membership",
    description: prompts.checkControlPlaneGroupMembershipPrompt(),
    parameters: parameters.checkControlPlaneGroupMembershipParameters(),
    category: "control_planes"
  }
];