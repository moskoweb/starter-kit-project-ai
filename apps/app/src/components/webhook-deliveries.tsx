"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Delivery = { id: string; event: string; status: string; attempts: number; nextAt: string; createdAt: string; lastStatusCode: string | null };
type Data = { items: Delivery[] };
const text = {
  "pt-BR": { title: "Entregas de webhook", empty: "Nenhuma entrega.", error: "Não foi possível carregar entregas.", refresh: "Atualizar", retry: "Tentar novamente", confirm: "Reenvio pode gerar entrega duplicada. Deseja continuar?", retryError: "Não foi possível reenviar entrega.", status: "Status", attempts: "Tentativas", next: "Próxima tentativa", created: "Criada", code: "Último código HTTP", loading: "Carregando…", event: "Evento" },
  en: { title: "Webhook deliveries", empty: "No deliveries.", error: "Could not load deliveries.", refresh: "Refresh", retry: "Retry", confirm: "Retry may create a duplicate delivery. Continue?", retryError: "Could not retry delivery.", status: "Status", attempts: "Attempts", next: "Next attempt", created: "Created", code: "Last HTTP status", loading: "Loading…", event: "Event" },
} as const;
export function WebhookDeliveries({ tenantIdentifier, locale }: { tenantIdentifier: string | null; locale: Locale }) {
  const [items, setItems] = useState<Delivery[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const t = text[locale];
  const query = new URLSearchParams(); if (tenantIdentifier !== null) query.set("tenantIdentifier", tenantIdentifier);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch(`/api/webhooks/deliveries?${query}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      setItems((await response.json() as Data).items);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(t.error); }
  }, [tenantIdentifier, t.error]);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  async function retry(id: string) {
    if (!window.confirm(t.confirm)) return;
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/webhooks/deliveries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, tenantIdentifier }) });
      if (!response.ok) throw new Error("RETRY_FAILED");
      await refresh();
    } catch { setError(t.retryError); } finally { setBusy(null); }
  }
  return <section aria-labelledby="webhook-deliveries-title" className="space-y-3">
    <header className="flex items-center justify-between"><h2 id="webhook-deliveries-title" className="text-xl font-semibold">{t.title}</h2><button type="button" disabled={busy !== null} onClick={() => void refresh()} className="underline">{t.refresh}</button></header>
    {error && <p role="alert">{error}</p>}
    {!items && !error && <p aria-live="polite">{t.loading}</p>}
    {items?.length === 0 && <p>{t.empty}</p>}
    {items && items.length > 0 && <ul className="space-y-2">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded border p-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1"><dt>{t.event}</dt><dd>{item.event}</dd><dt>{t.status}</dt><dd>{item.status}</dd><dt>{t.attempts}</dt><dd>{item.attempts}</dd><dt>{t.next}</dt><dd><time dateTime={item.nextAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.nextAt))}</time></dd><dt>{t.created}</dt><dd><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></dd>{item.lastStatusCode !== null && <><dt>{t.code}</dt><dd>{item.lastStatusCode}</dd></>}</dl>
      {item.status === "failed" && <button type="button" disabled={busy !== null} onClick={() => void retry(item.id)} className="underline">{t.retry}</button>}
    </li>)}</ul>}
  </section>;
}
