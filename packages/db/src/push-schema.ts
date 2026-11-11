import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { eventOutbox, notifications } from "./events-schema";
import { organization, user } from "./auth-schema";

const actor = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const tenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;
const memberScope = sql`exists (select 1 from member m where m.user_id = ${actor} and m.organization_id = ${tenant})`;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => {
  const scope = sql`${actor} is not null and ${t.userId} = ${actor} and ((${tenant} is null and ${t.organizationId} is null) or (${t.organizationId} = ${tenant} and ${memberScope}))`;
  return [uniqueIndex("push_subscriptions_endpoint_unique").on(t.endpoint),
    index("push_subscriptions_user_scope_idx").on(t.userId, t.organizationId),
    check("push_subscriptions_enabled", sql`${t.enabled} in (true, false)`),
    pgPolicy("push_subscriptions_actor_read", { for: "select", to: "public", using: scope }),
    pgPolicy("push_subscriptions_actor_insert", { for: "insert", to: "public", withCheck: scope }),
    pgPolicy("push_subscriptions_actor_update", { for: "update", to: "public", using: scope, withCheck: scope }),
    pgPolicy("push_subscriptions_actor_delete", { for: "delete", to: "public", using: scope })];
}).enableRLS();

/** Worker-only queue: RLS with no app policy denies app role; provision grants worker policy. */
export const pushDeliveries = pgTable("push_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => eventOutbox.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAt: timestamp("next_at", { withTimezone: true }).defaultNow().notNull(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  lastError: text("last_error"),
}, (t) => [
  uniqueIndex("push_deliveries_event_subscription_unique").on(t.eventId, t.subscriptionId),
  index("push_deliveries_due_idx").on(t.status, t.nextAt),
  check("push_deliveries_attempts", sql`${t.attempts} >= 0`),
  check("push_deliveries_status", sql`${t.status} in ('pending', 'leased', 'delivered', 'failed')`),
]).enableRLS();
