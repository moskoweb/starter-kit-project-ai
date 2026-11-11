import { sql } from "drizzle-orm";
import { closeDb, getDb } from "./client";

const BATCH_SIZE = 1000;

/** Delete at most one bounded batch; scheduler may invoke repeatedly. */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await getDb().execute(sql`
    with expired as (
      select key from rate_limit_windows
      where expires_at < now()
      order by expires_at
      limit ${BATCH_SIZE}
      for update skip locked
    )
    delete from rate_limit_windows target
    using expired
    where target.key = expired.key
    returning target.key`);
  return result.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredRateLimits().then((deleted) => {
    console.log(`Deleted ${deleted} expired rate-limit rows`);
  }).catch(() => {
    console.error("RATE_LIMIT_CLEANUP_FAILED");
    process.exitCode = 1;
  }).finally(closeDb);
}
