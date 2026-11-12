import { registry, validatePanels, type PanelConfig } from "./registry";

export type ResolvedPanelPath = {
  panel: PanelConfig;
  tenantParam?: string;
  segments: string[];
};

function decodeSegment(segment: string): string | undefined {
  try {
    const decoded = decodeURIComponent(segment);
    if (!decoded || decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\") || /%2f|%5c/i.test(decoded)) return;
    return decoded;
  } catch {
    return;
  }
}

function splitPath(pathname: string): string[] | undefined {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || pathname.includes("\\") || pathname.includes("?" ) || pathname.includes("#")) return;
  const raw = pathname.slice(1).split("/");
  if (raw.at(-1) === "") raw.pop();
  if (raw.some((part) => !part)) return;
  const parts = raw.map(decodeSegment);
  return parts.some((part) => part === undefined) ? undefined : parts as string[];
}

export function resolvePanelPath(pathname: string, panels: readonly PanelConfig[] = registry): ResolvedPanelPath | undefined {
  validatePanels(panels);
  const segments = splitPath(pathname);
  if (!segments) return;
  for (const panel of panels) {
    const prefix = panel.prefix.slice(1).split("/");
    if (prefix.some((part, index) => segments[index] !== part)) continue;
    const remaining = segments.slice(prefix.length);
    if (panel.context === "organization") {
      const tenantParam = remaining.shift();
      if (!tenantParam) return;
      return { panel, tenantParam, segments: remaining };
    }
    return { panel, segments: remaining };
  }
}

export function buildPanelPath(
  panelId: string,
  options: { tenant?: string; segments?: readonly string[] } = {},
  panels: readonly PanelConfig[] = registry,
): string {
  validatePanels(panels);
  const panel = panels.find(({ id }) => id === panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const parts = panel.prefix.slice(1).split("/");
  if (panel.context === "organization") {
    if (options.tenant === undefined) throw new Error(`Tenant required for organization panel: ${panelId}`);
    const tenant = decodeSegment(options.tenant);
    if (!tenant) throw new Error("Invalid tenant identifier");
    parts.push(tenant);
  } else if (options.tenant !== undefined) {
    throw new Error(`Tenant not allowed for panel: ${panelId}`);
  }
  for (const segment of options.segments ?? []) {
    const decoded = decodeSegment(segment);
    if (!decoded) throw new Error(`Invalid path segment: ${segment}`);
    parts.push(decoded);
  }
  return `/${parts.map(encodeURIComponent).join("/")}`;
}

/** Organization panel URL for an organization, or undefined when no organization panel is registered. */
export function organizationPanelPath(org: { id: string; slug: string }, panels: readonly PanelConfig[] = registry): string | undefined {
  const panel = panels.find(({ context }) => context === "organization");
  return panel && buildPanelPath(panel.id, { tenant: panel.tenantIdentifier === "uuid" ? org.id : org.slug }, panels);
}
