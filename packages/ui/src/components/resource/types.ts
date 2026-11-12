import type { ActionResult, FormSection, InfolistSection, ListState, ResourceRecord, TableColumn, TableFilter } from "../../lib/schema";

export type ResourceLabels = {
  search: string; filters: string; resetFilters: string; columns: string; all: string;
  rowsPerPage: string; page: (page: number, pages: number) => string; previous: string; next: string;
  selected: (count: number) => string; selectAll: string; selectRow: string;
  actions: string; view: string; edit: string; delete: string; deleteSelected: string; create: string;
  confirmDeleteTitle: string; confirmDeleteDescription: (count: number) => string; cancel: string; confirm: string;
  emptyTitle: string; emptyDescription: string; deleted: string; deleteFailed: string;
  save: string; saving: string; saved: string; saveFailed: string; yes: string; no: string; required: string; choose: string;
};

export type ResourcePermissions = { create: boolean; view: boolean; update: boolean; delete: boolean; bulkDelete: boolean };

export type ResourceTableProps = {
  columns: TableColumn[];
  filters?: TableFilter[];
  records: ResourceRecord[];
  total: number;
  state: ListState;
  /** Base path of the resource; record pages are `${basePath}/${id}` and `${basePath}/${id}/edit`. */
  basePath: string;
  /** Key in localStorage for column visibility; scope per resource/panel. */
  storageKey: string;
  permissions: ResourcePermissions;
  labels: ResourceLabels;
  locale: string;
  /** Server actions. Must re-check authorization. */
  onDelete?: (id: string) => Promise<ActionResult>;
  onBulkDelete?: (ids: string[]) => Promise<ActionResult>;
};

export type ResourceFormProps = {
  sections: FormSection[];
  /** Initial values; omit for create. */
  record?: ResourceRecord;
  /** Where to go after success: receives created/updated id. */
  redirectTo: (id: string | undefined) => string;
  cancelHref: string;
  labels: ResourceLabels;
  onSubmit: (values: Record<string, string | number | boolean | null>) => Promise<ActionResult>;
};

export type ResourceInfolistProps = { sections: InfolistSection[]; record: ResourceRecord; labels: Pick<ResourceLabels, "yes" | "no">; locale: string };
