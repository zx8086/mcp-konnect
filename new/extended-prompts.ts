export const queryApiRequestsPrompt = () => `
Query and analyze Kong API Gateway requests with customizable filters. 
Before calling this it's necessary to have a controlPlaneID and a serviceID or routeID. 
These can be obtained using the list-control-planes, list-services, and list-routes tools.

INPUT:
  - timeRange: String - Time range for data retrieval (15M, 1H, 6H, 12H, 24H, 7D)
  - statusCodes: Number[] (optional) - Filter by specific HTTP status codes
  - excludeStatusCodes: Number[] (optional) - Exclude specific HTTP status codes
  - httpMethods: String[] (optional) - Filter by HTTP methods (e.g., GET, POST)
  - consumerIds: String[] (optional) - Filter by consumer IDs
  - serviceIds: String[] (optional) - Filter by service IDs. The format of this field must be "<controlPlaneID>:<serviceID>". 
  - routeIds: String[] (optional) - Filter by route IDs. The format of this field must be "<controlPlaneID:routeID>"
  - maxResults: Number - Maximum number of results to return (1-1000)

OUTPUT:
  - metadata: Object - Contains totalRequests, timeRange, and applied filters
  - requests: Array - List of request objects with details including:
    - requestId: String - Unique request identifier
    - timestamp: String - When the request occurred
    - httpMethod: String - HTTP method used (GET, POST, etc.)
    - uri: String - Request URI path
    - statusCode: Number - HTTP status code of the response
    - consumerId: String - ID of the consumer making the request
    - serviceId: String - ID of the service handling the request
    - routeId: String - ID of the matched route
    - latency: Object - Response time metrics
    - clientIp: String - IP address of the client
    - and many more detailed fields...
`;

export const getConsumerRequestsPrompt = () => `
Retrieve and analyze API requests made by a specific consumer.

INPUT:
  - consumerId: String - ID of the consumer to analyze. The format of this field must be "controlPlaneID:consumerId".
  - timeRange: String - Time range for data retrieval (15M, 1H, 6H, 12H, 24H, 7D)
  - successOnly: Boolean - Filter to only show successful (2xx) requests (default: false)
  - failureOnly: Boolean - Filter to only show failed (non-2xx) requests (default: false)
  - maxResults: Number - Maximum number of results to return (1-1000)

OUTPUT:
  - metadata: Object - Contains consumerId, totalRequests, timeRange, and filters
  - statistics: Object - Usage statistics including:
    - averageLatencyMs: Number - Average response time in milliseconds
    - successRate: Number - Percentage of successful requests
    - statusCodeDistribution: Array - Breakdown of requests by status code
    - serviceDistribution: Array - Breakdown of requests by service
  - requests: Array - List of requests with details for each request
`;

export const listServicesPrompt = () => `
List all services associated with a control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of services to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - services: Array - List of services with details for each including:
    - serviceId: String - Unique identifier for the service
    - name: String - Display name of the service
    - host: String - Target host for the service
    - port: Number - Target port for the service
    - protocol: String - Protocol used (http, https, grpc, etc.)
    - path: String - Path prefix for the service
    - retries: Number - Number of retries on failure
    - connectTimeout: Number - Connection timeout in milliseconds
    - writeTimeout: Number - Write timeout in milliseconds
    - readTimeout: Number - Read timeout in milliseconds
    - tags: Array - Tags associated with the service
    - enabled: Boolean - Whether the service is enabled
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for further analysis
`;

export const listRoutesPrompt = () => `
List all routes associated with a control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of routes to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - routes: Array - List of routes with details for each including:
    - routeId: String - Unique identifier for the route
    - name: String - Display name of the route
    - protocols: Array - Protocols this route accepts (http, https, grpc, etc.)
    - methods: Array - HTTP methods this route accepts
    - hosts: Array - Hostnames this route matches
    - paths: Array - URL paths this route matches
    - stripPath: Boolean - Whether to strip the matched path prefix
    - preserveHost: Boolean - Whether to preserve the host header
    - serviceId: String - ID of the service this route forwards to
    - enabled: Boolean - Whether the route is enabled
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for further analysis
`;

export const listConsumersPrompt = () => `
List all consumers associated with a control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of consumers to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - consumers: Array - List of consumers with details for each including:
    - consumerId: String - Unique identifier for the consumer
    - username: String - Username for this consumer
    - customId: String - Custom identifier for this consumer
    - tags: Array - Tags associated with the consumer
    - enabled: Boolean - Whether the consumer is enabled
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for consumer analysis
`;

export const listPluginsPrompt = () => `
List all plugins associated with a control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of plugins to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - plugins: Array - List of plugins with details for each including:
    - pluginId: String - Unique identifier for the plugin
    - name: String - Name of the plugin (e.g., rate-limiting, cors, etc.)
    - enabled: Boolean - Whether the plugin is enabled
    - config: Object - Plugin-specific configuration
    - protocols: Array - Protocols this plugin applies to
    - tags: Array - Tags associated with the plugin
    - scoping: Object - Defines plugin scope including:
      - consumerId: String - Consumer this plugin applies to (if any)
      - serviceId: String - Service this plugin applies to (if any)
      - routeId: String - Route this plugin applies to (if any)
      - global: Boolean - Whether this is a global plugin
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for plugin configuration
`;

export const listControlPlanesPrompt = () => `
List all control planes in your organization.

INPUT:
  - pageSize: Number - Number of control planes per page (1-1000, default: 10)
  - pageNumber: Number (optional) - Page number to retrieve
  - filterName: String (optional) - Filter control planes by name
  - filterClusterType: String (optional) - Filter by cluster type (kubernetes, docker, etc.)
  - filterCloudGateway: Boolean (optional) - Filter by cloud gateway capability
  - labels: String (optional) - Filter by labels (format: 'key:value,existCheck')
  - sort: String (optional) - Sort field and direction (e.g. 'name,created_at desc')

OUTPUT:
  - metadata: Object - Contains pageSize, pageNumber, totalPages, totalCount, filters, sort
  - controlPlanes: Array - List of control planes with details for each including:
    - controlPlaneId: String - Unique identifier for the control plane
    - name: String - Display name of the control plane
    - description: String - Description of the control plane
    - type: String - Type of the control plane
    - clusterType: String - Underlying cluster type
    - controlPlaneEndpoint: String - URL endpoint for the control plane
    - telemetryEndpoint: String - URL endpoint for telemetry
    - hasCloudGateway: Boolean - Whether cloud gateway is enabled
    - labels: Object - Labels assigned to this control plane
    - metadata: Object - Creation and update timestamps
  - usage: Object - Information about how to use these results
`;

export const getControlPlanePrompt = () => `
Get detailed information about a specific control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane to retrieve

OUTPUT:
  - controlPlaneDetails: Object - Detailed information including:
    - controlPlaneId: String - Unique identifier for the control plane
    - name: String - Display name of the control plane
    - description: String - Description of the control plane
    - type: String - Type of the control plane
    - clusterType: String - Underlying cluster type
    - controlPlaneEndpoint: String - URL endpoint for the control plane
    - telemetryEndpoint: String - URL endpoint for telemetry
    - hasCloudGateway: Boolean - Whether cloud gateway is enabled
    - labels: Object - Labels assigned to this control plane
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for further analysis
`;

export const listControlPlaneGroupMembershipsPrompt = () => `
List all control planes that are members of a specific control plane group.

INPUT:
  - groupId: String - ID of the control plane group (control plane that acts as the group)
  - pageSize: Number - Number of members to return per page (1-1000, default: 10)
  - pageAfter: String (optional) - Cursor for pagination after a specific item

OUTPUT:
  - metadata: Object - Contains groupId, pageSize, pageAfter, nextPageAfter, totalCount
  - members: Array - List of member control planes with details for each including:
    - controlPlaneId: String - Unique identifier for the control plane
    - name: String - Display name of the control plane
    - description: String - Description of the control plane
    - type: String - Type of the control plane
    - clusterType: String - Underlying cluster type
    - membershipStatus: Object - Group membership status including:
      - status: String - Current status (OK, CONFLICT, etc.)
      - message: String - Status message
      - conflicts: Array - List of configuration conflicts if any
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - List of related tools for group management
`;

export const checkControlPlaneGroupMembershipPrompt = () => `
Check if a control plane is a member of any group.

INPUT:
  - controlPlaneId: String - ID of the control plane to check

OUTPUT:
  - controlPlaneId: String - ID of the control plane that was checked
  - groupMembership: Object - Membership information including:
    - isMember: Boolean - Whether the control plane is a member of any group
    - groupId: String - ID of the group this control plane belongs to (if any)
    - groupName: String - Name of the group this control plane belongs to
    - status: String - Membership status (OK, CONFLICT, etc.)
    - message: String - Status message
    - conflicts: Array - List of configuration conflicts if any
  - relatedTools: Array - List of related tools for group management
`;

// ===========================
// NEW: Certificate Management Prompts
// ===========================

export const listCertificatesPrompt = () => `
List all SSL/TLS certificates with expiration analysis and security recommendations.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of certificates to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - certificates: Array - List of certificates with details including:
    - certificateId: String - Unique identifier for the certificate
    - certDigest: String - SHA256 digest of the certificate
    - snis: Array - SNI hostnames associated with this certificate
    - tags: Array - Tags for grouping and filtering
    - expirationAnalysis: Object - Certificate health analysis including warnings
    - metadata: Object - Creation and update timestamps
  - healthSummary: Object - Overall certificate health metrics and recommendations
  - relatedTools: Array - List of related tools for certificate management
`;

export const getCertificatePrompt = () => `
Get detailed information about a specific SSL/TLS certificate with security analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - certificateId: String - Certificate ID to retrieve

OUTPUT:
  - certificateDetails: Object - Detailed certificate information including:
    - certificateId: String - Unique identifier
    - certDigest: String - SHA256 fingerprint
    - snis: Array - Associated SNI hostnames
    - hasAlternateCert: Boolean - Whether ECDSA alternate certificate is configured
    - certificateInfo: Object - Certificate type and key information
    - metadata: Object - Creation and update timestamps
  - securityRecommendations: Array - Best practices for certificate management
  - relatedTools: Array - Tools for certificate operations
`;

export const createCertificatePrompt = () => `
Upload a new SSL/TLS certificate with automatic validation and security checks.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - cert: String - PEM-encoded public certificate chain
  - key: String - PEM-encoded private key
  - certAlt: String (optional) - PEM-encoded alternate certificate (ECDSA)
  - keyAlt: String (optional) - PEM-encoded alternate private key (ECDSA)
  - tags: Array (optional) - Tags for grouping and filtering

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - certificate: Object - Created certificate details
  - nextSteps: Array - Recommended actions after certificate creation
`;

export const updateCertificatePrompt = () => `
Update an existing SSL/TLS certificate with validation.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - certificateId: String - Certificate ID to update
  - cert: String - PEM-encoded public certificate chain
  - key: String - PEM-encoded private key
  - certAlt: String (optional) - PEM-encoded alternate certificate (ECDSA)
  - keyAlt: String (optional) - PEM-encoded alternate private key (ECDSA)
  - tags: Array (optional) - Tags for grouping and filtering

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - certificate: Object - Updated certificate details
  - recommendations: Array - Post-update verification steps
`;

export const deleteCertificatePrompt = () => `
Delete an SSL/TLS certificate with safety checks for associated SNIs.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - certificateId: String - Certificate ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result message
  - associatedSNIs: Array (if applicable) - SNIs that must be removed first
  - recommendations: Array - Post-deletion verification steps
`;

// ===========================
// NEW: Upstreams and Health Check Prompts
// ===========================

export const listUpstreamsPrompt = () => `
List all upstreams with load balancing and health check analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of upstreams to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, nextOffset, totalCount
  - upstreams: Array - List of upstreams with configuration details including:
    - upstreamId: String - Unique identifier
    - name: String - Upstream name
    - algorithm: String - Load balancing algorithm
    - healthchecks: Object - Active and passive health check configuration
    - slots: Number - Load balancer slots
    - metadata: Object - Creation and update timestamps
  - healthSummary: Object - Cluster health metrics and algorithm distribution
  - relatedTools: Array - Tools for upstream management
`;

export const getUpstreamPrompt = () => `
Get detailed upstream configuration with best practices analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - upstreamId: String - Upstream ID to retrieve

OUTPUT:
  - upstreamDetails: Object - Complete upstream configuration including:
    - algorithm: String - Load balancing method
    - hashConfiguration: Object - Consistent hashing settings
    - healthchecks: Object - Health check configuration
    - security: Object - TLS and authentication settings
  - configurationAnalysis: Object - Best practices recommendations
  - relatedTools: Array - Tools for managing targets and health
`;

export const listUpstreamTargetsPrompt = () => `
List all targets for an upstream with weight distribution analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - upstreamId: String - Upstream ID to list targets for
  - size: Number - Number of targets to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains upstreamId, size, offset, totalCount
  - targets: Array - List of targets with status and weight information
  - targetSummary: Object - Active/disabled count and weight distribution
  - recommendations: Array - Best practices for target management
`;

export const getUpstreamHealthPrompt = () => `
Get real-time health status for all targets in an upstream.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - upstreamId: String - Upstream ID to check health for

OUTPUT:
  - upstreamId: String - Upstream identifier
  - healthStatus: Object - Overall health status and target details
  - healthAnalysis: Object - Health metrics and recommendations
  - troubleshooting: Object - Common issues and diagnostic steps
`;

// ===========================
// NEW: Data Plane Node Management Prompts
// ===========================

export const listDataPlaneNodesPrompt = () => `
List all data plane nodes with connectivity and version analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - pageSize: Number - Number of nodes to return (1-1000, default: 100)
  - pageAfter: String (optional) - Cursor for pagination

OUTPUT:
  - metadata: Object - Contains controlPlaneId, pageSize, pageAfter, nextPageAfter, totalCount
  - nodes: Array - List of data plane nodes with status including:
    - nodeId: String - Unique node identifier
    - hostname: String - Node hostname
    - version: String - Kong Gateway version
    - lastPing: Number - Last ping timestamp
    - configHash: String - Current configuration hash
    - status: Object - Connectivity and health status with warnings
    - metadata: Object - Creation and update timestamps
  - clusterHealth: Object - Overall cluster health metrics and version compatibility
  - recommendations: Array - Best practices for node management
`;

export const getDataPlaneNodePrompt = () => `
Get detailed information about a specific data plane node with troubleshooting guidance.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - nodeId: String - Data plane node ID to retrieve

OUTPUT:
  - nodeDetails: Object - Complete node information including version and config hash
  - healthAnalysis: Object - Connectivity status and configuration sync analysis
  - troubleshooting: Object - Common issues and diagnostic steps for node problems
  - relatedTools: Array - Tools for node management and configuration verification
`;

export const deleteDataPlaneNodePrompt = () => `
Delete a data plane node record from the control plane.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - nodeId: String - Data plane node ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result message
  - important: String - Important notes about the deletion
  - recommendations: Array - Post-deletion verification steps
`;

export const getExpectedConfigHashPrompt = () => `
Get the expected configuration hash for the control plane to verify node synchronization.

INPUT:
  - controlPlaneId: String - ID of the control plane

OUTPUT:
  - controlPlaneId: String - Control plane identifier
  - expectedConfigHash: String - Expected configuration hash
  - configMetadata: Object - Configuration creation and update timestamps
  - usage: Object - How to interpret and use this hash for troubleshooting
  - relatedTools: Array - Tools for comparing node configuration hashes
`;

// ===========================
// NEW: Enhanced Service Management Prompts
// ===========================

export const getServicePrompt = () => `
Get detailed service configuration with best practices analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - serviceId: String - Service ID to retrieve

OUTPUT:
  - serviceDetails: Object - Complete service configuration including:
    - connectivity: Object - Host, port, protocol settings
    - timeouts: Object - Connection, read, and write timeout settings
    - security: Object - TLS verification and certificate configuration
    - resilience: Object - Retry configuration
  - configurationAnalysis: Object - Best practices recommendations for security and performance
  - relatedTools: Array - Tools for service management and traffic analysis
`;

export const createServicePrompt = () => `
Create a new service with validation and security best practices.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - name: String (optional) - Service name
  - host: String - Upstream host (required)
  - port: Number - Upstream port (default: 80)
  - protocol: String - Protocol (http, https, grpc, grpcs, tcp, tls, ws, wss, default: http)
  - path: String (optional) - Path to be used in upstream requests
  - retries: Number - Number of retries on failure (default: 5)
  - connectTimeout: Number - Connection timeout in milliseconds (default: 60000)
  - writeTimeout: Number - Write timeout in milliseconds (default: 60000)
  - readTimeout: Number - Read timeout in milliseconds (default: 60000)
  - tags: Array (optional) - Tags for grouping and filtering
  - enabled: Boolean - Whether the service is enabled (default: true)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - service: Object - Created service details
  - recommendations: Array - Security and performance recommendations
  - nextSteps: Array - Recommended actions after service creation
`;

export const updateServicePrompt = () => `
Update an existing service configuration with validation.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - serviceId: String - Service ID to update
  - (All other fields optional - only provided fields will be updated)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - service: Object - Updated service details
  - recommendations: Array - Post-update verification steps
`;

export const deleteServicePrompt = () => `
Delete a service with safety checks for associated routes.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - serviceId: String - Service ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result or error message
  - associatedRoutes: Array (if applicable) - Routes that must be removed first
  - recommendations: Array - Post-deletion verification steps
`;

export const getRoutePrompt = () => `
Get detailed route configuration with routing and security analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - routeId: String - Route ID to retrieve

OUTPUT:
  - routeDetails: Object - Complete route configuration including:
    - routing conditions (hosts, paths, methods)
    - service association
    - configuration options (stripPath, preserveHost, etc.)
  - configurationAnalysis: Object - Routing logic and security recommendations
  - relatedTools: Array - Tools for route management and traffic analysis
`;

export const createRoutePrompt = () => `
Create a new route with validation and routing best practices.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - serviceId: String - Service ID this route forwards to (required)
  - name: String (optional) - Route name
  - protocols: Array - Protocols this route accepts (default: ["http", "https"])
  - methods: Array (optional) - HTTP methods this route accepts
  - hosts: Array (optional) - Hostnames this route matches
  - paths: Array (optional) - URL paths this route matches
  - stripPath: Boolean - Whether to strip matched path prefix (default: true)
  - preserveHost: Boolean - Whether to preserve host header (default: false)
  - tags: Array (optional) - Tags for grouping and filtering

Note: Route must have at least one matching condition (methods, hosts, or paths)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - route: Object - Created route details
  - recommendations: Array - Security and performance recommendations
  - nextSteps: Array - Recommended actions after route creation
`;

export const updateRoutePrompt = () => `
Update an existing route configuration.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - routeId: String - Route ID to update
  - (All other fields optional - only provided fields will be updated)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - route: Object - Updated route details
  - recommendations: Array - Post-update verification steps
`;

export const deleteRoutePrompt = () => `
Delete a route from the gateway.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - routeId: String - Route ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result message
  - important: String - Important notes about traffic impact
  - recommendations: Array - Post-deletion verification steps
`;

// ===========================
// NEW: Enhanced Plugin Management Prompts
// ===========================

export const getPluginPrompt = () => `
Get detailed plugin configuration with best practices analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - pluginId: String - Plugin ID to retrieve

OUTPUT:
  - pluginDetails: Object - Complete plugin configuration including scoping and config
  - configurationAnalysis: Object - Security and performance recommendations
  - commonConfigurations: Object - Example configurations for this plugin type
  - relatedTools: Array - Tools for plugin management and traffic analysis
`;

export const createPluginPrompt = () => `
Create a new plugin with validation and configuration best practices.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - name: String - Plugin name (required, e.g., 'rate-limiting', 'cors', 'key-auth')
  - config: Object (optional) - Plugin-specific configuration
  - enabled: Boolean - Whether the plugin is enabled (default: true)
  - protocols: Array (optional) - Protocols this plugin applies to
  - serviceId: String (optional) - Service ID to apply plugin to (if scoped to service)
  - routeId: String (optional) - Route ID to apply plugin to (if scoped to route)
  - consumerId: String (optional) - Consumer ID to apply plugin to (if scoped to consumer)
  - tags: Array (optional) - Tags for grouping and filtering

Note: Plugin can only be scoped to one entity (service, route, or consumer)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - plugin: Object - Created plugin details including scoping information
  - recommendations: Array - Plugin-specific security and performance recommendations
  - nextSteps: Array - Recommended actions after plugin creation
`;

export const updatePluginPrompt = () => `
Update an existing plugin configuration.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - pluginId: String - Plugin ID to update
  - (All other fields optional - only provided fields will be updated)

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - plugin: Object - Updated plugin details
  - recommendations: Array - Post-update verification steps
`;

export const deletePluginPrompt = () => `
Delete a plugin from the gateway.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - pluginId: String - Plugin ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result message
  - recommendations: Array - Post-deletion verification steps
`;

// ===========================
// NEW: Consumer Credential Management Prompts
// ===========================

export const listConsumerKeysPrompt = () => `
List all API keys for a consumer with security analysis and rotation recommendations.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - consumerId: String - Consumer ID to list API keys for
  - size: Number - Number of API keys to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, consumerId, size, offset, totalCount
  - apiKeys: Array - List of API keys with security analysis including:
    - keyId: String - Unique key identifier
    - key: String - Partially redacted API key for security
    - ttl: Number - Time-to-live in seconds (if set)
    - security: Object - Age analysis and rotation recommendations
    - metadata: Object - Creation and update timestamps
  - securityAnalysis: Object - Overall key security metrics and recommendations
  - relatedTools: Array - Tools for key management and usage analysis
`;

export const createConsumerKeyPrompt = () => `
Create a new API key for a consumer with security validation.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - consumerId: String - Consumer ID to create API key for
  - key: String (optional) - Custom API key value (auto-generated if not provided)
  - ttl: Number (optional) - Time-to-live for the key in seconds
  - tags: Array (optional) - Tags for grouping and filtering

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - apiKey: Object - Created API key details including expiration information
  - securityRecommendations: Array - Best practices for API key security
  - nextSteps: Array - Recommended actions after key creation
`;

export const deleteConsumerKeyPrompt = () => `
Delete an API key with security confirmation.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - consumerId: String - Consumer ID that owns the key
  - keyId: String - API key ID to delete

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - message: String - Deletion result message
  - securityNote: String - Important security information about the deletion
  - recommendations: Array - Post-deletion verification and replacement steps
  - relatedTools: Array - Tools for key management and monitoring
`;

// ===========================
// NEW: SNI Management Prompts
// ===========================

export const listSNIsPrompt = () => `
List all SNI (Server Name Indication) entries with SSL/TLS analysis.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - size: Number - Number of SNIs to return (1-1000, default: 100)
  - offset: String (optional) - Pagination offset token from previous response

OUTPUT:
  - metadata: Object - Contains controlPlaneId, size, offset, totalCount
  - snis: Array - List of SNI entries with SSL analysis including:
    - sniId: String - Unique SNI identifier
    - name: String - Hostname for this SNI
    - certificateId: String - Associated certificate ID
    - sslAnalysis: Object - Wildcard and domain analysis
  - sslSummary: Object - Overall SSL configuration metrics and recommendations
  - relatedTools: Array - Tools for certificate and SNI management
`;

export const createSNIPrompt = () => `
Create a new SNI entry to associate a hostname with an SSL certificate.

INPUT:
  - controlPlaneId: String - ID of the control plane
  - name: String - SNI hostname (required, e.g., 'api.example.com' or '*.example.com')
  - certificateId: String - Certificate ID to associate with this SNI (required)
  - tags: Array (optional) - Tags for grouping and filtering

OUTPUT:
  - success: Boolean - Whether the operation succeeded
  - sni: Object - Created SNI details
  - sslConfiguration: Object - SSL configuration summary
  - recommendations: Array - SSL/TLS best practices and testing steps
  - nextSteps: Array - Recommended actions after SNI creation
`;