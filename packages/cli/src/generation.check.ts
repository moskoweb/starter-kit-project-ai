import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderScopeProtection } from "./model.js";
import { snapshotFiles, restoreFiles, copyTemplate, withStaging, assertSafeDestination } from "./files.js";
import { pendingScopeProtections } from "../../db/src/scope-protections.mjs";
import { runPanel } from "./panel.js";
import { runResource } from "./resource.js";

// Run from repository root: pnpm exec tsx packages/cli/src/generation.check.ts
const directory = await mkdtemp(path.join(os.tmpdir(), "vibe-generation-"));
try {
  const migrations = path.join(directory, "migrations");
  await mkdir(path.join(migrations, "meta"), { recursive: true });
  await writeFile(path.join(migrations, "0000_existing.sql"), "existing");
  const before = await snapshotFiles(migrations);
  await writeFile(path.join(migrations, "0000_existing.sql"), "changed");
  await mkdir(path.join(migrations, "new"));
  await writeFile(path.join(migrations, "new/partial.sql"), "partial");
  await restoreFiles(migrations, before);
  assert.deepEqual(await snapshotFiles(migrations), before);
  await mkdir(path.join(directory, "scope-protections"));
  const sql = renderScopeProtection("Note");
  await writeFile(path.join(directory, "scope-protections/note.sql"), sql);
  const { pending } = await pendingScopeProtections(directory);
  assert.equal(pending.length, 1);
  await writeFile(path.join(migrations, "scope-protections.json"), JSON.stringify({ "note.sql": pending[0].hash }));
  assert.equal((await pendingScopeProtections(directory)).pending.length, 0);
  await writeFile(path.join(directory, "scope-protections/note.sql"), sql + "\n");
  await assert.rejects(pendingScopeProtections(directory), /changed after migration generation/);
  assert.equal(await readFile(path.join(migrations, "0000_existing.sql"), "utf8"), "existing");
  const source = path.join(directory, "source"), target = path.join(directory, "project");
  await mkdir(source);
  await writeFile(path.join(source, ".env.example"), "IDENTITY_PROFILE=personal\n");
  for (const name of [".astro", ".vibe-cli.lock"]) await mkdir(path.join(source, name));
  await writeFile(path.join(source, ".mcp.json"), "{}");
  await symlink(source, path.join(source, "linked"));
  await withStaging(target, stage => copyTemplate(source, stage, "hybrid"));
  const copied = await snapshotFiles(target);
  for (const name of [".astro", ".vibe-cli.lock", ".mcp.json", "linked"]) assert.equal(copied.has(path.join(target, name)), false);
  assert.match(await readFile(path.join(target, ".env.example"), "utf8"), /IDENTITY_PROFILE=hybrid/);
  await assert.rejects(assertSafeDestination(path.join(source, "linked", "child")), /symlink ancestor/);
  const failed = path.join(directory, "failed");
  await assert.rejects(withStaging(failed, async () => { throw new Error("stop"); }), /stop/);
  const cwd = process.cwd();
  try {
    process.chdir(target);
    await mkdir("apps/app/src/lib/panels", { recursive: true });
    await writeFile("apps/app/src/lib/panels/registry.ts", 'export const reservedPanelRoutes = ["api"] as const;\nexport const registry: readonly PanelConfig[] = validatePanels([\n]);\n');
    await runPanel(["ops-2", "--context", "global", "--prefix", "/ops-2"]);
    assert.match(await readFile("apps/app/src/lib/panels/ops-2.config.ts", "utf8"), /export const panel_ops\$2 =/);
    await writeFile("apps/app/src/lib/panels/registry.ts", 'export const registry: readonly PanelConfig[] = validatePanels([\n  { id: "personal", label: "Personal", prefix: "/app", context: "personal" },\n]);\n');
    await writeFile("apps/app/src/lib/panels/resources.ts", "// CLI_RESOURCE_IMPORTS\nexport const resourceRegistry = [\n  // CLI_RESOURCE_ENTRIES\n];\n");
    await mkdir("packages/db/src", { recursive: true });
    await writeFile("packages/db/src/schema.ts", 'export * from "./auth-schema";\n');
    await writeFile("packages/db/src/auth-schema.ts", "");
    const spec = JSON.stringify({ scope: "personal", fields: { title: { type: "string", required: true }, done: { type: "boolean", default: false } }, permissions: { read: ["personal"], create: ["personal"], update: ["personal"], delete: ["personal"] } });
    await runResource(["Note", "--model", "note", "--panel", "personal", "--with-model", "--spec", spec]);
    const generated = await readFile("apps/app/src/lib/resources/definitions/note.ts", "utf8");
    assert.match(generated, /export const noteResource = defineResource\(/);
    assert.match(generated, /if \(!can\(role, operation\)\) throw new Error\("FORBIDDEN"\)/, "generated resource enforces declared roles inside tenant transaction");
    assert.match(generated, /inputSchema\.safeParse\(values\)/, "generated mutations validate input on the server");
    assert.match(await readFile("apps/app/src/lib/panels/resources.ts", "utf8"), /\{ kind: "resource", definition: noteResource, panelIds: \["personal"\] \}/);
    await assert.rejects(runResource(["Note", "--model", "note", "--panel", "personal", "--spec", spec]), /already registered/);
  } finally { process.chdir(cwd); }
} finally {
  await rm(directory, { recursive: true, force: true });
}
