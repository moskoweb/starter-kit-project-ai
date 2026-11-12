"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Infolist, InfolistEntry } from "@vibe/ui";
import { Button } from "@vibe/ui/components/button";
import type { ResourceKind, ResourcePermissions, ResourceResult, ResourceRow } from "./list";
export function ResourceDetail({ kind, row, basePath, permissions, onDelete, locale = "pt-BR" }: { kind: ResourceKind; row: ResourceRow; basePath: string; permissions: ResourcePermissions; onDelete?: (id: string) => Promise<ResourceResult>; locale?: "pt-BR" | "en" }) {
  const en = locale === "en";
  const router = useRouter(); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function remove() {
    if (!onDelete || !window.confirm(en ? "Delete this item?" : "Excluir este item?")) return;
    setPending(true); setError("");
    try { const result = await onDelete(row.id); if (!result.ok) throw new Error(); router.push(basePath); }
    catch { setError(en ? "Could not delete." : "Não foi possível excluir."); }
    finally { setPending(false); }
  }
  return <section className="flex flex-col gap-4"><Infolist><InfolistEntry label={kind === "projects" ? en ? "Name" : "Nome" : en ? "Title" : "Título"}>{row.name ?? row.title ?? "—"}</InfolistEntry>{row.description != null && <InfolistEntry label={en ? "Description" : "Descrição"}>{row.description || "—"}</InfolistEntry>}{row.projectId && <InfolistEntry label={en ? "Project" : "Projeto"}>{row.projectId}</InfolistEntry>}{row.createdAt && <InfolistEntry label={en ? "Created" : "Criado em"}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(row.createdAt))}</InfolistEntry>}</Infolist><div className="flex gap-3">{permissions.update && <Button asChild><Link href={`${basePath}/${encodeURIComponent(row.id)}/edit`}>{en ? "Edit" : "Editar"}</Link></Button>}{permissions.delete && onDelete && <Button type="button" variant="destructive" disabled={pending} onClick={() => void remove()}>{en ? "Delete" : "Excluir"}</Button>}<Button asChild variant="outline"><Link href={basePath}>{en ? "Back" : "Voltar"}</Link></Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}
