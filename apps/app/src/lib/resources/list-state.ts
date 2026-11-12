import { pageSizeOptions, type ListState, type TableFilter } from "@vibe/ui/lib/schema";
import type { ResourceDefinition } from "./define";

type Query = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/** Parse untrusted URL query into a bounded list state; unknown keys are ignored. */
export function parseListState(resource: ResourceDefinition, query: Query, filterDefs: TableFilter<unknown>[] = []): ListState {
  const page = Number(one(query.page) ?? 1);
  const perPage = Number(one(query.perPage) ?? 10);
  const sort = one(query.sort);
  const direction = one(query.direction);
  const filters: Record<string, string> = {};
  for (const filter of filterDefs) {
    const value = one(query[filter.key]);
    if (!value) continue;
    const allowed = filter.type === "boolean" ? ["true", "false"] : filter.options.map(option => option.value);
    if (allowed.includes(value)) filters[filter.key] = value;
  }
  const validSort = sort && resource.table.sortable.includes(sort);
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 100_000 ? page : 1,
    pageSize: (pageSizeOptions as readonly number[]).includes(perPage) ? perPage : 10,
    search: (one(query.search) ?? "").trim().slice(0, 200),
    sort: validSort ? sort : resource.table.defaultSort.key,
    direction: validSort ? (direction === "asc" ? "asc" : "desc") : resource.table.defaultSort.direction,
    filters,
  };
}

/** Escape LIKE wildcards in user search. */
export const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, "\\$&")}%`;
