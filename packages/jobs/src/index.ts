import { PgBoss, type Db, type Job } from "pg-boss";
import postgres from "postgres";
import type { TransactionSql } from "postgres";
import { getJobsConfig, type JobsEnv } from "./config";
import { parseJobEnvelope, queueNames, type JobEnvelope, type JobType } from "./contracts";

export { getJobsConfig } from "./config";
export { parseJobEnvelope, queueNames } from "./contracts";
export type { JobEnvelope, JobType } from "./contracts";

export const deliveryOptions = { retryLimit: 5, retryDelay: 10, retryBackoff: true, expireInSeconds: 60 } as const;

/** No DDL, scheduling or index rebuilds; supervision still recovers expired leases. */
export function createJobs(onError: (error: Error) => void, env: JobsEnv = process.env): PgBoss | null {
  const config = getJobsConfig(env);
  if (!config) return null;
  const boss = new PgBoss({ ...config, schema: "pgboss", migrate: false, createSchema: false,
    schedule: false, reindex: false, persistQueueStats: false, max: 5,
    connectionTimeoutMillis: 5000 });
  boss.on("error", onError);
  return boss;
}

/** Refuse owner/admin credentials before opening pg-boss runtime. */
export async function startJobs(boss: PgBoss, env: JobsEnv = process.env): Promise<void> {
  const config = getJobsConfig(env);
  if (!config) throw new Error("JOBS_ENABLED must be true to start jobs");
  const sql = postgres(config.connectionString, { max: 1, connect_timeout: 5 });
  try {
    const roles = await sql.unsafe("SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, pg_has_role(current_user, n.nspowner, 'USAGE') AS owns_schema FROM pg_roles r JOIN pg_namespace n ON n.nspname = 'pgboss' WHERE r.rolname = current_user");
    if (roles.length !== 1) throw new Error("Jobs schema absent; run explicit provision command");
    if (roles[0].rolsuper || roles[0].rolcreatedb || roles[0].rolcreaterole || roles[0].owns_schema) throw new Error("Jobs runtime must use a non-owner, non-administrative DATABASE_URL role");
  } finally {
    await sql.end({ timeout: 5 });
  }
  await boss.start();
}

/** Bind only inside sql.begin callback. Never pass pool-level sql here. */
export function postgresTransactionAdapter(transaction: TransactionSql): Db {
  return {
    async executeSql(text, values = []) {
      const rows = await transaction.unsafe(text, values as postgres.ParameterOrJSON<never>[]);
      return { rows };
    },
  };
}

/** Caller must await inside the SAME transaction as domain mutation. */
export async function sendJob(boss: PgBoss, transaction: TransactionSql, input: JobEnvelope): Promise<string> {
  const envelope = parseJobEnvelope(input);
  const id = await boss.send(queueNames[envelope.type], envelope, {
    ...deliveryOptions, db: postgresTransactionAdapter(transaction),
  });
  if (!id) throw new Error("Job enqueue did not persist a job");
  return id;
}

export type JobHandler = (envelope: JobEnvelope, job: Pick<Job, "id" | "retryCount" | "signal">) => Promise<void>;
export type JobHandlers = Partial<Record<JobType, JobHandler>>;

/** Register only real callbacks. Return resolves only after their effect commits. */
export async function registerJobHandlers(boss: PgBoss, handlers: JobHandlers): Promise<void> {
  const entries = Object.entries(handlers) as [JobType, JobHandler][];
  if (!entries.length) throw new Error("No job handlers configured; connect real notification or webhook delivery handlers before starting worker");
  for (const [type, handler] of entries) {
    if (!Object.hasOwn(queueNames, type) || typeof handler !== "function") throw new Error("Invalid worker handler registration");
    await boss.work<unknown>(queueNames[type], { batchSize: 1, localConcurrency: 2 }, async (jobs) => {
      for (const job of jobs) await handler(parseJobEnvelope(job.data, type), job);
    });
  }
}
