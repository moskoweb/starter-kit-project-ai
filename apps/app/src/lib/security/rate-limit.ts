import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { TenantTransaction } from "@vibe/db";

/** Server-only: reads RATE_LIMIT_SECRET and must never be imported by client components. */

export class RateLimitExceeded extends Error {
  readonly retryAfter: number;
  constructor(retryAfter: number) {
    super("RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitExceeded";
    this.retryAfter = retryAfter;
  }
}

export interface RateLimitResult {
  remaining: number;
  retryAfter: number;
}

/** Any transaction exposing `execute`; authenticated tenant tx satisfies it. */
export type LimiterTransaction = Pick<TenantTransaction, "execute">;

/** Fixed UTC window: [start, expires). retryAfter = whole seconds until expires. */
export function rateLimitBucket(now: Date, windowSeconds: number) {
  const seconds = Math.floor(now.getTime() / 1000);
  const startSeconds = Math.floor(seconds / windowSeconds) * windowSeconds;
  const endSeconds = startSeconds + windowSeconds;
  return {
    start: new Date(startSeconds * 1000),
    expires: new Date(endSeconds * 1000),
    retryAfter: endSeconds - seconds,
  };
}

/** Keyed hash of the scope key; raw IP or identifiers never reach the table. */
export function rateLimitKeyHash(key: string, secret: string): string {
  return createHmac("sha256", secret).update(key).digest("hex");
}

export function validateRateLimitConfig(options: { key: string; limit: number; windowSeconds: number }): void {
  if (
    options.key.length === 0 ||
    !Number.isSafeInteger(options.limit) || options.limit < 1 ||
    !Number.isSafeInteger(options.windowSeconds) || options.windowSeconds < 1
  ) {
    throw new TypeError("INVALID_RATE_LIMIT_CONFIG");
  }
}

/**
 * Atomic fixed-window counter. Single statement: a new window resets count to 1,
 * the same window increments. Count returned after increment decides allow/deny.
 */
export async function enforceRateLimit(
  tx: LimiterTransaction,
  options: { key: string; limit: number; windowSeconds: number },
  now: Date = new Date(),
): Promise<RateLimitResult> {
  validateRateLimitConfig(options);
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("RATE_LIMIT_SECRET must contain at least 32 characters");

  const bucket = rateLimitBucket(now, options.windowSeconds);
  const hashed = rateLimitKeyHash(options.key, secret);
  const [row] = await tx.execute<{ count: number }>(sql`
    insert into rate_limit_windows (key, window_start, count, expires_at)
    values (${hashed}, ${bucket.start}, 1, ${bucket.expires})
    on conflict (key) do update set
      window_start = excluded.window_start,
      count = case
        when rate_limit_windows.window_start <> excluded.window_start then 1
        else least(rate_limit_windows.count + 1, ${options.limit + 1})
      end,
      expires_at = excluded.expires_at
    returning count`);
  const count = Number(row?.count ?? 0);
  if (count < 1) throw new Error("RATE_LIMIT_WRITE_FAILED");
  if (count > options.limit) throw new RateLimitExceeded(bucket.retryAfter);
  return { remaining: options.limit - count, retryAfter: bucket.retryAfter };
}

/**
 * Reads JSON body with byte cap. Returns unknown: caller MUST validate (zod) before use.
 * Checks content-type, declared length, then real byte length.
 */
export async function readJsonLimited(request: Request, maxBytes: number): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new TypeError("INVALID_BODY_LIMIT");
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) throw new TypeError("UNSUPPORTED_CONTENT_TYPE");
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) throw new RangeError("BODY_TOO_LARGE");
  if (!request.body) throw new TypeError("INVALID_JSON_BODY");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RangeError("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
}
