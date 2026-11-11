import { parseArgs } from "node:util";
import { readFile, writeFile, mkdir, unlink, rmdir, lstat } from "node:fs/promises";
import path from "node:path";

export type Change = { file: string; before: string | null; after: string };
export async function commitChanges(changes: Change[], preview: boolean, afterWrite?: () => Promise<void>) {
  if (new Set(changes.map(change => change.file)).size !== changes.length) throw new Error("Duplicate output path");
  for (const change of changes) {
    const root = process.cwd();
    const target = path.resolve(change.file);
    if (!target.startsWith(root + path.sep)) throw new Error("Output must remain inside project");
    let cursor = target;
    while (cursor !== root) {
      const info = await lstat(cursor).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error("Generator output cannot traverse symlinks");
      cursor = path.dirname(cursor);
    }
    const current = await readFile(change.file, "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
    if (current !== change.before) throw new Error(`Output exists or changed: ${change.file}`);
  }
  if (preview) return;
  const lock = path.resolve(".vibe-cli.lock");
  await mkdir(lock); // Shared lock prevents concurrent generator writes.
  const written: Change[] = [];
  const createdDirectories: string[] = [];
  try {
    for (const change of changes) {
      const current = await readFile(change.file, "utf8").catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
      if (current !== change.before) throw new Error(`Output changed: ${change.file}`);
      const missing: string[] = [];
      let directory = path.dirname(path.resolve(change.file));
      while (!(await lstat(directory).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; }))) {
        missing.push(directory);
        directory = path.dirname(directory);
      }
      for (const item of missing.reverse()) { await mkdir(item); createdDirectories.push(item); }
      await writeFile(change.file, change.after, { flag: change.before === null ? "wx" : "w" });
      written.push(change);
    }
    await afterWrite?.();
  } catch (error) {
    for (const change of written.reverse()) {
      const current = await readFile(change.file, "utf8").catch(() => null);
      if (current !== change.after) continue;
      if (change.before === null) await unlink(change.file); else await writeFile(change.file, change.before);
    }
    for (const directory of createdDirectories.reverse()) await rmdir(directory);
    throw error;
  } finally { await rmdir(lock); }
}
export function reportChanges(changes: Change[], json = false, preview = false) {
  console.log(json ? JSON.stringify({ preview, files: changes.map(({ file, after }) => ({ file, content: after })) }, null, 2) : changes.map(change => preview ? `--- ${change.file}\n${change.after}` : change.file).join("\n"));
}
export async function runPanel(argv: string[]) {
  const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { context: { type: "string" }, prefix: { type: "string" }, identifier: { type: "string", default: "slug" }, preview: { type: "boolean" }, json: { type: "boolean" }, noninteractive: { type: "boolean" } } });
  const id = positionals[0], context = values.context, prefix = values.prefix;
  if (!["slug", "uuid"].includes(values.identifier)) throw new Error("identifier must be slug or uuid");
  if (positionals.length !== 1 || !id || !/^[a-z][a-z0-9_-]*$/.test(id) || !["global", "personal", "organization"].includes(context ?? "") || !prefix || !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(prefix)) throw new Error("Usage: panel id --context global|personal|organization --prefix /path [--preview] [--json] [--noninteractive]");
  const file = "apps/app/src/lib/panels/registry.ts", before = await readFile(file, "utf8");
  const marker = "export const registry: readonly PanelConfig[] = validatePanels([";
  if (before.split(marker).length !== 2) throw new Error("Panel registry shape changed; refusing unsafe registration");
  let registered = before;
  for (const match of before.matchAll(/from ["']\.\/([^"']+\.config)["']/g)) registered += await readFile(`apps/app/src/lib/panels/${match[1]}.ts`, "utf8");
  const ids = [...registered.matchAll(/["']?\bid["']?:\s*["']([^"']+)["']/g)].map(match => match[1]);
  const prefixes = [...registered.matchAll(/["']?\bprefix["']?:\s*["']([^"']+)["']/g)].map(match => match[1]);
  const reservedBlock = before.match(/export const reservedPanelRoutes = \[([\s\S]*?)\] as const;/);
  if (!reservedBlock) throw new Error("Reserved route declaration missing");
  const reserved = [...reservedBlock[1].matchAll(/["']([^"']+)["']/g)].map(match => `/${match[1]}`);
  if (ids.includes(id) || [...prefixes, ...reserved].some(value => value === prefix || value.startsWith(`${prefix}/`) || prefix.startsWith(`${value}/`))) throw new Error("Panel id or prefix conflicts with existing routes");
  const configFile = `apps/app/src/lib/panels/${id}.config.ts`;
  const symbol = `panel_${id.replace(/-/g, "$")}`;
  const changes: Change[] = [
    { file: configFile, before: null, after: `import type { PanelConfig } from "./registry";\nexport const ${symbol} = { id: ${JSON.stringify(id)}, label: ${JSON.stringify(id)}, prefix: ${JSON.stringify(prefix)}, context: ${JSON.stringify(context)}${context === "organization" ? `, tenantIdentifier: ${JSON.stringify(values.identifier)}` : ""} } satisfies PanelConfig;\n` },
    { file, before, after: `import { ${symbol} } from "./${id}.config";\n${before.replace(marker, `${marker}\n  ${symbol},`)}` },
  ];
  await commitChanges(changes, !!values.preview); reportChanges(changes, values.json, values.preview);
}
