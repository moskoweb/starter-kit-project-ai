import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const actor = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const tenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;
const memberScope = sql`exists (select 1 from member m where m.user_id = ${actor} and m.organization_id = ${tenant})`;

export const webhookReceipts = pgTable("webhook_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  endpointId: uuid("endpoint_id").notNull(),
  eventId: uuid("event_id").notNull(),
  bodyHash: text("body_hash").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("webhook_receipts_endpoint_event_unique").on(t.endpointId, t.eventId),
  check("webhook_receipts_hash", sql`${t.bodyHash} ~ '^[0-9a-f]{64}$'`),
]);

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  eventId: uuid("event_id").notNull(),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAt: timestamp("next_at", { withTimezone: true }).defaultNow().notNull(),
  lastStatusCode: text("last_status_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => {
  const scope = sql`${actor} is not null and ${t.actorUserId} = ${actor} and ((${tenant} is null and ${t.organizationId} is null) or (${t.organizationId} = ${tenant} and ${memberScope}))`;
  return [index("webhook_deliveries_due_idx").on(t.status, t.nextAt),
    uniqueIndex("webhook_deliveries_event_unique").on(t.actorUserId, t.organizationId, t.eventId),
    uniqueIndex("webhook_deliveries_personal_event_unique").on(t.actorUserId, t.eventId).where(sql`${t.organizationId} is null`),
    check("webhook_deliveries_status", sql`${t.status} in ('pending', 'queued', 'delivered', 'failed')`),
    pgPolicy("webhook_deliveries_actor_read", { for: "select", to: "public", using: scope }),
    pgPolicy("webhook_deliveries_actor_insert", { for: "insert", to: "public", withCheck: sql`${scope} and ${t.status} = 'pending'` }),
    pgPolicy("webhook_deliveries_actor_update", { for: "update", to: "public", using: scope, withCheck: scope })];
}).enableRLS();
