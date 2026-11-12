"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { ActionResult } from "@vibe/ui/lib/schema";
import { requireSession, resolveTenant } from "@vibe/auth";
import { registry } from "../panels/registry";
import { getPanelResource } from "../panels/resources";
import type { Operation, ResourceDefinition, ResourceScope } from "./define";

const ids = z.array(z.string().uuid()).min(1).max(100).transform(values => [...new Set(values)]);

/** Re-resolve panel, tenant and role from the session; never trust client-bound arguments beyond identifiers. */
async function authorize(panelId: string, slug: string, identifier: string | null, operation: Operation): Promise<{ resource: ResourceDefinition; scope: ResourceScope } | { error: string }> {
  const currentHeaders = await headers();
  try { await requireSession(currentHeaders); } catch { return { error: "UNAUTHORIZED" }; }
  const panel = registry.find(({ id }) => id === panelId);
  const entry = panel ? getPanelResource(panel.id, slug) : undefined;
  if (!panel || !entry || entry.kind !== "resource" || panel.context === "global") return { error: "FORBIDDEN" };
  if ((panel.context === "personal") !== (identifier === null)) return { error: "FORBIDDEN" };
  let role: string | null = null;
  if (identifier !== null) {
    try { role = (await resolveTenant(identifier, currentHeaders, "slug")).role; } catch { return { error: "FORBIDDEN" }; }
  }
  if (!entry.definition.can(role, operation)) return { error: "FORBIDDEN" };
  return { resource: entry.definition, scope: { identifier, role } };
}

export async function createRecord(panelId: string, slug: string, identifier: string | null, values: unknown): Promise<ActionResult> {
  const access = await authorize(panelId, slug, identifier, "create");
  return "error" in access ? { ok: false, error: access.error } : access.resource.create(access.scope, values);
}

export async function updateRecord(panelId: string, slug: string, identifier: string | null, id: string, values: unknown): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "INVALID_INPUT" };
  const access = await authorize(panelId, slug, identifier, "update");
  return "error" in access ? { ok: false, error: access.error } : access.resource.update(access.scope, id, values);
}

export async function deleteRecords(panelId: string, slug: string, identifier: string | null, input: string[]): Promise<ActionResult> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const access = await authorize(panelId, slug, identifier, "delete");
  return "error" in access ? { ok: false, error: access.error } : access.resource.delete(access.scope, parsed.data);
}
