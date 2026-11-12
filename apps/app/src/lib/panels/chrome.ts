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

export async function currentLocale(): Promise<Locale> { return (await cookies()).get("locale")?.value === "en" ? "en" : "pt-BR"; }

/** Build shell props (navigation groups, tenant switcher, user) for a panel or account page. */
export async function panelChrome({ panel, basePath, tenant, user, locale }: { panel: PanelConfig; basePath: string; tenant?: { id: string; name: string; role: string }; user: { name: string; email?: string }; locale: Locale }): Promise<Omit<PanelShellProps, "children">> {
  const copy = messages[locale];
  const groups = new Map<string, NavGroup>([["", { label: copy.navigation, items: [{ title: copy.dashboard, href: basePath, icon: "dashboard", exact: true }] }]]);
  for (const item of resourcesForPanel(panel.id)) {
    const label = item.kind === "resource" && item.definition.navigationGroup ? t(item.definition.navigationGroup, locale) : copy.navigation;
    const group = groups.get(label) ?? { label, items: [] };
    group.items.push({ title: item.kind === "resource" ? t(item.definition.pluralLabel, locale) : item.label, href: `${basePath}/${resourceId(item)}`, icon: item.kind === "resource" ? item.definition.icon : "settings" });
    groups.set(label, group);
  }
  const profile = getIdentityEnv().IDENTITY_PROFILE;
  if (panel.context !== "global") groups.set("\u0000settings", { label: copy.settings, items: [
    { title: copy.account, href: "/account", icon: "account" },
    { title: copy.security, href: "/security", icon: "security" },
    ...(profile === "personal" ? [] : [{ title: copy.organizations, href: "/organizations", icon: "organization" as const }]),
  ] });
  const orgs = panel.context === "global" ? [] : await loadOrganizationOptions(panel.tenantIdentifier ?? "slug");
  const cookieStore = await cookies();
  return {
    title: tenant?.name ?? (panel.context === "personal" ? copy.personal : panel.label),
    subtitle: tenant ? tenant.role : panel.context === "global" ? panel.label : copy.workspace,
    groups: [...groups.values()],
    currentWorkspaceId: tenant?.id ?? null,
    personal: profile === "organizations" || !registry.some(item => item.id === "personal") ? undefined : { id: "personal", name: copy.personal, href: buildPanelPath("personal") },
    organizations: orgs.map(org => ({ id: org.id, name: org.name, href: buildPanelPath("organization", { tenant: org.identifier }) })),
    user, locale,
    initialCollapsed: cookieStore.get("sidebar_state")?.value === "false",
  };
}

/** Shell for account-level pages: personal panel when available, else first organization panel without tenant. */
export async function accountChrome(user: { name: string; email?: string }) {
  const locale = await currentLocale();
  const personal = registry.find(item => item.context === "personal");
  const panel = personal ?? registry.find(item => item.context === "organization")!;
  return panelChrome({ panel, basePath: personal ? buildPanelPath(personal.id) : "/organizations", user, locale });
}
