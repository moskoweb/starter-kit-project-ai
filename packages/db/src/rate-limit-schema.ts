import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Infrastructure-only table. Grant access only to the application server role. */
export const rateLimitWindows = pgTable("rate_limit_windows", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
