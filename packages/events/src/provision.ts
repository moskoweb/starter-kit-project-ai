import postgres from "postgres";

/** Run explicitly with migration-owner credentials; never runtime credentials. */
async function main(): Promise<void> {
  const url = process.env.EVENTS_PROVISION_DATABASE_URL;
  const role = process.env.EVENTS_WORKER_ROLE;
  if (!url || !role || !/^[a-z_][a-z0-9_]{0,62}$/.test(role)) throw new Error("Set EVENTS_PROVISION_DATABASE_URL and valid EVENTS_WORKER_ROLE");
  const sql = postgres(url, { max: 1, connect_timeout: 5 });
  try {
    await sql.begin(async (tx) => {
      const [worker] = await tx`select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole from pg_roles where rolname = ${role}`;
      if (!worker || worker.rolsuper || worker.rolbypassrls || worker.rolcreatedb || worker.rolcreaterole) throw new Error("Provision dedicated non-administrative worker login first");
      const owned = await tx`select 1 from pg_class where oid in ('event_outbox'::regclass, 'notifications'::regclass, 'projects'::regclass) and pg_has_role(${role}, relowner, 'USAGE')`;
      if (owned.length) throw new Error("Worker must not own domain tables or inherit owner role");
      await tx`grant usage on schema public to ${tx(role)}`;
      await tx`grant select on event_outbox to ${tx(role)}`;
      await tx`grant update (status, attempts, available_at, dispatched_at, done_at, last_error) on event_outbox to ${tx(role)}`;
      await tx`grant select (id, banned, ban_expires) on "user" to ${tx(role)}`;
      await tx`grant select (id, user_id, organization_id, role) on member to ${tx(role)}`;
      await tx`grant select (id, owner_user_id, organization_id) on projects to ${tx(role)}`;
      await tx`grant insert (recipient_user_id, organization_id, event_id, payload) on notifications to ${tx(role)}`;
      await tx`grant select (event_id) on notifications to ${tx(role)}`;
      await tx`drop policy if exists events_worker_read on event_outbox`;
      await tx`drop policy if exists events_worker_update on event_outbox`;
      await tx`create policy events_worker_read on event_outbox for select to ${tx(role)} using (true)`;
      await tx`create policy events_worker_update on event_outbox for update to ${tx(role)} using (true) with check (true)`;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
main().catch(() => { console.error("Events provision failed; verify owner URL and dedicated worker role"); process.exitCode = 1; });
