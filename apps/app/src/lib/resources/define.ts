import type { NavIcon } from "../../components/panels/nav-icons";
import type { ActionResult, FormSection, InfolistSection, ListState, ResourceRecord, TableColumn, TableFilter } from "@vibe/ui/lib/schema";
import type { Locale } from "../i18n";

/** Text in every supported locale. */
export type Text = Record<Locale, string>;
export type Operation = "read" | "create" | "update" | "delete";

/** Request-scoped data the panel route passes to resource loaders/actions. */
export type ResourceScope = { identifier: string | null; role: string | null };

/**
 * Declarative resource, inspired by Filament Resource: one object defines navigation,
 * table, filters, form, infolist and server operations. Loaders/actions run on the server
 * and MUST enforce authorization + RLS themselves; UI permissions only hide controls.
 */
export type ResourceDefinition = {
  slug: string;
  label: Text;
  pluralLabel: Text;
  description?: Text;
  /** Icon key from `components/panels/nav-icons.ts`; add new icons there. */
  icon: NavIcon;
  navigationGroup?: Text;
  /** Field used as record title in breadcrumbs and headings. */
  titleKey: string;
  can: (role: string | null, operation: Operation) => boolean;
  table: { columns: TableColumn<Text>[]; filters?: (scope: ResourceScope) => Promise<TableFilter<Text>[]>; defaultSort: { key: string; direction: "asc" | "desc" }; sortable: string[] };
  form: (scope: ResourceScope) => Promise<FormSection<Text>[]>;
  infolist: (scope: ResourceScope) => Promise<InfolistSection<Text>[]>;
  list: (scope: ResourceScope, state: ListState) => Promise<{ records: ResourceRecord[]; total: number }>;
  get: (scope: ResourceScope, id: string) => Promise<ResourceRecord | null>;
  create: (scope: ResourceScope, values: unknown) => Promise<ActionResult>;
  update: (scope: ResourceScope, id: string, values: unknown) => Promise<ActionResult>;
  delete: (scope: ResourceScope, ids: string[]) => Promise<ActionResult>;
};

export function defineResource(resource: ResourceDefinition): ResourceDefinition { return resource; }

/** Resolve a localized value to plain text. */
export const t = (text: Text, locale: Locale) => text[locale];

/** Translate every `Text` leaf inside a schema object. */
export function localize<T>(value: T, locale: Locale): Localized<T> {
  if (Array.isArray(value)) return value.map(item => localize(item, locale)) as Localized<T>;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record["pt-BR"] === "string" && typeof record.en === "string" && Object.keys(record).length === 2) return record[locale] as Localized<T>;
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, localize(item, locale)])) as Localized<T>;
  }
  return value as Localized<T>;
}
export type Localized<T> = T extends Text ? string : T extends (infer U)[] ? Localized<U>[] : T extends object ? { [K in keyof T]: Localized<T[K]> } : T;
