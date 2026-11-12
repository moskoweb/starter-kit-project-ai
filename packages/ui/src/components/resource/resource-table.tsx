"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Eye, Filter, Inbox, MoreHorizontal, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@vibe/ui/components/badge";
import { Button, buttonVariants } from "@vibe/ui/components/button";
import { Checkbox } from "@vibe/ui/components/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@vibe/ui/components/input-group";
import { NativeSelect, NativeSelectOption } from "@vibe/ui/components/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@vibe/ui/components/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vibe/ui/components/table";
import { Field, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { pageSizeOptions, type TableColumn } from "../../lib/schema";
import { ConfirmAction } from "./confirm-action";
import { FormattedValue } from "./value";
import type { ResourceTableProps } from "./types";

/** Server-driven data table: URL holds list state, server loads one page. Inspired by Filament tables. */
export function ResourceTable({ columns, filters = [], records, total, state, basePath, storageKey, permissions, labels, locale, onDelete, onBulkDelete }: ResourceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [navigating, startNavigation] = useTransition();
  const [search, setSearch] = useState(state.search);
  const [selected, setSelected] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>(() => columns.filter(column => column.hidden).map(column => column.key));
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  const activeFilters = Object.keys(state.filters).filter(key => state.filters[key]).length;
  const selectable = permissions.bulkDelete && !!onBulkDelete;
  const visible = columns.filter(column => !hidden.includes(column.key));

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(`table:${storageKey}:hidden`) ?? "null"); if (Array.isArray(saved)) setHidden(saved.filter((key): key is string => typeof key === "string")); } catch { /* corrupt preference: keep defaults */ }
  }, [storageKey]);
  useEffect(() => { setSelected([]); }, [records]);
  useEffect(() => { setSearch(state.search); }, [state.search]);
  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => navigate({ search, page: "" }), 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
    const query = next.toString();
    startNavigation(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }
  function toggleColumn(key: string, show: boolean) {
    const next = show ? hidden.filter(value => value !== key) : [...hidden, key];
    setHidden(next);
    try { localStorage.setItem(`table:${storageKey}:hidden`, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }
  function sortBy(column: TableColumn) {
    const direction = state.sort === column.key && state.direction === "asc" ? "desc" : "asc";
    navigate({ sort: column.key, direction, page: "" });
  }
  async function remove(ids: string[], action: (value: string[]) => Promise<{ ok: boolean }>) {
    const result = await action(ids).catch(() => ({ ok: false }));
    if (!result.ok) { toast.error(labels.deleteFailed); throw new Error("DELETE_FAILED"); }
    toast.success(labels.deleted);
    setSelected([]);
    router.refresh();
  }
  const allSelected = records.length > 0 && records.every(record => selected.includes(record.id));
  const someSelected = selected.length > 0 && !allSelected;

  return <div className="flex flex-col gap-3" data-slot="resource-table">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {selectable && selected.length > 0 ? <div className="flex items-center gap-2" aria-live="polite">
        <span className="text-sm font-medium">{labels.selected(selected.length)}</span>
        <ConfirmAction title={labels.confirmDeleteTitle} description={labels.confirmDeleteDescription(selected.length)} confirmLabel={labels.confirm} cancelLabel={labels.cancel} destructive onConfirm={() => remove(selected, onBulkDelete!)}
          trigger={<Button variant="destructive" size="sm"><Trash2 data-icon="inline-start" />{labels.deleteSelected}</Button>} />
        <Button variant="ghost" size="sm" onClick={() => setSelected([])}><X data-icon="inline-start" />{labels.cancel}</Button>
      </div> : <InputGroup className="sm:max-w-xs">
        <InputGroupAddon><Search /></InputGroupAddon>
        <InputGroupInput type="search" aria-label={labels.search} placeholder={labels.search} value={search} onChange={event => setSearch(event.target.value)} />
      </InputGroup>}
      <div className="flex items-center gap-2 sm:ml-auto">
        {filters.length > 0 && <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}><Filter data-icon="inline-start" />{labels.filters}{activeFilters > 0 && <Badge variant="secondary">{activeFilters}</Badge>}</PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <FieldGroup>
              {filters.map(filter => <Field key={filter.key}>
                <FieldLabel htmlFor={`filter-${filter.key}`}>{filter.label}</FieldLabel>
                <NativeSelect id={`filter-${filter.key}`} className="w-full" value={state.filters[filter.key] ?? ""} onChange={event => navigate({ [filter.key]: event.target.value, page: "" })}>
                  <NativeSelectOption value="">{labels.all}</NativeSelectOption>
                  {filter.type === "select" ? filter.options.map(option => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>) : <><NativeSelectOption value="true">{filter.trueLabel}</NativeSelectOption><NativeSelectOption value="false">{filter.falseLabel}</NativeSelectOption></>}
                </NativeSelect>
              </Field>)}
              {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={() => navigate(Object.fromEntries([...filters.map(filter => [filter.key, ""]), ["page", ""]]))}>{labels.resetFilters}</Button>}
            </FieldGroup>
          </PopoverContent>
        </Popover>}
        {columns.some(column => column.toggleable) && <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}><Columns3 data-icon="inline-start" />{labels.columns}</DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{labels.columns}</DropdownMenuLabel>
              {columns.filter(column => column.toggleable).map(column => <DropdownMenuCheckboxItem key={column.key} checked={!hidden.includes(column.key)} onCheckedChange={checked => toggleColumn(column.key, checked)}>{column.label}</DropdownMenuCheckboxItem>)}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    </div>

    <div className={cn("overflow-hidden rounded-xl border bg-card transition-opacity", navigating && "opacity-60")} aria-busy={navigating}>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {selectable && <TableHead className="w-10 pl-4"><Checkbox aria-label={labels.selectAll} checked={allSelected} indeterminate={someSelected} onCheckedChange={checked => setSelected(checked ? records.map(record => record.id) : [])} /></TableHead>}
            {visible.map(column => <TableHead key={column.key} className={cn(column.align === "end" && "text-right")} aria-sort={state.sort === column.key ? state.direction === "asc" ? "ascending" : "descending" : undefined}>
              {column.sortable ? <Button variant="ghost" size="sm" className="-ml-2.5" onClick={() => sortBy(column)}>{column.label}{state.sort !== column.key ? <ArrowUpDown data-icon="inline-end" className="opacity-50" /> : state.direction === "asc" ? <ArrowUp data-icon="inline-end" /> : <ArrowDown data-icon="inline-end" />}</Button> : column.label}
            </TableHead>)}
            <TableHead className="w-12"><span className="sr-only">{labels.actions}</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? <TableRow className="hover:bg-transparent">
            <TableCell colSpan={visible.length + (selectable ? 2 : 1)}>
              <Empty className="py-10">
                <EmptyHeader><EmptyMedia variant="icon"><Inbox /></EmptyMedia><EmptyTitle>{labels.emptyTitle}</EmptyTitle><EmptyDescription>{labels.emptyDescription}</EmptyDescription></EmptyHeader>
              </Empty>
            </TableCell>
          </TableRow> : records.map(record => <TableRow key={record.id} data-state={selected.includes(record.id) ? "selected" : undefined}>
            {selectable && <TableCell className="pl-4"><Checkbox aria-label={`${labels.selectRow} ${String(record[columns.find(column => column.primary)?.key ?? "id"] ?? record.id)}`} checked={selected.includes(record.id)} onCheckedChange={checked => setSelected(old => checked ? [...new Set([...old, record.id])] : old.filter(id => id !== record.id))} /></TableCell>}
            {visible.map(column => <TableCell key={column.key} className={cn("max-w-80 truncate", column.align === "end" && "text-right tabular-nums")}>
              {column.primary && permissions.view ? <Link href={`${basePath}/${encodeURIComponent(record.id)}`} className="font-medium hover:underline">{String(record[column.key] ?? "—")}</Link> : <FormattedValue value={record[column.key] ?? null} type={column.type} badges={column.badges} locale={locale} labels={labels} />}
            </TableCell>)}
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={labels.actions} />}><MoreHorizontal /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {permissions.view && <DropdownMenuItem render={<Link href={`${basePath}/${encodeURIComponent(record.id)}`} />}><Eye />{labels.view}</DropdownMenuItem>}
                    {permissions.update && <DropdownMenuItem render={<Link href={`${basePath}/${encodeURIComponent(record.id)}/edit`} />}><Pencil />{labels.edit}</DropdownMenuItem>}
                  </DropdownMenuGroup>
                  {permissions.delete && onDelete && <><DropdownMenuSeparator /><DropdownMenuGroup>
                    <ConfirmAction title={labels.confirmDeleteTitle} description={labels.confirmDeleteDescription(1)} confirmLabel={labels.confirm} cancelLabel={labels.cancel} destructive nativeButton={false} onConfirm={() => remove([record.id], ids => onDelete(ids[0]!))}
                      trigger={<DropdownMenuItem variant="destructive" closeOnClick={false}><Trash2 />{labels.delete}</DropdownMenuItem>} />
                  </DropdownMenuGroup></>}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>

    <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm sm:flex-row">
      <div className="flex items-center gap-2 text-muted-foreground">
        <label htmlFor={`${storageKey}-page-size`}>{labels.rowsPerPage}</label>
        <NativeSelect id={`${storageKey}-page-size`} size="sm" value={String(state.pageSize)} onChange={event => navigate({ perPage: event.target.value, page: "" })}>
          {pageSizeOptions.map(size => <NativeSelectOption key={size} value={String(size)}>{size}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <nav aria-label={labels.page(state.page, pages)} className="flex items-center gap-2">
        <span className="text-muted-foreground" aria-live="polite">{labels.page(state.page, pages)}</span>
        <Link aria-disabled={state.page <= 1} tabIndex={state.page <= 1 ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), state.page <= 1 && "pointer-events-none opacity-50")} href={pageHref(params, pathname, state.page - 1)} scroll={false}>{labels.previous}</Link>
        <Link aria-disabled={state.page >= pages} tabIndex={state.page >= pages ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), state.page >= pages && "pointer-events-none opacity-50")} href={pageHref(params, pathname, state.page + 1)} scroll={false}>{labels.next}</Link>
      </nav>
    </div>
  </div>;
}

function pageHref(params: URLSearchParams, pathname: string, page: number) {
  const next = new URLSearchParams(params.toString());
  if (page <= 1) next.delete("page"); else next.set("page", String(page));
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
