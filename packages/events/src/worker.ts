import { canAccessProject } from "@vibe/auth/permissions";
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
    if (event.actor_user_id !== envelope.actorUserId || event.organization_id !== organizationId || event.entity_id !== envelope.entityId || event.type !== "project.created" || envelope.correlationId !== event.id) throw new Error("EVENT_ENVELOPE_MISMATCH");
    if (event.status === "done") return;
    await tx`select set_config('app.current_user_id', ${event.actor_user_id}, true), set_config('app.current_tenant_id', ${event.organization_id ?? ""}, true)`;
    const [actor] = await tx`select id, banned, ban_expires from "user" where id = ${event.actor_user_id}`;
    let authorized = !!actor && (!actor.banned || (actor.ban_expires !== null && new Date(actor.ban_expires) <= new Date()));
    if (event.organization_id !== null) {
      const members = await tx`select id, role from member where user_id = ${event.actor_user_id} and organization_id = ${event.organization_id}`;
      authorized = authorized && members.some((membership) => canAccessProject(membership.role, "create"));
    }
    // Domain RLS independently enforces actor/tenant access after membership revalidation.
    const [project] = authorized ? await tx`select id, owner_user_id, organization_id from projects where id = ${event.entity_id}` : [];
    authorized = authorized && !!project && project.owner_user_id === event.actor_user_id && project.organization_id === event.organization_id;
    if (authorized) {
      await tx`insert into notifications (recipient_user_id, organization_id, event_id, payload)
        values (${event.actor_user_id}, ${event.organization_id}, ${event.id}, ${tx.json({ type: "project.created", projectId: event.entity_id })})
        on conflict (event_id) do nothing`;
    }
    // Revocation/deletion is terminal: never notify someone whose authority vanished.
    await tx`update event_outbox set status = 'done', done_at = now(), last_error = ${authorized ? null : "authorization_revoked"} where id = ${event.id}`;
  });
}

export const handlers: JobHandlers = { notification: async (envelope) => processEvent(envelope) };
