"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DataTable } from "@vibe/ui";
import { Button } from "@vibe/ui/components/button";
import { Checkbox } from "@vibe/ui/components/checkbox";
import { Input } from "@vibe/ui/components/input";
import type { ColumnDef, PaginationState, SortingState, Updater } from "@tanstack/react-table";
export type ResourceKind = "projects" | "tasks";
export type ResourceRow = { id: string; name?: string; title?: string; description?: string | null; status?: string; projectId?: string; createdAt?: string | Date };
export type ResourceResult = { ok: boolean; error?: string; id?: string };
export type ResourcePermissions = { create: boolean; update: boolean; delete: boolean; bulkDelete: boolean };
export type ResourceListProps = { kind: ResourceKind; rows: ResourceRow[]; rowCount: number; page: number; sort: string; basePath: string; tenantIdentifier: string | null; permissions: ResourcePermissions; locale?: "pt-BR" | "en"; onDelete?: (id: string) => Promise<ResourceResult>; onBulkDelete?: (ids: string[]) => Promise<ResourceResult> };
export function ResourceList({ kind, rows, rowCount, page, sort, basePath, tenantIdentifier, permissions, locale = "pt-BR", onDelete, onBulkDelete }: ResourceListProps) {
  const en = locale === "en";
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  useEffect(() => { setSelected([]); }, [page, sort, tenantIdentifier, basePath, search]);
  function updateQuery(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
    router.push(`${pathname}?${next}`);
  }
  async function remove(ids: string[], action?: (ids: string[]) => Promise<ResourceResult>) {
    if (!action || !window.confirm(en ? `Delete ${ids.length} item(s)?` : `Excluir ${ids.length} item(ns)?`)) return;
    setPending(true); setError("");
    try { const result = await action(ids); if (!result.ok) throw new Error(); setSelected([]); router.refresh(); }
    catch { setError(en ? "Could not delete." : "Não foi possível excluir."); }
    finally { setPending(false); }
  }
  const columns = useMemo<ColumnDef<ResourceRow, unknown>[]>(() => [
    { id: "select", enableSorting: false, header: () => <Checkbox aria-label={en ? "Select page" : "Selecionar página"} checked={rows.length > 0 && rows.every(row => selected.includes(row.id))} onCheckedChange={checked => setSelected(checked === true ? rows.map(row => row.id) : [])} />, cell: ({ row }) => <Checkbox aria-label={`${en ? "Select" : "Selecionar"} ${row.original.name ?? row.original.title}`} checked={selected.includes(row.id)} onCheckedChange={checked => setSelected(old => checked === true ? [...new Set([...old, row.id])] : old.filter(id => id !== row.id))} /> },
    { accessorKey: kind === "projects" ? "name" : "title", header: kind === "projects" ? en ? "Name" : "Nome" : en ? "Title" : "Título" },
    { id: "open", header: "", enableSorting: false, cell: ({ row }) => <span className="flex justify-end gap-2"><Button asChild variant="ghost" size="sm"><Link href={`${basePath}/${encodeURIComponent(row.id)}`}>{en ? "Open" : "Abrir"}</Link></Button>{permissions.delete && onDelete && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void remove([row.id], ids => onDelete(ids[0]))}>{en ? "Delete" : "Excluir"}</Button>}</span> },
  ], [rows, selected, kind, en, basePath, permissions.delete, onDelete, pending]);
  const sorting: SortingState = [{ id: sort, desc: (params.get("direction") ?? "desc") === "desc" }];
  const pagination: PaginationState = { pageIndex: Math.max(0, page - 1), pageSize: 20 };
  function paginationChange(update: Updater<PaginationState>) { const next = typeof update === "function" ? update(pagination) : update; updateQuery({ page: String(next.pageIndex + 1) }); }
  function sortingChange(update: Updater<SortingState>) { const next = typeof update === "function" ? update(sorting) : update; updateQuery({ sort: next[0]?.id ?? "createdAt", direction: next[0]?.desc === false ? "asc" : "desc", page: "1" }); }
  return <section className="flex flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-2"><form role="search" onSubmit={event => { event.preventDefault(); updateQuery({ search, page: "1" }); }} className="flex w-full max-w-sm gap-2"><Input type="search" aria-label={en ? "Search" : "Buscar"} value={search} onChange={event => setSearch(event.target.value)} /><Button type="submit" variant="outline">{en ? "Search" : "Buscar"}</Button></form><div className="flex gap-2">{permissions.bulkDelete && onBulkDelete && <Button type="button" variant="destructive" disabled={pending || !selected.length} onClick={() => void remove(selected, onBulkDelete)}>{en ? "Delete selected" : "Excluir selecionados"} ({selected.length})</Button>}{permissions.create && <Button asChild><Link href={`${basePath}/new`}>{en ? "Create" : "Criar"}</Link></Button>}</div></div><DataTable data={rows} columns={columns} getRowId={row => row.id} rowCount={rowCount} pagination={pagination} sorting={sorting} onPaginationChange={paginationChange} onSortingChange={sortingChange} caption={kind} emptyMessage={en ? "No results." : "Nenhum resultado."} previousLabel={en ? "Previous" : "Anterior"} nextLabel={en ? "Next" : "Próxima"} pageLabel={(current, total) => en ? `Page ${current} of ${total}` : `Página ${current} de ${total}`} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}
