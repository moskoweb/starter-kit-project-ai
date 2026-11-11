"use client";
import { useId, type ComponentProps } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
/** ChartContainer adapted from shadcn/ui chart (MIT); see docs/UI.md. */
export function ChartContainer({ children }: { children: ComponentProps<typeof ResponsiveContainer>["children"] }) { return <div className="h-64 w-full min-w-0 text-xs"><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 256 }}>{children}</ResponsiveContainer></div>; }
export interface ChartWidgetProps { title: string; description: string; data: { label: string; value: number }[]; seriesLabel: string; emptyMessage: string; }
export function ChartWidget({ title, description, data, seriesLabel, emptyMessage }: ChartWidgetProps) {
  const id = useId();
  return <section aria-labelledby={id} className="min-w-0 rounded-lg border border-border bg-card p-5"><h2 id={id} className="font-semibold">{title}</h2><p className="mb-4 text-sm text-muted-foreground">{description}</p>{data.length ? <><ChartContainer><BarChart data={data} accessibilityLayer><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)" }} /><YAxis tick={{ fill: "var(--muted-foreground)" }} /><Tooltip contentStyle={{ background: "var(--background)", color: "var(--foreground)", borderColor: "var(--border)" }} /><Bar dataKey="value" name={seriesLabel} fill="var(--chart-1)" isAnimationActive={false} /></BarChart></ChartContainer><details className="mt-2 text-sm"><summary>{seriesLabel}</summary><table className="w-full"><caption className="sr-only">{title}</caption><tbody>{data.map((item, index) => <tr key={index}><th scope="row" className="text-left font-normal">{item.label}</th><td className="text-right tabular-nums">{item.value}</td></tr>)}</tbody></table></details></> : <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>}</section>;
}
