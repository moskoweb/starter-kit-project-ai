import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const actor = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const tenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;
const membership = sql`exists (select 1 from member m where m.user_id = ${actor} and m.organization_id = ${tenant})`;

export const eventOutbox = pgTable("event_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  entityId: uuid("entity_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  doneAt: timestamp("done_at", { withTimezone: true }),
  lastError: text("last_error"),
}, (t) => {
  const scope = sql`${actor} is not null and ${t.actorUserId} = ${actor} and ((${tenant} is null and ${t.organizationId} is null) or (${t.organizationId} = ${tenant} and ${membership}))`;
  return [index("event_outbox_pending_idx").on(t.status, t.availableAt),
    check("event_outbox_type", sql`${t.type} = 'project.created'`),
    check("event_outbox_status", sql`${t.status} in ('pending', 'dispatched', 'done')`),
    check("event_outbox_attempts", sql`${t.attempts} >= 0`),
    pgPolicy("outbox_actor_read", { for: "select", to: "public", using: scope }),
    pgPolicy("outbox_actor_insert", { for: "insert", to: "public", withCheck: sql`${scope} and ${t.status} = 'pending'` })];
}).enableRLS();

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientUserId: uuid("recipient_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull().unique().references(() => eventOutbox.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  payload: jsonb("payload").$type<{ type: "project.created"; projectId: string }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => {
  const scope = sql`${actor} is not null and ${t.recipientUserId} = ${actor} and ((${tenant} is null and ${t.organizationId} is null) or (${t.organizationId} = ${tenant} and ${membership}))`;
  return [index("notifications_recipient_idx").on(t.recipientUserId, t.organizationId),
    check("notification_payload", sql`jsonb_typeof(${t.payload}) = 'object' and ${t.payload}->>'type' = 'project.created' and ${t.payload} ? 'projectId' and ${t.payload} - 'type' - 'projectId' = '{}'::jsonb`),
    pgPolicy("notification_read", { for: "select", to: "public", using: scope }),
    pgPolicy("notification_insert", { for: "insert", to: "public", withCheck: sql`${scope} and exists (select 1 from event_outbox e where e.id = ${t.eventId} and e.actor_user_id = ${t.recipientUserId} and e.organization_id is not distinct from ${t.organizationId} and ${t.payload} = jsonb_build_object('type', e.type, 'projectId', e.entity_id::text))` }),
    pgPolicy("notification_update", { for: "update", to: "public", using: scope, withCheck: scope }),
    pgPolicy("notification_delete", { for: "delete", to: "public", using: scope })];
}).enableRLS();
