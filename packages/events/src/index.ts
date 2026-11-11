import { and, eq, sql } from "drizzle-orm";
import type { TenantTransaction } from "@vibe/db";
import { projects } from "@vibe/db/schema";
import { eventOutbox, notifications } from "@vibe/db/events-schema";

export type EventContext = { userId: string; organizationId: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateContext(context: EventContext): void {
  if (!uuid.test(context.userId) || (context.organizationId !== null && !uuid.test(context.organizationId))) throw new Error("INVALID_EVENT_CONTEXT");
}

/** Only call inside withTenantTransaction, after project creation, before commit. */
export async function enqueueProjectCreated(tx: TenantTransaction, context: EventContext, projectId: string): Promise<string> {
  validateContext(context);
  if (!uuid.test(projectId)) throw new Error("INVALID_PROJECT_ID");
  const [scope] = await tx.execute<{ user_id: string; tenant_id: string | null }>(sql`select nullif(current_setting('app.current_user_id', true),'') as user_id, nullif(current_setting('app.current_tenant_id',true),'') as tenant_id`);
  if (!scope || scope.user_id !== context.userId || scope.tenant_id !== context.organizationId) throw new Error("EVENT_CONTEXT_MISMATCH");
  const [project] = await tx.select({ id: projects.id, ownerUserId: projects.ownerUserId, organizationId: projects.organizationId })
    .from(projects).where(eq(projects.id, projectId));
  if (!project || project.ownerUserId !== context.userId || project.organizationId !== context.organizationId) throw new Error("FORBIDDEN");
  const [event] = await tx.insert(eventOutbox).values({ actorUserId: context.userId, organizationId: context.organizationId, entityId: projectId, type: "project.created" }).returning({ id: eventOutbox.id });
  if (!event) throw new Error("EVENT_NOT_PERSISTED");
  return event.id;
}

/** RLS checks recipient and active tenant; API never accepts mutable payload/recipient. */
export async function markNotificationRead(tx: TenantTransaction, notificationId: string): Promise<boolean> {
  if (!uuid.test(notificationId)) throw new Error("INVALID_NOTIFICATION_ID");
  const rows = await tx.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), sql`${notifications.readAt} is null`)).returning({ id: notifications.id });
  return rows.length > 0;
}
