import type { ActionResult, ResourceRecord } from "@vibe/ui/lib/schema";
import type { Project, Task } from "@vibe/db/schema";

export const projectRecord = (row: Project): ResourceRecord => ({ id: row.id, name: row.name, description: row.description, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
export const taskRecord = (row: Task & { projectName: string | null }): ResourceRecord => ({ id: row.id, title: row.title, projectId: row.projectId, projectName: row.projectName, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });

/** Normalize data-layer results to the UI action contract without leaking internals. */
export function result(value: { ok: true; data?: unknown } | { ok: false; error: string }): ActionResult {
  if (!value.ok) return { ok: false, error: value.error };
  const data = value.data as { id?: unknown } | undefined;
  return { ok: true, id: typeof data?.id === "string" ? data.id : undefined };
}
