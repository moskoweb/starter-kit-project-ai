import "server-only";
import { headers } from "next/headers";
import { getAuth, requireSession, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { z } from "zod";
import { hasRole, validOrganizationSlug } from "../../../components/organization/shared";
import { defineResource, type ResourceScope } from "../define";

/** Account resources are registered here, never via a synthetic panel or client scope. */
export const accountResourceId = "$account";
export async function accountOrganizationScope(identifier: string | null): Promise<ResourceScope> {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders);
  if (getIdentityEnv().IDENTITY_PROFILE === "personal") throw new Error("FORBIDDEN");
  if (identifier !== null && !validOrganizationSlug(identifier)) throw new Error("NOT_FOUND");
  const tenant = identifier === null ? null : await resolveTenant(identifier, currentHeaders, "slug");
  return { identifier, role: tenant?.role ?? null, userId: session.user.id, isAdmin: session.user.role === "admin" };
}
const manager = (role: string | null) => !!role && (hasRole(role, "owner") || hasRole(role, "admin"));
const input = z.object({ name: z.string().trim().min(1).max(100), slug: z.string().refine(validOrganizationSlug) }).strict();
const failure = (error: unknown) => ({ ok: false as const, error: error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(error.message) ? error.message : "RESOURCE_ERROR" });

export const accountOrganizationResource = defineResource({
  slug: "organizations",
  label: { "pt-BR": "Organização", en: "Organization" },
  pluralLabel: { "pt-BR": "Organizações", en: "Organizations" },
  description: { "pt-BR": "Espaços de trabalho compartilhados dos quais você participa.", en: "Shared workspaces you belong to." },
  icon: "organization", titleKey: "name",
  can: (role, operation) => getIdentityEnv().IDENTITY_PROFILE !== "personal" && (operation === "read" || (operation === "create" && getIdentityEnv().ORGANIZATION_MODE !== "single") || (operation === "update" && manager(role))),
  form: async () => [{ title: { "pt-BR": "Dados da organização", en: "Organization details" }, columns: 2, fields: [
    { name: "name", label: { "pt-BR": "Nome", en: "Name" }, type: "text", required: true, maxLength: 100 },
    { name: "slug", label: { "pt-BR": "Identificador na URL", en: "URL identifier" }, type: "text", required: true, maxLength: 80, description: { "pt-BR": "Letras minúsculas, números e hífens. Exemplo: minha-equipe.", en: "Lowercase letters, numbers and hyphens. Example: my-team." } },
  ] }],
  table: { columns: [
    { key: "name", label: { "pt-BR": "Nome", en: "Name" }, primary: true, sortable: true },
    { key: "slug", label: { "pt-BR": "Identificador na URL", en: "URL identifier" }, sortable: true },
  ], defaultSort: { key: "name", direction: "asc" }, sortable: ["name", "slug"] },
  infolist: async () => [{ columns: 2, entries: [
    { key: "name", label: { "pt-BR": "Nome", en: "Name" } },
    { key: "slug", label: { "pt-BR": "Identificador na URL", en: "URL identifier" } },
  ] }],
  list: async (_scope, state) => {
    await accountOrganizationScope(null);
    const env = getIdentityEnv();
    const rows = (await getAuth().api.listOrganizations({ headers: await headers() }))
      .filter(org => (env.ORGANIZATION_MODE !== "single" || org.id === env.SINGLE_ORGANIZATION_ID) && (!state.search || `${org.name} ${org.slug}`.toLocaleLowerCase().includes(state.search.toLocaleLowerCase())))
      .map(org => ({ id: org.slug, name: org.name, slug: org.slug }));
    const key = state.sort === "slug" ? "slug" : "name";
    rows.sort((a, b) => (state.direction === "desc" ? -1 : 1) * a[key].localeCompare(b[key]) || a.id.localeCompare(b.id));
    return { records: rows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize), total: rows.length };
  },
  get: async (_scope, slug) => {
    await accountOrganizationScope(slug);
    const tenant = await resolveTenant(slug, await headers(), "slug");
    return { id: tenant.slug, name: tenant.name, slug: tenant.slug };
  },
  create: async (_scope, values) => {
    try {
      await accountOrganizationScope(null);
      if (getIdentityEnv().ORGANIZATION_MODE === "single") return { ok: false, error: "FORBIDDEN" };
      const parsed = input.safeParse(values);
      if (!parsed.success) return { ok: false, error: "INVALID_INPUT", fieldErrors: { name: "Nome / Name: 1–100", slug: "Identificador inválido / Invalid identifier" } };
      const org = await getAuth().api.createOrganization({ headers: await headers(), body: parsed.data });
      return org ? { ok: true, id: org.slug } : { ok: false, error: "RESOURCE_ERROR" };
    } catch (error) { return failure(error); }
  },
  update: async (_scope, slug, values) => {
    try {
      const scope = await accountOrganizationScope(slug);
      if (!manager(scope.role)) return { ok: false, error: "FORBIDDEN" };
      const parsed = input.safeParse(values);
      if (!parsed.success) return { ok: false, error: "INVALID_INPUT", fieldErrors: { name: "Nome / Name: 1–100", slug: "Identificador inválido / Invalid identifier" } };
      const tenant = await resolveTenant(slug, await headers(), "slug");
      const org = await getAuth().api.updateOrganization({ headers: await headers(), body: { organizationId: tenant.id, data: parsed.data } });
      return org?.id === tenant.id && org.slug === parsed.data.slug ? { ok: true, id: org.slug } : { ok: false, error: "RESOURCE_ERROR" };
    } catch (error) { return failure(error); }
  },
});
