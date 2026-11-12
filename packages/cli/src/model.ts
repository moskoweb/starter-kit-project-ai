import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { commitChanges, reportChanges } from "./panel.js";
import { snapshotFiles, restoreFiles } from "./files.js";
import { pendingScopeProtections } from "../../db/src/scope-protections.mjs";

export type FieldType = "string" | "text" | "integer" | "boolean" | "timestamp" | "uuid";
export type ModelSpec = { scope: "personal" | "organizations" | "hybrid"; fields: Record<string, { type: FieldType; required?: boolean; optional?: boolean; default?: string | number | boolean }> };
const types: Record<FieldType, true> = { string: true, text: true, integer: true, boolean: true, timestamp: true, uuid: true };
const scopes: Record<string, true> = { personal: true, organizations: true, hybrid: true };
const reserved: Record<string, true> = { id: true, organizationId: true, ownerUserId: true };
export function parseModelSpec(value: string): ModelSpec {
  const spec: unknown = JSON.parse(value);
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new Error("Spec must be object");
  const s = spec as Record<string, unknown>;
  if (typeof s.scope !== "string" || !Object.hasOwn(scopes, s.scope)) throw new Error("scope must be personal, organizations, or hybrid");
  if (!s.fields || typeof s.fields !== "object" || Array.isArray(s.fields)) throw new Error("fields must be object");
  for (const [name, raw] of Object.entries(s.fields)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name) || Object.hasOwn(reserved, name) || !raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Invalid or reserved field: ${name}`);
    const field = raw as Record<string, unknown>;
    if (Object.keys(field).some(key => !["type", "required", "optional", "default"].includes(key))) throw new Error(`Unknown property for ${name}`);
    if (typeof field.type !== "string" || !Object.hasOwn(types, field.type)) throw new Error(`Invalid type for ${name}`);
    if ((field.required !== undefined && typeof field.required !== "boolean") || (field.optional !== undefined && typeof field.optional !== "boolean") || (field.required === true && field.optional === true)) throw new Error(`Invalid required/optional for ${name}`);
    if (field.default !== undefined && !["string", "number", "boolean"].includes(typeof field.default)) throw new Error(`Invalid default for ${name}`);
    if (field.type === "integer" && field.default !== undefined && !Number.isInteger(field.default)) throw new Error(`Invalid integer default for ${name}`);
    if (field.type === "boolean" && field.default !== undefined && typeof field.default !== "boolean") throw new Error(`Invalid boolean default for ${name}`);
    if (["string", "text", "uuid", "timestamp"].includes(field.type) && field.default !== undefined && typeof field.default !== "string") throw new Error(`Invalid string default for ${name}`);
    if (field.type === "timestamp" && field.default !== undefined && Number.isNaN(Date.parse(field.default as string))) throw new Error(`Invalid timestamp default for ${name}`);
    if (field.type === "uuid" && field.default !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(field.default as string)) throw new Error(`Invalid UUID default for ${name}`);
  }
  return s as unknown as ModelSpec;
}
function ident(name: string) { return name.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`).replace(/^_/, ""); }
export function renderModel(name: string, spec: ModelSpec) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error("Model name must be PascalCase identifier");
  const fields = Object.entries(spec.fields);
  const funcs: Record<FieldType, string> = { string: "varchar", text: "text", integer: "integer", boolean: "boolean", timestamp: "timestamp", uuid: "uuid" };
  const imports = new Set(["uuid", ...fields.map(([, field]) => funcs[field.type])]);
  const lines = fields.map(([key, field]) => {
    const builders: Record<FieldType, string> = { string: `varchar("${ident(key)}", { length: 255 })`, text: `text("${ident(key)}")`, integer: `integer("${ident(key)}")`, boolean: `boolean("${ident(key)}")`, timestamp: `timestamp("${ident(key)}", { withTimezone: true, mode: "date" })`, uuid: `uuid("${ident(key)}")` };
    let value = builders[field.type];
    if (field.default !== undefined) value += field.type === "timestamp" ? `.default(new Date(${JSON.stringify(field.default)}))` : `.default(${JSON.stringify(field.default)})`;
    if (field.required || (!field.optional && field.default === undefined)) value += ".notNull()";
    return `  ${key}: ${value},`;
  });
  const table = ident(name), personalAllowed = spec.scope !== "organizations", tenantAllowed = spec.scope !== "personal", organizationRequired = spec.scope === "organizations";
  imports.add("pgPolicy");
  const header = `import { pgTable, ${[...imports].sort().join(", ")} } from "drizzle-orm/pg-core";\nimport { sql } from "drizzle-orm";\nimport { organization, user } from "./auth-schema";`;
  const scopeFields = `  organizationId: uuid("organization_id")${organizationRequired ? ".notNull()" : ""}.references(() => organization.id, { onDelete: "cascade" }),\n  ownerUserId: uuid("owner_user_id").references(() => user.id, { onDelete: "set null" }),\n`;
  const personalCond = personalAllowed ? "  const personal = sql`${currentTenant} is null and ${table.organizationId} is null and ${table.ownerUserId} = ${currentUser}`;\n" : "";
  const tenantCond = tenantAllowed ? "  const tenant = sql`${currentTenant} is not null and ${table.organizationId} = ${currentTenant} and exists (select 1 from member m where m.organization_id = ${currentTenant} and m.user_id = ${currentUser})`;\n" : "";
  const needsTenant = personalAllowed || tenantAllowed;
  const tenantDecl = needsTenant ? "  const currentTenant = sql`nullif(current_setting('app.current_tenant_id', true), '')::uuid`;\n" : "";
  const policy = `\n}, (table) => {\n  const currentUser = sql\`nullif(current_setting('app.current_user_id', true), '')::uuid\`;\n${tenantDecl}${personalCond}${tenantCond}  const scope = sql\`\${currentUser} is not null and (${personalAllowed ? "${personal}" : "false"} or ${tenantAllowed ? "${tenant}" : "false"})\`;\n  return [pgPolicy("${table}_read", { for: "select", to: "public", using: scope }), pgPolicy("${table}_create", { for: "insert", to: "public", withCheck: sql\`(\${scope}) and \${table.ownerUserId} = \${currentUser}\` }), pgPolicy("${table}_update", { for: "update", to: "public", using: scope, withCheck: scope }), pgPolicy("${table}_delete", { for: "delete", to: "public", using: scope })];\n}).enableRLS();`;
  return `${header}\n\nexport const ${name[0].toLowerCase()}${name.slice(1)} = pgTable("${table}", {\n  id: uuid("id").defaultRandom().primaryKey(),\n${scopeFields}${lines.join("\n")}${policy}\n`;
}
export function renderScopeProtection(name: string) {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error("Model name must be PascalCase identifier");
  const table = ident(name);
  return `CREATE FUNCTION public."${table}_immutable_scope"() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  -- Owner may only be cleared (account deletion sets it NULL); never reassigned.
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id OR (OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id AND NEW.owner_user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Scope identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public."${table}_immutable_scope"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER immutable_scope BEFORE UPDATE ON public."${table}"
FOR EACH ROW EXECUTE FUNCTION public."${table}_immutable_scope"();
--> statement-breakpoint
-- Deleting a user keeps organization rows (owner becomes NULL) and removes that user's personal rows.
CREATE FUNCTION public."${table}_drop_orphan"() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM public."${table}" WHERE id = NEW.id;
  RETURN NULL;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public."${table}_drop_orphan"() FROM PUBLIC;
--> statement-breakpoint
CREATE TRIGGER drop_orphan AFTER UPDATE OF owner_user_id ON public."${table}"
FOR EACH ROW WHEN (NEW.owner_user_id IS NULL AND NEW.organization_id IS NULL) EXECUTE FUNCTION public."${table}_drop_orphan"();
`;
}
export async function assertMigrationOutput() {
  const config = await readFile("packages/db/drizzle.config.ts", "utf8");
  if (!/out:\s*["']\.\/migrations["']/.test(config)) throw new Error("Migration requires standard ./migrations output");
  await snapshotFiles("packages/db/migrations");
}
async function drizzle(args: string[] = []) {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const child = spawn("pnpm", ["exec", "drizzle-kit", "generate", ...args], { cwd: path.resolve("packages/db"), shell: false, stdio: "inherit" });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? resolve() : reject(new Error(`drizzle generate exited ${code}`)));
  await promise;
}
export async function generateMigration() {
  await assertMigrationOutput();
  const directory = "packages/db/migrations", before = await snapshotFiles(directory);
  try {
    const { manifest, pending } = await pendingScopeProtections(path.resolve("packages/db"));
    await drizzle();
    for (const protection of pending) {
      const journalFile = path.join(directory, "meta/_journal.json");
      const oldJournal = JSON.parse(await readFile(journalFile, "utf8")) as { entries: { tag: string }[] };
      await drizzle(["--custom", "--name", `${protection.name.slice(0, -4)}_scope`]);
      const journal = JSON.parse(await readFile(journalFile, "utf8")) as { entries: { tag: string }[] };
      const tag = journal.entries.at(-1)?.tag;
      if (!tag || !/^[a-zA-Z0-9_-]+$/.test(tag) || journal.entries.length !== oldJournal.entries.length + 1 || before.has(path.join(directory, `${tag}.sql`))) throw new Error("Custom migration was not appended safely");
      await writeFile(path.join(directory, `${tag}.sql`), protection.sql);
      manifest[protection.name] = protection.hash;
    }
    for (const [file, content] of before) {
      if (content !== null && file.endsWith(".sql") && !(await readFile(file)).equals(content)) throw new Error(`Existing migration changed: ${file}`);
    }
    await writeFile("packages/db/migrations/scope-protections.json", JSON.stringify(manifest, null, 2) + "\n");
  } catch (error) {
    await restoreFiles(directory, before);
    throw error;
  }
}
export async function runModel(argv: string[]) {
  const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { spec: { type: "string" }, preview: { type: "boolean" }, json: { type: "boolean" }, migration: { type: "boolean" } } });
  if (!positionals[0] || !values.spec) throw new Error("Usage: model Name --spec JSON [--preview] [--json] [--migration]");
  const spec = parseModelSpec(values.spec), code = renderModel(positionals[0], spec);
  if (positionals.length !== 1) throw new Error("Expected one model name");
  if (values.migration) await assertMigrationOutput();
  // Preview runs the same destination checks without writing files.
  const dbDir = path.resolve("packages/db"), sourceDir = path.join(dbDir, "src");
  const file = path.join(sourceDir, `${positionals[0][0].toLowerCase()}${positionals[0].slice(1)}-schema.ts`);
  const aggregator = path.join(sourceDir, "schema.ts");
  const exportLine = `export * from "./${path.basename(file, ".ts")}";`;
  const schema = await readFile(aggregator, "utf8");
  if (schema.split(/\r?\n/).some(line => line.trim() === exportLine)) throw new Error(`Schema already registered: ${exportLine}`);
  const changes = [{ file, before: null, after: code }, { file: aggregator, before: schema, after: `${schema}${schema.endsWith("\n") ? "" : "\n"}${exportLine}\n` }, { file: path.join(dbDir, "scope-protections", `${ident(positionals[0])}.sql`), before: null, after: renderScopeProtection(positionals[0]) }];
  await commitChanges(changes, !!values.preview, values.migration ? generateMigration : undefined);
  reportChanges(changes, !!values.json, !!values.preview);
}
