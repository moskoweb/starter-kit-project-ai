import "server-only";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { registry } from "@/lib/panels/registry";
import { buildPanelPath, organizationPanelPath } from "@/lib/panels/routing";

/**
 * Landing for a signed-in user, by registered panel context (ids are project-defined):
 * personal panel when the profile allows → first organization in the organization panel →
 * `/onboarding` (multi mode) or `/organizations` (single mode) → `/admin` for superadmins → `/account`.
 */
export async function landingPath(headers: Headers, role?: string | null): Promise<string> {
  const env = getIdentityEnv();
  const fallback = role === "admin" && registry.some(panel => panel.context === "global") ? buildPanelPath(registry.find(panel => panel.context === "global")!.id) : "/account";
  const personal = registry.find(panel => panel.context === "personal");
  const organization = registry.find(panel => panel.context === "organization");
  if (personal && env.IDENTITY_PROFILE !== "organizations") return buildPanelPath(personal.id);
  if (!organization || env.IDENTITY_PROFILE === "personal") return fallback;
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter(org => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  const first = organizations[0];
  if (first) return organizationPanelPath(first)!;
  // Single mode cannot create organizations; /organizations explains how to get access.
  return single ? "/organizations" : "/onboarding";
}
