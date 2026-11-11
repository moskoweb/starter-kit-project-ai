import { setTimeout as delay } from "node:timers";
import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { MAX_BODY_BYTES, createEnvelope, isPublicIp, signPayload } from "./index";

const MAX_RESPONSE_BYTES = 64 * 1024;
export type DeliveryResult = { status: "delivered"; statusCode: number } | { status: "retryable" | "terminal"; statusCode: number | null };
type SendOptions = { url: string; allowedHosts: ReadonlySet<string>; secret: string; event: string; data: unknown; allowedEvents: ReadonlySet<string>; deliveryId: string; createdAt: string };
export async function deliverWebhook({ url: destination, allowedHosts, secret, event, data, allowedEvents, deliveryId, createdAt }: SendOptions): Promise<DeliveryResult> {
  const url = new URL(destination);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !allowedHosts.has(url.hostname.toLowerCase())) throw new Error("WEBHOOK_DESTINATION_REJECTED");
  const body = Buffer.from(JSON.stringify(createEnvelope(event, data, allowedEvents, deliveryId, createdAt)));
  if (body.byteLength > MAX_BODY_BYTES) throw new Error("WEBHOOK_BODY_TOO_LARGE");
  const { promise, resolve } = Promise.withResolvers<DeliveryResult>();
  let settled = false;
  let req: ReturnType<typeof httpsRequest> | undefined;
  const finish = (result: DeliveryResult) => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
  const timer = delay(() => { req?.destroy(); finish({ status: "retryable", statusCode: null }); }, 10_000);
  let answers: string[][];
  try {
    answers = await Promise.all([resolve4(url.hostname).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENODATA" || error.code === "ENOTFOUND") return []; throw error; }), resolve6(url.hostname).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENODATA" || error.code === "ENOTFOUND") return []; throw error; })]);
  } catch {
    clearTimeout(timer);
    throw new Error("WEBHOOK_DNS_FAILED");
  }
  if (settled) return promise;
  const addresses = [...new Set(answers.flat())];
  if (!addresses.length || addresses.some((ip) => !isPublicIp(ip))) { clearTimeout(timer); throw new Error("WEBHOOK_DESTINATION_REJECTED"); }
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(secret, body, timestamp);
  req = httpsRequest(url, {
    method: "POST", servername: url.hostname,
    lookup: (_hostname, options, callback) => {
      const family = typeof options === "object" && options !== null ? options.family : 0;
      const selected = family ? addresses.find((ip) => isIP(ip) === family) : addresses[0];
      if (!selected) return callback(new Error("DNS_LOOKUP_FAILED"), "", 0);
      callback(null, selected, isIP(selected));
    },
    headers: { "content-type": "application/json", "content-length": body.byteLength, "x-webhook-timestamp": String(timestamp), "x-webhook-signature": `sha256=${signature}` },
    timeout: 10_000,
  }, (res) => {
    let size = 0;
    res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > MAX_RESPONSE_BYTES) { req?.destroy(); finish({ status: "terminal", statusCode: null }); } });
    res.on("end", () => {
      const code = res.statusCode ?? 0;
      finish(code >= 200 && code < 300 ? { status: "delivered", statusCode: code } : { status: code === 408 || code === 429 || code >= 500 ? "retryable" : "terminal", statusCode: code });
    });
    res.on("error", () => finish({ status: "retryable", statusCode: null }));
  });
  req.on("timeout", () => req?.destroy(new Error("timeout")));
  req.on("error", () => finish({ status: "retryable", statusCode: null }));
  req.end(body);
  return promise;
}
