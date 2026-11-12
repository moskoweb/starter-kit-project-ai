import { canAccessScope } from "@vibe/auth/permissions";
import { parseJobEnvelope, type JobEnvelope, type JobHandlers } from "@vibe/jobs";
import { checkedWorkerSql } from "./connection";
export { closeConnections } from "./connection";

/** Outbox is authority, not untrusted queue context. Row lock serializes duplicate jobs. */
export async function processEvent(input: JobEnvelope): Promise<void> {
  const envelope = parseJobEnvelope(input, "notification");
  const sql = await checkedWorkerSql();
  await sql.begin("isolation level serializable", async (tx) => {
    const [event] = await tx`select * from event_outbox where id = ${envelope.eventId} for update`;
    if (!event) throw new Error("EVENT_NOT_FOUND");
    const organizationId = envelope.context.kind === "organization" ? envelope.context.organizationId : null;
    if (event.actor_user_id !== envelope.actorUserId || event.organization_id !== organizationId || event.entity_id !== envelope.entityId || envelope.correlationId !== event.id) throw new Error("EVENT_ENVELOPE_MISMATCH");
    if (event.status === "done") return;
    await tx`select set_config('app.current_user_id', ${event.actor_user_id}, true), set_config('app.current_tenant_id', ${event.organization_id ?? ""}, true)`;
    const [actor] = await tx`select id, banned, ban_expires from "user" where id = ${event.actor_user_id}`;
    let authorized = !!actor && (!actor.banned || (actor.ban_expires !== null && new Date(actor.ban_expires) <= new Date()));
    if (event.organization_id !== null) {
      const members = await tx`select id, role from member where user_id = ${event.actor_user_id} and organization_id = ${event.organization_id}`;
      authorized = authorized && members.some((membership) => canAccessScope(membership.role, "read"));
    }
    // Notification RLS independently enforces actor/tenant scope; domain rows are not looked up here.
    if (authorized) {
      await tx`insert into notifications (recipient_user_id, organization_id, event_id, payload)
        values (${event.actor_user_id}, ${event.organization_id}, ${event.id}, ${tx.json({ type: event.type, entityId: event.entity_id })})
        on conflict (event_id) do nothing`;
      if (process.env.PUSH_ENABLED === "true") {
        await tx`insert into push_deliveries(event_id,subscription_id,notification_id)
          select ${event.id},s.id,n.id from push_subscriptions s join notifications n on n.event_id=${event.id}
          where s.user_id=${event.actor_user_id} and s.organization_id is not distinct from ${event.organization_id}::uuid and s.enabled=true
          on conflict(event_id,subscription_id) do nothing`;
      }
    }
    // Revocation/deletion is terminal: never notify someone whose authority vanished.
    await tx`update event_outbox set status = 'done', done_at = now(), last_error = ${authorized ? null : "authorization_revoked"} where id = ${event.id}`;
  });
}

export const handlers: JobHandlers = { notification: async (envelope) => processEvent(envelope) };
