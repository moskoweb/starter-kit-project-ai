"use server";

import { headers } from "next/headers";
import { requireSession, resolveTenant, canAccessProject } from "@vibe/auth";
import { registry } from "../panels/registry";
import { createProject, updateProject, deleteProject, bulkDeleteProjects, createTask, updateTask, deleteTask, bulkDeleteTasks } from "./actions";

async function authorizePanel(panelId: string, identifier: string | null, action: "read" | "create" | "update" | "delete") {
  const panel = registry.find(({ id }) => id === panelId);
  if (!panel) return { error: "FORBIDDEN" as const };
  if (panel.context === "global") return { error: "FORBIDDEN" as const };
  if (panel.context === "personal") return identifier === null ? { panel } : { error: "FORBIDDEN" as const };
  if (identifier === null) return { error: "FORBIDDEN" as const };
  try {
    // Internal resource calls carry the canonical slug after URL resolution.
    const tenant = await resolveTenant(identifier, await headers(), "slug");
    const allowed = canAccessProject(tenant.role, action);
    return allowed ? { panel } : { error: "FORBIDDEN" as const };
  } catch (error) {
    return { error: error instanceof Error && error.message === "UNAUTHORIZED" ? "UNAUTHORIZED" as const : "FORBIDDEN" as const };
  }
}

export async function saveResource(panelId: string, kind: "projects" | "tasks", identifier: string | null, id: string | undefined, values: unknown) {
  const currentHeaders = await headers();
  await requireSession(currentHeaders);
  const access = await authorizePanel(panelId, identifier, id ? "update" : "create");
  if ("error" in access) return { ok: false, error: access.error };
  const result = kind === "projects" ? id ? await updateProject(identifier, id, values) : await createProject(identifier, values) : id ? await updateTask(identifier, id, values) : await createTask(identifier, values);
  return result.ok && result.data?.id ? { ok: true, id: result.data.id } : result.ok ? { ok: true } : result;
}

export async function removeResource(panelId: string, kind: "projects" | "tasks", identifier: string | null, id: string) {
  const currentHeaders = await headers();
  await requireSession(currentHeaders);
  const access = await authorizePanel(panelId, identifier, "delete");
  if ("error" in access) return { ok: false, error: access.error };
  const result = kind === "projects" ? await deleteProject(identifier, id) : await deleteTask(identifier, id);
  return result.ok ? { ok: true } : result;
}

export async function removeResources(panelId: string, kind: "projects" | "tasks", identifier: string | null, ids: string[]) {
  const currentHeaders = await headers();
  await requireSession(currentHeaders);
  const access = await authorizePanel(panelId, identifier, "delete");
  if ("error" in access) return { ok: false, error: access.error };
  const result = kind === "projects" ? await bulkDeleteProjects(identifier, { ids }) : await bulkDeleteTasks(identifier, { ids });
  return result.ok ? { ok: true } : result;
}
