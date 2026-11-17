import "server-only";
import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { getDb, member, organization, user } from "@vibe/db";
import type { ResourceRecord } from "@vibe/ui/lib/schema";
import { defineResource } from "../define";
import { likePattern } from "../list-state";
import { adminError, requireAdmin } from "./admin-users";

const members = count(member.id).as("members");
const columns = { name: organization.name, slug: organization.slug, createdAt: organization.createdAt };

const record = (row: typeof organization.$inferSelect & { members: number; memberList?: string }): ResourceRecord => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  members: row.members,
  memberList: row.memberList ?? null,
  createdAt: row.createdAt.toISOString(),
});

export const adminOrganizationResource = defineResource({
  slug: "organizations",
  label: { "pt-BR": "Organização", en: "Organization" },
  pluralLabel: { "pt-BR": "Organizações", en: "Organizations" },
  description: { "pt-BR": "Todas as organizações do sistema.", en: "Every organization in the system." },
  icon: "organization",
  navigationGroup: { "pt-BR": "Sistema", en: "System" },
  titleKey: "name",
  can: (_role, operation, scope) => scope.isAdmin && scope.identifier === null && (operation === "read" || operation === "update"),
  form: async () => [{
    title: { "pt-BR": "Organização", en: "Organization" },
    fields: [
      { name: "name", label: { "pt-BR": "Nome", en: "Name" }, type: "text", required: true, maxLength: 100 },
      { name: "slug", label: { "pt-BR": "Slug", en: "Slug" }, type: "text", disabledOnEdit: true,
        description: { "pt-BR": "Identificador preservado para não invalidar URLs da organização.", en: "Identifier is preserved to keep organization URLs valid." } },
    ],
  }],
  update: async (scope, id, values) => {
    try {
      await requireAdmin();
      if (!scope.isAdmin || scope.identifier !== null) return { ok: false, error: "FORBIDDEN" };
      const parsed = z.object({ name: z.string().trim().min(1).max(100) }).strict().safeParse(values);
      if (!z.string().uuid().safeParse(id).success || !parsed.success) {
        return { ok: false, error: "INVALID_INPUT", fieldErrors: { name: "Nome / Name: 1–100 caracteres / characters." } };
      }
      // Global identity metadata only. Never enter tenant data or bypass RLS for administration.
      const [updated] = await getDb().update(organization).set(parsed.data).where(eq(organization.id, id)).returning({ id: organization.id });
      return updated ? { ok: true, id: updated.id } : { ok: false, error: "NOT_FOUND" };
    } catch (error) { return adminError(error); }
  },
  table: {
    columns: [
      { key: "name", label: { "pt-BR": "Nome", en: "Name" }, primary: true, sortable: true },
      { key: "slug", label: { "pt-BR": "Slug", en: "Slug" }, sortable: true },
      { key: "members", label: { "pt-BR": "Membros", en: "Members" }, type: "number", align: "end" },
      { key: "createdAt", label: { "pt-BR": "Criada em", en: "Created" }, type: "datetime", sortable: true, toggleable: true },
    ],
    defaultSort: { key: "createdAt", direction: "desc" },
    sortable: Object.keys(columns),
  },
  infolist: async () => [
    {
      title: { "pt-BR": "Detalhes", en: "Details" },
      columns: 2,
      entries: [
        { key: "name", label: { "pt-BR": "Nome", en: "Name" } },
        { key: "slug", label: { "pt-BR": "Slug", en: "Slug" } },
        { key: "members", label: { "pt-BR": "Membros", en: "Members" }, type: "number" },
        { key: "createdAt", label: { "pt-BR": "Criada em", en: "Created" }, type: "datetime" },
      ],
    },
    {
      title: { "pt-BR": "Membros", en: "Members" },
      columns: 1,
      entries: [{ key: "memberList", label: { "pt-BR": "Nome · e-mail · papel", en: "Name · email · role" }, fullWidth: true }],
    },
  ],
  list: async (_scope, state) => {
    await requireAdmin();
    const db = getDb();
    const where = state.search ? or(ilike(organization.name, likePattern(state.search)), ilike(organization.slug, likePattern(state.search))) : undefined;
    const order = columns[state.sort as keyof typeof columns] ?? organization.createdAt;
    const [rows, [{ total }]] = await Promise.all([
      db.select({ organization, members }).from(organization).leftJoin(member, eq(member.organizationId, organization.id)).where(where).groupBy(organization.id)
        .orderBy(state.direction === "asc" ? asc(order) : desc(order), asc(organization.id)).limit(state.pageSize).offset((state.page - 1) * state.pageSize),
      db.select({ total: count() }).from(organization).where(where),
    ]);
    return { records: rows.map(row => record({ ...row.organization, members: row.members })), total };
  },
  get: async (_scope, id) => {
    await requireAdmin();
    const db = getDb();
    const [[row], list, [{ total }]] = await Promise.all([
      db.select().from(organization).where(eq(organization.id, id)).limit(1),
      db.select({ name: user.name, email: user.email, role: member.role }).from(member).innerJoin(user, eq(user.id, member.userId)).where(eq(member.organizationId, id)).orderBy(asc(user.name)).limit(200),
      db.select({ total: count() }).from(member).where(eq(member.organizationId, id)),
    ]);
    // ponytail: members rendered as text lines (cap 200); upgrade to a relation table when resources support relation managers.
    return row ? record({ ...row, members: total, memberList: list.map(m => `${m.name} · ${m.email} · ${m.role}`).join("\n") || "—" }) : null;
  },
  // ponytail: creation stays in the identity flow; deletion needs an explicit tenant-data retention policy before enabling.
});
