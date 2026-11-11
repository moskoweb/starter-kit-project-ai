import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc, adminAc, memberAc } from "better-auth/plugins/organization/access";

export const accessControl = createAccessControl({ ...defaultStatements, project: ["read", "create", "update", "delete"] } as const);
export const roles = {
  owner: accessControl.newRole({ ...ownerAc.statements, project: ["read", "create", "update", "delete"] }),
  admin: accessControl.newRole({ ...adminAc.statements, project: ["read", "create", "update", "delete"] }),
  member: accessControl.newRole({ ...memberAc.statements, project: ["read", "create", "update"] }),
  viewer: accessControl.newRole({ project: ["read"] }),
};
export type ProjectAction = "read" | "create" | "update" | "delete";
export function canAccessProject(role: string, action: ProjectAction): boolean {
  return role.split(",").some((name) => {
    const declared = roles[name.trim() as keyof typeof roles];
    return declared?.authorize({ project: [action] }).success === true;
  });
}
