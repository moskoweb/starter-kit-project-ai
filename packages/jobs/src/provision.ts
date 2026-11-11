import { PgBoss } from "pg-boss";
import postgres from "postgres";
import { getProvisionUrl } from "./config";
import { queueNames } from "./contracts";
import { deliveryOptions } from "./index";

// Sole DDL entrypoint. This credential must never enter web/worker environments.
async function provision() {
  const connectionString = getProvisionUrl();
  const runtimeRole = process.env.JOBS_RUNTIME_ROLE;
  if (!runtimeRole || !/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole)) throw new Error("JOBS_RUNTIME_ROLE must name the existing dedicated runtime role");
  const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
  const boss = new PgBoss({ connectionString, schema: "pgboss", migrate: true, createSchema: true,
    supervise: false, schedule: false, reindex: false });
  boss.on("error", () => { process.exitCode = 1; console.error("jobs_provision_error"); });
  try {
    const roles = await sql.unsafe("SELECT current_user AS owner, rolname, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1", [runtimeRole]);
    if (roles.length !== 1 || roles[0].owner === runtimeRole || roles[0].rolsuper || roles[0].rolcreatedb || roles[0].rolcreaterole) throw new Error("JOBS_RUNTIME_ROLE must be a separate non-administrative existing role");
    await boss.start();
    for (const name of Object.values(queueNames)) await boss.createQueue(name, { ...deliveryOptions, partition: false });
    await sql.unsafe('GRANT USAGE ON SCHEMA pgboss TO "' + runtimeRole + '"');
    await sql.unsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO "' + runtimeRole + '"');
    await sql.unsafe('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgboss TO "' + runtimeRole + '"');
    console.info("jobs_provisioned");
  } finally {
    await boss.stop({ graceful: true, timeout: 5000 }).finally(() => sql.end({ timeout: 5 }));
  }
}

provision().catch(() => { console.error("Jobs provision failed; check JOBS_MIGRATION_DATABASE_URL, JOBS_RUNTIME_ROLE and database permissions"); process.exitCode = 1; });
