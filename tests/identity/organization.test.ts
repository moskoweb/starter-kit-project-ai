import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb, closeDb } from "../../packages/db/src/client";
import { user, account, organization } from "../../packages/db/src/schema";

const enabled = process.env.IDENTITY_TEST_DATABASE === "1" && process.env.NODE_ENV !== "production";
const base = process.env.IDENTITY_TEST_BASE_URL ?? "http://127.0.0.1:3001";
function client() {
  const jar = new Map<string, string>();
  return async (path: string, body?: object) => {
    const response = await fetch(`${base}/api/auth${path}`, { method: body ? "POST" : "GET", headers: { origin: base, "content-type": "application/json", cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") }, ...(body ? { body: JSON.stringify(body) } : {}) });
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(";", 1)[0]!; const i = pair.indexOf("="); jar.set(pair.slice(0, i), pair.slice(i + 1)); }
    return { status: response.status, data: await response.json() };
  };
}
test("organization invitations, role separation, direct cross-tenant actions and revocation", { skip: !enabled, timeout: 30_000 }, async () => {
  assert.equal(new URL(base).hostname, "127.0.0.1");
  const ids = [randomUUID(), randomUUID()]; const orgs: string[] = [];
  const password = `Identity!${randomUUID()}`;
  const emails = ids.map((id) => `member-${id}@example.test`);
  try {
    const hash = await hashPassword(password);
    for (const [index, id] of ids.entries()) {
      await getDb().insert(user).values({ id, email: emails[index]!, name: "Membership proof", emailVerified: true, role: "user" });
      await getDb().insert(account).values({ id: randomUUID(), userId: id, accountId: id, providerId: "credential", password: hash, updatedAt: new Date() });
    }
    const owner = client(); const member = client();
    assert.equal((await owner("/sign-in/email", { email: emails[0], password })).status, 200);
    assert.equal((await member("/sign-in/email", { email: emails[1], password })).status, 200);
    for (let n = 0; n < 2; n++) {
      const result = await owner("/organization/create", { name: `Proof ${n}`, slug: `proof-${randomUUID()}` });
      assert.equal(result.status, 200); orgs.push(result.data.id);
    }
    assert.notEqual((await member("/organization/get-full-organization?organizationId=" + orgs[0])).status, 200);
    const invite = await owner("/organization/invite-member", { email: emails[1], role: "viewer", organizationId: orgs[0] });
    assert.equal(invite.status, 200);
    assert.equal((await member("/organization/accept-invitation", { invitationId: invite.data.id })).status, 200);
    assert.notEqual((await member("/organization/accept-invitation", { invitationId: invite.data.id })).status, 200);
    assert.notEqual((await member("/organization/invite-member", { email: "nope@example.test", role: "admin", organizationId: orgs[0] })).status, 200);
    assert.notEqual((await member("/organization/get-full-organization?organizationId=" + orgs[1])).status, 200);
    assert.notEqual((await member("/admin/list-users")).status, 200);
    const members = await owner("/organization/list-members?organizationId=" + orgs[0]);
    assert.equal(members.status, 200);
    const membership = members.data.members.find((entry: { userId: string }) => entry.userId === ids[1]);
    assert.ok(membership);
    assert.equal((await owner("/organization/update-member-role", { memberId: membership.id, role: "admin", organizationId: orgs[0] })).status, 200);
    assert.notEqual((await member("/admin/list-users")).status, 200);
    assert.equal((await owner("/organization/remove-member", { memberIdOrEmail: membership.id, organizationId: orgs[0] })).status, 200);
    assert.notEqual((await member("/organization/get-full-organization?organizationId=" + orgs[0])).status, 200);
    const [identity] = await getDb().select({ role: user.role }).from(user).where(eq(user.id, ids[1]!));
    assert.equal(identity!.role, "user");
  } finally {
    if (orgs.length) await getDb().delete(organization).where(inArray(organization.id, orgs));
    await getDb().delete(user).where(inArray(user.id, ids));
    await closeDb();
  }
});
