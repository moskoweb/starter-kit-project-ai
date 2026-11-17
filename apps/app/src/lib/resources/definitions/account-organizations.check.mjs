import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(new URL("../../../../../../package.json", import.meta.url));
const { transpileModule, ModuleKind } = require("typescript");
const { z } = require("zod");
const env = { IDENTITY_PROFILE: "hybrid", ORGANIZATION_MODE: "multi", SINGLE_ORGANIZATION_ID: "uuid-team" };
let authenticated = true, role = "owner", membership = true, apiError = false, missingUpdate = false;
const writes = [];
const dependencies = {
  "server-only": {}, "zod": { z }, "next/headers": { headers: async () => ({}) },
  "@vibe/config/env": { getIdentityEnv: () => env },
  "../../../components/organization/shared": load("../../../components/organization/shared.ts", {}),
  "../define": { defineResource: value => value },
  "@vibe/auth": {
    requireSession: async () => { if (!authenticated) throw new Error("UNAUTHORIZED"); return { user: { id: "current-user", role: "user" } }; },
    resolveTenant: async slug => { if (!membership || slug !== "team") throw new Error("NOT_FOUND"); return { id: "uuid-team", slug, name: "Team", role }; },
    getAuth: () => ({ api: {
      listOrganizations: async () => [{ id: "uuid-team", name: "Team", slug: "team" }, { id: "uuid-other", name: "Other", slug: "other" }],
      createOrganization: async args => { if (apiError) throw new Error("secret"); writes.push(args.body); return args.body; },
      updateOrganization: async args => { if (apiError) throw new Error("secret"); writes.push(args.body); return missingUpdate ? null : { id: args.body.organizationId, ...args.body.data }; },
    } }),
  },
};
function load(path, deps) {
  const loaded = { exports: {} };
  const { outputText } = transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ModuleKind.CommonJS } });
  runInNewContext(outputText, { Error, exports: loaded.exports, require: name => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; } });
  return loaded.exports;
}
const resourceModule = load("./account-organizations.ts", dependencies);
const resource = resourceModule.accountOrganizationResource;
const forged = { userId: "forged", isAdmin: true, identifier: "other", role: "owner" };
const values = { name: " Renamed ", slug: "renamed" };
for (const invalid of [null, {}, { ...values, name: " " }, { ...values, name: "x".repeat(101) }, { ...values, slug: "new" }, { ...values, slug: "Invalid" }, { ...values, slug: "11111111-1111-4111-8111-111111111111" }, { ...values, role: "owner" }]) {
  assert.equal((await resource.create(forged, invalid)).error, "INVALID_INPUT");
  assert.equal((await resource.update(forged, "team", invalid)).error, "INVALID_INPUT");
}
authenticated = false;
assert.equal((await resource.create(forged, values)).error, "UNAUTHORIZED");
assert.equal((await resource.update(forged, "team", values)).error, "UNAUTHORIZED");
authenticated = true;
for (role of ["viewer", "member"]) assert.equal((await resource.update(forged, "team", values)).error, "FORBIDDEN");
role = "owner";
membership = false;
assert.equal((await resource.update(forged, "team", values)).error, "NOT_FOUND");
membership = true;
env.IDENTITY_PROFILE = "personal";
assert.equal(resource.can("owner", "read", forged), false);
assert.equal((await resource.create(forged, values)).error, "FORBIDDEN");
assert.equal((await resource.update(forged, "team", values)).error, "FORBIDDEN");
env.IDENTITY_PROFILE = "hybrid";
env.ORGANIZATION_MODE = "single";
assert.equal(resource.can(null, "create", forged), false);
assert.equal((await resource.create(forged, values)).error, "FORBIDDEN");
const state = { page: 1, pageSize: 10, search: "", sort: "name", direction: "asc", filters: {} };
assert.equal((await resource.list(forged, state)).total, 1);
env.ORGANIZATION_MODE = "multi";
assert.equal(writes.length, 0);
assert.equal((await resource.create(forged, values)).id, "renamed");
assert.equal((await resource.update(forged, "team", values)).id, "renamed");
assert.equal(writes[1].organizationId, "uuid-team");
assert.equal(writes[1].data.name, "Renamed");
missingUpdate = true;
assert.equal((await resource.update(forged, "team", values)).error, "RESOURCE_ERROR");
missingUpdate = false;
apiError = true;
assert.equal((await resource.update(forged, "team", values)).error, "RESOURCE_ERROR");
const fields = (await resource.form(forged))[0].fields;
assert.deepEqual(Array.from(fields, field => field.name), ["name", "slug"]);
assert.ok(fields.every(field => field.required));
assert.equal(resource.delete, undefined);
const actions = load("../resource-actions.ts", {
  "next/headers": dependencies["next/headers"], "zod": { z }, "@vibe/auth": dependencies["@vibe/auth"],
  "../panels/registry": { registry: [] }, "../panels/resources": { getPanelResource: () => undefined },
  "./definitions/account-organizations": resourceModule,
});
apiError = false;
assert.equal((await actions.updateRecord("$account", "organizations", "team", "other", values)).error, "INVALID_INPUT");
assert.equal((await actions.createRecord("$account", "users", null, values)).error, "FORBIDDEN");
assert.equal((await actions.createRecord("fake-panel", "organizations", null, values)).error, "FORBIDDEN");
role = "viewer";
assert.equal((await actions.updateRecord("$account", "organizations", "team", "team", values)).error, "FORBIDDEN");
authenticated = false;
assert.equal((await actions.createRecord("$account", "organizations", null, values)).error, "UNAUTHORIZED");
console.log("account-organizations check passed: strict input, fresh auth/membership, forged scope, roles, profiles, single mode, form, slug/UUID boundary, action registration.");
