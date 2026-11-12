import type { ReactNode } from "react";
import type { PanelConfig } from "./registry";
import type { Locale } from "../i18n";
import type { ResourceDefinition } from "../resources/define";
import { projectResource } from "../resources/definitions/projects";
import { taskResource } from "../resources/definitions/tasks";

export type ResourceContext = {
  panel: PanelConfig;
  identifier: string | null;
  basePath: string;
  route: string[];
  query: Record<string, string | string[] | undefined>;
  role: string;
  locale: Locale;
};

/** Declarative resources (preferred) or custom-rendered pages registered by the CLI. */
export type PanelResource = { panelIds: readonly string[] } & (
  | { kind: "resource"; definition: ResourceDefinition }
  | { kind: "custom"; id: string; label: string; render: (context: ResourceContext) => Promise<ReactNode> }
);

// CLI inserts explicit domain imports and registrations; no runtime directory discovery.
// CLI_RESOURCE_IMPORTS
export const resourceRegistry: readonly PanelResource[] = [
  { kind: "resource", definition: projectResource, panelIds: ["personal", "organization"] },
  { kind: "resource", definition: taskResource, panelIds: ["personal", "organization"] },
  // CLI_RESOURCE_ENTRIES
];

export const resourceId = (resource: PanelResource) => resource.kind === "resource" ? resource.definition.slug : resource.id;
export function resourcesForPanel(panelId: string) { return resourceRegistry.filter(resource => resource.panelIds.includes(panelId)); }
export function getPanelResource(panelId: string, id: string | undefined) { return resourcesForPanel(panelId).find(resource => resourceId(resource) === id); }
