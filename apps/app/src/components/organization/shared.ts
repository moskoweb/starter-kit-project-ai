import type { Locale } from "@/lib/i18n";

export const organizationRoles = ["owner", "admin", "member", "viewer"] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const roleLabels: Record<Locale, Record<OrganizationRole, string>> = {
  "pt-BR": { owner: "Proprietário", admin: "Administrador", member: "Membro", viewer: "Leitor" },
  en: { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" },
};

export const parseRoles = (role: string) => role.split(",").map(value => value.trim());
export const hasRole = (role: string, wanted: OrganizationRole) => parseRoles(role).includes(wanted);
export const roleText = (role: string, locale: Locale) => parseRoles(role).map(value => roleLabels[locale][value as OrganizationRole] ?? value).join(", ");

// ponytail: mirrors the slug hook in packages/auth/src/auth.ts for instant feedback; the hook stays authoritative.
const reservedSlugs = ["new", "settings", "members", "invitations", "admin", "personal"];
export const slugPattern = "[a-z0-9]+(-[a-z0-9]+)*";
export function validOrganizationSlug(slug: string) {
  return slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) && !reservedSlugs.includes(slug);
}
