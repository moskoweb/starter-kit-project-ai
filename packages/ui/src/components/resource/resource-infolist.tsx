import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { FormattedValue } from "./value";
import type { ResourceInfolistProps } from "./types";

/** Read-only record view grouped in sections, like Filament infolists. */
export function ResourceInfolist({ sections, record, labels, locale }: ResourceInfolistProps) {
  return <div className="flex flex-col gap-6">
    {sections.map((section, index) => <Card key={index}>
      {(section.title || section.description) && <CardHeader>{section.title && <CardTitle>{section.title}</CardTitle>}{section.description && <CardDescription>{section.description}</CardDescription>}</CardHeader>}
      <CardContent>
        <dl className={cn("grid gap-x-6 gap-y-5", section.columns === 2 && "md:grid-cols-2", section.columns === 3 && "md:grid-cols-3")}>
          {section.entries.map(entry => <div key={entry.key} className={cn("flex flex-col gap-1", entry.fullWidth && "md:col-span-full")}>
            <dt className="text-sm font-medium text-muted-foreground">{entry.label}</dt>
            <dd className="text-sm break-words whitespace-pre-wrap"><FormattedValue value={record[entry.key] ?? null} type={entry.type} badges={entry.badges} locale={locale} labels={labels} /></dd>
          </div>)}
        </dl>
      </CardContent>
    </Card>)}
  </div>;
}
