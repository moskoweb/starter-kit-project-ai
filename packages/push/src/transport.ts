import { resolve4, resolve6 } from "node:dns/promises";
import { Agent as HttpsAgent } from "node:https";
import { isIP } from "node:net";
import { sendNotification } from "web-push";
import { isPublicIp } from "@vibe/webhooks";

export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushPayload = { id: string; title: string; body: string; url: string };
export type PushResult = "sent" | "expired";

const MAX_ENDPOINT_LENGTH = 2048;
const MAX_PAYLOAD_BYTES = 4096;
const TIMEOUT_MS = 10_000;
const DEFAULT_ALLOWED_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-bl2p.notify.windows.com", "wns2-by2p.notify.windows.com", "wns2-db5p.notify.windows.com", "wns2-hp2p.notify.windows.com", "wns2-mx2p.notify.windows.com", "wns2-se2p.notify.windows.com", "wns2-tp2p.notify.windows.com"];

function allowedHosts(): Set<string> {
  const configured = process.env.PUSH_ALLOWED_HOSTS;
  const hosts = configured === undefined ? DEFAULT_ALLOWED_HOSTS : configured.split(",").map((host) => host.trim().toLowerCase());
  if (!hosts.length || hosts.some((host) => !host || host !== host.replace(/\.$/, "") || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host))) throw new Error("PUSH_ALLOWED_HOSTS_INVALID");
  return new Set(hosts);
}

export function validatePushSubscription(value: unknown): PushSubscription {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.endpoint !== "string" || candidate.endpoint.length > MAX_ENDPOINT_LENGTH) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  let url: URL;
  try { url = new URL(candidate.endpoint); } catch { throw new Error("PUSH_SUBSCRIPTION_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || url.hash || !allowedHosts().has(url.hostname.toLowerCase()) || isIP(url.hostname)) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  if (!candidate.keys || typeof candidate.keys !== "object" || Array.isArray(candidate.keys)) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  const keys = candidate.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== "string" || !/^[A-Za-z0-9_-]{87}=?$/.test(keys.p256dh) || typeof keys.auth !== "string" || !/^[A-Za-z0-9_-]{22}(?:==)?$/.test(keys.auth)) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  const p256dh = Buffer.from(keys.p256dh, "base64url");
  const auth = Buffer.from(keys.auth, "base64url");
  if (p256dh.length !== 65 || auth.length !== 16 || p256dh[0] !== 4 || p256dh.toString("base64url") !== keys.p256dh.replace(/=+$/, "") || auth.toString("base64url") !== keys.auth.replace(/=+$/, "")) throw new Error("PUSH_SUBSCRIPTION_INVALID");
  return { endpoint: url.href, keys: { p256dh: keys.p256dh.replace(/=+$/, ""), auth: keys.auth.replace(/=+$/, "") } };
}

function assertPushEnabled(): void {
  if (process.env.PUSH_ENABLED !== "true") throw new Error("PUSH_DISABLED");
}

function vapidDetails() {
  const subject = process.env.PUSH_VAPID_SUBJECT?.trim();
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY?.trim();
  if (!subject || !publicKey || !privateKey) throw new Error("PUSH_VAPID_CONFIGURATION_REQUIRED");
  return { subject, publicKey, privateKey };
}

export async function sendPush(subscription: PushSubscription, payload: PushPayload): Promise<PushResult> {
  assertPushEnabled();
  const validSubscription = validatePushSubscription(subscription);
  const endpoint = new URL(validSubscription.endpoint);
  const { id, title, body, url: targetUrl } = payload;
  if (typeof id !== "string" || id.length < 1 || id.length > 128 || typeof title !== "string" || title.length < 1 || title.length > 256 || typeof body !== "string" || body.length > 1024 || typeof targetUrl !== "string" || targetUrl.length > 2048 || !targetUrl.startsWith("/") || targetUrl.startsWith("//") || targetUrl.includes("\\")) throw new Error("PUSH_PAYLOAD_INVALID");
  const bodyJson = JSON.stringify({ id, title, body, url: targetUrl });
  if (Buffer.byteLength(bodyJson) > MAX_PAYLOAD_BYTES) throw new Error("PUSH_PAYLOAD_TOO_LARGE");
  const credentials = vapidDetails();
  const addressesPromise = Promise.all([
    resolve4(endpoint.hostname).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENODATA" || error.code === "ENOTFOUND") return []; throw error; }),
    resolve6(endpoint.hostname).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENODATA" || error.code === "ENOTFOUND") return []; throw error; }),
  ]);
  const { promise: timeoutPromise, reject: rejectTimeout } = Promise.withResolvers<never>();
  const timeoutHandle = setTimeout(() => rejectTimeout(new Error("PUSH_TIMEOUT")), TIMEOUT_MS);
  let answers: string[][];
  try { answers = await Promise.race([addressesPromise, timeoutPromise]); }
  catch (error) {
    clearTimeout(timeoutHandle);
    if (error instanceof Error && error.message === "PUSH_TIMEOUT") throw error;
    throw new Error("PUSH_DNS_FAILED");
  }
  const addresses = [...new Set(answers.flat())];
  if (!addresses.length || addresses.some((ip) => !isPublicIp(ip))) {
    clearTimeout(timeoutHandle);
    throw new Error("PUSH_SUBSCRIPTION_INVALID");
  }
  const agent = new HttpsAgent({
    lookup: (hostname, options, callback) => {
      if (hostname.toLowerCase() !== endpoint.hostname.toLowerCase()) return callback(new Error("PUSH_DNS_LOOKUP_REJECTED"), "", 0);
      const family = typeof options === "object" && options !== null ? options.family : 0;
      const address = family ? addresses.find((ip) => isIP(ip) === family) : addresses[0];
      if (!address) return callback(new Error("PUSH_DNS_LOOKUP_FAILED"), "", 0);
      callback(null, address, isIP(address));
    },
  });
  try {
    await Promise.race([sendNotification(validSubscription, bodyJson, { vapidDetails: credentials, TTL: 60, timeout: TIMEOUT_MS, agent }), timeoutPromise]);
    return "sent";
  } catch (error) {
    if (error instanceof Error && error.message === "PUSH_TIMEOUT") throw error;
    if (error && typeof error === "object" && "statusCode" in error) {
      const statusCode = error.statusCode;
      if (statusCode === 404 || statusCode === 410) return "expired";
    }
    throw new Error("PUSH_DELIVERY_FAILED");
  } finally { clearTimeout(timeoutHandle!); agent.destroy(); }
}
