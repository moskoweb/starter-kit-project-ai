import postgres from "postgres";
import { sendPush } from "./transport";
let connection: postgres.Sql | undefined;
export async function closePushConnection() { const current = connection; connection = undefined; await current?.end({ timeout: 5 }); }
export async function sendPendingPush(): Promise<number> {
  if (process.env.PUSH_ENABLED !== "true") return 0;
  if (!process.env.WORKER_DATABASE_URL) throw new Error("WORKER_DATABASE_URL_REQUIRED");
  const db = connection ??= postgres(process.env.WORKER_DATABASE_URL, { max: 2, connect_timeout: 5 });
  const [role] = await db`select r.rolsuper,r.rolbypassrls,pg_has_role(current_user,c.relowner,'USAGE') as owns_table from pg_roles r cross join pg_class c where r.rolname=current_user and c.oid='push_deliveries'::regclass`;
  if (!role || role.rolsuper || role.rolbypassrls || role.owns_table) throw new Error("PUSH_WORKER_ROLE_INVALID");
  const rows = await db.begin(async tx => {
    await tx`update push_deliveries set status='failed',last_error='attempt_limit',lease_until=null where attempts>=5 and (status='pending' or (status='leased' and lease_until<now()))`;
    const due = await tx`select id from push_deliveries where attempts<5 and ((status='pending' and next_at<=now()) or (status='leased' and lease_until<now())) order by next_at limit 10 for update skip locked`;
    if (!due.length) return [];
    return tx`update push_deliveries set status='leased', lease_until=now()+interval '2 minutes', attempts=attempts+1 where id in ${tx(due.map(row=>row.id))} returning *`;
  });
  for (const delivery of rows) {
    try {
      const [subscription] = await db`select s.*, u.banned, u.ban_expires from push_subscriptions s join "user" u on u.id=s.user_id where s.id=${delivery.subscription_id}`;
      let allowed = !!subscription?.enabled && (!subscription.banned || (subscription.ban_expires && new Date(subscription.ban_expires)<new Date()));
      if (allowed && subscription.organization_id) {
        const members = await db`select id from member where user_id=${subscription.user_id} and organization_id=${subscription.organization_id}`;
        allowed = members.length>0;
      }
      if (!allowed) { await db`update push_deliveries set status='failed',last_error='subscription_unavailable',lease_until=null where id=${delivery.id}`; continue; }
      const result = await sendPush({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}}, {id:delivery.notification_id,title:"Nova notificação",body:"Abra o aplicativo para consultar.",url:"/account"});
      if (result==='expired') await db`delete from push_subscriptions where id=${subscription.id} and endpoint=${subscription.endpoint}`;
      else await db`update push_deliveries set status='delivered',lease_until=null,last_error=null where id=${delivery.id}`;
    } catch {
      await db`update push_deliveries set status=${delivery.attempts>=5?'failed':'pending'},next_at=now()+interval '30 seconds',lease_until=null,last_error='delivery_failed' where id=${delivery.id}`;
    }
  }
  return rows.length;
}
