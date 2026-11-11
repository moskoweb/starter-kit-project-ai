export type PanelContext = "global" | "personal" | "organization";
export type TenantIdentifier = "slug" | "uuid";

export type PanelConfig = {
  id: string;
  label: string;
  prefix: string;
  context: PanelContext;
  tenantIdentifier?: TenantIdentifier;
};

export const reservedPanelRoutes = [
  "api",
  "_next",
  "login",
  "signup",
  "account",
  "organizations",
  "forgot-password",
  "two-factor",
  "auth",
  "reset-password",
  "verify-email",
  "security",
  "invitations",
] as const;

export const registry: readonly PanelConfig[] = validatePanels([
  { id: "admin", label: "Admin", prefix: "/admin", context: "global" },
  { id: "personal", label: "Personal", prefix: "/app", context: "personal" },
  {
    id: "organization",
    label: "Organization",
    prefix: "/org",
    context: "organization",
    tenantIdentifier: "slug",
  },
]);

export function validatePanels(panels: readonly PanelConfig[]): readonly PanelConfig[] {
  const ids = new Set<string>();
  const prefixes = new Set<string>();
  for (const panel of panels) {
    if (!/^[a-zA-Z0-9_-]+$/.test(panel.id) || ids.has(panel.id)) {
      throw new Error(`Invalid or duplicate panel id: ${panel.id}`);
    }
    ids.add(panel.id);
    if (!panel.label.trim()) throw new Error(`Panel label is required: ${panel.id}`);
    if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(panel.prefix)) {
      throw new Error(`Invalid panel prefix: ${panel.prefix}`);
    }
    if (prefixes.has(panel.prefix)) throw new Error(`Duplicate panel prefix: ${panel.prefix}`);
    prefixes.add(panel.prefix);
    if (panel.context === "organization" && !panel.tenantIdentifier) {
      throw new Error(`Organization panel requires tenantIdentifier: ${panel.id}`);
    }
    if (panel.context !== "organization" && panel.tenantIdentifier) {
      throw new Error(`Only organization panels may define tenantIdentifier: ${panel.id}`);
    }
  }
  for (const prefix of prefixes) {
    for (const other of prefixes) {
      if (prefix !== other && other.startsWith(`${prefix}/`)) {
        throw new Error(`Overlapping panel prefixes: ${prefix} and ${other}`);
      }
    }
  }
  for (const route of reservedPanelRoutes) {
    if (prefixes.has(`/${route}`) || [...prefixes].some((prefix) => prefix.startsWith(`/${route}/`))) {
      throw new Error(`Panel prefix conflicts with reserved route: /${route}`);
    }
  }
  return panels;
}
