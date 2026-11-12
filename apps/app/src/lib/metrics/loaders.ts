import "server-only";
import { asc, count, gte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, organization, projects, tasks, user } from "@vibe/db";
import { getAuth, requireSession, withAuthorizedProjects } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";

export async function loadGlobalMetrics() {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders);
  if (session.user.role !== "admin") throw new Error("FORBIDDEN");
  const db = getDb();
  const [[{ users }], [{ organizations }]] = await Promise.all([
    db.select({ users: count() }).from(user),
    db.select({ organizations: count() }).from(organization),
  ]);
  return { users, organizations };
}

export async function loadOrganizationOptions(identifierKind: "slug" | "uuid" = "slug") {
  const env = getIdentityEnv();
  if (env.IDENTITY_PROFILE === "personal") return [];
  const currentHeaders = await headers();
  const organizations = await getAuth().api.listOrganizations({ headers: currentHeaders });
  return organizations.filter(({ id }) => env.ORGANIZATION_MODE !== "single" || id === env.SINGLE_ORGANIZATION_ID)
    .map(({ id, name, slug }) => ({ id, name, identifier: identifierKind === "uuid" ? id : slug }));
}



const MONTHS = 12;

export async function loadProjectMetrics(identifier: string | null) {
  const currentHeaders = await headers();
  return withAuthorizedProjects(currentHeaders, identifier, "read", async (tx) => {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCMonth(start.getUTCMonth() - (MONTHS - 1));
    const rows = await tx
      .select({ month: sql<string>`to_char(date_trunc('month', ${projects.createdAt} at time zone 'UTC'), 'YYYY-MM')`, total: count() })
      .from(projects)
      .where(gte(projects.createdAt, start))
      .groupBy(sql`date_trunc('month', ${projects.createdAt} at time zone 'UTC')`)
      .orderBy(asc(sql`date_trunc('month', ${projects.createdAt} at time zone 'UTC')`));
    const totals = new Map(rows.map(({ month, total }) => [month, total]));
    return Array.from({ length: MONTHS }, (_, index) => {
      const date = new Date(start);
      date.setUTCMonth(start.getUTCMonth() + index);
      const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      return { month, total: totals.get(month) ?? 0 };
    });
  });
}

/** Workspace totals for dashboard stats; runs under tenant RLS. */
export async function loadWorkspaceStats(identifier: string | null) {
  const currentHeaders = await headers();
  return withAuthorizedProjects(currentHeaders, identifier, "read", async (tx) => {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const [[{ projectCount }], [{ taskCount }], [{ projectsThisMonth }]] = await Promise.all([
      tx.select({ projectCount: count() }).from(projects),
      tx.select({ taskCount: count() }).from(tasks),
      tx.select({ projectsThisMonth: count() }).from(projects).where(gte(projects.createdAt, start)),
    ]);
    return { projectCount, taskCount, projectsThisMonth };
  });
}
