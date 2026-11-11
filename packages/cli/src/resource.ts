import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { parseModelSpec, renderModel, renderScopeProtection, assertMigrationOutput, generateMigration, type ModelSpec } from "./model.js";
import { commitChanges, reportChanges, type Change } from "./panel.js";

type Spec = ModelSpec & { relations: Record<string, { model: string; label: string }>; permissions: Record<"read" | "create" | "update" | "delete", string[]> };
const operations = ["read", "create", "update", "delete"] as const;
const quote = JSON.stringify;
export function parseResourceSpec(raw: string): Spec {
  const input = JSON.parse(raw);
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !["scope", "fields", "permissions", "relations"].includes(key))) throw new Error("Resource spec requires scope, fields and explicit permissions");
  const model = parseModelSpec(quote({ scope: input.scope, fields: input.fields }));
  const relations = input.relations ?? {};
  if (!relations || typeof relations !== "object" || Array.isArray(relations)) throw new Error("relations must be object");
  for (const [field, relation] of Object.entries(relations) as [string, { model: string; label: string }][]) {
    if (!model.fields[field] || model.fields[field].type !== "uuid" || !relation || Object.keys(relation).some(key => !["model", "label"].includes(key)) || !/^[a-z][A-Za-z0-9]*$/.test(relation.model) || !/^[a-z][A-Za-z0-9]*$/.test(relation.label)) throw new Error(`Invalid UUID relation: ${field}`);
  }
  if (!Object.keys(model.fields).length || Object.entries(model.fields).some(([key, field]) => !["string", "text", "integer", "boolean", "uuid"].includes(field.type) || field.type === "uuid" && !relations[key] || ["__proto__", "prototype", "constructor"].includes(key))) throw new Error("Unsupported field; UUID requires explicit relation");
  if (!input.permissions || Object.keys(input.permissions).length !== 4 || operations.some(operation => !Array.isArray(input.permissions[operation]) || input.permissions[operation].some((role: unknown) => typeof role !== "string" || !["personal", "owner", "admin", "member", "viewer"].includes(role)))) throw new Error("permissions must explicitly list roles for read/create/update/delete");
  return { ...model, relations, permissions: input.permissions };
}
export async function runResource(argv: string[]) {
  const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { model: { type: "string" }, panel: { type: "string" }, spec: { type: "string" }, migration: { type: "boolean" }, "with-model": { type: "boolean" }, preview: { type: "boolean" }, json: { type: "boolean" }, noninteractive: { type: "boolean" } } });
  const name = positionals[0], model = values.model, panel = values.panel;
  if (positionals.length !== 1 || !name || !/^[A-Z][A-Za-z0-9]*$/.test(name) || !model || !/^[a-z][A-Za-z0-9]*$/.test(model) || !panel || !/^[a-z][a-z0-9_-]*$/.test(panel) || !values.spec) throw new Error("Usage: resource Name --model export --panel id --spec JSON-or-path [--with-model] [--preview] [--json] [--noninteractive]");
  const raw = values.spec.trim().startsWith("{") ? values.spec : await readFile(values.spec, "utf8");
  const spec = parseResourceSpec(raw), slug = name.replace(/[A-Z]/g, (letter, index) => `${index ? "-" : ""}${letter.toLowerCase()}`), dir = `apps/app/src/lib/resources/${slug}`;
  if (values.migration && !values["with-model"]) throw new Error("--migration requires --with-model");
  if (values.migration) await assertMigrationOutput();
  if (values["with-model"] && Object.keys(spec.relations).length) throw new Error("Relations require existing FK model; generate model with FK before resource");
  const registryFile = "apps/app/src/lib/panels/resources.ts", registry = await readFile(registryFile, "utf8");
  const panels = await readFile("apps/app/src/lib/panels/registry.ts", "utf8");
  let panelSource = panels;
  const configImports = [...panels.matchAll(/from ["']\.\/([^"']+\.config)["']/g)];
  for (const match of configImports) panelSource += await readFile(`apps/app/src/lib/panels/${match[1]}.ts`, "utf8");
  const panelMatch = [...panelSource.matchAll(/\{[^{}]*\bid\s*:\s*["']([^"']+)["'][^{}]*\}/g)].find(match => match[1] === panel);
  const context = panelMatch?.[0].match(/\bcontext\s*:\s*["']([^"']+)["']/)?.[1];
  if (!context || context === "global" || context === "personal" && spec.scope === "organizations" || context === "organization" && spec.scope === "personal") throw new Error("Panel missing or incompatible with resource scope; global CRUD is unsupported");
  if (registry.split("// CLI_RESOURCE_IMPORTS").length !== 2 || registry.split("// CLI_RESOURCE_ENTRIES").length !== 2 || new RegExp(`id: ["']${slug}["']`).test(registry)) throw new Error("Resource registry changed or resource already registered");
  const schemaFile = "packages/db/src/schema.ts", schema = await readFile(schemaFile, "utf8");
  const changes: Change[] = [];
  if (values["with-model"]) {
    if (model !== name[0].toLowerCase() + name.slice(1)) throw new Error("--with-model requires --model matching camelCase Name");
    let existing = schema;
    for (const match of schema.matchAll(/export \* from ["']\.\/([^"']+)["']/g)) existing += await readFile(`packages/db/src/${match[1]}.ts`, "utf8");
    if (new RegExp(`export const ${model}\\b`).test(existing)) throw new Error(`Model export already exists: ${model}`);
    const filename = `${model}-schema`, exportLine = `export * from "./${filename}";`;
    if (schema.includes(`./${filename}`)) throw new Error("Model already registered");
    changes.push({ file: `packages/db/src/${filename}.ts`, before: null, after: renderModel(name, spec) }, { file: schemaFile, before: schema, after: `${schema.trimEnd()}\n${exportLine}\n` });
    changes.push({ file: `packages/db/scope-protections/${name.replace(/[A-Z]/g, (letter, index) => `${index ? "_" : ""}${letter.toLowerCase()}`)}.sql`, before: null, after: renderScopeProtection(name) });
  } else {
    let source = schema;
    for (const match of schema.matchAll(/export \* from ["']\.\/([^"']+)["']/g)) source += await readFile(`packages/db/src/${match[1]}.ts`, "utf8");
    const table = source.match(new RegExp(`export const ${model} = pgTable\\([\\s\\S]*?\\.enableRLS\\(\\);`))?.[0];
    for (const [field, relation] of Object.entries(spec.relations)) {
      const parent = source.match(new RegExp(`export const ${relation.model} = pgTable\\([\\s\\S]*?\\.enableRLS\\(\\);`))?.[0];
      if (!table || !parent || !parent.includes(`${relation.label}:`) || !parent.includes("ownerUserId:") || !parent.includes("organizationId:") || !new RegExp(`${field}: [^\\n]*references\\(\\(\\) => ${relation.model}\\.id`).test(table)) throw new Error(`Unsupported or missing RLS FK relation: ${field}`);
    }
    if (!table || !table.includes("ownerUserId:") || !table.includes("organizationId:") || !table.includes("id:") || !/policies\(table\)|pgPolicy\(/.test(table)) throw new Error("Unsupported model: require exported RLS pgTable with UUID id, ownerUserId and organizationId; use --with-model for new table");
    for (const [field, def] of Object.entries(spec.fields)) {
      const builder = { string: "varchar", text: "text", integer: "integer", boolean: "boolean", uuid: "uuid", timestamp: "timestamp" }[def.type];
      const declaration = table.match(new RegExp(`\\b${field}:\\s*[^\\n]+`))?.[0] ?? "";
      if (def.optional && declaration.includes(".notNull()")) throw new Error(`Required model field cannot be optional: ${field}`);
      if (!new RegExp(`\\b${field}:\\s*${builder}\\(`).test(table)) throw new Error(`Model field missing or incompatible: ${field}`);
    }
    if (!table.includes("uuid(\"id\")") || !source.includes("pgPolicy")) throw new Error("Unsupported model id or missing RLS policies");
    for (const match of table.matchAll(/^\s*(\w+):\s*[^\n]+/gm)) {
      if (!["id", "ownerUserId", "organizationId", ...Object.keys(spec.fields)].includes(match[1]) && match[0].includes(".notNull()") && !/\.default(?:Now|Random)?\(/.test(match[0])) throw new Error(`Required model field omitted from allowlist: ${match[1]}`);
    }
  }
  const fields = Object.entries(spec.fields), select = `{ id: table.id, ${fields.map(([key]) => `${key}: table.${key}`).join(", ")} }`;
  const validators = fields.map(([key, field]) => {
    let validator = field.type === "uuid" ? "z.string().uuid()" : field.type === "boolean" ? "z.boolean()" : field.type === "integer" ? "z.number().int()" : `z.string().trim().max(${field.type === "text" ? 5000 : 255})${field.required || !field.optional && field.default === undefined ? ".min(1)" : ""}`;
    if (field.default !== undefined) validator += `.default(${quote(field.default)})`; else if (field.optional) validator += ".nullable().optional()";
    return `${key}: ${validator}`;
  }).join(",\n  ");
  const config = `import { z } from "zod";\nexport const inputSchema = z.object({\n  ${validators}\n}).strict();\nexport const permissions = ${quote(spec.permissions)} as const;\nexport const scope: string = ${quote(spec.scope)};\n`;
  const queries = `import "server-only";
import { headers } from "next/headers";
import { eq, asc, desc, count, and, ilike } from "drizzle-orm";
import { z } from "zod";
import { ${model} as table, ${[...new Set(Object.values(spec.relations).map(relation => relation.model))].join(", ")} } from "@vibe/db/schema";
import { withTenantTransaction, type TenantTransaction } from "@vibe/db";
import { requireSession, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { permissions, scope } from "./config";
export async function authorized<T>(identifier: string | null, operation: keyof typeof permissions, run: (tx: TenantTransaction, userId: string) => Promise<T>) {
  const h = await headers(), session = await requireSession(h);
  if (identifier === null && (scope === "organizations" || getIdentityEnv().IDENTITY_PROFILE === "organizations") || identifier !== null && scope === "personal") throw new Error("FORBIDDEN");
  const tenant = identifier === null ? null : await resolveTenant(identifier, h);
  return withTenantTransaction({ userId: session.user.id, organizationId: tenant?.id ?? null }, async (tx, role) => {
    const roles = role === null ? ["personal"] : role.split(",").map(value => value.trim());
    if (!roles.some(value => (permissions[operation] as readonly string[]).includes(value))) throw new Error("FORBIDDEN");
    return run(tx, session.user.id);
  });
}
export async function list(identifier: string | null, raw: Record<string, unknown>) {
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(raw.page);
  const search = z.string().max(200).default("").parse(raw.search);
  const sort = z.enum(["id", ${fields.map(([key]) => quote(key)).join(", ")}]).default("id").parse(raw.sort);
  const direction = z.enum(["asc", "desc"]).default("asc").parse(raw.direction);
  const columns = { id: table.id, ${fields.map(([key]) => `${key}: table.${key}`).join(", ")} };
  const escaped = search.replaceAll("\\\\", "\\\\\\\\").replaceAll("%", "\\\\%").replaceAll("_", "\\\\_");
  const where = and(${fields.filter(([, field]) => field.type === "string" || field.type === "text").slice(0, 1).map(([key]) => `search ? ilike(table.${key}, "%" + escaped + "%") : undefined`).join(", ") || "undefined"}, ${Object.keys(spec.relations).map(key => `raw.${key} ? eq(table.${key}, z.string().uuid().parse(raw.${key})) : undefined`).join(", ") || "undefined"});
  return authorized(identifier, "read", async tx => {
    const [items, [{ total }]] = await Promise.all([tx.select(${select}).from(table).where(where).orderBy(direction === "asc" ? asc(columns[sort]) : desc(columns[sort]), asc(table.id)).limit(20).offset((page - 1) * 20), tx.select({ total: count() }).from(table).where(where)]);
    return { items, total, page };
  });
}
export async function get(identifier: string | null, id: string) {
  z.string().uuid().parse(id);
  return authorized(identifier, "read", async tx => (await tx.select(${select}).from(table).where(eq(table.id, id)).limit(1))[0] ?? null);
}
${Object.entries(spec.relations).map(([key, relation]) => `export async function options${key}(identifier: string | null) { return authorized(identifier, "read", tx => tx.select({ id: ${relation.model}.id, label: ${relation.model}.${relation.label} }).from(${relation.model}).orderBy(asc(${relation.model}.${relation.label})).limit(100)); }\n`).join("")}
`;
  const actions = `"use server";
import { eq, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ${model} as table, ${[...new Set(Object.values(spec.relations).map(relation => relation.model))].join(", ")} } from "@vibe/db/schema";
import { registry } from "../../panels/registry";
import { buildPanelPath } from "../../panels/routing";
import { authorized } from "./queries";
import { inputSchema } from "./config";
function base(identifier: string | null) {
  const panel = registry.find(value => value.id === ${quote(panel)});
  if (!panel || (panel.context === "personal") !== (identifier === null)) throw new Error("FORBIDDEN");
  return buildPanelPath(panel.id, identifier === null ? {} : { tenant: identifier }) + ${quote(`/${slug}`)};
}
export async function save(identifier: string | null, id: string | null, form: FormData) {
  const path = base(identifier);
  const input = inputSchema.parse({ ${fields.map(([key, field]) => {
    const raw = `form.get(${quote(key)})`;
    const empty = field.optional && field.default === undefined ? "null" : "undefined";
    const value = field.type === "boolean" ? `${raw} === "on"` : field.type === "integer" || field.type === "uuid" ? `${raw} === null || ${raw} === "" ? ${empty} : ${field.type === "integer" ? `Number(${raw})` : raw}` : `${raw} ?? undefined`;
    return `${key}: ${value}`;
  }).join(", ")} });
  if (id !== null) z.string().uuid().parse(id);
  await authorized(identifier, id === null ? "create" : "update", async (tx, ownerUserId) => {
    ${Object.entries(spec.relations).map(([key, relation]) => `if (input.${key}) { const [parent] = await tx.select({ id: ${relation.model}.id }).from(${relation.model}).where(eq(${relation.model}.id, input.${key})).limit(1); if (!parent) throw new Error("NOT_FOUND"); }`).join("\n")}
    if (id !== null) {
      const [row] = await tx.update(table).set(input).where(eq(table.id, id)).returning({ id: table.id });
      if (!row) throw new Error("NOT_FOUND");
    } else {
      const [context] = await tx.execute<{ organizationId: string | null }>(sql\`select nullif(current_setting('app.current_tenant_id', true), '') as "organizationId"\`);
      ${spec.scope === "organizations" ? 'if (!context.organizationId) throw new Error("ORGANIZATION_REQUIRED");' : ""}
      await tx.insert(table).values({ ...input, ownerUserId, organizationId: context.organizationId });
    }
  });
  revalidatePath(path); redirect(path);
}
export async function remove(identifier: string | null, id: string) {
  const path = base(identifier); z.string().uuid().parse(id);
  await authorized(identifier, "delete", async tx => {
    const [row] = await tx.delete(table).where(eq(table.id, id)).returning({ id: table.id });
    if (!row) throw new Error("NOT_FOUND");
  });
  revalidatePath(path); redirect(path);
}
export async function bulkRemove(identifier: string | null, form: FormData) {
  const path = base(identifier);
  const ids = z.array(z.string().uuid()).min(1).max(100).transform(values => [...new Set(values)]).parse(form.getAll("ids"));
  await authorized(identifier, "delete", async tx => {
    const rows = await tx.select({ id: table.id }).from(table).where(inArray(table.id, ids)).for("update");
    if (rows.length !== ids.length) throw new Error("NOT_FOUND");
    await tx.delete(table).where(inArray(table.id, ids));
  });
  revalidatePath(path); redirect(path);
}
`;
  const safeViews = `import { notFound, forbidden } from "next/navigation";
import { Button, Input, Label, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Infolist, InfolistEntry, Heading, ConfirmSubmit } from "@vibe/ui";
import type { ResourceContext } from "../../panels/resources";
import { list, get${Object.keys(spec.relations).map(key => `, options${key}`).join("")} } from "./queries";
import { save, remove, bulkRemove } from "./actions";
import { permissions } from "./config";
const labels = {
  en: { create: "Create", search: "Search", sort: "Sort", direction: "Direction", asc: "Ascending", desc: "Descending", all: "All", filter: "Filter", actions: "Actions", select: "Select", view: "View", deleteSelected: "Delete selected", confirmSelected: "Delete selected items?", previous: "Previous", next: "Next", choose: "Choose", save: "Save", cancel: "Cancel", edit: "Edit", delete: "Delete", confirmDelete: "Delete this item?", back: "Back", empty: "No items found" },
  pt: { create: "Criar", search: "Buscar", sort: "Ordenar", direction: "Direção", asc: "Crescente", desc: "Decrescente", all: "Todos", filter: "Filtrar", actions: "Ações", select: "Selecionar", view: "Ver", deleteSelected: "Excluir selecionados", confirmSelected: "Excluir itens selecionados?", previous: "Anterior", next: "Próxima", choose: "Escolher", save: "Salvar", cancel: "Cancelar", edit: "Editar", delete: "Excluir", confirmDelete: "Excluir este item?", back: "Voltar", empty: "Nenhum item encontrado" },
};
export async function render(context: ResourceContext) {
  const t = context.locale === "en" ? labels.en : labels.pt;
  const { identifier, route, query } = context, base = context.basePath + ${quote(`/${slug}`)};
  ${Object.keys(spec.relations).map(key => `const ${key}Options = await options${key}(identifier);`).join("\n")}
  const pageHref = (page: number) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (typeof value === "string") params.set(key, value); params.set("page", String(page)); return base + "?" + params.toString(); };
  const roles = identifier === null ? ["personal"] : context.role.split(",").map(value => value.trim());
  const can = (operation: keyof typeof permissions) => roles.some(value => (permissions[operation] as readonly string[]).includes(value));
  const action = route.length === 1 ? "list" : route.length === 2 && route[1] === "new" ? "new" : route.length === 3 && route[2] === "edit" ? "edit" : route.length === 2 ? "detail" : "invalid";
  if (action === "invalid") notFound();
  if (action === "list") {
    const result = await list(identifier, query);
    return <section className="space-y-4"><Heading level={2}>${name}</Heading>{can("create") && <a className="text-sm underline" href={base + "/new"}>{t.create}</a>}
      <form method="get" className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="search">{t.search}</Label><Input id="search" name="search" defaultValue={typeof query.search === "string" ? query.search : ""} /></div>
      <div className="space-y-2"><Label htmlFor="sort">{t.sort}</Label><Select id="sort" name="sort" defaultValue={typeof query.sort === "string" ? query.sort : "id"}>${["id", ...fields.map(([key]) => key)].map(key => `<option value="${key}">${key}</option>`).join("")}</Select></div>
      <div className="space-y-2"><Label htmlFor="direction">{t.direction}</Label><Select id="direction" name="direction" defaultValue={query.direction === "desc" ? "desc" : "asc"}><option value="asc">{t.asc}</option><option value="desc">{t.desc}</option></Select></div>
      ${Object.keys(spec.relations).map(key => `<div className="space-y-2"><Label htmlFor="filter-${key}">${key}</Label><Select id="filter-${key}" name="${key}" defaultValue={typeof query.${key} === "string" ? query.${key} : ""}><option value="">{t.all}</option>{${key}Options.map(option => <option key={option.id} value={option.id}>{String(option.label)}</option>)}</Select></div>`).join("")}<Button type="submit">{t.filter}</Button></form>
      <form action={bulkRemove.bind(null, identifier)} className="space-y-4"><Table><TableHeader><TableRow>${fields.map(([key]) => `<TableHead>${key}</TableHead>`).join("")}<TableHead>{t.actions}</TableHead>{can("delete") && <TableHead>{t.select}</TableHead>}</TableRow></TableHeader><TableBody>{result.items.map(row => <TableRow key={row.id}>${fields.map(([key]) => `<TableCell>{String(row.${key} ?? "")}</TableCell>`).join("")}<TableCell><a className="underline" href={base + "/" + row.id}>{t.view}</a></TableCell>{can("delete") && <TableCell><Input type="checkbox" name="ids" value={row.id} aria-label={t.select + " " + row.id} /></TableCell>}</TableRow>)}</TableBody></Table>{result.items.length === 0 && <p role="status">{t.empty}</p>}{can("delete") && <ConfirmSubmit message={t.confirmSelected}>{t.deleteSelected}</ConfirmSubmit>}</form>
      <nav aria-label={t.direction} className="flex gap-4">{result.page > 1 && <a className="underline" href={pageHref(result.page - 1)}>{t.previous}</a>}{result.page * 20 < result.total && <a className="underline" href={pageHref(result.page + 1)}>{t.next}</a>}</nav></section>;
  }
  const row = action === "new" ? null : await get(identifier, route[1]);
  if (action !== "new" && !row) notFound();
  if (action === "new" || action === "edit") {
    if (!can(action === "new" ? "create" : "update")) forbidden();
    return <form className="max-w-xl space-y-4" action={save.bind(null, identifier, row?.id ?? null)}>${fields.map(([key, field]) => `<div className="space-y-2"><Label htmlFor="field-${key}">${key}</Label>${field.type === "uuid" ? `<Select id="field-${key}" name="${key}" defaultValue={row?.${key} ?? ""} ${field.required || !field.optional && field.default === undefined ? "required" : ""}><option value="">{t.choose}</option>{${key}Options.map(option => <option key={option.id} value={option.id}>{String(option.label)}</option>)}</Select>` : `<Input id="field-${key}" name="${key}" type="${field.type === "boolean" ? "checkbox" : field.type === "integer" ? "number" : "text"}" ${field.type === "boolean" ? `defaultChecked={row?.${key} ?? ${quote(field.default ?? false)}}` : `defaultValue={row?.${key} ?? ${quote(field.default ?? "")}}`} ${field.type !== "boolean" && (field.required || !field.optional && field.default === undefined) ? "required" : ""} />`}</div>`).join("")}<div className="flex items-center gap-4"><Button type="submit">{t.save}</Button><a className="text-sm underline" href={base}>{t.cancel}</a></div></form>;
  }
  return <section className="space-y-4"><Infolist>${fields.map(([key]) => `<InfolistEntry label="${key}">{String(row!.${key} ?? "")}</InfolistEntry>`).join("")}</Infolist><div className="flex items-center gap-4">{can("update") && <a className="underline" href={base + "/" + row!.id + "/edit"}>{t.edit}</a>}{can("delete") && <form action={remove.bind(null, identifier, row!.id)}><ConfirmSubmit message={t.confirmDelete}>{t.delete}</ConfirmSubmit></form>}<a className="underline" href={base}>{t.back}</a></div></section>;
}
`;
  for (const [file, after] of Object.entries({ "config.ts": config, "queries.ts": queries, "actions.ts": actions, "views.tsx": safeViews })) changes.push({ file: `${dir}/${file}`, before: null, after });
  changes.push({ file: registryFile, before: registry, after: registry.replace("// CLI_RESOURCE_IMPORTS", `import { render as render${name} } from "../resources/${slug}/views";\n// CLI_RESOURCE_IMPORTS`).replace("// CLI_RESOURCE_ENTRIES", `{ id: ${quote(slug)}, label: ${quote(name)}, panelIds: [${quote(panel)}], kind: "custom", render: render${name} },\n  // CLI_RESOURCE_ENTRIES`) });
  await commitChanges(changes, !!values.preview, values.migration ? generateMigration : undefined); reportChanges(changes, values.json, values.preview);
}
