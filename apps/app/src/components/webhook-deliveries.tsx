"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@vibe/ui/components/badge";
import { Button } from "@vibe/ui/components/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@vibe/ui/components/card";
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
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const query = new URLSearchParams(); if (tenantIdentifier !== null) query.set("tenantIdentifier", tenantIdentifier);
    try {
      const response = await fetch(`/api/webhooks/deliveries?${query}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      setItems((await response.json() as Data).items);
      setError("");
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(t.error); }
  }, [tenantIdentifier, t.error]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after an awaited fetch (external sync), not synchronously
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
  return <Card role="region" aria-labelledby="webhook-deliveries-title">
    <CardHeader>
      <CardTitle><h2 id="webhook-deliveries-title">{t.title}</h2></CardTitle>
      <CardAction><Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void refresh()}>{t.refresh}</Button></CardAction>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!items && !error && <p aria-live="polite" className="text-muted-foreground">{t.loading}</p>}
      {items?.length === 0 && <p className="text-muted-foreground">{t.empty}</p>}
      {items && items.length > 0 && <ul className="flex flex-col gap-2">{items.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm"><dt className="text-muted-foreground">{t.event}</dt><dd>{item.event}</dd><dt className="text-muted-foreground">{t.status}</dt><dd><Badge variant={item.status === "failed" ? "destructive" : "secondary"}>{item.status}</Badge></dd><dt className="text-muted-foreground">{t.attempts}</dt><dd>{item.attempts}</dd><dt className="text-muted-foreground">{t.next}</dt><dd><time dateTime={item.nextAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.nextAt))}</time></dd><dt className="text-muted-foreground">{t.created}</dt><dd><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></dd>{item.lastStatusCode !== null && <><dt className="text-muted-foreground">{t.code}</dt><dd>{item.lastStatusCode}</dd></>}</dl>
        {item.status === "failed" && <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void retry(item.id)}>{t.retry}</Button>}
      </li>)}</ul>}
    </CardContent>
  </Card>;
}
