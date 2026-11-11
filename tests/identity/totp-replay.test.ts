import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "../../packages/db/src/client";
import { user } from "../../packages/db/src/auth-schema";

const enabled = process.env.IDENTITY_TEST_DATABASE === "1" && process.env.NODE_ENV !== "production";
const base = process.env.IDENTITY_TEST_BASE_URL ?? "http://127.0.0.1:3001";
function browser() {
  const cookies = new Map<string, string>();
  return async (path: string, body: object) => {
    const response = await fetch(`${base}/api/auth${path}`, {
      method: "POST", headers: { "content-type": "application/json", origin: base, cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") }, body: JSON.stringify(body),
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";", 1)[0]!;
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return { response, data: await response.json() };
  };
}

test("TOTP timestep accepted once across enrollment, independent challenges and concurrent requests", { skip: !enabled, timeout: 60_000 }, async () => {
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const email = `totp-replay-${randomUUID()}@example.invalid`;
  const password = `Identity!${randomUUID()}`;
  const setupBrowser = browser();
  try {
    assert.equal((await setupBrowser("/sign-up/email", { email, password, name: "Replay proof" })).response.status, 200);
    // This test targets replay, not delivery: fixture email confirmation is explicit DB setup.
    await getDb().update(user).set({ emailVerified: true }).where(eq(user.email, email));
    assert.equal((await setupBrowser("/sign-in/email", { email, password })).response.status, 200);
    const setup = await setupBrowser("/two-factor/enable", { password });
    assert.equal(setup.response.status, 200);
    const uri = new URL(setup.data.totpURI);
    const secret = base32.decode(uri.searchParams.get("secret")!.toUpperCase());
    const period = Number(uri.searchParams.get("period") ?? 30);
    const digits = Number(uri.searchParams.get("digits") ?? 6);
    const otp = createOTP(secret, { period, digits });
    const step = Math.floor(Date.now() / (period * 1000));
    const code = await otp.hotp(step);
    assert.equal((await setupBrowser("/two-factor/verify-totp", { code, trustDevice: false })).response.status, 200);
    await setupBrowser("/sign-out", {});
    const left = browser();
    const right = browser();
    for (const call of [left, right]) assert.equal((await call("/sign-in/email", { email, password })).data.twoFactorRedirect, true);
    for (const call of [left, right]) assert.equal((await call("/two-factor/verify-totp", { code, trustDevice: false })).response.status, 401, "enrollment timestep cannot authenticate another challenge");
    await delay(11_000); // Real native rate-limit window, not mocked clock.
    // Native window is ±1 timestep. Future drift is accepted once; no wall-clock mutation.
    const futureCode = await otp.hotp(step + 1);
    const results = await Promise.all([left, right].map((call) => call("/two-factor/verify-totp", { code: futureCode, trustDevice: false })));
    assert.equal(results.filter(({ response }) => response.status === 200).length, 1, "one timestep grants at most one session across challenges");
    await delay(11_000);
    const third = browser();
    assert.equal((await third("/sign-in/email", { email, password })).data.twoFactorRedirect, true);
    assert.notEqual((await third("/two-factor/verify-totp", { code: futureCode, trustDevice: false })).response.status, 200);
    assert.notEqual((await third("/two-factor/verify-totp", { code: await otp.hotp(step + 10), trustDevice: false })).response.status, 200);
  } finally {
    try { await getDb().delete(user).where(eq(user.email, email)); } finally { await closeDb(); }
  }
});
