import { z } from "zod";

// =========================
// Common Field Schemas
// =========================

/**
 * Standard time range options used across multiple tools.
 */
export const timeRangeSchema = z.enum(["15M", "1H", "6H", "12H", "24H", "7D"])
  .default("1H")
  .describe("Time range for data retrieval (15M = 15 minutes, 1H = 1 hour, etc.)");

/**
 * Standard pagination size parameter
 */
export const pageSizeSchema = z.number().int()
  .min(1).max(1000)
  .default(100)
  .describe("Number of items to return per page");

// =========================
// API Requests Analytics Schemas
// =========================

export const queryApiRequestsParameters = () => z.object({
  timeRange: timeRangeSchema,
  statusCodes: z.array(z.number().int().min(100).max(599))
    .optional()
    .describe("Filter by specific HTTP status codes (e.g. [200, 201, 404])"),
  excludeStatusCodes: z.array(z.number().int().min(100).max(599))
    .optional()
    .describe("Exclude specific HTTP status codes (e.g. [400, 401, 500])"),
  httpMethods: z.array(z.string())
    .optional()
    .describe("Filter by HTTP methods (e.g. ['GET', 'POST', 'DELETE'])"),
  consumerIds: z.array(z.string())
    .optional()
    .describe("Filter by consumer IDs"),
  serviceIds: z.array(z.string())
    .optional()
    .describe("Filter by service IDs"),
  routeIds: z.array(z.string())
    .optional()
    .describe("Filter by route IDs (from list-routes tool)"),
  maxResults: pageSizeSchema,
});

export const getConsumerRequestsParameters = () => z.object({
  consumerId: z.string()
    .describe("Consumer ID to filter by (obtainable from analyze-failed-requests or query-api-requests tools)"),
  timeRange: timeRangeSchema,
  successOnly: z.boolean()
    .default(false)
    .describe("Show only successful (2xx) requests"),
  failureOnly: z.boolean()
    .default(false)
    .describe("Show only failed (non-2xx) requests"),
  maxResults: pageSizeSchema,
});

// =========================
// Control Planes Configuration Schemas
// =========================

export const listServicesParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of services to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const listRoutesParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of routes to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const listConsumersParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of consumers to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const listPluginsParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of plugins to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

// =========================
// Control Planes Tools
// =========================

export const listControlPlanesParameters = () => z.object({
  pageSize: z.number().int()
    .min(1).max(1000)
    .default(10)
    .describe("Number of control planes per page"),
  pageNumber: z.number().int()
    .min(1)
    .optional()
    .describe("Page number to retrieve"),
  filterName: z.string()
    .optional()
    .describe("Filter control planes by name (contains)"),
  filterClusterType: z.string()
    .optional()
    .describe("Filter by cluster type (e.g., 'kubernetes', 'docker')"),
  filterCloudGateway: z.boolean()
    .optional()
    .describe("Filter by cloud gateway capability"),
  labels: z.string()
    .optional()
    .describe("Filter by labels (format: 'key:value,existCheck')"),
  sort: z.string()
    .optional()
    .describe("Sort field and direction (e.g. 'name,created_at desc')"),
});

export const getControlPlaneParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
});

export const listControlPlaneGroupMembershipsParameters = () => z.object({
  groupId: z.string()
    .describe("Control plane group ID (the ID of the control plane that acts as the group)"),
  pageSize: z.number().int()
    .min(1).max(1000)
    .default(10)
    .describe("Number of members to return per page"),
  pageAfter: z.string()
    .optional()
    .describe("Cursor for pagination after a specific item"),
});

export const checkControlPlaneGroupMembershipParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control plane ID to check (can be obtained from list-control-planes tool)"),
});

// =========================
// NEW: Certificate Management Parameters (Tier 1)
// =========================

export const listCertificatesParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of certificates to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const getCertificateParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  certificateId: z.string()
    .describe("Certificate ID to retrieve"),
});

export const createCertificateParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  cert: z.string()
    .describe("PEM-encoded public certificate chain"),
  key: z.string()
    .describe("PEM-encoded private key"),
  certAlt: z.string()
    .optional()
    .describe("PEM-encoded alternate certificate chain (for ECDSA)"),
  keyAlt: z.string()
    .optional()
    .describe("PEM-encoded alternate private key (for ECDSA)"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const updateCertificateParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  certificateId: z.string()
    .describe("Certificate ID to update"),
  cert: z.string()
    .describe("PEM-encoded public certificate chain"),
  key: z.string()
    .describe("PEM-encoded private key"),
  certAlt: z.string()
    .optional()
    .describe("PEM-encoded alternate certificate chain (for ECDSA)"),
  keyAlt: z.string()
    .optional()
    .describe("PEM-encoded alternate private key (for ECDSA)"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const deleteCertificateParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  certificateId: z.string()
    .describe("Certificate ID to delete"),
});

// =========================
// NEW: Upstreams and Health Check Parameters (Tier 1)
// =========================

export const listUpstreamsParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of upstreams to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const getUpstreamParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  upstreamId: z.string()
    .describe("Upstream ID to retrieve"),
});

export const listUpstreamTargetsParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  upstreamId: z.string()
    .describe("Upstream ID to list targets for"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of targets to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const getUpstreamHealthParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  upstreamId: z.string()
    .describe("Upstream ID to check health for"),
});

// =========================
// NEW: Plugin Configuration Helpers (Tier 2)
// =========================

export const getPluginParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  pluginId: z.string()
    .describe("Plugin ID to retrieve"),
});

export const createPluginParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  name: z.string()
    .describe("Plugin name (e.g., 'rate-limiting', 'cors', 'key-auth')"),
  config: z.record(z.any())
    .optional()
    .describe("Plugin-specific configuration"),
  enabled: z.boolean()
    .default(true)
    .describe("Whether the plugin is enabled"),
  protocols: z.array(z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"]))
    .optional()
    .describe("Protocols this plugin applies to"),
  serviceId: z.string()
    .optional()
    .describe("Service ID to apply plugin to (if scoped to service)"),
  routeId: z.string()
    .optional()
    .describe("Route ID to apply plugin to (if scoped to route)"),
  consumerId: z.string()
    .optional()
    .describe("Consumer ID to apply plugin to (if scoped to consumer)"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const updatePluginParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  pluginId: z.string()
    .describe("Plugin ID to update"),
  name: z.string()
    .optional()
    .describe("Plugin name (e.g., 'rate-limiting', 'cors', 'key-auth')"),
  config: z.record(z.any())
    .optional()
    .describe("Plugin-specific configuration"),
  enabled: z.boolean()
    .optional()
    .describe("Whether the plugin is enabled"),
  protocols: z.array(z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"]))
    .optional()
    .describe("Protocols this plugin applies to"),
  serviceId: z.string()
    .optional()
    .describe("Service ID to apply plugin to (if scoped to service)"),
  routeId: z.string()
    .optional()
    .describe("Route ID to apply plugin to (if scoped to route)"),
  consumerId: z.string()
    .optional()
    .describe("Consumer ID to apply plugin to (if scoped to consumer)"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const deletePluginParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  pluginId: z.string()
    .describe("Plugin ID to delete"),
});

// =========================
// NEW: Data Plane Node Management (Tier 2)
// =========================

export const listDataPlaneNodesParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  pageSize: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of data plane nodes to return"),
  pageAfter: z.string()
    .optional()
    .describe("Cursor for pagination after a specific item"),
});

export const getDataPlaneNodeParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  nodeId: z.string()
    .describe("Data plane node ID to retrieve"),
});

export const deleteDataPlaneNodeParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  nodeId: z.string()
    .describe("Data plane node ID to delete"),
});

export const getExpectedConfigHashParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
});

// =========================
// NEW: SNI Management (Tier 2)
// =========================

export const listSNIsParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of SNIs to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const createSNIParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  name: z.string()
    .describe("SNI hostname to associate with certificate"),
  certificateId: z.string()
    .describe("Certificate ID to associate with this SNI"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

// =========================
// NEW: Consumer Credential Management (Tier 2)
// =========================

export const listConsumerKeysParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  consumerId: z.string()
    .describe("Consumer ID to list API keys for"),
  size: z.number().int()
    .min(1).max(1000)
    .default(100)
    .describe("Number of API keys to return"),
  offset: z.string()
    .optional()
    .describe("Offset token for pagination (from previous response)"),
});

export const createConsumerKeyParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  consumerId: z.string()
    .describe("Consumer ID to create API key for"),
  key: z.string()
    .optional()
    .describe("API key value (auto-generated if not provided)"),
  ttl: z.number().int()
    .optional()
    .describe("Time-to-live for the key in seconds"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const deleteConsumerKeyParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  consumerId: z.string()
    .describe("Consumer ID that owns the key"),
  keyId: z.string()
    .describe("API key ID to delete"),
});

// =========================
// NEW: Service and Route Management (Tier 1)
// =========================

export const getServiceParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  serviceId: z.string()
    .describe("Service ID to retrieve"),
});

export const createServiceParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  name: z.string()
    .optional()
    .describe("Service name"),
  host: z.string()
    .describe("Upstream host"),
  port: z.number().int()
    .min(1).max(65535)
    .default(80)
    .describe("Upstream port"),
  protocol: z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"])
    .default("http")
    .describe("Protocol to use"),
  path: z.string()
    .optional()
    .describe("Path to be used in upstream requests"),
  retries: z.number().int()
    .min(0)
    .default(5)
    .describe("Number of retries on failure"),
  connectTimeout: z.number().int()
    .min(1)
    .default(60000)
    .describe("Connection timeout in milliseconds"),
  writeTimeout: z.number().int()
    .min(1)
    .default(60000)
    .describe("Write timeout in milliseconds"),
  readTimeout: z.number().int()
    .min(1)
    .default(60000)
    .describe("Read timeout in milliseconds"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
  enabled: z.boolean()
    .default(true)
    .describe("Whether the service is enabled"),
});

export const updateServiceParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  serviceId: z.string()
    .describe("Service ID to update"),
  name: z.string()
    .optional()
    .describe("Service name"),
  host: z.string()
    .optional()
    .describe("Upstream host"),
  port: z.number().int()
    .min(1).max(65535)
    .optional()
    .describe("Upstream port"),
  protocol: z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"])
    .optional()
    .describe("Protocol to use"),
  path: z.string()
    .optional()
    .describe("Path to be used in upstream requests"),
  retries: z.number().int()
    .min(0)
    .optional()
    .describe("Number of retries on failure"),
  connectTimeout: z.number().int()
    .min(1)
    .optional()
    .describe("Connection timeout in milliseconds"),
  writeTimeout: z.number().int()
    .min(1)
    .optional()
    .describe("Write timeout in milliseconds"),
  readTimeout: z.number().int()
    .min(1)
    .optional()
    .describe("Read timeout in milliseconds"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
  enabled: z.boolean()
    .optional()
    .describe("Whether the service is enabled"),
});

export const deleteServiceParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  serviceId: z.string()
    .describe("Service ID to delete"),
});

export const getRouteParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  routeId: z.string()
    .describe("Route ID to retrieve"),
});

export const createRouteParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  name: z.string()
    .optional()
    .describe("Route name"),
  protocols: z.array(z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"]))
    .default(["http", "https"])
    .describe("Protocols this route accepts"),
  methods: z.array(z.string())
    .optional()
    .describe("HTTP methods this route accepts"),
  hosts: z.array(z.string())
    .optional()
    .describe("Hostnames this route matches"),
  paths: z.array(z.string())
    .optional()
    .describe("URL paths this route matches"),
  serviceId: z.string()
    .describe("Service ID this route forwards to"),
  stripPath: z.boolean()
    .default(true)
    .describe("Whether to strip matched path prefix"),
  preserveHost: z.boolean()
    .default(false)
    .describe("Whether to preserve host header"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const updateRouteParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  routeId: z.string()
    .describe("Route ID to update"),
  name: z.string()
    .optional()
    .describe("Route name"),
  protocols: z.array(z.enum(["http", "https", "grpc", "grpcs", "tcp", "tls", "ws", "wss"]))
    .optional()
    .describe("Protocols this route accepts"),
  methods: z.array(z.string())
    .optional()
    .describe("HTTP methods this route accepts"),
  hosts: z.array(z.string())
    .optional()
    .describe("Hostnames this route matches"),
  paths: z.array(z.string())
    .optional()
    .describe("URL paths this route matches"),
  serviceId: z.string()
    .optional()
    .describe("Service ID this route forwards to"),
  stripPath: z.boolean()
    .optional()
    .describe("Whether to strip matched path prefix"),
  preserveHost: z.boolean()
    .optional()
    .describe("Whether to preserve host header"),
  tags: z.array(z.string())
    .optional()
    .describe("Tags for grouping and filtering"),
});

export const deleteRouteParameters = () => z.object({
  controlPlaneId: z.string()
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
  routeId: z.string()
    .describe("Route ID to delete"),
});