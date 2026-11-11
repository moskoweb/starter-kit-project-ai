# Resource views

`components/resources/list.tsx`, `form.tsx`, and `detail.tsx` are client components for resource CRUD pages. Page/server callers supply all tenant-scoped data and callbacks; views never resolve tenant identity or authorization themselves.

## Shared types

- `ResourceKind`: `projects | tasks`.
- `ResourceRow`: `id` plus optional `name`, `title`, `description`, `status`, `projectId`, `createdAt`.
- Permissions: server-computed `create`, `update`, `delete`, `bulkDelete` booleans.
- Callback result: `{ ok: boolean; error?: string; id?: string }`. Return `ok: false` and safe error on failure. No optimistic success; views refresh/navigate only on `ok: true`.
- `tenantIdentifier` is `string | null`; callbacks receive their server-selected tenant identifier through closure/binding, never client trust.

## List

`ResourceList` takes `kind`, `rows`, `rowCount`, one-based `page`, `sort`, `basePath`, `tenantIdentifier`, `permissions`, and optional `onDelete(id)` / `onBulkDelete(ids)` server-action callbacks. Search uses URL `search`; pagination uses `page`; sort uses `sort` and `direction`. DataTable is manual-paged/sorted and row IDs are UUIDs. Bulk selection is local and clears on page, sort, search, kind, tenant, or path context changes. Only expose delete actions when permission and callback both exist. Optional callback omission disables action; do not supply no-op handlers.

## Form

`ResourceForm` takes `kind`, `basePath`, optional `initialValues`, required `onSave(values)`, real `cancelHref`, and task `projects` options (`id`, `name`). Project values use `projectInputSchema` (`name`, `description`); task values use `taskInputSchema` (`title`, `projectId`). RHF uses those Zod schemas and `@vibe/ui` form primitives. Save result with `id` navigates to detail; result without ID navigates to base path. Action errors remain visible and accessible.

For existing tasks, `projectId` remains read-only and `onSave` receives only `{ title }`, matching the strict `taskUpdateSchema`. Creation still sends `{ title, projectId }`. List inputs accept pages 1–1,000,000; larger offsets are rejected before querying.

## Detail

`ResourceDetail` takes `kind`, `row`, `basePath`, server-computed `permissions`, and optional `onDelete(id)`. Edit link appears only when `update` is allowed; delete control appears only when `delete` and callback are present. Back/edit links require matching real routes from caller.

## ResourceData actions

Expected wrappers bind identifier and call server actions: `createProject(identifier, {name,description?})`, `updateProject(identifier,id,{name?,description?})`, `deleteProject(identifier,id)`, `createTask(identifier,{projectId,title})`, `updateTask(identifier,id,{title})`, `deleteTask(identifier,id)`, and `bulkDeleteProjects(identifier,{ids})`. Adapt their `{ok:true,data:{id}|null}` / `{ok:false,error}` results at page boundary to view result shape. Task status is not in current validation/action contract, so views display status if supplied but do not edit it.
