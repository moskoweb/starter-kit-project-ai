"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import type { UploadUrlResult, DownloadUrlResult } from "@vibe/storage";

const listResponse = z.object({ items: z.array(z.object({ id: z.string().uuid(), projectId: z.string().uuid(), contentType: z.string(), size: z.number().int(), status: z.enum(["pending", "ready"]), createdAt: z.string().datetime() })) });
const initiateResponse = z.object({ id: z.string().uuid(), url: z.string().url(), method: z.literal("POST"), fields: z.record(z.string(), z.string()), object: z.object({ key: z.string(), bucket: z.string(), namespace: z.enum(["org", "user"]), namespaceId: z.string(), contentType: z.string(), size: z.number().int() }), expiresAt: z.string().datetime() }) satisfies z.ZodType<UploadUrlResult & { id: string }>;
const completeResponse = z.object({ id: z.string().uuid(), status: z.literal("ready") });
const downloadResponse = z.object({ url: z.string().url(), expiresAt: z.string().datetime() }) satisfies z.ZodType<DownloadUrlResult>;
type Attachment = z.infer<typeof listResponse>["items"][number];
const text = {
  "pt-BR": { title: "Anexos", add: "Adicionar arquivo", uploading: "Upload em andamento…", download: "Baixar arquivo", pending: "Upload pendente", loadError: "Não foi possível carregar anexos.", initiateError: "Falha ao iniciar upload.", sendError: "Upload S3 falhou.", completeError: "Não foi possível confirmar upload.", confirmationError: "Resposta de confirmação inválida.", uploadError: "Falha no upload.", downloadError: "Falha ao baixar." },
  en: { title: "Attachments", add: "Add file", uploading: "Uploading…", download: "Download file", pending: "Upload pending", loadError: "Could not load attachments.", initiateError: "Could not start upload.", sendError: "S3 upload failed.", completeError: "Could not confirm upload.", confirmationError: "Invalid confirmation response.", uploadError: "Upload failed.", downloadError: "Download failed." },
} as const;
export function Attachments({ projectId, tenantIdentifier, locale = "pt-BR" }: { projectId: string; tenantIdentifier: string | null; locale?: "pt-BR" | "en" }) {
  const [items, setItems] = useState<Attachment[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const t = text[locale];
  const scopeQuery = tenantIdentifier === null ? "" : `&tenantIdentifier=${encodeURIComponent(tenantIdentifier)}`;
  const query = `projectId=${encodeURIComponent(projectId)}${scopeQuery}`;
  async function refresh(signal?: AbortSignal) { const response = await fetch(`/api/storage?${query}`, { signal, cache: "no-store" }); if (!response.ok) throw new Error(t.loadError); const data = listResponse.parse(await response.json()); if (!signal?.aborted) setItems(data.items); }
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal).catch(() => { if (!controller.signal.aborted) setError(t.loadError); }); return () => controller.abort(); }, [projectId, tenantIdentifier, locale]);
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantIdentifier, projectId, contentType: file.type, size: file.size }) });
      const raw: unknown = await response.json(); if (!response.ok) throw new Error(t.initiateError); const data = initiateResponse.parse(raw);
      const form = new FormData(); for (const [key, value] of Object.entries(data.fields)) form.append(key, value); form.append("file", file);
      const sent = await fetch(data.url, { method: data.method, body: form }); if (!sent.ok) throw new Error(t.sendError);
      const completed = await fetch(`/api/storage/${encodeURIComponent(data.id)}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantIdentifier }) });
      if (!completed.ok) throw new Error(t.completeError); const confirmation = completeResponse.parse(await completed.json()); if (confirmation.id !== data.id) throw new Error(t.confirmationError); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.uploadError); await refresh().catch(() => undefined); } finally { setBusy(false); }
  }
  async function download(id: string) { try { const response = await fetch(`/api/storage/${encodeURIComponent(id)}/download${tenantIdentifier === null ? "" : `?tenantIdentifier=${encodeURIComponent(tenantIdentifier)}`}`, { cache: "no-store" }); if (!response.ok) throw new Error(t.downloadError); const data = downloadResponse.parse(await response.json()); window.location.assign(data.url); } catch { setError(t.downloadError); } }
  return <section aria-label={t.title} className="space-y-3"><h2 className="font-semibold">{t.title}</h2><label className="block">{t.add}<input type="file" disabled={busy} onChange={event => void upload(event.currentTarget.files?.[0])} /></label>{busy && <p role="status">{t.uploading}</p>}{error && <p role="alert">{error}</p>}<ul className="space-y-2">{items.map(item => <li key={item.id} className="flex gap-3">{item.status === "ready" ? <button type="button" onClick={() => void download(item.id)}>{t.download}</button> : <span role="status">{t.pending}</span>}<span>{item.contentType} · {item.size} bytes</span></li>)}</ul></section>;
}
