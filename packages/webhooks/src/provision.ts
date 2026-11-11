import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.WEBHOOKS_PROVISION_DATABASE_URL;
  const role = process.env.WEBHOOKS_WORKER_ROLE;
  if (!url || !role || !/^[a-z_][a-z0-9_]{0,62}$/.test(role)) throw new Error("Set WEBHOOKS_PROVISION_DATABASE_URL and valid WEBHOOKS_WORKER_ROLE");
  const sql = postgres(url, { max: 1, connect_timeout: 5 });
  try {
    await sql.begin(async (tx) => {
      const [worker] = await tx`select rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole from pg_roles where rolname = ${role}`;
      if (!worker || worker.rolsuper || worker.rolbypassrls || worker.rolcreatedb || worker.rolcreaterole) throw new Error("Provision dedicated non-administrative worker login first");
      const owned = await tx`select 1 from pg_class where oid in ('webhook_deliveries'::regclass, 'webhook_receipts'::regclass) and pg_has_role(${role}, relowner, 'USAGE')`;
      if (owned.length) throw new Error("Worker must not own webhook tables or inherit owner role");
      await tx`grant usage on schema public to ${tx(role)}`;
      await tx`grant select (id, actor_user_id, organization_id, event_id, event, payload, status, attempts, next_at, created_at, last_status_code) on webhook_deliveries to ${tx(role)}`;
      await tx`grant update (status, attempts, next_at, last_status_code) on webhook_deliveries to ${tx(role)}`;
      await tx`grant select (id, banned, ban_expires) on "user" to ${tx(role)}`;
      await tx`grant select (id, user_id, organization_id, role) on member to ${tx(role)}`;
      await tx`drop policy if exists webhooks_worker_read on webhook_deliveries`;
      await tx`drop policy if exists webhooks_worker_update on webhook_deliveries`;
      await tx`create policy webhooks_worker_read on webhook_deliveries for select to ${tx(role)} using (true)`;
      await tx`create policy webhooks_worker_update on webhook_deliveries for update to ${tx(role)} using (true) with check (true)`;
    });
  } finally { await sql.end({ timeout: 5 }); }
}
main().catch(() => { console.error("Webhooks provision failed; verify owner URL and dedicated worker role"); process.exitCode = 1; });
