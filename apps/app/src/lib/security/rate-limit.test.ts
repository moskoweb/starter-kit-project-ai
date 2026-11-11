import assert from "node:assert/strict";
import { rateLimitBucket, rateLimitKeyHash, validateRateLimitConfig, readJsonLimited } from "./rate-limit";

async function selfCheck() {
  const before = rateLimitBucket(new Date("2026-01-01T00:00:59.999Z"), 60);
  assert.equal(before.start.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(before.expires.toISOString(), "2026-01-01T00:01:00.000Z");
  assert.equal(before.retryAfter, 1);
  const boundary = rateLimitBucket(new Date("2026-01-01T00:01:00.000Z"), 60);
  assert.equal(boundary.start.toISOString(), "2026-01-01T00:01:00.000Z");
  assert.equal(boundary.retryAfter, 60);
  assert.match(rateLimitKeyHash("ip:192.0.2.1", "a-secret"), /^[0-9a-f]{64}$/);
  assert.notEqual(rateLimitKeyHash("scope", "secret-one"), rateLimitKeyHash("scope", "secret-two"));
  assert.doesNotThrow(() => validateRateLimitConfig({ key: "scope", limit: 1, windowSeconds: 1 }));
  assert.throws(() => validateRateLimitConfig({ key: "scope", limit: 0, windowSeconds: 1 }), /INVALID_RATE_LIMIT_CONFIG/);
  const parsed = await readJsonLimited(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"ok":true}',
  }), 16);
  assert.deepEqual(parsed, { ok: true });
  await assert.rejects(readJsonLimited(new Request("https://example.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"payload":"too long"}',
  }), 4), /BODY_TOO_LARGE/);
}

selfCheck().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
