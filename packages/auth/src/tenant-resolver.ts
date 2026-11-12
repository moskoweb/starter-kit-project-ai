import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, withTenantTransaction, type TenantTransaction } from "@vibe/db";
import { member, organization } from "@vibe/db/schema";
import { getIdentityEnv } from "@vibe/config/env";
import { getAuth } from "./auth";
import { canAccessScope, type ScopeAction } from "./permissions";

export async function requireSession(headers: Headers) {
  const session = await getAuth().api.getSession({ headers, query: { disableCookieCache: true } });
  if (!session || !session.user.emailVerified) throw new Error("UNAUTHORIZED");
  return session;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function resolveTenant(identifier: string, headers: Headers, kind: "slug" | "uuid" = "slug") {
  const session = await requireSession(headers);
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") throw new Error("FORBIDDEN");
  if (kind === "slug" ? !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(identifier) : !uuid.test(identifier)) throw new Error("NOT_FOUND");
  const [result] = await getDb().select({ id: organization.id, name: organization.name, slug: organization.slug, role: member.role })
    .from(organization).innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)))
    .where(and(
      kind === "uuid" ? eq(organization.id, identifier) : eq(organization.slug, identifier),
      env.ORGANIZATION_MODE === "single" ? eq(organization.id, env.SINGLE_ORGANIZATION_ID!) : undefined,
    ));
  if (!result) throw new Error("NOT_FOUND");
  return result;
}
export async function withTenantScope<T>(headers: Headers, identifier: string | null, action: ScopeAction, operation: (tx: TenantTransaction) => Promise<T>): Promise<T> {
  const session = await requireSession(headers);
  const profile = getIdentityEnv().IDENTITY_PROFILE;
  if (identifier === null && profile === "organizations") throw new Error("ORGANIZATION_REQUIRED");
  const tenant = identifier === null ? null : await resolveTenant(identifier, headers);
  return withTenantTransaction({ userId: session.user.id, organizationId: tenant?.id ?? null }, async (tx, role) => {
    if (role !== null && !canAccessScope(role, action)) throw new Error("FORBIDDEN");
    return operation(tx);
  });
}
