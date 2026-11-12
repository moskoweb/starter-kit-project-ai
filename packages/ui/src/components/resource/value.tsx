import { Check, X } from "lucide-react";
import { Badge } from "@vibe/ui/components/badge";
import type { TableColumn, ValueType } from "../../lib/schema";

export function FormattedValue({ value, type = "text", badges, locale, labels }: { value: string | number | boolean | null; type?: ValueType; badges?: TableColumn["badges"]; locale: string; labels: { yes: string; no: string } }) {
  if (value === null || value === "") return <span className="text-muted-foreground">—</span>;
  if (type === "boolean") return value === true || value === "true" ? <Check aria-label={labels.yes} className="size-4 text-primary" /> : <X aria-label={labels.no} className="size-4 text-muted-foreground" />;
  if (type === "badge") { const badge = badges?.[String(value)]; return <Badge variant={badge?.variant ?? "secondary"}>{badge?.label ?? String(value)}</Badge>; }
  if (type === "number" && typeof value === "number") return <>{new Intl.NumberFormat(locale).format(value)}</>;
  if ((type === "date" || type === "datetime") && typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return <time dateTime={value}>{new Intl.DateTimeFormat(locale, type === "date" ? { dateStyle: "medium", timeZone: "UTC" } : { dateStyle: "medium", timeStyle: "short" }).format(date)}</time>;
  }
  return <>{String(value)}</>;
}
