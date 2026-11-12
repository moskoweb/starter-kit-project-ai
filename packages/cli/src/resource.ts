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
  const spec = parseResourceSpec(raw), slug = name.replace(/[A-Z]/g, (letter, index) => `${index ? "-" : ""}${letter.toLowerCase()}`);
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
  if (registry.split("// CLI_RESOURCE_IMPORTS").length !== 2 || registry.split("// CLI_RESOURCE_ENTRIES").length !== 2 || registry.includes(`definitions/${slug}"`) || ["projects", "tasks", "new"].includes(slug)) throw new Error("Resource registry changed or resource already registered");
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
  const fields = Object.entries(spec.fields);
  const validators = fields.map(([key, field]) => {
    let validator = field.type === "uuid" ? "z.string().uuid()" : field.type === "boolean" ? "z.boolean()" : field.type === "integer" ? "z.number().int()" : `z.string().trim().max(${field.type === "text" ? 5000 : 255})${field.required || !field.optional && field.default === undefined ? ".min(1)" : ""}`;
    if (field.default !== undefined) validator += `.default(${quote(field.default)})`; else if (field.optional) validator += ".nullable().optional()";
    return `${key}: ${validator}`;
  }).join(",\n  ");
  const title = fields.find(([, field]) => field.type === "string" || field.type === "text")?.[0] ?? "id";
  const label = (text: string) => `{ "pt-BR": ${quote(text)}, en: ${quote(text)} }`;
  const human = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
  const plural = name.endsWith("s") ? name : `${name}s`;
  const valueType = (type: string) => type === "boolean" ? "boolean" : type === "integer" ? "number" : "text";
  const fieldType = (type: string) => type === "boolean" ? "boolean" : type === "integer" ? "number" : type === "text" ? "textarea" : type === "uuid" ? "select" : "text";
  const searchable = fields.filter(([, field]) => field.type === "string" || field.type === "text").slice(0, 1).map(([key]) => key);
  const definition = `import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ${model} as table${[...new Set(Object.values(spec.relations).map(relation => relation.model))].map(value => `, ${value}`).join("")} } from "@vibe/db/schema";
import { withTenantTransaction, type TenantTransaction } from "@vibe/db";
import { requireSession, resolveTenant } from "@vibe/auth";
import { getIdentityEnv } from "@vibe/config/env";
import { defineResource, type Operation, type ResourceScope } from "../define";
import { likePattern } from "../list-state";

const inputSchema = z.object({
  ${validators}
}).strict();
const permissions = ${quote(spec.permissions)} as const satisfies Record<Operation, readonly string[]>;
const scope: string = ${quote(spec.scope)};
const columns = { ${fields.map(([key]) => `${key}: table.${key}`).join(", ")} };
const select = { id: table.id, ...columns };
const roles = (role: string | null) => role === null ? ["personal"] : role.split(",").map(value => value.trim());
const can = (role: string | null, operation: Operation) => roles(role).some(value => (permissions[operation] as readonly string[]).includes(value));

/** Re-resolves session and tenant, enforces declared roles, then runs under RLS. */
async function authorized<T>({ identifier }: ResourceScope, operation: Operation, run: (tx: TenantTransaction, userId: string) => Promise<T>) {
  const h = await headers(), session = await requireSession(h);
  if (identifier === null && (scope === "organizations" || getIdentityEnv().IDENTITY_PROFILE === "organizations") || identifier !== null && scope === "personal") throw new Error("FORBIDDEN");
  const tenant = identifier === null ? null : await resolveTenant(identifier, h);
  return withTenantTransaction({ userId: session.user.id, organizationId: tenant?.id ?? null }, async (tx, role) => {
    if (!can(role, operation)) throw new Error("FORBIDDEN");
    return run(tx, session.user.id);
  });
}
async function mutate(scope: ResourceScope, operation: Operation, run: (tx: TenantTransaction, userId: string) => Promise<string | undefined>) {
  try { const id = await authorized(scope, operation, run); revalidatePath("/[...segments]", "page"); return { ok: true as const, id }; }
  catch (error) { const message = error instanceof Error ? error.message : ""; return { ok: false as const, error: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "ORGANIZATION_REQUIRED"].includes(message) ? message : "RESOURCE_ERROR" }; }
}
const record = (row: Record<string, unknown> & { id: string }) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value as string | number | boolean | null])) as { id: string } & Record<string, string | number | boolean | null>;
${Object.entries(spec.relations).map(([key, relation]) => `async function options${key}(scope: ResourceScope) {
  const rows = await authorized(scope, "read", tx => tx.select({ id: ${relation.model}.id, label: ${relation.model}.${relation.label} }).from(${relation.model}).orderBy(asc(${relation.model}.${relation.label})).limit(500));
  return rows.map(row => ({ value: row.id, label: { "pt-BR": String(row.label), en: String(row.label) } }));
}
`).join("")}
export const ${model}Resource = defineResource({
  slug: ${quote(slug)},
  label: ${label(name)},
  pluralLabel: ${label(plural)},
  icon: "settings",
  titleKey: ${quote(title)},
  can,
  table: {
    columns: [
      ${fields.map(([key, field], index) => `{ key: ${quote(key)}, label: ${label(human(key))}${key === title ? ", primary: true" : ""}, type: ${quote(valueType(field.type))}, sortable: true${index > 0 ? ", toggleable: true" : ""} },`).join("\n      ")}
    ],
    ${Object.keys(spec.relations).length ? `filters: async scope => [${Object.keys(spec.relations).map(key => `{ key: ${quote(key)}, label: ${label(human(key))}, type: "select", options: await options${key}(scope) }`).join(", ")}],` : ""}
    defaultSort: { key: ${quote(title === "id" ? fields[0]![0] : title)}, direction: "asc" },
    sortable: Object.keys(columns),
  },
  form: async scope => [{ fields: [
    ${fields.map(([key, field]) => `{ name: ${quote(key)}, label: ${label(human(key))}, type: ${quote(fieldType(field.type))}${field.required || !field.optional && field.default === undefined && field.type !== "boolean" ? ", required: true" : ""}${field.type === "string" ? ", maxLength: 255" : field.type === "text" ? ", maxLength: 5000" : ""}${field.type === "uuid" ? `, options: await options${key}(scope)` : ""} },`).join("\n    ")}
  ] }],
  infolist: async () => [{ columns: 2, entries: [
    ${fields.map(([key, field]) => `{ key: ${quote(key)}, label: ${label(human(key))}, type: ${quote(valueType(field.type))} },`).join("\n    ")}
  ] }],
  list: async (scope, state) => authorized(scope, "read", async tx => {
    const where = and(${searchable.map(key => `state.search ? ilike(table.${key}, likePattern(state.search)) : undefined`).join(", ") || "undefined"}${Object.keys(spec.relations).map(key => `, state.filters.${key} ? eq(table.${key}, state.filters.${key}) : undefined`).join("")});
    const order = columns[state.sort as keyof typeof columns] ?? table.id;
    const [rows, [{ total }]] = await Promise.all([
      tx.select(select).from(table).where(where).orderBy(state.direction === "asc" ? asc(order) : desc(order), asc(table.id)).limit(state.pageSize).offset((state.page - 1) * state.pageSize),
      tx.select({ total: count() }).from(table).where(where),
    ]);
    return { records: rows.map(record), total };
  }),
  get: async (scope, id) => z.string().uuid().safeParse(id).success ? authorized(scope, "read", async tx => { const [row] = await tx.select(select).from(table).where(eq(table.id, id)).limit(1); return row ? record(row) : null; }) : null,
  create: async (scope, values) => {
    const parsed = inputSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: "INVALID_INPUT", fieldErrors: Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])) };
    return mutate(scope, "create", async (tx, ownerUserId) => {
      const input = parsed.data;
      ${Object.entries(spec.relations).map(([key, relation]) => `if (input.${key}) { const [parent] = await tx.select({ id: ${relation.model}.id }).from(${relation.model}).where(eq(${relation.model}.id, input.${key})).limit(1); if (!parent) throw new Error("NOT_FOUND"); }`).join("\n      ")}
      const [context] = await tx.execute<{ organizationId: string | null }>(sql\`select nullif(current_setting('app.current_tenant_id', true), '') as "organizationId"\`);
      ${spec.scope === "organizations" ? 'if (!context.organizationId) throw new Error("ORGANIZATION_REQUIRED");' : ""}
      const [row] = await tx.insert(table).values({ ...input, ownerUserId, organizationId: context.organizationId }).returning({ id: table.id });
      return row!.id;
    });
  },
  update: async (scope, id, values) => {
    const parsed = inputSchema.safeParse(values);
    if (!parsed.success || !z.string().uuid().safeParse(id).success) return { ok: false, error: "INVALID_INPUT", fieldErrors: parsed.success ? undefined : Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])) };
    return mutate(scope, "update", async tx => {
      const input = parsed.data;
      ${Object.entries(spec.relations).map(([key, relation]) => `if (input.${key}) { const [parent] = await tx.select({ id: ${relation.model}.id }).from(${relation.model}).where(eq(${relation.model}.id, input.${key})).limit(1); if (!parent) throw new Error("NOT_FOUND"); }`).join("\n      ")}
      const [row] = await tx.update(table).set(input).where(eq(table.id, id)).returning({ id: table.id });
      if (!row) throw new Error("NOT_FOUND");
      return row.id;
    });
  },
  delete: async (scope, ids) => mutate(scope, "delete", async tx => {
    const rows = await tx.select({ id: table.id }).from(table).where(inArray(table.id, ids)).for("update");
    if (rows.length !== ids.length) throw new Error("NOT_FOUND");
    await tx.delete(table).where(inArray(table.id, ids));
    return undefined;
  }),
});
`;
  changes.push({ file: `apps/app/src/lib/resources/definitions/${slug}.ts`, before: null, after: definition });
  changes.push({ file: registryFile, before: registry, after: registry.replace("// CLI_RESOURCE_IMPORTS", `import { ${model}Resource } from "../resources/definitions/${slug}";\n// CLI_RESOURCE_IMPORTS`).replace("// CLI_RESOURCE_ENTRIES", `{ kind: "resource", definition: ${model}Resource, panelIds: [${quote(panel)}] },\n  // CLI_RESOURCE_ENTRIES`) });
  await commitChanges(changes, !!values.preview, values.migration ? generateMigration : undefined); reportChanges(changes, values.json, values.preview);
}
