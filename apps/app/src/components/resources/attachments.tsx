"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import type { UploadUrlResult, DownloadUrlResult } from "@vibe/storage";

const listResponse = z.object({ items: z.array(z.object({ id: z.string().uuid(), projectId: z.string().uuid(), contentType: z.string(), size: z.number().int(), status: z.enum(["pending", "ready"]), createdAt: z.string().datetime() })) });
const initiateResponse = z.object({ id: z.string().uuid(), url: z.string().url(), method: z.literal("POST"), fields: z.record(z.string(), z.string()), object: z.object({ key: z.string(), bucket: z.string(), namespace: z.enum(["org", "user"]), namespaceId: z.string(), contentType: z.string(), size: z.number().int() }), expiresAt: z.string().datetime() }) satisfies z.ZodType<UploadUrlResult & { id: string }>;
const completeResponse = z.object({ id: z.string().uuid(), status: z.literal("ready") });
const downloadResponse = z.object({ url: z.string().url(), expiresAt: z.string().datetime() }) satisfies z.ZodType<DownloadUrlResult>;
type Attachment = z.infer<typeof listResponse>["items"][number];
export function Attachments({ projectId, tenantIdentifier }: { projectId: string; tenantIdentifier: string | null }) {
  const [items, setItems] = useState<Attachment[]>([]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const scopeQuery = tenantIdentifier === null ? "" : `&tenantIdentifier=${encodeURIComponent(tenantIdentifier)}`;
  const query = `projectId=${encodeURIComponent(projectId)}${scopeQuery}`;
  async function refresh() { const response = await fetch(`/api/storage?${query}`, { cache: "no-store" }); if (!response.ok) throw new Error("Não foi possível carregar anexos."); setItems(listResponse.parse(await response.json()).items); }
  useEffect(() => { void refresh().catch(() => setError("Não foi possível carregar anexos.")); }, [projectId, tenantIdentifier]);
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/storage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantIdentifier, projectId, contentType: file.type, size: file.size }) });
      const raw: unknown = await response.json(); if (!response.ok) throw new Error("Falha ao iniciar upload."); const data = initiateResponse.parse(raw);
      const form = new FormData(); for (const [key, value] of Object.entries(data.fields)) form.append(key, value); form.append("file", file);
      const sent = await fetch(data.url, { method: data.method, body: form }); if (!sent.ok) throw new Error("Upload S3 falhou.");
      const completed = await fetch(`/api/storage/${encodeURIComponent(data.id)}/complete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantIdentifier }) });
      if (!completed.ok) throw new Error("Não foi possível confirmar upload."); const confirmation = completeResponse.parse(await completed.json()); if (confirmation.id !== data.id) throw new Error("Resposta de confirmação inválida."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha no upload."); await refresh().catch(() => undefined); } finally { setBusy(false); }
  }
  async function download(id: string) { try { const response = await fetch(`/api/storage/${encodeURIComponent(id)}/download${tenantIdentifier === null ? "" : `?tenantIdentifier=${encodeURIComponent(tenantIdentifier)}`}`, { cache: "no-store" }); if (!response.ok) throw new Error("Falha ao baixar."); const data = downloadResponse.parse(await response.json()); window.location.assign(data.url); } catch { setError("Falha ao baixar."); } }
  return <section aria-label="Anexos" className="space-y-3"><h2 className="font-semibold">Anexos</h2><label className="block">Adicionar arquivo<input type="file" disabled={busy} onChange={event => void upload(event.currentTarget.files?.[0])} /></label>{busy && <p role="status">Upload em andamento…</p>}{error && <p role="alert">{error}</p>}<ul className="space-y-2">{items.map(item => <li key={item.id} className="flex gap-3">{item.status === "ready" ? <button type="button" onClick={() => void download(item.id)}>Baixar arquivo</button> : <span role="status">Upload pendente</span>}<span>{item.contentType} · {item.size} bytes</span></li>)}</ul></section>;
}
