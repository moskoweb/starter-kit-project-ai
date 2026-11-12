import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@vibe/ui/components/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";

export type Stat = { label: string; value: string; description?: string; trend?: { value: string; direction: "up" | "down" }; icon?: ReactNode };

/** Dashboard stat cards (Filament StatsOverviewWidget). Values arrive formatted. */
export function StatsOverview({ stats }: { stats: Stat[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(stat => <Card key={stat.label} className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">{stat.icon}{stat.label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stat.value}</CardTitle>
        {stat.trend && <CardAction><Badge variant="outline">{stat.trend.direction === "up" ? <TrendingUp /> : <TrendingDown />}{stat.trend.value}</Badge></CardAction>}
      </CardHeader>
      {stat.description && <CardFooter className="text-sm text-muted-foreground">{stat.description}</CardFooter>}
    </Card>)}
  </div>;
}
