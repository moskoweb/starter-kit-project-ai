import { sql } from "drizzle-orm";
import { check, integer, pgPolicy, pgTable, date, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const actor = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const tenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;

export const aiUsageDaily = pgTable("ai_usage_daily", {
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  usageDate: date("usage_date", { mode: "string" }).notNull(),
  requests: integer("requests").notNull().default(0),
  reservedOutputTokens: integer("reserved_output_tokens").notNull().default(0),
}, (t) => {
  const scope = sql`${actor} is not null and ${actor} = ${t.userId} and ${tenant} is not distinct from ${t.organizationId}`;
  return [
    uniqueIndex("ai_usage_daily_personal_unique").on(t.userId, t.usageDate).where(sql`${t.organizationId} is null`),
    uniqueIndex("ai_usage_daily_tenant_unique").on(t.userId, t.usageDate, t.organizationId).where(sql`${t.organizationId} is not null`),
    check("ai_usage_daily_positive", sql`${t.requests} > 0 and ${t.reservedOutputTokens} >= 0`),
    pgPolicy("ai_usage_daily_read", { for: "select", to: "public", using: scope }),
    pgPolicy("ai_usage_daily_insert", { for: "insert", to: "public", withCheck: scope }),
    pgPolicy("ai_usage_daily_update", { for: "update", to: "public", using: scope, withCheck: scope }),
  ];
}).enableRLS();
