import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export * from "./auth-schema";
export * from "./totp-schema";
export * from "./ai-schema";
export * from "./events-schema";
export * from "./webhook-schema";
export * from "./rate-limit-schema";
export * from "./push-schema";
export * from "./storage-schema";
