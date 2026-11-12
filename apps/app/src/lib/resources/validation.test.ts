import assert from "node:assert/strict";
import { taskUpdateSchema } from "./validation";
import { parseListState } from "./list-state";
import type { ResourceDefinition } from "./define";

assert.deepEqual(taskUpdateSchema.parse({ title: "Updated task" }), { title: "Updated task" });
assert.equal(taskUpdateSchema.safeParse({ title: "Updated task", projectId: "11111111-1111-4111-8111-111111111111" }).success, false);

const resource = { table: { columns: [], sortable: ["name"], defaultSort: { key: "createdAt", direction: "desc" } } } as unknown as ResourceDefinition;
const filters = [{ key: "status", label: "Status", type: "select" as const, options: [{ value: "open", label: "Open" }] }];
const state = parseListState(resource, { page: "100001", perPage: "7", sort: "owner_user_id", direction: "asc", status: "closed", search: " x ".repeat(200) }, filters);
assert.equal(state.page, 1);
assert.equal(state.pageSize, 10);
assert.deepEqual([state.sort, state.direction], ["createdAt", "desc"], "unknown sort falls back to default and ignores direction");
assert.deepEqual(state.filters, {}, "filter values outside options are dropped");
assert.ok(state.search.length <= 200);
const valid = parseListState(resource, { page: "3", perPage: "25", sort: "name", direction: "asc", status: "open" }, filters);
assert.deepEqual([valid.page, valid.pageSize, valid.sort, valid.direction, valid.filters.status], [3, 25, "name", "asc", "open"]);
