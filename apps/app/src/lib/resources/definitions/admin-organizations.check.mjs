import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

// Execute the actual resource with synthetic auth/DB boundaries. No real session or DB access.
const require = createRequire(new URL("../../../../../../package.json", import.meta.url));
const { transpileModule, ModuleKind } = require("typescript");
const { z } = require("zod");
const id = "11111111-1111-4111-8111-111111111111";
const organization = { id: "organization.id", name: "organization.name", slug: "organization.slug", createdAt: "organization.createdAt" };
let authError;
let dbError;
let found = true;
let authChecks = 0;
const writes = [];
const db = {
  update(table) {
    const write = { table };
    writes.push(write);
    return { set(values) {
      write.values = values;
      return { where(predicate) {
        write.predicate = predicate;
        return { returning: async () => { if (dbError) throw dbError; return found ? [{ id }] : []; } };
      } };
    } };
  },
};
const dependencies = {
  "server-only": {},
  "zod": { z },
  "drizzle-orm": { count: () => ({ as: () => "members" }), eq: (...args) => args },
  "@vibe/db": { organization, member: { id: "member.id" }, user: {}, getDb: () => db },
  "../define": { defineResource: value => value },
  "../list-state": {},
  "./admin-users": {
    requireAdmin: async () => { authChecks++; if (authError) throw new Error(authError); },
    adminError: error => ({ ok: false, error: ["FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"].includes(error.message) ? error.message : "RESOURCE_ERROR" }),
  },
};
const loaded = { exports: {} };
const source = readFileSync(new URL("./admin-organizations.ts", import.meta.url), "utf8");
const { outputText } = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } });
runInNewContext(outputText, { exports: loaded.exports, require: name => {
  assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
  return dependencies[name];
} });
const resource = loaded.exports.adminOrganizationResource;
const scope = { isAdmin: true, identifier: null, role: null, userId: id };
const plain = value => JSON.parse(JSON.stringify(value));
for (const operation of ["read", "create", "update", "delete"]) {
  assert.equal(resource.can(null, operation, scope), ["read", "update"].includes(operation));
  assert.equal(resource.can("owner", operation, { ...scope, isAdmin: false }), false);
  assert.equal(resource.can(null, operation, { ...scope, identifier: "foreign-tenant" }), false);
}
assert.equal(resource.create, undefined);
assert.equal(resource.delete, undefined);
assert.ok(!resource.actions?.some(action => action.name === "delete"));
const fields = (await resource.form(scope))[0].fields;
assert.equal(fields.find(field => field.name === "slug").disabledOnEdit, true);
assert.equal(fields.find(field => field.name === "name").maxLength, 100);
for (authError of ["FORBIDDEN", "UNAUTHORIZED"]) {
  assert.equal((await resource.update(scope, id, { name: "Valid" })).error, authError);
}
authError = undefined;
for (const denied of [{ ...scope, isAdmin: false }, { ...scope, identifier: "foreign-tenant" }]) {
  assert.equal((await resource.update(denied, id, { name: "Valid" })).error, "FORBIDDEN");
}
for (const values of [null, {}, { name: " " }, { name: "x".repeat(101) }, { name: 12 }, { name: "Valid", slug: "changed" }, { name: "Valid", metadata: "{}" }, { name: "Valid", role: "owner" }]) {
  assert.equal((await resource.update(scope, id, values)).error, "INVALID_INPUT");
}
assert.equal((await resource.update(scope, "invalid", { name: "Valid" })).error, "INVALID_INPUT");
assert.equal(writes.length, 0);
assert.deepEqual(plain(await resource.update(scope, id, { name: "  Renamed  " })), { ok: true, id });
assert.deepEqual(plain(writes[0]), { table: organization, values: { name: "Renamed" }, predicate: [organization.id, id] });
found = false;
assert.equal((await resource.update(scope, id, { name: "Valid" })).error, "NOT_FOUND");
dbError = new Error("private database failure");
assert.equal((await resource.update(scope, id, { name: "Valid" })).error, "RESOURCE_ERROR");
assert.equal(authChecks, 16);
console.log("admin-organizations check passed: resource contract, auth, strict input, scoped name-only write, missing record, DB error, no deletion.");
