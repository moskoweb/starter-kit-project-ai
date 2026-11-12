"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { ActionResult } from "@vibe/ui/lib/schema";
import { requireSession, resolveTenant } from "@vibe/auth";
import { registry } from "../panels/registry";
import { getPanelResource } from "../panels/resources";
import type { Operation, ResourceDefinition, ResourceScope } from "./define";

const ids = z.array(z.string().uuid()).min(1).max(100).transform(values => [...new Set(values)]);
const actionName = z.string().regex(/^[a-zA-Z][\w-]{0,63}$/);

/** Re-resolve panel, tenant, role and superadmin flag from the session; never trust client-bound arguments beyond identifiers. */
async function authorize(panelId: string, slug: string, identifier: string | null, operation: Operation): Promise<{ resource: ResourceDefinition; scope: ResourceScope } | { error: string }> {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders).catch(() => null);
  if (!session) return { error: "UNAUTHORIZED" };
  const panel = registry.find(({ id }) => id === panelId);
  const entry = panel ? getPanelResource(panel.id, slug) : undefined;
  if (!panel || !entry || entry.kind !== "resource") return { error: "FORBIDDEN" };
  const isAdmin = session.user.role === "admin";
  if (panel.context === "global" ? !isAdmin || identifier !== null : (panel.context === "personal") !== (identifier === null)) return { error: "FORBIDDEN" };
  let role: string | null = null;
  if (identifier !== null) {
    try { role = (await resolveTenant(identifier, currentHeaders, "slug")).role; } catch { return { error: "FORBIDDEN" }; }
  }
  const scope: ResourceScope = { identifier, role, userId: session.user.id, isAdmin };
  if (!entry.definition.can(role, operation, scope)) return { error: "FORBIDDEN" };
  return { resource: entry.definition, scope };
}

export async function createRecord(panelId: string, slug: string, identifier: string | null, values: unknown): Promise<ActionResult> {
  const access = await authorize(panelId, slug, identifier, "create");
  if ("error" in access) return { ok: false, error: access.error };
  return access.resource.create ? access.resource.create(access.scope, values) : { ok: false, error: "FORBIDDEN" };
}

export async function updateRecord(panelId: string, slug: string, identifier: string | null, id: string, values: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "INVALID_INPUT" };
  const access = await authorize(panelId, slug, identifier, "update");
  if ("error" in access) return { ok: false, error: access.error };
  return access.resource.update ? access.resource.update(access.scope, id, values) : { ok: false, error: "FORBIDDEN" };
}

export async function deleteRecords(panelId: string, slug: string, identifier: string | null, input: string[]): Promise<ActionResult> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const access = await authorize(panelId, slug, identifier, "delete");
  if ("error" in access) return { ok: false, error: access.error };
  return access.resource.delete ? access.resource.delete(access.scope, parsed.data) : { ok: false, error: "FORBIDDEN" };
}

/** Run a declared record action. Requires `read`, re-loads each record through the scoped loader and re-checks `visible`. */
export async function runRecordAction(panelId: string, slug: string, identifier: string | null, action: string, input: string[]): Promise<ActionResult> {
  const parsed = ids.safeParse(input);
  if (!parsed.success || !actionName.safeParse(action).success) return { ok: false, error: "INVALID_INPUT" };
  const access = await authorize(panelId, slug, identifier, "read");
  if ("error" in access) return { ok: false, error: access.error };
  const definition = access.resource.actions?.find(({ name }) => name === action);
  if (!definition) return { ok: false, error: "FORBIDDEN" };
  if (parsed.data.length > 1 && !definition.bulk) return { ok: false, error: "INVALID_INPUT" };
  for (const id of parsed.data) {
    const record = await access.resource.get(access.scope, id);
    if (!record) return { ok: false, error: "NOT_FOUND" };
    if (definition.visible && !definition.visible(record, access.scope)) return { ok: false, error: "FORBIDDEN" };
  }
  try { return await definition.run(access.scope, parsed.data); }
  catch { return { ok: false, error: "ACTION_FAILED" }; }
}
