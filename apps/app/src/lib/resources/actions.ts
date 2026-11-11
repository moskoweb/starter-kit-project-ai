"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { projects, tasks } from "@vibe/db/schema";
import { requireSession, withAuthorizedProjects } from "@vibe/auth";
import { enqueueProjectCreated } from "@vibe/events";
import { createDelivery } from "@vibe/webhooks/delivery";
import { bulkDeleteSchema, projectInputSchema, projectUpdateSchema, taskInputSchema, taskUpdateSchema, uuidSchema } from "./validation";
import { buildPanelPath } from "../panels/routing";

async function action<T>(identifier: string | null, permission: "create" | "update" | "delete", run: (tx: Parameters<Parameters<typeof withAuthorizedProjects>[3]>[0], userId: string) => Promise<T>, path: string) {
  try {
    const currentHeaders = await headers();
    const result = await withAuthorizedProjects(currentHeaders, identifier, permission, async (tx) => {
      const session = await requireSession(currentHeaders);
      return run(tx, session.user.id);
    });
    revalidatePath(path);
    revalidatePath("/[...segments]", "page");
    return { ok: true as const, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { ok: false as const, error: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED", "INVALID_INPUT"].includes(message) ? message : "RESOURCE_ERROR" };
  }
}
const safePath = (identifier: string | null) => identifier === null ? buildPanelPath("personal") : buildPanelPath("organization", { tenant: identifier });

export async function createProject(identifier: string | null, input: unknown) {
  const parsed = projectInputSchema.safeParse(input); if (!parsed.success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "create", async (tx, ownerUserId) => {
    const [{ organizationId }] = await tx.execute<{ organizationId: string | null }>(sql`select nullif(current_setting('app.current_tenant_id', true), '') as "organizationId"`);
    const [project] = await tx.insert(projects).values({ ...parsed.data, ownerUserId, organizationId }).returning({ id: projects.id, organizationId: projects.organizationId });
    if (process.env.WEBHOOKS_OUTBOUND_ENABLED === "true" && process.env.JOBS_ENABLED !== "true") throw new Error("WEBHOOK_JOBS_REQUIRED");
    if (process.env.JOBS_ENABLED === "true") {
      const eventId = await enqueueProjectCreated(tx, { userId: ownerUserId, organizationId: project.organizationId }, project.id);
      if (process.env.WEBHOOKS_OUTBOUND_ENABLED === "true") await createDelivery(tx, { actorUserId: ownerUserId, organizationId: project.organizationId }, eventId, { projectId: project.id, name: parsed.data.name });
    }
    return { id: project.id };
  }, safePath(identifier));
}
export async function updateProject(identifier: string | null, id: string, input: unknown) {
  const parsed = projectUpdateSchema.safeParse(input); if (!parsed.success || !uuidSchema.safeParse(id).success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "update", async tx => { const [row] = await tx.update(projects).set(parsed.data).where(eq(projects.id, id)).returning({ id: projects.id }); if (!row) throw new Error("NOT_FOUND"); return row; }, safePath(identifier));
}
export async function deleteProject(identifier: string | null, id: string) {
  if (!uuidSchema.safeParse(id).success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "delete", async tx => { const [row] = await tx.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id }); if (!row) throw new Error("NOT_FOUND"); return row; }, safePath(identifier));
}
export async function createTask(identifier: string | null, input: unknown) {
  const parsed = taskInputSchema.safeParse(input); if (!parsed.success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "create", async (tx, ownerUserId) => {
    const [project] = await tx.select({ id: projects.id, organizationId: projects.organizationId }).from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
    if (!project) throw new Error("NOT_FOUND");
    const [task] = await tx.insert(tasks).values({ ...parsed.data, organizationId: project.organizationId, ownerUserId }).returning({ id: tasks.id }); return task;
  }, safePath(identifier));
}
export async function updateTask(identifier: string | null, id: string, input: unknown) {
  const parsed = taskUpdateSchema.safeParse(input); if (!parsed.success || !uuidSchema.safeParse(id).success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "update", async tx => { const [row] = await tx.update(tasks).set(parsed.data).where(eq(tasks.id, id)).returning({ id: tasks.id }); if (!row) throw new Error("NOT_FOUND"); return row; }, safePath(identifier));
}
export async function deleteTask(identifier: string | null, id: string) {
  if (!uuidSchema.safeParse(id).success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "delete", async tx => { const [row] = await tx.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id }); if (!row) throw new Error("NOT_FOUND"); return row; }, safePath(identifier));
}
export async function bulkDeleteProjects(identifier: string | null, input: unknown) {
  const parsed = bulkDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "delete", async tx => {
    const found = await tx.select({ id: projects.id }).from(projects).where(inArray(projects.id, parsed.data.ids)).for("update");
    if (found.length !== parsed.data.ids.length) throw new Error("NOT_FOUND");
    return tx.delete(projects).where(inArray(projects.id, parsed.data.ids)).returning({ id: projects.id });
  }, safePath(identifier));
}
export async function bulkDeleteTasks(identifier: string | null, input: unknown) {
  const parsed = bulkDeleteSchema.safeParse(input); if (!parsed.success) return { ok: false as const, error: "INVALID_INPUT" };
  return action(identifier, "delete", async tx => {
    const found = await tx.select({ id: tasks.id }).from(tasks).where(inArray(tasks.id, parsed.data.ids)).for("update");
    if (found.length !== parsed.data.ids.length) throw new Error("NOT_FOUND");
    return tx.delete(tasks).where(inArray(tasks.id, parsed.data.ids)).returning({ id: tasks.id });
  }, safePath(identifier));
}
