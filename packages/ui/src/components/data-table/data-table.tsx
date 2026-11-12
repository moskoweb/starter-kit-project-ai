"use client";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type SortingState, type PaginationState, type OnChangeFn } from "@tanstack/react-table";
import { Button } from "@vibe/ui/components/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@vibe/ui/components/table";
export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  rowCount: number;
  pagination: PaginationState;
  sorting: SortingState;
  onPaginationChange: OnChangeFn<PaginationState>;
  onSortingChange: OnChangeFn<SortingState>;
  caption: string;
  emptyMessage: string;
  previousLabel: string;
  nextLabel: string;
  pageLabel: (page: number, count: number) => string;
}
export function DataTable<T>({ data, columns, getRowId, rowCount, pagination, sorting, onPaginationChange, onSortingChange, caption, emptyMessage, previousLabel, nextLabel, pageLabel }: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getRowId, rowCount, state: { sorting, pagination }, onSortingChange, onPaginationChange, getCoreRowModel: getCoreRowModel(), manualPagination: true, manualSorting: true });
  return <div className="space-y-3"><Table><caption className="sr-only">{caption}</caption><TableHeader>{table.getHeaderGroups().map(group => <TableRow key={group.id}>{group.headers.map(header => <TableHead key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}>{header.isPlaceholder ? null : header.column.getCanSort() ? <button type="button" className="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : " ↕"}</button> : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map(row => <TableRow key={row.id}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="py-8 text-center">{emptyMessage}</TableCell></TableRow>}</TableBody></Table><nav aria-label={caption} className="flex items-center justify-end gap-3"><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>{previousLabel}</Button><span aria-live="polite" className="text-sm">{pageLabel(table.getState().pagination.pageIndex + 1, Math.max(1, table.getPageCount()))}</span><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>{nextLabel}</Button></nav></div>;
}
