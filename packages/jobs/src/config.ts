export type JobsEnv = Record<string, string | undefined>;

function databaseUrl(value: string | undefined, name: string): string {
  try {
    const url = new URL(value ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
    if (!url.hostname || !url.username || !url.pathname.slice(1)) throw new Error();
    return value!;
  } catch {
    throw new Error(name + " must be a PostgreSQL URL with host, role and database");
  }
}

export function getJobsConfig(env: JobsEnv = process.env) {
  const enabled = env.JOBS_ENABLED ?? "false";
  if (enabled !== "true" && enabled !== "false") throw new Error("JOBS_ENABLED must be true or false");
  if (enabled === "false") return null;
  return { connectionString: databaseUrl(env.DATABASE_URL, "DATABASE_URL") };
}

export function getProvisionUrl(env: JobsEnv = process.env): string {
  return databaseUrl(env.JOBS_MIGRATION_DATABASE_URL, "JOBS_MIGRATION_DATABASE_URL");
}
