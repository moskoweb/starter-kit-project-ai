import { sql, type SQLWrapper } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const currentUser = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const currentTenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;

// Auth tables deliberately have no RLS. Membership is checked again by every domain policy.
function policies(table: { organizationId: SQLWrapper; ownerUserId: SQLWrapper }) {
  const personal = sql`${currentTenant} is null and ${table.organizationId} is null and ${table.ownerUserId} = ${currentUser}`;
  const tenant = sql`${currentTenant} is not null and ${table.organizationId} = ${currentTenant} and exists (select 1 from member m where m.organization_id = ${currentTenant} and m.user_id = ${currentUser})`;
  const scope = sql`${currentUser} is not null and ((${personal}) or (${tenant}))`;
  return [
    pgPolicy("domain_read", { for: "select", to: "public", using: scope }),
    pgPolicy("domain_create", { for: "insert", to: "public", withCheck: sql`(${scope}) and ${table.ownerUserId} = ${currentUser}` }),
    pgPolicy("domain_update", { for: "update", to: "public", using: scope, withCheck: scope }),
    pgPolicy("domain_delete", { for: "delete", to: "public", using: scope }),
  ];
}

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [index("projects_id_organization_scope_idx").on(table.id, table.organizationId), index("projects_scope_idx").on(table.organizationId, table.ownerUserId), ...policies(table)]).enableRLS();

// task_project_scope (migration 0004): same organization as parent; personal parents
// additionally require same owner. Organization task owner is its creating actor, not project owner.
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  ownerUserId: uuid("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [index("tasks_project_idx").on(table.projectId), index("tasks_scope_idx").on(table.organizationId, table.ownerUserId), ...policies(table)]).enableRLS();

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
