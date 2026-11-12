import assert from "node:assert/strict";
import { renderAuthEmail, type AuthEmail } from "./render";

// Run explicitly: pnpm exec tsx packages/email/src/render.check.ts
const templates: AuthEmail[] = [
  { type: "verification", url: "https://example.test/verify?token=synthetic-check" },
  { type: "reset-password", url: "https://example.test/reset?token=synthetic-check" },
  { type: "invitation", url: "https://example.test/invitations/synthetic-check", organizationName: '<img src=x onerror="bad()"> & equipe' },
  { type: "otp", code: "123456" },
  { type: "change-email", url: "https://example.test/verify-email?token=synthetic-check", newEmail: "novo@example.test" },
  { type: "delete-account", url: "https://example.test/delete-user/callback?token=synthetic-check" },
];
for (const template of templates) {
  const result = await renderAuthEmail(template);
  assert.ok(result.subject && result.html.includes("<html") && result.text.trim());
  if (template.type === "otp") assert.ok(result.text.includes(template.code));
  else assert.ok(result.text.includes(template.url));
  if (template.type === "invitation") {
    assert.ok(!result.html.includes('<img src=x'));
    assert.ok(result.html.includes("&lt;img"));
    assert.ok(result.text.includes(template.organizationName));
  }
}
for (const url of ["javascript:alert(1)", "data:text/html,bad", "http://example.test/action", "https://user:pass@example.test/action", "/relative", "https://example.test/\nheader"]) {
  await assert.rejects(renderAuthEmail({ type: "verification", url }));
}
await assert.rejects(renderAuthEmail({ type: "otp", code: "<1234>" }));
await assert.rejects(renderAuthEmail({ type: "invitation", url: "https://example.test/action", organizationName: "bad\r\nsubject" }));
const previous = process.env.NODE_ENV;
await assert.rejects(renderAuthEmail({ type: "change-email", url: "https://example.test/action", newEmail: "bad\r\n@example.test" }));
assert.ok((await renderAuthEmail({ type: "change-email", url: "https://example.test/action", newEmail: "novo@example.test" })).text.includes("novo@example.test"));
try {
  process.env.NODE_ENV = "development";
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    await renderAuthEmail({ type: "verification", url: `http://${host}:3001/action` });
  }
  process.env.NODE_ENV = "production";
  await assert.rejects(renderAuthEmail({ type: "verification", url: "http://127.0.0.1:3001/action" }));
  process.env.EMAIL_ALLOW_INSECURE_LOOPBACK = "true";
  await renderAuthEmail({ type: "verification", url: "http://127.0.0.1:3001/action" });
  await assert.rejects(renderAuthEmail({ type: "verification", url: "http://example.test/action" }), "opt-in never allows non-loopback HTTP");
} finally {
  delete process.env.EMAIL_ALLOW_INSECURE_LOOPBACK;
  if (previous === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previous;
}
console.log("Email render checks passed");
