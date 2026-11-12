"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@vibe/ui/components/button";
import { Bell, BellOff, Check, CheckCheck } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@vibe/ui/components/sheet";
import { Skeleton } from "@vibe/ui/components/skeleton";
import type { Locale } from "@/lib/i18n";

type Item = { id: string; payload: { type: "project.created"; projectId: string }; createdAt: string; readAt: string | null };
type Data = { items: Item[]; unreadCount: number; page: number; pageSize: number };
const text = {
  "pt-BR": { title: "Notificações", empty: "Nenhuma notificação.", error: "Não foi possível carregar notificações.", read: "Marcar como lida", all: "Marcar todas como lidas", project: "Novo projeto criado", loading: "Carregando…", unread: "não lidas", previous: "Anterior", next: "Próxima", page: "Página" },
  en: { title: "Notifications", empty: "No notifications.", error: "Could not load notifications.", read: "Mark as read", all: "Mark all as read", project: "New project created", loading: "Loading…", unread: "unread", previous: "Previous", next: "Next", page: "Page" },
} as const;
export function Notifications({ tenantIdentifier, locale }: { tenantIdentifier: string | null; locale: Locale }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(true);
  const [page, setPage] = useState(1);
  const t = text[locale];
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setError(false); setPending(true);
    const query = new URLSearchParams({ page: String(page) }); if (tenantIdentifier) query.set("tenantIdentifier", tenantIdentifier);
    try {
      const response = await fetch(`/api/notifications?${query}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      const result = await response.json() as Data;
      if (!signal?.aborted) setData(result);
    } catch { if (!signal?.aborted) setError(true); } finally { if (!signal?.aborted) setPending(false); }
  }, [tenantIdentifier, page]);
  useEffect(() => { const controller = new AbortController(); setData(null); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  function changePage(nextPage: number) { setData(null); setPending(true); setPage(nextPage); }
  async function mark(id?: string) {
    setPending(true); setError(false);
    try {
      const response = await fetch(id ? `/api/notifications/${encodeURIComponent(id)}/read` : "/api/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(tenantIdentifier ? { tenantIdentifier } : {}), ...(id ? { id } : { markAll: true }) }),
      });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      await refresh();
    } catch { setError(true); } finally { setPending(false); }
  }
  return <Sheet onOpenChange={value => { if (value) void refresh(); }}>
    <SheetTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`${t.title} (${data?.unreadCount ?? 0} ${t.unread})`} />}>
      <Bell />
      {Boolean(data?.unreadCount) && <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">{data!.unreadCount > 99 ? "99+" : data!.unreadCount}</span>}
    </SheetTrigger>
    <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
      <SheetHeader className="border-b">
        <SheetTitle>{t.title}</SheetTitle>
        <SheetDescription>{data?.unreadCount ?? 0} {t.unread}</SheetDescription>
        {Boolean(data?.unreadCount) && <Button type="button" variant="link" size="sm" className="self-start px-0" disabled={pending} onClick={() => void mark()}><CheckCheck data-icon="inline-start" />{t.all}</Button>}
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {error && <p role="alert" className="text-sm text-destructive">{t.error}</p>}
        {!data && !error && <div aria-live="polite" className="flex flex-col gap-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>}
        {data?.items.length === 0 && <Empty className="py-10"><EmptyHeader><EmptyMedia variant="icon"><BellOff /></EmptyMedia><EmptyTitle>{t.empty}</EmptyTitle></EmptyHeader></Empty>}
        {data?.items.map(item => <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
          <span aria-hidden className={item.readAt ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent" : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5"><p className={item.readAt ? "text-sm" : "text-sm font-medium"}>{t.project}</p><time dateTime={item.createdAt} className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></div>
          {!item.readAt && <Button type="button" variant="ghost" size="icon-sm" aria-label={t.read} disabled={pending} onClick={() => void mark(item.id)}><Check /></Button>}
        </div>)}
      </div>
      <SheetFooter className="flex-row items-center justify-between border-t">
        <Button type="button" variant="outline" size="sm" disabled={pending || page === 1} onClick={() => changePage(page - 1)}>{t.previous}</Button>
        <span aria-live="polite" className="text-sm text-muted-foreground">{t.page} {page}</span>
        <Button type="button" variant="outline" size="sm" disabled={pending || !data || data.items.length !== data.pageSize} onClick={() => changePage(page + 1)}>{t.next}</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>;
}
