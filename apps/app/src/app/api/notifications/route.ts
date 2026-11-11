import { requireSession, resolveTenant } from "@vibe/auth";
import { markNotificationRead } from "@vibe/events";
import { withTenantTransaction } from "@vibe/db";
import { notifications } from "@vibe/db/events-schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getIdentityEnv } from "@vibe/config/env";
import { headers } from "next/headers";
import { z } from "zod";
import { readJsonLimited } from "@/lib/security/rate-limit";

const querySchema = z.object({ tenantIdentifier: z.string().trim().min(1).optional(), page: z.coerce.number().int().min(1).max(1_000_000).default(1) }).strict();
const bodySchema = z.object({ tenantIdentifier: z.string().trim().min(1).nullable().optional(), markAll: z.literal(true).optional(), id: z.string().uuid().optional() }).strict();

async function context(identifier: string | null, currentHeaders: Headers) {
  const session = await requireSession(currentHeaders);
  if (identifier === null && getIdentityEnv().IDENTITY_PROFILE === "organizations") throw new Error("ORGANIZATION_REQUIRED");
  const tenant = identifier === null ? null : await resolveTenant(identifier, currentHeaders);
  return { session, tenantId: tenant?.id ?? null };
}
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return Response.json({ error: message }, { status: 401 });
  if (["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  console.error("NOTIFICATIONS_REQUEST_FAILED");
  return Response.json({ error: "NOTIFICATIONS_REQUEST_FAILED" }, { status: 500 });
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return origin === new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch { return false; }
}
export async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const currentHeaders = await headers();
    const { session, tenantId } = await context(parsed.data.tenantIdentifier ?? null, currentHeaders);
    return await withTenantTransaction({ userId: session.user.id, organizationId: tenantId }, async tx => {
      const unreadWhere = and(eq(notifications.recipientUserId, session.user.id), isNull(notifications.readAt));
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(notifications).where(unreadWhere);
      const items = await tx.select({ id: notifications.id, payload: notifications.payload, createdAt: notifications.createdAt, readAt: notifications.readAt })
        .from(notifications).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(20).offset((parsed.data.page - 1) * 20);
      return Response.json({ items, unreadCount: count, page: parsed.data.page, pageSize: 20 }, { headers: { "Cache-Control": "no-store" } });
    });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "CSRF_REJECTED" }, { status: 403 });
  let raw: unknown;
  try { raw = await readJsonLimited(request, 4096); }
  catch (error) {
    if (error instanceof RangeError) return Response.json({ error: "INVALID_REQUEST" }, { status: 413 });
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success || (!parsed.data.markAll && !parsed.data.id) || (parsed.data.markAll && parsed.data.id)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  try {
    const currentHeaders = await headers();
    const { session, tenantId } = await context(parsed.data.tenantIdentifier ?? null, currentHeaders);
    return await withTenantTransaction({ userId: session.user.id, organizationId: tenantId }, async tx => {
      if (parsed.data.markAll) {
        const rows = await tx.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientUserId, session.user.id), isNull(notifications.readAt))).returning({ id: notifications.id });
        return Response.json({ updated: rows.length });
      }
      const updated = await markNotificationRead(tx, parsed.data.id!);
      return Response.json({ updated });
    });
  } catch (error) { return errorResponse(error); }
}
