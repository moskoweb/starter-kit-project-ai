import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../../packages/db/src/client";
import { member, organization, user } from "../../packages/db/src/auth-schema";
import { eventOutbox, notifications } from "../../packages/db/src/events-schema";
import { pushSubscriptions } from "../../packages/db/src/push-schema";
import { storageObjects } from "../../packages/db/src/storage-schema";
import { withTenantTransaction } from "../../packages/db/src/tenant";
import { webhookDeliveries } from "../../packages/db/src/webhook-schema";
import { canAccessScope } from "../../packages/auth/src/permissions";

const enabled = process.env.IDENTITY_TEST_DATABASE === "1" && process.env.NODE_ENV !== "production";
type Context = { userId: string; organizationId: string | null };

// Requires the runtime role grants documented for storage_objects, push_subscriptions, event_outbox,
// notifications and webhook_deliveries. Uses only generic infrastructure tables shipped with the kit.
test("runtime DB: tenant/personal RLS, revocation, viewer write gate and pooled context", { skip: !enabled }, async () => {
  const db = getDb();
  const a = randomUUID();
  const b = randomUUID();
  const orgA = randomUUID();
  const orgB = randomUUID();
  const scopeA: Context = { userId: a, organizationId: orgA };
  const scopeB: Context = { userId: b, organizationId: orgB };
  const ownA: Context = { userId: a, organizationId: null };
  const ownB: Context = { userId: b, organizationId: null };
  const contexts = [scopeA, scopeB, ownA, ownB] as const;
  const now = new Date();
  const marker = `identity-rls-${randomUUID()}`;
  const rows = new Map<Context, { storage: string; push: string; event: string }>();

  const storageRow = (context: Context, ownerUserId = context.userId, organizationId = context.organizationId) => ({
    ownerUserId, organizationId, entityType: "fixture", entityId: randomUUID(), key: `${marker}/${randomUUID()}`,
    contentType: "text/plain", size: 1, status: "pending" as const, expiresAt: new Date(Date.now() + 60_000),
  });
  const pushRow = (context: Context, userId = context.userId) => ({
    userId, organizationId: context.organizationId, endpoint: `https://push.example.invalid/${randomUUID()}`, p256dh: marker, auth: marker,
  });
  const eventRow = (context: Context, actorUserId = context.userId) => ({
    actorUserId, organizationId: context.organizationId, entityId: randomUUID(), type: "fixture.created",
  });

  async function assertNoContext() {
    await db.transaction(async (tx) => {
      const [settings] = await tx.execute<{ user: string | null; tenant: string | null }>(sql`
        select nullif(current_setting('app.current_user_id', true), '') as "user",
          nullif(current_setting('app.current_tenant_id', true), '') as tenant
      `);
      assert.equal(settings?.user, null);
      assert.equal(settings?.tenant, null);
      for (const table of [storageObjects, pushSubscriptions, eventOutbox, notifications, webhookDeliveries]) {
        assert.deepEqual(await tx.select().from(table), []);
      }
    });
  }

  try {
    const [runtime] = await db.execute<{ rolsuper: boolean; rolbypassrls: boolean; owns_tables: boolean }>(sql`
      select r.rolsuper, r.rolbypassrls,
        exists (select 1 from pg_class c where c.oid in ('public.storage_objects'::regclass, 'public.event_outbox'::regclass) and c.relowner = r.oid) as owns_tables
      from pg_roles r where r.rolname = current_user`);
    assert.ok(runtime);
    assert.equal(runtime.rolsuper, false, "test requires non-superuser runtime DATABASE_URL");
    assert.equal(runtime.rolbypassrls, false);
    assert.equal(runtime.owns_tables, false);
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
    for (const context of contexts) {
      await withTenantTransaction(context, async (tx) => {
        const [storage] = await tx.insert(storageObjects).values(storageRow(context)).returning({ id: storageObjects.id });
        const [push] = await tx.insert(pushSubscriptions).values(pushRow(context)).returning({ id: pushSubscriptions.id });
        const [event] = await tx.insert(eventOutbox).values(eventRow(context)).returning({ id: eventOutbox.id });
        rows.set(context, { storage: storage!.id, push: push!.id, event: event!.id });
      });
    }
    await assertNoContext();

    const eventId = randomUUID();
    await withTenantTransaction(ownA, async (tx) => {
      await tx.insert(webhookDeliveries).values({ actorUserId: a, organizationId: null, eventId, event: "fixture.created", payload: {} });
    });
    await assert.rejects(withTenantTransaction(ownA, async (tx) => {
      await tx.insert(webhookDeliveries).values({ actorUserId: a, organizationId: null, eventId, event: "fixture.created", payload: {} });
    }), (error: unknown) => {
      const cause = error instanceof Error && "cause" in error ? error.cause : error;
      return typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505";
    });

    for (const context of contexts) {
      const own = rows.get(context)!;
      const others = contexts.filter((other) => other !== context).map((other) => rows.get(other)!);
      await withTenantTransaction(context, async (tx) => {
        assert.deepEqual((await tx.select({ id: storageObjects.id }).from(storageObjects)).map((row) => row.id), [own.storage]);
        assert.deepEqual((await tx.select({ id: pushSubscriptions.id }).from(pushSubscriptions)).map((row) => row.id), [own.push]);
        assert.deepEqual((await tx.select({ id: eventOutbox.id }).from(eventOutbox)).map((row) => row.id), [own.event]);
        assert.deepEqual(await tx.select().from(notifications), []);
        for (const hidden of others) {
          assert.deepEqual(await tx.update(storageObjects).set({ status: "ready" }).where(eq(storageObjects.id, hidden.storage)).returning(), []);
          assert.deepEqual(await tx.delete(storageObjects).where(eq(storageObjects.id, hidden.storage)).returning(), []);
          assert.deepEqual(await tx.update(pushSubscriptions).set({ enabled: false }).where(eq(pushSubscriptions.id, hidden.push)).returning(), []);
          assert.deepEqual(await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.id, hidden.push)).returning(), []);
        }
      });
      const stranger = context.userId === a ? b : a;
      await assert.rejects(withTenantTransaction(context, async (tx) => { await tx.insert(storageObjects).values(storageRow(context, stranger)); }));
      await assert.rejects(withTenantTransaction(context, async (tx) => { await tx.insert(pushSubscriptions).values(pushRow(context, stranger)); }));
      await assert.rejects(withTenantTransaction(context, async (tx) => { await tx.insert(eventOutbox).values(eventRow(context, stranger)); }));
      await assert.rejects(withTenantTransaction(context, async (tx) => {
        await tx.insert(notifications).values({ recipientUserId: stranger, organizationId: context.organizationId, eventId: rows.get(context)!.event, payload: { type: "fixture.created", entityId: randomUUID() } });
      }));
    }
    // Rows cannot be moved across scopes: tenant to another tenant, personal to another owner or into a tenant.
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.update(storageObjects).set({ organizationId: orgB }).where(eq(storageObjects.id, rows.get(scopeA)!.storage));
    }));
    await assert.rejects(withTenantTransaction(ownA, async (tx) => {
      await tx.update(storageObjects).set({ ownerUserId: b }).where(eq(storageObjects.id, rows.get(ownA)!.storage));
    }));
    await assert.rejects(withTenantTransaction(ownA, async (tx) => {
      await tx.update(pushSubscriptions).set({ organizationId: orgA }).where(eq(pushSubscriptions.id, rows.get(ownA)!.push));
    }));
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => { await tx.insert(storageObjects).values(storageRow(scopeA, a, orgB)); }));

    // Viewer in orgB: tenant rows visible, actor-owned rows of others hidden, writes gated by canAccessScope.
    await withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      assert.equal(role, "viewer");
      assert.deepEqual((await tx.select({ id: storageObjects.id }).from(storageObjects)).map((row) => row.id), [rows.get(scopeB)!.storage]);
      assert.deepEqual(await tx.select().from(pushSubscriptions), []);
      assert.deepEqual(await tx.select().from(eventOutbox), []);
      assert.equal(canAccessScope(role!, "read"), true);
      assert.equal(canAccessScope(role!, "update"), false);
      assert.equal(canAccessScope(role!, "delete"), false);
    });
    await assert.rejects(withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      if (!canAccessScope(role!, "create")) throw new Error("FORBIDDEN");
      await tx.insert(storageObjects).values(storageRow({ userId: a, organizationId: orgB }));
    }), /FORBIDDEN/);
    await db.update(member).set({ role: "member" }).where(and(eq(member.userId, a), eq(member.organizationId, orgB)));
    await withTenantTransaction({ userId: a, organizationId: orgB }, async (tx, role) => {
      assert.equal(canAccessScope(role!, "create"), true);
      assert.equal(canAccessScope(role!, "delete"), false);
      const [created] = await tx.insert(storageObjects).values(storageRow({ userId: a, organizationId: orgB })).returning();
      assert.equal(created!.ownerUserId, a);
      assert.equal(created!.organizationId, orgB);
      assert.equal((await tx.select().from(storageObjects)).length, 2);
      await tx.delete(storageObjects).where(eq(storageObjects.id, created!.id));
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
      const context = contexts[index % contexts.length]!;
      await withTenantTransaction(context, async (tx) => {
        const visible = await tx.select({ id: storageObjects.id }).from(storageObjects);
        assert.deepEqual(visible.map((row) => row.id), [rows.get(context)!.storage]);
      });
    }));
    await assertNoContext();
    await assert.rejects(withTenantTransaction(scopeA, async (tx) => {
      await tx.select().from(storageObjects);
      throw new Error("deliberate rollback");
    }), /deliberate rollback/);
    await assertNoContext();
  } finally {
    // Cleanup namespaced fixtures only; auth FKs cascade scoped rows.
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
