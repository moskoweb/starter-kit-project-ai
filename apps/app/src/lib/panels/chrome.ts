import "server-only";
import { cookies } from "next/headers";
import { getIdentityEnv } from "@vibe/config/env";
import type { NavGroup } from "../../components/panels/nav-main";
import type { PanelShellProps } from "../../components/panels/shell";
import { loadOrganizationOptions } from "../metrics/loaders";
import { messages, type Locale } from "../i18n";
import { t } from "../resources/define";
import { registry, type PanelConfig } from "./registry";
import { resourceId, resourcesForPanel } from "./resources";
import { buildPanelPath } from "./routing";

type Copy = (typeof messages)[Locale];
type User = { name: string; email?: string };

export async function currentLocale(): Promise<Locale> { return (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; }

/** Registered workspace panels, looked up by context (ids are project-defined). */
export const personalPanel = () => registry.find(panel => panel.context === "personal");
export const organizationPanel = () => registry.find(panel => panel.context === "organization");

function settingsGroup(copy: Copy): NavGroup {
  return { label: copy.settings, items: [
    { title: copy.account, href: "/account", icon: "account" },
    { title: copy.security, href: "/security", icon: "security" },
    ...(getIdentityEnv().IDENTITY_PROFILE === "personal" ? [] : [{ title: copy.organizations, href: "/organizations", icon: "organization" as const }]),
  ] };
}

/** Workspace switcher entries; `switchable` is false when no personal/organization panel is registered. */
async function workspaceSwitcher(copy: Copy, loadOrganizations: boolean): Promise<Pick<PanelShellProps, "personal" | "organizations" | "switchable">> {
  const profile = getIdentityEnv().IDENTITY_PROFILE;
  const personal = personalPanel(), organization = organizationPanel();
  const orgs = organization && loadOrganizations ? await loadOrganizationOptions(organization.tenantIdentifier ?? "slug") : [];
  return {
    switchable: !!(personal || organization),
    personal: personal && profile !== "organizations" ? { id: "personal", name: copy.personal, href: buildPanelPath(personal.id) } : undefined,
    organizations: organization ? orgs.map(org => ({ id: org.id, name: org.name, href: buildPanelPath(organization.id, { tenant: org.identifier }) })) : [],
  };
}

/** Build shell props (navigation groups, tenant switcher, user) for a panel page. */
export async function panelChrome({ panel, basePath, tenant, user, locale }: { panel: PanelConfig; basePath: string; tenant?: { id: string; name: string; role: string }; user: User; locale: Locale }): Promise<Omit<PanelShellProps, "children">> {
  const copy = messages[locale];
  const groups = new Map<string, NavGroup>([["", { label: copy.navigation, items: [{ title: copy.dashboard, href: basePath, icon: "dashboard", exact: true }] }]]);
  for (const item of resourcesForPanel(panel.id)) {
    const label = item.kind === "resource" && item.definition.navigationGroup ? t(item.definition.navigationGroup, locale) : copy.navigation;
    const group = groups.get(label) ?? { label, items: [] };
    group.items.push({ title: item.kind === "resource" ? t(item.definition.pluralLabel, locale) : item.label, href: `${basePath}/${resourceId(item)}`, icon: item.kind === "resource" ? item.definition.icon : "settings" });
    groups.set(label, group);
  }
  if (panel.context !== "global") groups.set("\u0000settings", settingsGroup(copy));
  return {
    title: tenant?.name ?? (panel.context === "personal" ? copy.personal : panel.label),
    subtitle: tenant ? tenant.role : panel.context === "global" ? panel.label : copy.workspace,
    groups: [...groups.values()],
    currentWorkspaceId: tenant?.id ?? null,
    ...await workspaceSwitcher(copy, panel.context !== "global"),
    user, locale,
    initialCollapsed: (await cookies()).get("sidebar_state")?.value === "false",
  };
}

/** Shell for account-level pages: personal panel when registered, else organization panel without tenant, else Settings only. */
export async function accountChrome(user: User) {
  const locale = await currentLocale();
  const personal = personalPanel();
  const panel = personal ?? organizationPanel();
  if (panel) return panelChrome({ panel, basePath: personal ? buildPanelPath(personal.id) : "/organizations", user, locale });
  const copy = messages[locale];
  return {
    title: copy.account,
    subtitle: copy.settings,
    groups: [settingsGroup(copy)],
    currentWorkspaceId: null,
    ...await workspaceSwitcher(copy, false),
    user, locale,
    initialCollapsed: (await cookies()).get("sidebar_state")?.value === "false",
  } satisfies Omit<PanelShellProps, "children">;
}
