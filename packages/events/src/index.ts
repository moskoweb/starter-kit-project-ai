import { and, eq, sql } from "drizzle-orm";
import type { TenantTransaction } from "@vibe/db";
import { eventOutbox, notifications } from "@vibe/db/events-schema";

export type EventContext = { userId: string; organizationId: string | null };
export type DomainEvent = { type: string; entityId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Dotted lowercase name, e.g. `invoice.paid`. Mirrors event_outbox_type check. */
export const eventTypePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
export function validateContext(context: EventContext): void {
  if (!uuid.test(context.userId) || (context.organizationId !== null && !uuid.test(context.organizationId))) throw new Error("INVALID_EVENT_CONTEXT");
}

/**
 * Only call inside withTenantTransaction/withTenantScope, after the entity write and before commit,
 * so the event commits atomically with the change. Caller must have authorized the entity write.
 */
export async function enqueueEvent(tx: TenantTransaction, context: EventContext, event: DomainEvent): Promise<string> {
  validateContext(context);
  if (event.type.length > 100 || !eventTypePattern.test(event.type)) throw new Error("INVALID_EVENT_TYPE");
  if (!uuid.test(event.entityId)) throw new Error("INVALID_ENTITY_ID");
  const [scope] = await tx.execute<{ user_id: string; tenant_id: string | null }>(sql`select nullif(current_setting('app.current_user_id', true),'') as user_id, nullif(current_setting('app.current_tenant_id',true),'') as tenant_id`);
  if (!scope || scope.user_id !== context.userId || scope.tenant_id !== context.organizationId) throw new Error("EVENT_CONTEXT_MISMATCH");
  const [row] = await tx.insert(eventOutbox).values({ actorUserId: context.userId, organizationId: context.organizationId, entityId: event.entityId, type: event.type }).returning({ id: eventOutbox.id });
  if (!row) throw new Error("EVENT_NOT_PERSISTED");
  return row.id;
}

/** RLS checks recipient and active tenant; API never accepts mutable payload/recipient. */
export async function markNotificationRead(tx: TenantTransaction, notificationId: string): Promise<boolean> {
  if (!uuid.test(notificationId)) throw new Error("INVALID_NOTIFICATION_ID");
  const rows = await tx.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), sql`${notifications.readAt} is null`)).returning({ id: notifications.id });
  return rows.length > 0;
}
