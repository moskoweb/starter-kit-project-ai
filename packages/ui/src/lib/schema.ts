/**
 * Serializable, presentation-only schemas shared by server definitions and client renderers.
 * `L` is the label type: apps may use localized objects and resolve them to `string` before rendering.
 */
export type ValueType = "text" | "badge" | "boolean" | "number" | "date" | "datetime";
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
export type Option<L = string> = { value: string; label: L };

export type TableColumn<L = string> = {
  key: string;
  label: L;
  type?: ValueType;
  /** Link cell to the record view page. */
  primary?: boolean;
  sortable?: boolean;
  /** Can be hidden by the user through the column toggle menu. */
  toggleable?: boolean;
  /** Hidden until the user enables it (requires toggleable). */
  hidden?: boolean;
  align?: "start" | "end";
  /** Badge columns map raw values to label and variant. */
  badges?: Record<string, { label: L; variant: BadgeVariant }>;
};

export type TableFilter<L = string> =
  | { key: string; label: L; type: "select"; options: Option<L>[] }
  | { key: string; label: L; type: "boolean"; trueLabel: L; falseLabel: L };

export type FieldType = "text" | "email" | "url" | "textarea" | "number" | "boolean" | "select" | "date";
export type FormField<L = string> = {
  name: string;
  label: L;
  type: FieldType;
  required?: boolean;
  placeholder?: L;
  description?: L;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: Option<L>[];
  /** Rendered read-only and omitted from submitted values when editing. */
  disabledOnEdit?: boolean;
  /** Occupies the whole row in multi-column sections. */
  fullWidth?: boolean;
};
export type FormSection<L = string> = { title?: L; description?: L; columns?: 1 | 2; fields: FormField<L>[] };

export type InfolistEntry<L = string> = { key: string; label: L; type?: ValueType; badges?: TableColumn<L>["badges"]; fullWidth?: boolean };
export type InfolistSection<L = string> = { title?: L; description?: L; columns?: 1 | 2 | 3; entries: InfolistEntry<L>[] };

export type ResourceRecord = { id: string } & Record<string, string | number | boolean | null>;
export type ListState = { page: number; pageSize: number; search: string; sort: string | null; direction: "asc" | "desc"; filters: Record<string, string> };
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };
export const pageSizeOptions = [10, 25, 50, 100] as const;
