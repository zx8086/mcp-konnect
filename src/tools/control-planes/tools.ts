import { z } from "zod";
import * as prompts from "./prompts.js";
import * as parameters from "./parameters.js";

export type ControlPlanesTool = {
  method: string;
  name: string;
  description: string;
  parameters: z.ZodObject<any, any, any, any>;
  category: string;
};

export const controlPlanesTools = (): ControlPlanesTool[] => [
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