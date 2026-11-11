import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";
import { createJobs, sendJob, startJobs } from "@vibe/jobs";
import type { PgBoss } from "pg-boss";
import { checkedWorkerSql, closeConnections } from "./connection";

/** Send and mark share one physical Postgres transaction. SKIP LOCKED bounds concurrency. */
export async function relayPending(boss: PgBoss, limit = 25): Promise<number> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("INVALID_RELAY_LIMIT");
  const sql = await checkedWorkerSql();
  return sql.begin(async (tx) => {
    const events = await tx`select * from event_outbox where status <> 'done' and available_at <= now()
      order by available_at, id limit ${limit} for update skip locked`;
    for (const event of events) {
      // Persist bounded retries even when pg-boss rejects this send; no raw driver error retained.
      try {
        await tx.savepoint(async (savepoint) => {
          await sendJob(boss, savepoint, { version: 1, type: "notification", eventId: event.id,
            actorUserId: event.actor_user_id, context: event.organization_id === null ? { kind: "personal" } : { kind: "organization", organizationId: event.organization_id },
            entityId: event.entity_id, correlationId: event.id });
          await savepoint`update event_outbox set status = 'dispatched', dispatched_at = now(), attempts = attempts + 1,
            available_at = now() + interval '15 minutes', last_error = null where id = ${event.id}`;
        });
      } catch {
        await tx`update event_outbox set attempts = attempts + 1, last_error = 'dispatch_failed',
          available_at = now() + least(interval '1 hour', interval '10 seconds' * power(2, least(attempts, 8))) where id = ${event.id}`;
      }
    }
    return events.length;
  });
}

async function main(): Promise<void> {
  const boss = createJobs(() => console.error("Events relay queue error"));
  if (!boss) throw new Error("Events relay requires JOBS_ENABLED=true");
  const stop = new AbortController();
  const shutdown = () => stop.abort();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  try {
    await startJobs(boss);
    while (!stop.signal.aborted) {
      const count = await relayPending(boss);
      if (!count) await setTimeout(1000, undefined, { signal: stop.signal }).catch(() => {});
    }
  } finally {
    try {
      await boss.stop();
    } finally {
      await closeConnections();
      process.removeListener("SIGTERM", shutdown);
      process.removeListener("SIGINT", shutdown);
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error("Events relay failed; check operator configuration"); process.exitCode = 1; });
}
