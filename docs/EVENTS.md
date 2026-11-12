# Events

`@vibe/events` implements durable domain-event delivery for any event your app defines. Event `type` is a dotted lowercase name (`/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/`, max 100, e.g. `invoice.paid`), enforced by `enqueueEvent` and the `event_outbox_type` check. Notification recipient is the event actor, not every organization member. Queue contains UUID references only; no names, descriptions, credentials, email content or arbitrary payload.

## Domain transaction

DB schema root exports `events-schema.ts`. Migration `0003_events.sql`, journal entry and `0003_snapshot.json` were generated canonically with Drizzle offline; custom FORCE RLS and notification identity trigger remain appended to generated SQL. Migration must run before runtime startup. Future schema generation alone does not replace these custom protections.

Call inside existing authoritative session boundary (`withTenantScope`), after the entity write, before commit:

```ts
import { withTenantScope } from "@vibe/auth";
import { enqueueEvent } from "@vibe/events";
import { invoices } from "@vibe/db/schema"; // your generated model

await withTenantScope(headers, tenantIdentifier, "create", async (tx) => {
  const [invoice] = await tx.insert(invoices).values({ /* ... */ }).returning();
  if (!invoice) throw new Error("NOT_PERSISTED");
  await enqueueEvent(tx, { userId, organizationId: invoice.organizationId }, { type: "invoice.created", entityId: invoice.id });
});
```

`context = { userId, organizationId: string | null }` comes from session, never job/request input. Enqueue validates event type and entity UUID and verifies the actual transaction-local context; the caller is responsible for having authorized the entity write (`withTenantScope` + RLS). Do not call after commit or use pool-level connection. Failed enqueue rolls back the entity write. RLS fails closed without context. Application role needs SELECT/INSERT outbox; notifications SELECT, DELETE and UPDATE(read_at) only. Do not grant general notification UPDATE/INSERT to application role. `markNotificationRead(tx,id)` changes only `readAt` under recipient RLS. Payload is exactly `{ type, entityId }` copied from the outbox row (`notification_payload` check); SQL insert policy checks against outbox; immutable identity trigger prevents retargeting/changing existing payload.

## Explicit role provisioning

Create dedicated login using operator secret provisioning, `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`, no owner-role inheritance. No password belongs in source, shell history, logs or jobs. Use same physical PostgreSQL database for domain and pg-boss; transactional adapter cannot atomically send across databases.

1. Apply domain migration and jobs provision procedure.
2. Set `EVENTS_PROVISION_DATABASE_URL` to migration-owner URL and `EVENTS_WORKER_ROLE` to pre-created login name. Run `pnpm --filter @vibe/events provision` explicitly. No runtime DDL.
3. Jobs provisioning must grant pg-boss runtime rights to this login too. Events provision grants only outbox SELECT/metadata UPDATE, identity/membership column SELECT, notification INSERT. Global outbox policies are role-specific, not PUBLIC; worker has no domain RLS bypass. Role name is validated/quoted, no host hardcoding. Rotation to another role requires removing previous role grants separately.
4. Set `WORKER_DATABASE_URL` to dedicated worker login. Set `JOBS_ENABLED=true` and jobs runtime database URL to same database (current jobs contract reads `DATABASE_URL`; if jobs gains `JOBS_DATABASE_URL`, use that documented contract). Do not set worker to owner/superuser. Events checks role capabilities before first use.

## Relay and worker

Worker reuses `canAccessScope(role, "read")` from `@vibe/auth/permissions`; owner must expose this server-only-free subpath. Permission revalidation runs in the same serializable snapshot as effect. Auth tables remain SELECT-only: no UPDATE grants merely for row locks. A concurrent revocation may serialize after an already-started event transaction; revocations committed before its snapshot prevent delivery. Serialization failures propagate to jobs retry. This is deliberate snapshot linearization, not a claim that revocation cancels earlier work.
Run `pnpm --filter @vibe/events relay` as supervised process. It polls globally through explicit outbox-only policy, claims at most 25 rows with `FOR UPDATE SKIP LOCKED`, and sends via `@vibe/jobs.sendJob` using real `postgres.TransactionSql` savepoint on same connection. Send and dispatched marker commit together. Crash before commit leaves neither; crash after commit leaves both. Failed sends roll back savepoint and record generic safe error plus exponential delay capped at one hour. Counters/timestamps remain queryable. No raw exception or secret retained.

Dispatched events become eligible again after 15 minutes until done, including exhausted/lost queue jobs. This intentionally permits duplicate transport. No exactly-once claim. Handler row lock, notification `event_id UNIQUE`, notification insertion and done marker in one serializable transaction make committed effect idempotent. A crash before commit rolls back both; after commit duplicate is no-op. Serializable conflicts propagate so pg-boss retries. Relay eventually republishes if queue retries exhaust. No per-context discovery list, no event loss on revoked membership.

Register `packages/events/src/worker.ts`: exports `handlers: JobHandlers`, `processEvent(envelope)`, `closeConnections()`. Existing worker accepts operator module path; owner can wire `WORKER_HANDLERS_MODULE` support or pass module as current CLI positional argument. Handler trusts stored outbox, rejects envelope mismatch, installs stored scope, revalidates actor ban and (organization events) current membership with `read` permission; it does not look up domain rows, so event types stay app-defined. Revoked/deleted authority marks done with `authorization_revoked`, without notification. These are in-app notifications, not email/webhook placeholders. No app/worker files changed here.

## Checks for owner

Not executed during parallel implementation. Default `pnpm --filter @vibe/events test` reports explicit node:test skip, opens no connections and needs no environment. Opt in only on disposable migrated PostgreSQL: provision worker role, set `EVENTS_TEST_INTEGRATION=true`, `WORKER_DATABASE_URL`, `EVENTS_TEST_DATABASE_URL` (fixture-owner credential with insert/delete user, outbox creation and notification inspection rights), then run same command. Test creates random actor/event fixtures, launches eight duplicate handlers, allows only PostgreSQL serialization losers, retries, asserts one notification and done marker, and cleans fixtures via user cascade even after failed assertion. No pre-existing event ID required.

Additional smoke acceptance: two relays claim disjoint rows; kill relay before/after commit and see pending or persisted job respectively; kill handler before/after commit and retry; remove membership before handling and assert done/no notification; unset context and attempt cross-recipient SELECT/UPDATE; reject notification retargeting and payload changes. Inspect only safe IDs/status/counters. No test sends external email or contains secrets.
