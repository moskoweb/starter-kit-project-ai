import postgres from "postgres";

let connection: postgres.Sql | undefined;
let checked: Promise<void> | undefined;
export function workerSql(): postgres.Sql {
  if (!connection) {
    const url = process.env.WORKER_DATABASE_URL;
    if (!url) throw new Error("WORKER_DATABASE_URL is required for events");
    connection = postgres(url, { max: 5, connect_timeout: 5, idle_timeout: 20, connection: { statement_timeout: 15000 } });
  }
  return connection;
}
export async function checkedWorkerSql(): Promise<postgres.Sql> {
  const sql = workerSql();
  checked ??= (async () => {
    const rows = await sql`select r.rolsuper, r.rolbypassrls, r.rolcreatedb, r.rolcreaterole,
      pg_has_role(current_user, c.relowner, 'USAGE') as owns_table
      from pg_roles r cross join pg_class c where r.rolname = current_user and c.oid = 'event_outbox'::regclass`;
    if (rows.length !== 1 || rows[0]!.rolsuper || rows[0]!.rolbypassrls || rows[0]!.rolcreatedb || rows[0]!.rolcreaterole || rows[0]!.owns_table) throw new Error("Events worker requires dedicated non-owner role without BYPASSRLS or administrative privileges");
  })();
  await checked;
  return sql;
}
export async function closeConnections(): Promise<void> {
  const current = connection;
  connection = undefined;
  checked = undefined;
  await current?.end({ timeout: 5 });
}
