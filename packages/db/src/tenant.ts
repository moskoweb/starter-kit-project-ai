import { and, eq, sql } from "drizzle-orm";
import { getDb, type Database } from "./client";
import { member, user } from "./auth-schema";

export type TenantTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server-only boundary: userId MUST come from an authoritative session, never request input.
 * Callback must authorize operation using locked membershipRole and query only tx.
 * No context escapes the transaction; global admin grants no domain bypass.
 */
export async function withTenantTransaction<T>(
  context: { userId: string; organizationId: string | null },
  operation: (tx: TenantTransaction, membershipRole: string | null) => Promise<T>,
): Promise<T> {
  if (!uuidV4.test(context.userId) || (context.organizationId !== null && !uuidV4.test(context.organizationId))) {
    throw new Error("INVALID_IDENTITY_CONTEXT");
  }
  return getDb().transaction(async (tx) => {
    const [identity] = await tx.select({ banned: user.banned, banExpires: user.banExpires })
      .from(user).where(eq(user.id, context.userId)).for("share");
    if (!identity || (identity.banned && (!identity.banExpires || identity.banExpires > new Date()))) {
      throw new Error("UNAUTHORIZED");
    }
    let membershipRole: string | null = null;
    if (context.organizationId !== null) {
      const [membership] = await tx.select({ role: member.role }).from(member)
        .where(and(eq(member.organizationId, context.organizationId), eq(member.userId, context.userId))).for("share");
      if (!membership) throw new Error("FORBIDDEN");
      membershipRole = membership.role;
    }
    await tx.execute(sql`select set_config('app.current_user_id', ${context.userId}, true), set_config('app.current_tenant_id', ${context.organizationId ?? ""}, true)`);
    return operation(tx, membershipRole);
  });
}
