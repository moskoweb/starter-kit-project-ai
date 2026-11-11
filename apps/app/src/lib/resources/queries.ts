import "server-only";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { headers } from "next/headers";
import { projects, tasks } from "@vibe/db/schema";
import { withAuthorizedProjects } from "@vibe/auth";
import { listSchema, taskListSchema, uuidSchema } from "./validation";

const PAGE_SIZE = 20;
const fail = (error: unknown): never => { throw new Error(error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(error.message) ? error.message : "RESOURCE_ERROR"); };


export async function listProjects(identifier: string | null, input: unknown = {}) {
  const parsed = listSchema.safeParse(input); if (!parsed.success) throw new Error("INVALID_INPUT");
  try { return await withAuthorizedProjects(await headers(), identifier, "read", async (tx) => {
    const { page, search, sort, direction } = parsed.data;
    const where = search ? ilike(projects.name, `%${search.replace(/[\\%_]/g, "\\$&")}%`) : undefined;
    const order = sort === "updatedAt" ? projects.updatedAt : sort === "name" ? projects.name : projects.createdAt;
    const [items, [{ total }]] = await Promise.all([tx.select().from(projects).where(where).orderBy(direction === "asc" ? asc(order) : desc(order), asc(projects.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE), tx.select({ total: count() }).from(projects).where(where)]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }); } catch (error) { return fail(error); }
}
export async function getProject(identifier: string | null, id: string) {
  if (!uuidSchema.safeParse(id).success) throw new Error("INVALID_INPUT");
  try { return await withAuthorizedProjects(await headers(), identifier, "read", async tx => (await tx.select().from(projects).where(eq(projects.id, id)).limit(1))[0] ?? null); } catch (error) { return fail(error); }
}
export async function listTasks(identifier: string | null, input: unknown = {}) {
  const parsed = taskListSchema.safeParse(input); if (!parsed.success) throw new Error("INVALID_INPUT");
  try { return await withAuthorizedProjects(await headers(), identifier, "read", async tx => {
    const { page, search, projectId, direction, sort } = parsed.data;
    const where = and(projectId ? eq(tasks.projectId, projectId) : undefined, search ? ilike(tasks.title, `%${search.replace(/[\\%_]/g, "\\$&")}%`) : undefined);
    const order = sort === "updatedAt" ? tasks.updatedAt : sort === "title" ? tasks.title : tasks.createdAt;
    const [items, [{ total }]] = await Promise.all([tx.select().from(tasks).where(where).orderBy(direction === "asc" ? asc(order) : desc(order), asc(tasks.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE), tx.select({ total: count() }).from(tasks).where(where)]);
    return { items, total, page, pageSize: PAGE_SIZE };
  }); } catch (error) { return fail(error); }
}
export async function getTask(identifier: string | null, id: string) {
  if (!uuidSchema.safeParse(id).success) throw new Error("INVALID_INPUT");
  try { return await withAuthorizedProjects(await headers(), identifier, "read", async tx => (await tx.select().from(tasks).where(eq(tasks.id, id)).limit(1))[0] ?? null); } catch (error) { return fail(error); }
}
export async function listAuthorizedProjects(identifier: string | null, input: unknown = {}) {
  const parsed = listSchema.pick({ search: true }).safeParse(input);
  if (!parsed.success) throw new Error("INVALID_INPUT");
  try {
    return await withAuthorizedProjects(await headers(), identifier, "read", async tx => tx.select({ id: projects.id, name: projects.name }).from(projects).where(parsed.data.search ? ilike(projects.name, `%${parsed.data.search.replace(/[\\%_]/g, "\\$&")}%`) : undefined).orderBy(asc(projects.name), asc(projects.id)).limit(100));
  } catch (error) { return fail(error); }
}
