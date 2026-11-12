import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { canAccessScope } from "@vibe/auth/permissions";
import { getSql, type TenantTransaction, webhookDeliveries } from "@vibe/db";
import { eventTypePattern } from "@vibe/events";
import { parseJobEnvelope, sendJob, type JobEnvelope } from "@vibe/jobs";
import type { PgBoss } from "pg-boss";
import { deliverWebhook, verifySignature } from "./index";
import { checkedWorkerSql } from "./worker-connection";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isEventName = (event: unknown): event is string => typeof event === "string" && event.length <= 100 && eventTypePattern.test(event);
type Context = { actorUserId: string; organizationId: string | null };

/**
 * Verifies signature/envelope and records an idempotent receipt; returns 200 (new or identical replay) or 409.
 * Processing is project-specific: consume `webhook_receipts` from your own code (hook point), never here.
 */
export async function acceptInbound(raw: Uint8Array, headers: Headers): Promise<{ status: number; body: string }> {
  const endpointId = process.env.WEBHOOK_INBOUND_ENDPOINT_ID;
  const secret = process.env.WEBHOOK_INBOUND_SECRET;
  if (!endpointId || !secret || !uuid.test(endpointId)) return { status: 404, body: "NOT_FOUND" };
  if (raw.byteLength > 256 * 1024) return { status: 413, body: "PAYLOAD_TOO_LARGE" };
  const timestamp = Number(headers.get("x-webhook-timestamp"));
  const signature = headers.get("x-webhook-signature")?.replace(/^sha256=/, "") ?? "";
  if (!verifySignature(secret, raw, timestamp, signature)) return { status: 401, body: "INVALID_SIGNATURE" };
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(raw).toString("utf8")); } catch { return { status: 400, body: "INVALID_PAYLOAD" }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: 400, body: "INVALID_PAYLOAD" };
  const envelope = parsed as Record<string, unknown>;
  if (typeof envelope.id !== "string" || !uuid.test(envelope.id) || !isEventName(envelope.event) || typeof envelope.createdAt !== "string" || !Number.isFinite(Date.parse(envelope.createdAt)) || !("data" in envelope) || Object.keys(envelope).some((key) => !["id", "event", "createdAt", "data"].includes(key))) return { status: 400, body: "INVALID_PAYLOAD" };
  const eventId = envelope.id;
  const bodyHash = createHash("sha256").update(raw).digest("hex");
  try {
    const status = await getSql().begin(async (tx) => {
      const inserted = await tx`insert into webhook_receipts (endpoint_id, event_id, body_hash, payload) values (${endpointId}::uuid, ${eventId}::uuid, ${bodyHash}, ${JSON.stringify(envelope)}::jsonb) on conflict (endpoint_id, event_id) do nothing returning id`;
      if (inserted.length) return 200;
      const [prior] = await tx`select body_hash from webhook_receipts where endpoint_id = ${endpointId}::uuid and event_id = ${eventId}::uuid`;
      return prior?.body_hash === bodyHash ? 200 : 409;
    });
    return { status, body: status === 200 ? "OK" : "EVENT_ID_CONFLICT" };
  } catch { return { status: 500, body: "DELIVERY_FAILED" }; }
}

/** Call inside the same tenant transaction as `enqueueEvent`; `event` must match the event name pattern. */
export async function createDelivery(tx: TenantTransaction, context: Context, eventId: string, event: string, payload: unknown) {
  if (!uuid.test(context.actorUserId) || (context.organizationId !== null && !uuid.test(context.organizationId)) || !uuid.test(eventId)) throw new Error("INVALID_IDENTITY_CONTEXT");
  if (!isEventName(event)) throw new Error("INVALID_WEBHOOK_EVENT");
  const enabled = process.env.WEBHOOKS_OUTBOUND_ENABLED ?? "false";
  if (enabled !== "true" && enabled !== "false") throw new Error("WEBHOOKS_OUTBOUND_ENABLED must be true or false");
  if (enabled === "false") throw new Error("WEBHOOK_OUTBOUND_DISABLED");
  if (!process.env.WEBHOOK_OUTBOUND_URL || !process.env.WEBHOOK_OUTBOUND_SECRET || !process.env.WEBHOOK_OUTBOUND_ALLOWED_HOSTS) throw new Error("WEBHOOK_OUTBOUND_NOT_CONFIGURED");
  const [row] = await tx.insert(webhookDeliveries).values({ actorUserId: context.actorUserId, organizationId: context.organizationId, eventId, event, payload }).returning({ id: webhookDeliveries.id });
  return row!;
}

export async function relayWebhookDeliveries(boss: PgBoss, limit = 25): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_RELAY_LIMIT");
  const sql = await checkedWorkerSql();
  return sql.begin(async (tx) => {
    const rows = await tx`select id, actor_user_id, organization_id, event_id from webhook_deliveries where status in ('pending', 'queued') and next_at <= now() order by next_at, id limit ${limit} for update skip locked`;
    for (const row of rows) {
      const context = row.organization_id === null ? { kind: "personal" as const } : { kind: "organization" as const, organizationId: row.organization_id };
      const envelope: JobEnvelope = { version: 1, type: "webhook", eventId: row.event_id, actorUserId: row.actor_user_id, context, entityId: row.id, correlationId: row.id };
      await sendJob(boss, tx, envelope);
      await tx`update webhook_deliveries set status = 'queued', next_at = now() + interval '15 minutes' where id = ${row.id} and status in ('pending', 'queued')`;
    }
    return rows.length;
  });
}

export async function webhookHandler(input: JobEnvelope): Promise<void> {
  const envelope = parseJobEnvelope(input, "webhook");
  const sql = await checkedWorkerSql();
  await sql.begin(async (tx) => {
    const [row] = await tx`select * from webhook_deliveries where id = ${envelope.entityId}::uuid and event_id = ${envelope.eventId}::uuid for update`;
    if (!row || row.status === "delivered" || row.status === "failed") return;
    if (row.status === "pending" && new Date(row.next_at).getTime() > Date.now()) return;
    const contextOrg = envelope.context.kind === "organization" ? envelope.context.organizationId : null;
    if (row.actor_user_id !== envelope.actorUserId || row.organization_id !== contextOrg || envelope.correlationId !== row.id) throw new Error("WEBHOOK_ENVELOPE_MISMATCH");
    await tx`select set_config('app.current_user_id', ${row.actor_user_id}, true), set_config('app.current_tenant_id', ${row.organization_id ?? ""}, true)`;
    const [actor] = await tx`select id, banned, ban_expires from "user" where id = ${row.actor_user_id}`;
    let authorized = !!actor && (!actor.banned || (actor.ban_expires !== null && new Date(actor.ban_expires) <= new Date()));
    if (row.organization_id !== null) {
      const [membership] = await tx`select role from member where user_id = ${row.actor_user_id} and organization_id = ${row.organization_id}`;
      authorized = authorized && !!membership && canAccessScope(membership.role, "create");
    }
    if (!authorized) { await tx`update webhook_deliveries set status = 'failed' where id = ${row.id}`; return; }
    if (Date.now() - new Date(row.created_at).getTime() > 86_400_000) { await tx`update webhook_deliveries set status = 'failed' where id = ${row.id}`; return; }
    const allowedHosts = new Set((process.env.WEBHOOK_OUTBOUND_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
    const url = process.env.WEBHOOK_OUTBOUND_URL;
    const secret = process.env.WEBHOOK_OUTBOUND_SECRET;
    if (!url || !secret || !allowedHosts.size) throw new Error("WEBHOOK_OUTBOUND_NOT_CONFIGURED");
    // Stored event was validated at insert; a tampered name fails createEnvelope and becomes terminal.
    const result = await deliverWebhook({ url, allowedHosts, secret, deliveryId: row.id, createdAt: new Date(row.created_at).toISOString(), event: row.event, data: row.payload, allowedEvents: new Set([row.event].filter(isEventName)) }).catch((error: unknown) => ({ status: error instanceof Error && error.message === "WEBHOOK_DNS_FAILED" ? "retryable" as const : "terminal" as const, statusCode: null }));
    const attempt = Number(row.attempts) + 1;
    const failure = result.status !== "delivered";
    const terminal = result.status === "terminal" || attempt >= 5;
    const nextAt = terminal ? new Date() : new Date(Date.now() + Math.min(24 * 60 * 60_000, 30_000 * 2 ** (attempt - 1)));
    await tx`update webhook_deliveries set attempts = ${attempt}, status = ${failure ? terminal ? "failed" : "pending" : "delivered"}, next_at = ${nextAt}, last_status_code = ${result.statusCode === null ? null : String(result.statusCode)} where id = ${row.id}`;
  });
}

export async function listDeliveries(tx: TenantTransaction) {
  return tx.select().from(webhookDeliveries).orderBy(webhookDeliveries.createdAt).limit(100);
}

export async function retryDelivery(tx: TenantTransaction, id: string) {
  return tx.update(webhookDeliveries).set({ status: "pending", nextAt: new Date(), lastStatusCode: null }).where(and(eq(webhookDeliveries.id, id), eq(webhookDeliveries.status, "failed"))).returning();
}
