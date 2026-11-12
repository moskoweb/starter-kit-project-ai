import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc, adminAc, memberAc } from "better-auth/plugins/organization/access";

export const accessControl = createAccessControl({ ...defaultStatements, data: ["read", "create", "update", "delete"] } as const);
export const roles = {
  owner: accessControl.newRole({ ...ownerAc.statements, data: ["read", "create", "update", "delete"] }),
  admin: accessControl.newRole({ ...adminAc.statements, data: ["read", "create", "update", "delete"] }),
  member: accessControl.newRole({ ...memberAc.statements, data: ["read", "create", "update"] }),
  viewer: accessControl.newRole({ data: ["read"] }),
};
export type ScopeAction = "read" | "create" | "update" | "delete";
export function canAccessScope(role: string, action: ScopeAction): boolean {
  return role.split(",").some((name) => {
    if (!Object.hasOwn(roles, name.trim())) return false;
    const declared = roles[name.trim() as keyof typeof roles];
    return declared?.authorize({ data: [action] }).success === true;
  });
}
