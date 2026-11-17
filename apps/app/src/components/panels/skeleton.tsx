import { Skeleton } from "@vibe/ui/components/skeleton";
import type { Locale } from "../../lib/i18n";

/** Content-only placeholder. Shell stays available while server data streams. */
export function PanelSkeleton({ locale = "pt-BR" }: { locale?: Locale }) {
  return <div role="status" aria-busy="true" className="flex flex-col gap-6">
    <span className="sr-only">{locale === "en" ? "Loading content…" : "Carregando conteúdo…"}</span>
    <div aria-hidden="true" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-72 max-w-full motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(key => <Skeleton key={key} className="h-28 motion-reduce:animate-none" />)}
      </div>
      <Skeleton className="h-72 w-full motion-reduce:animate-none" />
    </div>
  </div>;
}
