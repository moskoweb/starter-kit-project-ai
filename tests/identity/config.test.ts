import test from "node:test";
import assert from "node:assert/strict";
import { getIdentityEnv } from "../../packages/config/src/identity";
import { canAccessProject } from "../../packages/auth/src/permissions";

test("identity requires real secret and accepts all three explicit profiles", () => {
  assert.throws(() => getIdentityEnv({}), /configuration invalid/);
  assert.throws(() => getIdentityEnv({ BETTER_AUTH_SECRET: "replace-with-at-least-32-random-characters", BETTER_AUTH_URL: "http://localhost:3000" }));
  for (const profile of ["personal", "organizations", "hybrid"]) {
    assert.equal(getIdentityEnv({ BETTER_AUTH_SECRET: "3c70169f2841497e9c506a0d272b7995", BETTER_AUTH_URL: "http://localhost:3000", IDENTITY_PROFILE: profile }).IDENTITY_PROFILE, profile);
  }
});
test("organization mode defaults to multi and single requires a valid organization UUID", () => {
  const env = { BETTER_AUTH_SECRET: "3c70169f2841497e9c506a0d272b7995", BETTER_AUTH_URL: "http://localhost:3000" };
  assert.equal(getIdentityEnv(env).ORGANIZATION_MODE, "multi");
  assert.equal(getIdentityEnv({ ...env, SINGLE_ORGANIZATION_ID: "" }).SINGLE_ORGANIZATION_ID, undefined);
  assert.equal(getIdentityEnv({ ...env, ORGANIZATION_MODE: "multi" }).ORGANIZATION_MODE, "multi");
  assert.throws(() => getIdentityEnv({ ...env, ORGANIZATION_MODE: "invalid" }), /ORGANIZATION_MODE/);
  for (const id of [undefined, "", "not-a-uuid"]) {
    assert.throws(() => getIdentityEnv({ ...env, ORGANIZATION_MODE: "single", SINGLE_ORGANIZATION_ID: id }), /SINGLE_ORGANIZATION_ID/);
  }
  const id = "c944e9af-0796-4a40-9598-66f8bb723033";
  const single = getIdentityEnv({ ...env, ORGANIZATION_MODE: "single", SINGLE_ORGANIZATION_ID: id });
  assert.equal(single.ORGANIZATION_MODE, "single");
  assert.equal(single.SINGLE_ORGANIZATION_ID, id);
  assert.equal(single.IDENTITY_PROFILE, "hybrid");
});
test("declared project permissions deny unknown roles and preserve multiple memberships", () => {
  assert.equal(canAccessProject("viewer", "read"), true);
  assert.equal(canAccessProject("viewer", "create"), false);
  assert.equal(canAccessProject("member", "delete"), false);
  assert.equal(canAccessProject("unknown", "read"), false);
  assert.equal(canAccessProject("viewer, admin", "delete"), true);
});
