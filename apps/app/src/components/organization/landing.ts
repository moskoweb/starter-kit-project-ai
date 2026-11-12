import "server-only";
import { getAuth } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { registry } from "@/lib/panels/registry";
import { buildPanelPath } from "@/lib/panels/routing";

/** Landing for a signed-in user: personal panel when the profile allows, else first organization panel, else onboarding. */
export async function landingPath(headers: Headers): Promise<string> {
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE !== "organizations" && registry.some(panel => panel.id === "personal")) return buildPanelPath("personal");
  if (env.IDENTITY_PROFILE === "personal") return "/account";
  const single = env.ORGANIZATION_MODE === "single";
  const organizations = (await getAuth().api.listOrganizations({ headers })).filter(org => !single || org.id === env.SINGLE_ORGANIZATION_ID);
  const first = organizations[0];
  if (first) return buildPanelPath("organization", { tenant: first.slug });
  // Single mode cannot create organizations; /organizations explains how to get access.
  return single ? "/organizations" : "/onboarding";
}
