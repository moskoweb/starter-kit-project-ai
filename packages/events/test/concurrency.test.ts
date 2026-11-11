import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import postgres from "postgres";
import { processEvent } from "../src/worker";
import { checkedWorkerSql, closeConnections } from "../src/connection";

const enabled = process.env.EVENTS_TEST_INTEGRATION === "true";
test("concurrent duplicate events commit one notification", {
  skip: enabled ? false : "Set EVENTS_TEST_INTEGRATION=true with disposable provisioned PostgreSQL",
}, async () => {
  const url = process.env.EVENTS_TEST_DATABASE_URL;
  assert(url, "EVENTS_TEST_DATABASE_URL requires disposable fixture-owner connection");
  assert(process.env.WORKER_DATABASE_URL, "WORKER_DATABASE_URL requires provisioned restricted worker");
  const fixture = postgres(url, { max: 1 });
  const actorUserId = randomUUID();
  const entityId = randomUUID();
  const eventId = randomUUID();
  try {
    await fixture.begin(async (tx) => {
      await tx`insert into "user" (id, name, email) values (${actorUserId}, 'Events concurrency fixture', ${`events-${actorUserId}@example.invalid`})`;
      await tx`select set_config('app.current_user_id', ${actorUserId}, true), set_config('app.current_tenant_id', '', true)`;
      await tx`insert into projects (id, owner_user_id, name) values (${entityId}, ${actorUserId}, 'Events concurrency fixture')`;
      await tx`insert into event_outbox (id, actor_user_id, entity_id, type) values (${eventId}, ${actorUserId}, ${entityId}, 'project.created')`;
    });
    const worker = await checkedWorkerSql();
    const envelope = { version: 1 as const, type: "notification" as const, eventId,
      actorUserId, entityId, correlationId: eventId, context: { kind: "personal" as const } };
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => processEvent(envelope)));
    assert(attempts.some((result) => result.status === "fulfilled"));
    for (const result of attempts) {
      if (result.status === "rejected") {
        const error: unknown = result.reason;
        assert(error && typeof error === "object" && "code" in error, "Expected PostgreSQL serialization error");
        assert.equal(error.code, "40001", "Only serializable losers are retryable");
      }
    }
    await processEvent(envelope);
    const [done] = await worker`select status from event_outbox where id = ${eventId}`;
    assert.equal(done?.status, "done");
    await fixture.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${actorUserId}, true), set_config('app.current_tenant_id', '', true)`;
      const [result] = await tx`select count(*)::int as count from notifications where event_id = ${eventId}`;
      assert.equal(result?.count, 1);
    });
  } finally {
    try {
      // FK cascades clean fixture event, project and notification even after failed assertion.
      await fixture`delete from "user" where id = ${actorUserId}`;
    } finally {
      await fixture.end({ timeout: 5 });
      await closeConnections();
    }
  }
});
