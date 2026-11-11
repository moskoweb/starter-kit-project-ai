import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "../../packages/db/src/client";
import { user, session, verification } from "../../packages/db/src/schema";

const enabled = process.env.IDENTITY_TEST_DATABASE === "1" && process.env.NODE_ENV !== "production";
const base = process.env.IDENTITY_TEST_BASE_URL ?? "http://127.0.0.1:3001";
const mailpit = process.env.IDENTITY_TEST_MAILPIT_URL ?? "http://127.0.0.1:18025";
let factorCalls = 0;
function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase()].map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}
function browser() {
  const cookies = new Map<string, string>();
  return async (path: string, body?: object) => {
    // Real BetterAuth rate limit spans two-factor paths; deterministic mocks cannot control app clock.
    if (path.startsWith("/two-factor/") && factorCalls++ > 0 && (factorCalls - 1) % 3 === 0) await delay(11_000);
    const response = await fetch(`${base}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: { origin: base, "content-type": "application/json", cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0]!; const index = pair.indexOf("=");
      cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    const data = await response.json().catch(() => null);
    return { response, data };
  };
}
async function emailText(email: string, subject: string) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const listing = await fetch(`${mailpit}/api/v1/messages`).then((r) => r.json());
    const message = listing.messages.find((m: { Subject: string; To: { Address: string }[] }) => m.Subject.includes(subject) && m.To.some((to) => to.Address === email));
    if (message) {
      const detail = await fetch(`${mailpit}/api/v1/message/${message.ID}`).then((r) => r.json());
      return String(detail.Text);
    }
    // SMTP is external; wait for captured-message condition on the real platform clock.
    await delay(100);
  }
  throw new Error(`Email ${subject} not received by local Mailpit`);
}

test("real signup, verification, reset, session, TOTP, email OTP and recovery reject reuse", { skip: !enabled, timeout: 120_000 }, async () => {
  assert.equal(new URL(base).hostname, "127.0.0.1", "Use loopback test app only");
  assert.equal(new URL(mailpit).hostname, "127.0.0.1", "Use local Mailpit only");
  const email = `identity-${randomUUID()}@example.test`;
  const password = `Identity!${randomUUID()}`;
  const call = browser();
  let createdId: string | undefined;
  try {
    const elevated = await call("/sign-up/email", { email, password, name: "Identity proof", role: "admin" });
    assert.equal(elevated.response.status, 400);
    assert.equal((await call("/sign-up/email", { email, password, name: "Identity proof" })).response.status, 200);
    const [created] = await getDb().select().from(user).where(eq(user.email, email));
    assert.equal(created!.role, "user");
    createdId = created!.id;
    assert.match(created!.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual((await call("/sign-in/email", { email, password })).response.status, 200);
    const verificationEmail = await emailText(email, "Verificar email");
    const verifyUrl = verificationEmail.match(/https?:\/\/\S+/)![0]!;
    assert.equal(new URL(verifyUrl).origin, new URL(base).origin);
    const token = new URL(verifyUrl).searchParams.get("token")!;
    assert.equal((await call(`/verify-email?token=${encodeURIComponent(token)}`)).response.status, 200);
    assert.equal((await call("/sign-in/email", { email, password })).response.status, 200);
    assert.ok((await call("/get-session")).data?.user);
    await getDb().update(session).set({ expiresAt: new Date(0) }).where(eq(session.userId, created!.id));
    assert.equal((await call("/get-session")).data, null);
    assert.equal((await call("/sign-in/email", { email, password })).response.status, 200);
    const setup = await call("/two-factor/enable", { password });
    assert.equal(setup.response.status, 200);
    assert.notEqual((await call("/two-factor/verify-totp", { code: "invalid" })).response.status, 200);
    assert.equal((await call("/two-factor/verify-totp", { code: totp(setup.data.totpURI) })).response.status, 200);
    const backup = setup.data.backupCodes[0];
    await call("/sign-out", {});
    assert.equal((await call("/get-session")).data, null);
    assert.equal((await call("/sign-in/email", { email, password })).data.twoFactorRedirect, true);
    assert.equal((await call("/two-factor/send-otp", {})).response.status, 200);
    const code = (await emailText(email, "Código de autenticação")).match(/\b\d{6}\b/)![0]!;
    assert.notEqual((await call("/two-factor/verify-otp", { code: "invalid" })).response.status, 200);
    assert.equal((await call("/two-factor/verify-otp", { code })).response.status, 200);
    await call("/sign-out", {});
    await call("/sign-in/email", { email, password });
    assert.notEqual((await call("/two-factor/verify-otp", { code })).response.status, 200);
    assert.equal((await call("/two-factor/verify-backup-code", { code: backup })).response.status, 200);
    await call("/sign-out", {});
    await call("/sign-in/email", { email, password });
    assert.notEqual((await call("/two-factor/verify-backup-code", { code: backup })).response.status, 200);
    await call("/request-password-reset", { email, redirectTo: `${base}/reset-password` });
    assert.notEqual((await call("/reset-password", { token: "invalid-token", newPassword: password })).response.status, 200);
    const resetToken = new URL((await emailText(email, "Redefinir senha")).match(/https?:\/\/\S+/)![0]!).pathname.split("/").at(-1)!;
    const nextPassword = `Changed!${randomUUID()}`;
    assert.equal((await call("/reset-password", { token: resetToken, newPassword: nextPassword })).response.status, 200);
    assert.notEqual((await call("/reset-password", { token: resetToken, newPassword: password })).response.status, 200);
    assert.notEqual((await call("/sign-in/email", { email, password })).response.status, 200);
    await call("/request-password-reset", { email, redirectTo: `${base}/reset-password` });
    const expired = await getDb().select().from(verification).where(eq(verification.value, created!.id));
    const reset = expired.find((row) => row.identifier.startsWith("reset-password:"));
    assert.ok(reset);
    await getDb().update(verification).set({ expiresAt: new Date(0) }).where(eq(verification.id, reset.id));
    assert.notEqual((await call("/reset-password", { token: reset.identifier.slice("reset-password:".length), newPassword: password })).response.status, 200);
  } finally {
    await getDb().delete(user).where(eq(user.email, email));
    if (createdId) await getDb().delete(verification).where(eq(verification.value, createdId));
    await closeDb();
  }
});
