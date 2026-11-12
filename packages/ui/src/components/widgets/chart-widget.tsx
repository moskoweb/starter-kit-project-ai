"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@vibe/ui/components/chart";
import { Empty, EmptyDescription, EmptyHeader } from "@vibe/ui/components/empty";

export interface ChartWidgetProps { title: string; description: string; data: { label: string; value: number }[]; seriesLabel: string; emptyMessage: string }

/** Bar chart widget on shadcn Chart; accessible table alternative included. */
export function ChartWidget({ title, description, data, seriesLabel, emptyMessage }: ChartWidgetProps) {
  const id = useId();
  const config = { value: { label: seriesLabel, color: "var(--chart-1)" } } satisfies ChartConfig;
  return <Card role="region" aria-labelledby={id} className="min-w-0">
    <CardHeader><CardTitle id={id}>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
    <CardContent>
      {data.length ? <>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <BarChart data={data} accessibilityLayer margin={{ left: -20 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={6} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">{seriesLabel}</summary>
          <table className="mt-2 w-full"><tbody>{data.map(point => <tr key={point.label} className="border-b"><th scope="row" className="py-1 text-left font-normal">{point.label}</th><td className="py-1 text-right tabular-nums">{point.value}</td></tr>)}</tbody></table>
        </details>
      </> : <Empty className="py-10"><EmptyHeader><EmptyDescription>{emptyMessage}</EmptyDescription></EmptyHeader></Empty>}
    </CardContent>
  </Card>;
}
