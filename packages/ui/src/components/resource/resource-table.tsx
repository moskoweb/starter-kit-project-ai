"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Eye, Filter, Inbox, MoreHorizontal, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Badge } from "@vibe/ui/components/badge";
import { Button, buttonVariants } from "@vibe/ui/components/button";
import { Checkbox } from "@vibe/ui/components/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@vibe/ui/components/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@vibe/ui/components/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@vibe/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@vibe/ui/components/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@vibe/ui/components/table";
import { Field, FieldGroup, FieldLabel } from "@vibe/ui/components/field";
import { pageSizeOptions, type RecordActionDef, type TableColumn } from "../../lib/schema";
import { ConfirmAction } from "./confirm-action";
import { ActionTrigger, ConfirmPending, useRecordAction } from "./record-actions";
import { FormattedValue } from "./value";
import type { ResourceTableProps } from "./types";

/** Server-driven data table: URL holds list state, server loads one page. Inspired by Filament tables. */
export function ResourceTable({ columns, filters = [], records, total, state, basePath, storageKey, permissions, labels, locale, onDelete, onBulkDelete, recordActions = [], availableActions = {}, onRecordAction, actionIcons = {} }: ResourceTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [navigating, startNavigation] = useTransition();
  const [search, setSearch] = useState(state.search);
  const [selected, setSelected] = useState<string[]>([]);
  // Reset derived UI state when server data/URL change (render-time adjustment, no effect cascade).
  const [seen, setSeen] = useState({ records, search: state.search });
  if (seen.records !== records || seen.search !== state.search) {
    setSeen({ records, search: state.search });
    setSelected([]);
    if (seen.search !== state.search) setSearch(state.search);
  }
  const storageId = `table:${storageKey}:hidden`;
  const defaultHidden = columns.filter(column => column.hidden).map(column => column.key);
  const storedHidden = useSyncExternalStore(subscribeStorage, () => localStorage.getItem(storageId), () => null);
  const hidden = parseHidden(storedHidden) ?? defaultHidden;
  const pages = Math.max(1, Math.ceil(total / state.pageSize));
  const activeFilters = Object.keys(state.filters).filter(key => state.filters[key]).length;
  const canBulkDelete = permissions.bulkDelete && !!onBulkDelete;
  const bulkActions = onRecordAction ? recordActions.filter(action => action.bulk) : [];
  const selectable = canBulkDelete || bulkActions.length > 0;
  const allows = (id: string, action: string) => availableActions[id]?.includes(action) ?? false;
  const visible = columns.filter(column => !hidden.includes(column.key));

  const navigateSearch = useEffectEvent((value: string) => navigate({ search: value, page: "" }));
  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => navigateSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search, state.search]);

  function navigate(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    const query = next.toString();
    startNavigation(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }
  function toggleColumn(key: string, show: boolean) {
    const next = show ? hidden.filter(value => value !== key) : [...hidden, key];
    try { localStorage.setItem(storageId, JSON.stringify(next)); window.dispatchEvent(new StorageEvent("storage", { key: storageId })); } catch { /* storage unavailable */ }
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
  const execute = useRecordAction(onRecordAction, labels, () => setSelected([]));
  // Row-menu confirmations live outside the menu: closing the menu unmounts its content.
  const [confirming, setConfirming] = useState<{ action: RecordActionDef; run: () => Promise<void> } | null>(null);
  const allSelected = records.length > 0 && records.every(record => selected.includes(record.id));
  const someSelected = selected.length > 0 && !allSelected;

  return <div className="flex flex-col gap-3" data-slot="resource-table">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {selectable && selected.length > 0 ? <div className="flex items-center gap-2" aria-live="polite">
        <span className="text-sm font-medium">{labels.selected(selected.length)}</span>
        {canBulkDelete && <ConfirmAction title={labels.confirmDeleteTitle} description={labels.confirmDeleteDescription(selected.length)} confirmLabel={labels.confirm} cancelLabel={labels.cancel} destructive onConfirm={() => remove(selected, onBulkDelete!)}
          trigger={<Button variant="destructive" size="sm"><Trash2 data-icon="inline-start" />{labels.deleteSelected}</Button>} />}
        {bulkActions.filter(action => selected.every(id => allows(id, action.name))).map(action => {
          const Icon = action.icon ? actionIcons[action.icon] : undefined;
          return <ActionTrigger key={action.name} action={action} labels={labels} count={selected.length} run={() => execute(action, selected)}
            trigger={onClick => <Button variant={action.destructive ? "destructive" : "outline"} size="sm" onClick={onClick}>{Icon && <Icon data-icon="inline-start" />}{action.label}</Button>} />;
        })}
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
                <FilterSelect id={`filter-${filter.key}`} value={state.filters[filter.key] ?? null} onChange={value => navigate({ [filter.key]: value ?? "", page: "" })}
                  items={[{ value: null, label: labels.all }, ...(filter.type === "select" ? filter.options : [{ value: "true", label: filter.trueLabel }, { value: "false", label: filter.falseLabel }])]} />
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
                  {recordActions.some(action => allows(record.id, action.name)) && onRecordAction && <><DropdownMenuSeparator /><DropdownMenuGroup>
                    {recordActions.filter(action => allows(record.id, action.name)).map(action => {
                      const Icon = action.icon ? actionIcons[action.icon] : undefined;
                      const run = () => execute(action, [record.id]);
                      return <DropdownMenuItem key={action.name} variant={action.destructive ? "destructive" : "default"} onClick={() => action.confirm || action.destructive ? setConfirming({ action, run }) : void run().catch(() => undefined)}>{Icon && <Icon />}{action.label}</DropdownMenuItem>;
                    })}
                  </DropdownMenuGroup></>}
                  {permissions.delete && onDelete && <><DropdownMenuSeparator /><DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirming({ action: { name: "delete", label: labels.delete, destructive: true, confirm: { title: labels.confirmDeleteTitle, description: labels.confirmDeleteDescription(1) } }, run: () => remove([record.id], ids => onDelete(ids[0]!)) })}><Trash2 />{labels.delete}</DropdownMenuItem>
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
        <span id={`${storageKey}-page-size-label`}>{labels.rowsPerPage}</span>
        <Select items={pageSizeOptions.map(size => ({ value: String(size), label: String(size) }))} value={String(state.pageSize)} onValueChange={value => value && navigate({ perPage: value, page: "" })}>
          <SelectTrigger size="sm" aria-labelledby={`${storageKey}-page-size-label`}><SelectValue /></SelectTrigger>
          <SelectContent>{pageSizeOptions.map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <nav aria-label={labels.page(state.page, pages)} className="flex items-center gap-2">
        <span className="text-muted-foreground" aria-live="polite">{labels.page(state.page, pages)}</span>
        <Link aria-disabled={state.page <= 1} tabIndex={state.page <= 1 ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), state.page <= 1 && "pointer-events-none opacity-50")} href={pageHref(params, pathname, state.page - 1)} scroll={false}>{labels.previous}</Link>
        <Link aria-disabled={state.page >= pages} tabIndex={state.page >= pages ? -1 : undefined} className={cn(buttonVariants({ variant: "outline", size: "sm" }), state.page >= pages && "pointer-events-none opacity-50")} href={pageHref(params, pathname, state.page + 1)} scroll={false}>{labels.next}</Link>
      </nav>
    </div>
    <ConfirmPending pending={confirming} labels={labels} onClose={() => setConfirming(null)} />
  </div>;
}

function pageHref(params: URLSearchParams, pathname: string, page: number) {
  const next = new URLSearchParams(params.toString());
  if (page <= 1) next.delete("page"); else next.set("page", String(page));
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function parseHidden(raw: string | null): string[] | null {
  try { const value: unknown = JSON.parse(raw ?? "null"); return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : null; }
  catch { return null; }
}

function FilterSelect({ id, value, items, onChange }: { id: string; value: string | null; items: { value: string | null; label: string }[]; onChange: (value: string | null) => void }) {
  return <Select items={items} value={value} onValueChange={next => onChange(next)}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent>{items.map(item => <SelectItem key={item.value ?? ""} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
  </Select>;
}
