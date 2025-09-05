export const listControlPlanesPrompt = () => `
List all control planes in your organization with filtering and pagination options.

INPUT:
  - pageSize: Number - Number of control planes per page (1-1000, default: 10)
  - pageNumber: Number (optional) - Page number to retrieve
  - filterName: String (optional) - Filter control planes by name (partial match)
  - filterClusterType: String (optional) - Filter by cluster type
  - filterCloudGateway: Boolean (optional) - Filter by cloud gateway availability
  - labels: String (optional) - Filter by labels (comma-separated key:value pairs)
  - sort: String (optional) - Sort order for results

OUTPUT:
  - metadata: Object - Contains pagination info, filters, and totals
  - controlPlanes: Array - List of control planes with details including:
    - controlPlaneId: String - Unique identifier for the control plane
    - name: String - Display name of the control plane
    - description: String - Description of the control plane
    - type: String - Type of control plane
    - clusterType: String - Cluster type (e.g., HYBRID, SERVERLESS)
    - controlPlaneEndpoint: String - Endpoint for control plane communication
    - telemetryEndpoint: String - Endpoint for telemetry data
    - hasCloudGateway: Boolean - Whether cloud gateway is available
    - labels: Object - Labels associated with the control plane
    - metadata: Object - Creation and update timestamps

USAGE TIPS:
  - Use the controlPlaneId from results with other tools like list-services, list-routes
  - Filter by clusterType to find specific deployment types
  - Use labels to organize and categorize control planes
  - Large organizations should use pagination for better performance
`;

export const getControlPlanePrompt = () => `
Get detailed information about a specific control plane including configuration and endpoints.

INPUT:
  - controlPlaneId: String - ID of the control plane to retrieve (from list-control-planes)

OUTPUT:
  - controlPlaneDetails: Object - Comprehensive control plane information including:
    - controlPlaneId: String - Unique identifier
    - name: String - Display name
    - description: String - Control plane description
    - type: String - Control plane type
    - clusterType: String - Deployment cluster type
    - controlPlaneEndpoint: String - Management endpoint
    - telemetryEndpoint: String - Telemetry collection endpoint
    - hasCloudGateway: Boolean - Cloud gateway availability
    - labels: Object - Associated labels and metadata
    - metadata: Object - Creation and modification timestamps
  - relatedTools: Array - List of related tools for further exploration

NEXT STEPS:
  - Use list-services to explore services in this control plane
  - Use list-routes to see routing configuration
  - Use list-certificates to view SSL/TLS certificates
  - Use list-data-plane-nodes to see connected data plane nodes
  - Use query-api-requests to analyze traffic patterns
`;

export const listControlPlaneGroupMembershipsPrompt = () => `
List all control planes that are members of a specific control plane group.

INPUT:
  - groupId: String - ID of the control plane group (control plane that acts as the group)
  - pageSize: Number - Number of members to return per page (1-1000, default: 10)
  - pageAfter: String (optional) - Cursor for pagination after a specific item

OUTPUT:
  - metadata: Object - Contains group information and pagination details
  - members: Array - List of group member control planes with:
    - controlPlaneId: String - Member control plane identifier
    - name: String - Member control plane name
    - description: String - Member description
    - type: String - Member type
    - clusterType: String - Member cluster type
    - membershipStatus: Object - Group membership status including:
      - status: String - Membership status
      - message: String - Status message
      - conflicts: Array - Any configuration conflicts
    - metadata: Object - Creation and update timestamps
  - relatedTools: Array - Suggested tools for group management

GROUP MANAGEMENT:
  - Monitor membership status to identify configuration issues
  - Check for conflicts that may affect group synchronization
  - Use related tools to manage group configuration consistency
`;

export const checkControlPlaneGroupMembershipPrompt = () => `
Check if a control plane is a member of any group and get membership details.

INPUT:
  - controlPlaneId: String - ID of the control plane to check (from list-control-planes)

OUTPUT:
  - controlPlaneId: String - The checked control plane ID
  - groupMembership: Object - Membership information including:
    - isMember: Boolean - Whether the control plane is a group member
    - groupId: String - ID of the group (if member)
    - groupName: String - Name of the group (if member)
    - status: String - Current membership status
    - message: String - Status message or details
    - conflicts: Array - Any configuration conflicts with the group
  - relatedTools: Array - Tools for further group management

MEMBERSHIP ANALYSIS:
  - Check membership status before making configuration changes
  - Identify conflicts that may prevent group synchronization
  - Use for troubleshooting group-related issues
  - Monitor group health and consistency
`;