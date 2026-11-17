import assert from "node:assert/strict";
import type { Database } from "@vibe/db/client";
import { provisionAdmin, validateAdminInput } from "./seed-admin.js";

const password = "synthetic-safe-password";
const input = validateAdminInput(" Admin@Example.test ", " Admin ", password);
assert.equal(input.email, "admin@example.test");
assert.equal(input.name, "Admin");
for (const email of [undefined, "", "x", "a@@b.test", "a b@c.test", "a@b.test\0", `${"a".repeat(250)}@b.test`]) {
  assert.throws(() => validateAdminInput(email, "Admin", password), /Email/);
}
for (const name of [undefined, "", "  ", "a\0b", "a".repeat(201)]) {
  assert.throws(() => validateAdminInput(input.email, name, password), /Nome/);
}
for (const invalid of ["", "short", " ".repeat(12), "a".repeat(129), "password\0with-controls"]) {
  assert.throws(() => validateAdminInput(input.email, "Admin", invalid), /Senha/);
}
let transactions = 0;
let lookups = 0;
const db = {
  async transaction(run: (tx: unknown) => Promise<void>) {
    transactions++;
    // No mutating methods: any attempted insert/update/delete makes this fail.
    await run({ select: () => ({ from: () => ({ where: async () => { lookups++; return [{ id: "existing" }]; } }) }) });
  },
} as unknown as Database;
await assert.rejects(provisionAdmin(input, db), /Email já existe/);
assert.equal(transactions, 1);
assert.equal(lookups, 1);
await assert.rejects(provisionAdmin({ ...input, password: "short" }, db), /Senha/);
assert.equal(transactions, 1, "invalid input must not access database");
console.log("seed-admin check passed (validation and existing-email refusal, synthetic DB).");
