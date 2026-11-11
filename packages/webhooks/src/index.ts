import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";

export const MAX_BODY_BYTES = 256 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isPublicIp(address: string): boolean {
  if (isIP(address) === 0) return false;
  try { return ipaddr.parse(address).range() === "unicast"; } catch { return false; }
}

export function signPayload(secret: string, rawBody: Uint8Array, timestamp = Math.floor(Date.now() / 1000)): string {
  if (rawBody.byteLength > MAX_BODY_BYTES) throw new Error("WEBHOOK_BODY_TOO_LARGE");
  return createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
}
export function verifySignature(secret: string, rawBody: Uint8Array, timestamp: number, signature: string, now = Math.floor(Date.now() / 1000)): boolean {
  if (rawBody.byteLength > MAX_BODY_BYTES || !Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signPayload(secret, rawBody, timestamp), "hex");
  const actual = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, actual);
}

export type WebhookEnvelope = { id: string; event: string; createdAt: string; data: unknown };
export function createEnvelope(event: string, data: unknown, allowedEvents: ReadonlySet<string>, id: string = randomUUID(), createdAt = new Date().toISOString()): WebhookEnvelope {
  if (!allowedEvents.has(event)) throw new Error("WEBHOOK_EVENT_NOT_ALLOWED");
  if (!uuid.test(id) || !Number.isFinite(Date.parse(createdAt))) throw new Error("INVALID_WEBHOOK_ENVELOPE_METADATA");
  return { id, event, createdAt, data };
}
export function validateEnvelope(value: unknown, allowedEvents: ReadonlySet<string>): value is WebhookEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && uuid.test(v.id) &&
    typeof v.event === "string" && allowedEvents.has(v.event) &&
    typeof v.createdAt === "string" && Number.isFinite(Date.parse(v.createdAt)) && "data" in v;
}

export { deliverWebhook } from "./transport";
export type { DeliveryResult } from "./transport";
