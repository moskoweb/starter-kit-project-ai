import "server-only";
import { and, asc, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { getDb, member, session, user } from "@vibe/db";
import { getAuth, requireSession } from "@vibe/auth";
import type { ActionResult, ResourceRecord } from "@vibe/ui/lib/schema";
import { defineResource, type ResourceScope } from "../define";
import { likePattern } from "../list-state";

const columns = { name: user.name, email: user.email, createdAt: user.createdAt };

/** Loaders run outside the generic action guard too (page render), so re-check the superadmin role here. */
export async function requireAdmin() {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders);
  if (session.user.role !== "admin") throw new Error("FORBIDDEN");
  return { session, headers: currentHeaders };
}

/** Dashboard counters for the global panel: signups in the last 30 days and banned accounts. */
export async function loadAdminUserStats() {
  await requireAdmin();
  const [stats] = await getDb().select({
    recent: sql<number>`count(*) filter (where ${user.createdAt} >= now() - interval '30 days')`.mapWith(Number),
    banned: sql<number>`count(*) filter (where ${user.banned})`.mapWith(Number),
  }).from(user);
  return stats ?? { recent: 0, banned: 0 };
}

/** Map Better Auth APIError codes to stable action errors without leaking internals. */
export function adminError(error: unknown): ActionResult {
  const code = error instanceof APIError ? error.body?.code : undefined;
  if (typeof code === "string" && /^[A-Z_]+$/.test(code)) return { ok: false, error: code };
  if (error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(error.message)) return { ok: false, error: error.message };
  return { ok: false, error: "RESOURCE_ERROR" };
}

/** Run a Better Auth admin endpoint per target user; refuses to act on the current admin. */
async function forEachUser(scope: ResourceScope, ids: string[], run: (headers: Headers, userId: string) => Promise<unknown>, revokeImpersonation = false): Promise<ActionResult> {
  try {
    const { session: current, headers: currentHeaders } = await requireAdmin();
    if (!scope.isAdmin || ids.includes(current.user.id) || ids.includes(scope.userId)) return { ok: false, error: "CANNOT_ACT_ON_SELF" };
    for (const id of ids) {
      await run(currentHeaders, id);
      // Better Auth revokes sessions by userId only; also end impersonations this user started.
      if (revokeImpersonation) await getDb().delete(session).where(eq(session.impersonatedBy, id));
    }
    return { ok: true };
  } catch (error) { return adminError(error); }
}

const record = (row: typeof user.$inferSelect & { organizations?: number }): ResourceRecord => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role === "admin" ? "admin" : "user",
  emailVerified: row.emailVerified,
  banned: Boolean(row.banned),
  banReason: row.banReason,
  banExpires: row.banExpires?.toISOString() ?? null,
  twoFactorEnabled: Boolean(row.twoFactorEnabled),
  organizations: row.organizations ?? 0,
  createdAt: row.createdAt.toISOString(),
});

const roleBadges = { admin: { label: { "pt-BR": "Admin", en: "Admin" }, variant: "default" as const }, user: { label: { "pt-BR": "Usuário", en: "User" }, variant: "secondary" as const } };
const bannedBadges = { true: { label: { "pt-BR": "Banido", en: "Banned" }, variant: "destructive" as const }, false: { label: { "pt-BR": "Ativo", en: "Active" }, variant: "outline" as const } };

export const adminUserResource = defineResource({
  slug: "users",
  label: { "pt-BR": "Usuário", en: "User" },
  pluralLabel: { "pt-BR": "Usuários", en: "Users" },
  description: { "pt-BR": "Todas as contas do sistema.", en: "Every account in the system." },
  icon: "users",
  navigationGroup: { "pt-BR": "Sistema", en: "System" },
  titleKey: "name",
  can: (_role, operation, scope) => scope.isAdmin && operation === "read",
  table: {
    columns: [
      { key: "name", label: { "pt-BR": "Nome", en: "Name" }, primary: true, sortable: true },
      { key: "email", label: { "pt-BR": "E-mail", en: "Email" }, sortable: true },
      { key: "role", label: { "pt-BR": "Papel", en: "Role" }, type: "badge", badges: roleBadges },
      { key: "emailVerified", label: { "pt-BR": "Verificado", en: "Verified" }, type: "boolean", toggleable: true },
      { key: "banned", label: { "pt-BR": "Status", en: "Status" }, type: "badge", badges: bannedBadges },
      { key: "twoFactorEnabled", label: { "pt-BR": "2FA", en: "2FA" }, type: "boolean", toggleable: true },
      { key: "createdAt", label: { "pt-BR": "Criado em", en: "Created" }, type: "datetime", sortable: true, toggleable: true },
    ],
    filters: async () => [
      { key: "role", label: { "pt-BR": "Papel", en: "Role" }, type: "select", options: [{ value: "admin", label: roleBadges.admin.label }, { value: "user", label: roleBadges.user.label }] },
      { key: "banned", label: { "pt-BR": "Banido", en: "Banned" }, type: "boolean", trueLabel: { "pt-BR": "Sim", en: "Yes" }, falseLabel: { "pt-BR": "Não", en: "No" } },
    ],
    defaultSort: { key: "createdAt", direction: "desc" },
    sortable: Object.keys(columns),
  },
  infolist: async () => [
    {
      title: { "pt-BR": "Perfil", en: "Profile" },
      columns: 2,
      entries: [
        { key: "name", label: { "pt-BR": "Nome", en: "Name" } },
        { key: "email", label: { "pt-BR": "E-mail", en: "Email" } },
        { key: "role", label: { "pt-BR": "Papel", en: "Role" }, type: "badge", badges: roleBadges },
        { key: "organizations", label: { "pt-BR": "Organizações", en: "Organizations" }, type: "number" },
        { key: "createdAt", label: { "pt-BR": "Criado em", en: "Created" }, type: "datetime" },
      ],
    },
    {
      title: { "pt-BR": "Segurança", en: "Security" },
      columns: 2,
      entries: [
        { key: "emailVerified", label: { "pt-BR": "E-mail verificado", en: "Email verified" }, type: "boolean" },
        { key: "twoFactorEnabled", label: { "pt-BR": "Autenticação em dois fatores", en: "Two-factor authentication" }, type: "boolean" },
      ],
    },
    {
      title: { "pt-BR": "Status", en: "Status" },
      columns: 3,
      entries: [
        { key: "banned", label: { "pt-BR": "Status", en: "Status" }, type: "badge", badges: bannedBadges },
        { key: "banReason", label: { "pt-BR": "Motivo", en: "Reason" } },
        { key: "banExpires", label: { "pt-BR": "Expira em", en: "Expires" }, type: "datetime" },
      ],
    },
  ],
  list: async (_scope, state) => {
    await requireAdmin();
    const db = getDb();
    const where = and(
      state.search ? or(ilike(user.name, likePattern(state.search)), ilike(user.email, likePattern(state.search))) : undefined,
      state.filters.role === "admin" ? eq(user.role, "admin") : state.filters.role === "user" ? sql`coalesce(${user.role}, 'user') <> 'admin'` : undefined,
      state.filters.banned === "true" ? eq(user.banned, true) : state.filters.banned === "false" ? or(ne(user.banned, true), sql`${user.banned} is null`) : undefined,
    );
    const order = columns[state.sort as keyof typeof columns] ?? user.createdAt;
    const [rows, [{ total }]] = await Promise.all([
      db.select().from(user).where(where).orderBy(state.direction === "asc" ? asc(order) : desc(order), asc(user.id)).limit(state.pageSize).offset((state.page - 1) * state.pageSize),
      db.select({ total: count() }).from(user).where(where),
    ]);
    return { records: rows.map(row => record(row)), total };
  },
  get: async (_scope, id) => {
    await requireAdmin();
    const db = getDb();
    const [[row], [{ organizations }]] = await Promise.all([
      db.select().from(user).where(eq(user.id, id)).limit(1),
      db.select({ organizations: count() }).from(member).where(eq(member.userId, id)),
    ]);
    return row ? record({ ...row, organizations }) : null;
  },
  actions: [
    {
      name: "impersonate",
      label: { "pt-BR": "Atuar como", en: "Impersonate" },
      icon: "impersonate",
      visible: (row, scope) => row.id !== scope.userId && row.role !== "admin" && !row.banned,
      run: async (scope, ids) => {
        if (ids.length !== 1) return { ok: false, error: "INVALID_INPUT" };
        const done = await forEachUser(scope, ids, (h, userId) => getAuth().api.impersonateUser({ headers: h, body: { userId } }));
        return done.ok ? { ok: true, redirectTo: "/" } : done; // `/` redirects to the impersonated user's landing.
      },
    },
    {
      name: "makeAdmin",
      label: { "pt-BR": "Tornar admin", en: "Make admin" },
      icon: "shield",
      confirm: { title: { "pt-BR": "Conceder acesso de admin?", en: "Grant admin access?" }, description: { "pt-BR": "O usuário terá acesso total ao painel do sistema.", en: "The user gets full access to the system panel." } },
      visible: (row, scope) => row.id !== scope.userId && row.role !== "admin",
      run: (scope, ids) => forEachUser(scope, ids, (h, userId) => getAuth().api.setRole({ headers: h, body: { userId, role: "admin" } })),
    },
    {
      name: "makeUser",
      label: { "pt-BR": "Remover admin", en: "Remove admin" },
      icon: "users",
      destructive: true,
      confirm: { title: { "pt-BR": "Remover acesso de admin?", en: "Remove admin access?" }, description: { "pt-BR": "O usuário perde acesso ao painel do sistema.", en: "The user loses access to the system panel." } },
      visible: (row, scope) => row.id !== scope.userId && row.role === "admin",
      run: (scope, ids) => forEachUser(scope, ids, (h, userId) => getAuth().api.setRole({ headers: h, body: { userId, role: "user" } }), true),
    },
    {
      name: "revokeSessions",
      label: { "pt-BR": "Encerrar sessões", en: "Revoke sessions" },
      icon: "sessions",
      destructive: true,
      bulk: true,
      confirm: { title: { "pt-BR": "Encerrar todas as sessões?", en: "Revoke every session?" }, description: { "pt-BR": "O usuário precisará entrar novamente em todos os dispositivos.", en: "The user must sign in again on every device." } },
      visible: (row, scope) => row.id !== scope.userId,
      run: (scope, ids) => forEachUser(scope, ids, (h, userId) => getAuth().api.revokeUserSessions({ headers: h, body: { userId } }), true),
    },
    {
      name: "ban",
      label: { "pt-BR": "Banir", en: "Ban" },
      icon: "ban",
      destructive: true,
      bulk: true,
      confirm: { title: { "pt-BR": "Banir usuário?", en: "Ban user?" }, description: { "pt-BR": "As sessões são encerradas e o login fica bloqueado até o desbanimento.", en: "Sessions are revoked and sign-in is blocked until unbanned." } },
      visible: (row, scope) => row.id !== scope.userId && !row.banned,
      run: (scope, ids) => forEachUser(scope, ids, (h, userId) => getAuth().api.banUser({ headers: h, body: { userId, banReason: "Banned by administrator" } }), true),
    },
    {
      name: "unban",
      label: { "pt-BR": "Desbanir", en: "Unban" },
      icon: "ban",
      bulk: true,
      visible: row => Boolean(row.banned),
      run: (scope, ids) => forEachUser(scope, ids, (h, userId) => getAuth().api.unbanUser({ headers: h, body: { userId } })),
    },
  ],
});
