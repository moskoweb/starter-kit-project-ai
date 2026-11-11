"use client";

import { useCallback, useEffect, useState } from "react";
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
  return <section aria-labelledby="notifications-title" className="space-y-3">
    <header className="flex items-center justify-between"><h2 id="notifications-title" className="text-xl font-semibold">{t.title} <span aria-label={`${data?.unreadCount ?? 0} ${t.unread}`}>({data?.unreadCount ?? 0})</span></h2>{Boolean(data?.unreadCount) && <button type="button" disabled={pending} onClick={() => void mark()} className="underline">{t.all}</button>}</header>
    {error && <p role="alert">{t.error}</p>}
    {!data && !error && <p aria-live="polite">{t.loading}</p>}
    {data?.items.length === 0 && <p>{t.empty}</p>}
    {data?.items.length ? <ul className="space-y-2">{data.items.map(item => <li key={item.id} className="flex items-start justify-between gap-4 rounded border p-3">
      <div><p className={item.readAt ? "" : "font-semibold"}>{t.project}</p><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></div>
      {!item.readAt && <button type="button" disabled={pending} onClick={() => void mark(item.id)} className="underline">{t.read}</button>}
    </li>)}</ul> : null}
    <nav aria-label={t.title} className="flex items-center gap-3">
      <button type="button" disabled={pending || page === 1} onClick={() => changePage(page - 1)}>{t.previous}</button>
      <span aria-live="polite">{t.page} {page}</span>
      <button type="button" disabled={pending || !data || data.items.length !== data.pageSize} onClick={() => changePage(page + 1)}>{t.next}</button>
    </nav>
  </section>;
}
