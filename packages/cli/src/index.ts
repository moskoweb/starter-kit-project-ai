#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createProject } from "./create.js";
import { profiles, assertSafeDestination, type Profile } from "./files.js";
import { runModel } from "./model.js";
import { readFile, access } from "node:fs/promises";
import { runResource } from "./resource.js";
import { runPanel } from "./panel.js";
import path from "node:path";

export const commands = { create: createProject, model: runModel, resource: runResource, panel: runPanel };
const help = `Usage: vibe <command>\n\nCommands:\n  create <dir> --profile <personal|organizations|hybrid> [--preview] [--json] [--noninteractive]\n    personal: registers panel app (/app); organizations: panel org (/org/<slug>); hybrid: both. Admin (/admin) always ships.\n  model <Name> --spec <JSON> [--preview] [--json] [--migration]\n  resource <Name> --model export --panel id --spec JSON-or-path [--with-model] [--migration] [--preview] [--json] [--noninteractive]\n  panel <id> --context global|personal|organization --prefix /path [--label text] [--identifier slug|uuid] [--preview] [--json] [--noninteractive]\n  doctor`;
export async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h") { console.log(help); return; }
  if (command === "doctor") {
    const checks: { name: string; ok: boolean }[] = [];
    for (const file of ["package.json", "pnpm-workspace.yaml", "packages/db/src/schema.ts", "packages/config/src/env.ts", "apps/app/src/lib/panels/registry.ts", "apps/app/src/lib/panels/resources.ts"]) checks.push({ name: file, ok: await access(file).then(() => true, () => false) });
    const pkg = JSON.parse(await readFile("package.json", "utf8").catch(() => "{}"));
    for (const script of ["dev", "build"]) checks.push({ name: `script:${script}`, ok: typeof pkg.scripts?.[script] === "string" });
    for (const key of ["DATABASE_URL", "MIGRATION_DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) checks.push({ name: `env:${key}`, ok: !!process.env[key] });
    console.log(JSON.stringify({ node: process.version, checks }, null, 2));
    if (checks.some(check => !check.ok)) process.exitCode = 1;
    return;
  }
  if (command === "create") {
    const { positionals, values } = parseArgs({ args, allowPositionals: true, options: { profile: { type: "string" }, preview: { type: "boolean" }, json: { type: "boolean" }, noninteractive: { type: "boolean" } } });
    const profile = values.profile;
    if (!positionals[0] || !profile || !(profiles as readonly string[]).includes(profile)) throw new Error("Usage: create <dir> --profile <personal|organizations|hybrid>");
    if (positionals.length !== 1) throw new Error("create requires exactly one destination");
    const target = await assertSafeDestination(positionals[0]);
    if (target === process.cwd() || target.startsWith(process.cwd() + path.sep)) throw new Error("Destination cannot be inside source template");
    const result = values.preview ? { directory: target, profile, preview: true } : { directory: await createProject(positionals[0], profile as Profile), profile, preview: false };
    console.log(values.json ? JSON.stringify(result, null, 2) : result.directory); return;
  }
  if (command === "model") { await runModel(args); return; }
  if (command === "resource") { await runResource(args); return; }
  if (command === "panel") { await runPanel(args); return; }
  throw new Error(`Unknown command: ${command}\n${help}`);
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
