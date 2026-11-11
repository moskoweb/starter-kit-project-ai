import { bigint, pgTable, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Auth state, deliberately without RLS. Never stores codes or secrets.
export const totpReplay = pgTable("totp_replay", {
  userId: uuid("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  lastStep: bigint("last_step", { mode: "number" }).notNull(),
});
