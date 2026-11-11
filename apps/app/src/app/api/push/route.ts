import { requireSession, resolveTenant } from "@vibe/auth";
import { withTenantTransaction } from "@vibe/db";
import { pushSubscriptions } from "@vibe/db/schema";
import { validatePushSubscription, type PushSubscription } from "@vibe/push";
import { and, eq, isNull } from "drizzle-orm";
import { getIdentityEnv } from "@vibe/config/env";
import { headers } from "next/headers";
import { z } from "zod";
import { readJsonLimited } from "@/lib/security/rate-limit";
const scopeSchema = z.object({ tenantIdentifier: z.string().trim().min(1).nullable().optional(), endpoint: z.string().url().max(2048).optional() }).strict();
const bodySchema = scopeSchema.extend({ action: z.enum(["subscribe", "unsubscribe"]), subscription: z.unknown().optional() }).strict();

async function context(identifier: string | null) {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders);
  if (identifier === null && getIdentityEnv().IDENTITY_PROFILE === "organizations") throw new Error("FORBIDDEN");
  const tenant = identifier === null ? null : await resolveTenant(identifier, currentHeaders);
  return { session, tenantId: tenant?.id ?? null };
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return origin === new URL(getIdentityEnv().BETTER_AUTH_URL).origin; } catch { return false; }
}
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHORIZED") return Response.json({ error: message }, { status: 401 });
  if (["FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message)) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (error && typeof error === "object" && "code" in error && error.code === "23505") return Response.json({ error: "SUBSCRIPTION_CONFLICT" }, { status: 409 });
  console.error("PUSH_REQUEST_FAILED");
  return Response.json({ error: "PUSH_REQUEST_FAILED" }, { status: 500 });
}

export async function GET(request: Request) {
  if (process.env.PUSH_ENABLED !== "true") return Response.json({ error: "PUSH_DISABLED" }, { status: 404 });
  try {
    const parsed = scopeSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const { session, tenantId } = await context(parsed.data.tenantIdentifier ?? null);
    const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY;
    if (!publicKey) return Response.json({ error: "PUSH_UNAVAILABLE" }, { status: 503 });
    const enabled = parsed.data.endpoint ? await withTenantTransaction({ userId: session.user.id, organizationId: tenantId }, async tx => {
      const [row] = await tx.select({ enabled: pushSubscriptions.enabled }).from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, session.user.id), tenantId === null ? isNull(pushSubscriptions.organizationId) : eq(pushSubscriptions.organizationId, tenantId), eq(pushSubscriptions.endpoint, parsed.data.endpoint!))).limit(1);
      return row?.enabled ?? false;
    }) : false;
    return Response.json({ publicKey, enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (process.env.PUSH_ENABLED !== "true") return Response.json({ error: "PUSH_DISABLED" }, { status: 404 });
  if (!sameOrigin(request)) return Response.json({ error: "CSRF_REJECTED" }, { status: 403 });
  let raw: unknown;
  try { raw = await readJsonLimited(request, 8192); }
  catch (error) {
    if (error instanceof RangeError) return Response.json({ error: "INVALID_REQUEST" }, { status: 413 });
    return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success || (parsed.data.action === "subscribe" && !parsed.data.subscription)) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  let validated: PushSubscription | undefined;
  try { if (parsed.data.action === "subscribe") validated = validatePushSubscription(parsed.data.subscription); }
  catch { return Response.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 }); }
  try {
    const { session, tenantId } = await context(parsed.data.tenantIdentifier ?? null);
    return await withTenantTransaction({ userId: session.user.id, organizationId: tenantId }, async tx => {
      const scope = and(eq(pushSubscriptions.userId, session.user.id), tenantId === null ? isNull(pushSubscriptions.organizationId) : eq(pushSubscriptions.organizationId, tenantId));
      if (parsed.data.action === "unsubscribe") {
        if (!parsed.data.subscription || typeof parsed.data.subscription !== "object" || !("endpoint" in parsed.data.subscription) || typeof parsed.data.subscription.endpoint !== "string") return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
        const removed = await tx.delete(pushSubscriptions).where(and(scope, eq(pushSubscriptions.endpoint, parsed.data.subscription.endpoint))).returning({ id: pushSubscriptions.id });
        return removed.length ? Response.json({ ok: true }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      const [existing] = await tx.select({ userId: pushSubscriptions.userId, organizationId: pushSubscriptions.organizationId }).from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, validated!.endpoint)).for("update");
      if (existing && (existing.userId !== session.user.id || existing.organizationId !== tenantId)) return Response.json({ error: "SUBSCRIPTION_OWNED_BY_ANOTHER_USER" }, { status: 409 });
      if (existing) {
        await tx.update(pushSubscriptions).set({ p256dh: validated!.keys.p256dh, auth: validated!.keys.auth, enabled: true }).where(and(scope, eq(pushSubscriptions.endpoint, validated!.endpoint)));
      } else {
        await tx.insert(pushSubscriptions).values({ userId: session.user.id, organizationId: tenantId, endpoint: validated!.endpoint, p256dh: validated!.keys.p256dh, auth: validated!.keys.auth, enabled: true });
      }
      return Response.json({ ok: true });
    });
  } catch (error) { return errorResponse(error); }
}
