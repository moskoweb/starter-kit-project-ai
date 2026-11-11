import { sql, type SQLWrapper } from "drizzle-orm";
import { check, foreignKey, index, integer, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { member, organization, user } from "./auth-schema";
import { projects } from "./domain-schema";

const currentUser = sql`nullif(current_setting('app.current_user_id', true), '')::uuid`;
const currentTenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;
function policies(table: { organizationId: SQLWrapper; ownerUserId: SQLWrapper; projectId: SQLWrapper }) {
  const personal = sql`${currentTenant} is null and ${table.organizationId} is null and ${table.ownerUserId} = ${currentUser}`;
  const tenant = sql`${currentTenant} is not null and ${table.organizationId} = ${currentTenant} and exists (select 1 from member m where m.organization_id = ${currentTenant} and m.user_id = ${currentUser})`;
  const parent = sql`exists (select 1 from projects p where p.id = ${table.projectId} and p.organization_id is not distinct from ${table.organizationId} and (${table.organizationId} is not null or p.owner_user_id = ${table.ownerUserId}))`;
  const scope = sql`${currentUser} is not null and ((${personal}) or (${tenant})) and ${parent}`;
  return [
    pgPolicy("storage_objects_read", { for: "select", to: "public", using: scope }),
    pgPolicy("storage_objects_create", { for: "insert", to: "public", withCheck: sql`(${scope}) and ${table.ownerUserId} = ${currentUser}` }),
    pgPolicy("storage_objects_update", { for: "update", to: "public", using: scope, withCheck: scope }),
    pgPolicy("storage_objects_delete", { for: "delete", to: "public", using: scope }),
  ];
}

export const storageObjects = pgTable("storage_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organization.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  key: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  status: text("status").$type<"pending" | "ready">().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("storage_objects_scope_idx").on(table.organizationId, table.ownerUserId, table.projectId, table.status),
  uniqueIndex("storage_objects_key_idx").on(table.key),
  foreignKey({ columns: [table.projectId], foreignColumns: [projects.id], name: "storage_objects_project_fk" }).onDelete("cascade"),
  check("storage_objects_size_check", sql`${table.size} between 1 and 10485760`),
  check("storage_objects_status_check", sql`${table.status} in ('pending', 'ready')`),
  ...policies(table),
]).enableRLS();
