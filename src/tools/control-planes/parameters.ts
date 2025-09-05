import { z } from "zod";
import { CommonSchemas } from "../../utils/validation.js";

// =========================
// Control Planes API Parameters
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
    .describe("Filter control planes by name (partial match)"),
  filterClusterType: z.string()
    .optional()
    .describe("Filter by cluster type (e.g., 'CLUSTER_TYPE_HYBRID')"),
  filterCloudGateway: z.boolean()
    .optional()
    .describe("Filter by cloud gateway availability"),
  labels: z.string()
    .optional()
    .describe("Filter by labels (comma-separated key:value pairs)"),
  sort: z.string()
    .optional()
    .describe("Sort order for results")
});

export const getControlPlaneParameters = () => z.object({
  controlPlaneId: CommonSchemas.uuid
    .describe("Control Plane ID (obtainable from list-control-planes tool)"),
});

export const listControlPlaneGroupMembershipsParameters = () => z.object({
  groupId: CommonSchemas.uuid
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
  controlPlaneId: CommonSchemas.uuid
    .describe("Control plane ID to check (can be obtained from list-control-planes tool)"),
});