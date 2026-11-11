import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../../packages/db/src/client";
import { member, organization, user } from "../../packages/db/src/auth-schema";
import { projects, tasks } from "../../packages/db/src/domain-schema";
import { withTenantTransaction } from "../../packages/db/src/tenant";

import { canAccessProject } from "../../packages/auth/src/permissions";
const enabled = process.env.IDENTITY_TEST_DATABASE === "1" && process.env.NODE_ENV !== "production";

test("runtime DB: tenant/personal RLS, revocation, relation scope and pooled context", { skip: !enabled }, async () => {
  const db = getDb();
  const a = randomUUID();
  const b = randomUUID();
  const orgA = randomUUID();
  const orgB = randomUUID();
  const projectA = randomUUID();
  const projectB = randomUUID();
  const personalA = randomUUID();
  const personalB = randomUUID();
  const scopeA = { userId: a, organizationId: orgA };
  const scopeB = { userId: b, organizationId: orgB };
  const ownA = { userId: a, organizationId: null };
  const ownB = { userId: b, organizationId: null };
  const now = new Date();
  const marker = `identity-rls-${randomUUID()}`;

  async function assertNoContext() {
    await db.transaction(async (tx) => {
      const [settings] = await tx.execute<{ user: string | null; tenant: string | null }>(sql`
        select nullif(current_setting('app.current_user_id', true), '') as "user",
          nullif(current_setting('app.current_tenant_id', true), '') as tenant
      `);
      assert.equal(settings?.user, null);
      assert.equal(settings?.tenant, null);
      assert.deepEqual(await tx.select().from(projects), []);
      assert.deepEqual(await tx.select().from(tasks), []);
    });
  }

  try {
    const [runtime] = await db.execute<{ rolsuper: boolean; rolbypassrls: boolean; owns_domain: boolean }>(sql`
      select r.rolsuper, r.rolbypassrls,
        exists (select 1 from pg_class c where c.oid = 'public.projects'::regclass and c.relowner = r.oid) as owns_domain
      from pg_roles r where r.rolname = current_user`);
    assert.ok(runtime);
    assert.equal(runtime.rolsuper, false, "test requires non-superuser runtime DATABASE_URL");
    assert.equal(runtime.rolbypassrls, false);
    assert.equal(runtime.owns_domain, false);
    await db.insert(user).values([
      { id: a, name: marker, email: `${a}@example.invalid`, emailVerified: true },
      { id: b, name: marker, email: `${b}@example.invalid`, emailVerified: true },
    ]);
    await db.insert(organization).values([
      { id: orgA, name: marker, slug: `${marker}-a`, createdAt: now },
      { id: orgB, name: marker, slug: `${marker}-b`, createdAt: now },
    ]);
    await db.insert(member).values([
      { id: randomUUID(), userId: a, organizationId: orgA, role: "owner", createdAt: now },
      { id: randomUUID(), userId: b, organizationId: orgB, role: "owner", createdAt: now },
      { id: randomUUID(), userId: a, organizationId: orgB, role: "viewer", createdAt: now },
    ]);
    for (const [context, id] of [[scopeA, projectA], [scopeB, projectB], [ownA, personalA], [ownB, personalB]] as const) {
      await withTenantTransaction(context, async (tx) => {
        await tx.insert(projects).values({ id, ownerUserId: context.userId, organizationId: context.organizationId, name: marker });
        await tx.insert(tasks).values({ projectId: id, ownerUserId: context.userId, organizationId: context.organizationId, title: marker });
      });
    }
    await assertNoContext();

    for (const [context, visible, hidden] of [[scopeA, projectA, projectB], [scopeB, projectB, projectA], [ownA, personalA, personalB], [ownB, personalB, personalA]] as const) {
      await withTenantTransaction(context, async (tx) => {
        assert.deepEqual((await tx.select({ id: projects.id }).from(projects)).map((row) => row.id), [visible]);
        assert.deepEqual(await tx.select().from(projects).where(eq(projects.id, hidden)), []);
        assert.deepEqual(await tx.update(projects).set({ name: "denied" }).where(eq(projects.id, hidden)).returning(), []);
        assert.deepEqual(await tx.delete(projects).where(eq(projects.id, hidden)).returning(), []);
        assert.equal((await tx.select().from(tasks)).length, 1);
      });
      await assert.rejects(withTenantTransaction(context, async (tx) => {
        await tx.insert(projects).values({ ownerUserId: context.userId === a ? b : a, organizationId: context.organizationId, name: marker });
      }));
    }
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.insert(tasks).values({ projectId: projectB, ownerUserId: a, organizationId: orgA, title: marker });
    }));
    await assert.rejects(withTenantTransaction(ownA, async (tx) => {
      await tx.insert(tasks).values({ projectId: personalB, ownerUserId: a, organizationId: null, title: marker });
    }));
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.update(projects).set({ organizationId: orgB }).where(eq(projects.id, projectA));
    }));
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.update(projects).set({ ownerUserId: b }).where(eq(projects.id, projectA));
    }));

    await withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      assert.equal(role, "viewer");
      assert.equal((await tx.select().from(projects)).length, 1);
      assert.equal(canAccessProject(role!, "read"), true);
      assert.equal(canAccessProject(role!, "update"), false);
      assert.equal(canAccessProject(role!, "delete"), false);
    });
    await assert.rejects(withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      if (!canAccessProject(role!, "create")) throw new Error("FORBIDDEN");
      await tx.insert(projects).values({ ownerUserId: a, organizationId: orgB, name: marker });
    }), /FORBIDDEN/);
    await db.update(member).set({ role: "member" }).where(and(eq(member.userId, a), eq(member.organizationId, orgB)));
    await withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      assert.equal(canAccessProject(role!, "create"), true);
      const [created] = await tx.insert(tasks).values({ projectId: projectB, ownerUserId: a, organizationId: orgB, title: `${marker}-collaborative` }).returning();
      assert.equal(created!.ownerUserId, a);
      assert.equal(created!.projectId, projectB);
      assert.equal((await tx.select().from(projects).where(eq(projects.id, projectB)))[0]!.ownerUserId, b);
      await tx.delete(tasks).where(eq(tasks.id, created!.id));
    });
    await db.delete(member).where(and(eq(member.userId, a), eq(member.organizationId, orgB)));
    await assert.rejects(withTenantTransaction({ userId: a, organizationId: orgB }, async () => {
      assert.fail("revoked membership must not enter callback");
    }), /FORBIDDEN/);
    await db.update(user).set({ role: "admin" }).where(eq(user.id, a));
    await assert.rejects(withTenantTransaction({ userId: a, organizationId: orgB }, async () => {
      assert.fail("global admin must not bypass membership");
    }), /FORBIDDEN/);

    await Promise.all(Array.from({ length: 60 }, async (_, index) => {
      const [context, expected] = ([[scopeA, projectA], [scopeB, projectB], [ownA, personalA], [ownB, personalB]] as const)[index % 4]!;
      await withTenantTransaction(context, async (tx) => {
        const rows = await tx.select({ id: projects.id }).from(projects);
        assert.deepEqual(rows.map((row) => row.id), [expected]);
      });
    }));
    await assertNoContext();
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.select().from(projects);
      throw new Error("deliberate rollback");
    }), /deliberate rollback/);
    await assertNoContext();
  } finally {
    // Cleanup namespaced fixtures only; auth FKs cascade domain data.
    try {
      await db.delete(organization).where(eq(organization.id, orgA));
      await db.delete(organization).where(eq(organization.id, orgB));
      await db.delete(user).where(eq(user.id, a));
      await db.delete(user).where(eq(user.id, b));
    } finally {
      await closeDb();
    }
  }
});
