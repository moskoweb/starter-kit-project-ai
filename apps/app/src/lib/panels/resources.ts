import type { ReactNode } from "react";
import type { PanelConfig } from "./registry";
import type { Locale } from "../i18n";

export type ResourceContext = {
  panel: PanelConfig;
  identifier: string | null;
  basePath: string;
  route: string[];
  query: Record<string, string | string[] | undefined>;
  role: string;
  locale: Locale;
};
export type PanelResource = {
  id: string;
  label: string;
  panelIds: readonly string[];
} & ({ kind: "builtin" } | { kind: "custom"; render: (context: ResourceContext) => Promise<ReactNode> });

// CLI inserts explicit domain imports and registrations; no runtime directory discovery.
// CLI_RESOURCE_IMPORTS
export const resourceRegistry: readonly PanelResource[] = [
  { id: "projects", label: "Projects", panelIds: ["personal", "organization"], kind: "builtin" },
  { id: "tasks", label: "Tasks", panelIds: ["personal", "organization"], kind: "builtin" },
  // CLI_RESOURCE_ENTRIES
];
export function resourcesForPanel(panelId: string) { return resourceRegistry.filter(resource => resource.panelIds.includes(panelId)); }
export function getPanelResource(panelId: string, id: string | undefined) { return resourcesForPanel(panelId).find(resource => resource.id === id); }
