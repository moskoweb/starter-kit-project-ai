import "server-only";
import { count } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, organization, user } from "@vibe/db";
import { getAuth, requireSession } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";

export async function loadGlobalMetrics() {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders);
  if (session.user.role !== "admin") throw new Error("FORBIDDEN");
  const db = getDb();
  const [[{ users }], [{ organizations }]] = await Promise.all([
    db.select({ users: count() }).from(user),
    db.select({ organizations: count() }).from(organization),
  ]);
  return { users, organizations };
}

export async function loadOrganizationOptions(identifierKind: "slug" | "uuid" = "slug") {
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") return [];
  const currentHeaders = await headers();
  const organizations = await getAuth().api.listOrganizations({ headers: currentHeaders });
  return organizations.filter(({ id }) => env.ORGANIZATION_MODE !== "single" || id === env.SINGLE_ORGANIZATION_ID)
    .map(({ id, name, slug }) => ({ id, name, identifier: identifierKind === "uuid" ? id : slug }));
}
