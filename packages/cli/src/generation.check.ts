import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderScopeProtection } from "./model.js";
import { snapshotFiles, restoreFiles } from "./files.js";
import { pendingScopeProtections } from "../../db/src/scope-protections.mjs";

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
  await writeFile(path.join(migrations, "meta/scope-protections.json"), JSON.stringify({ "note.sql": pending[0].hash }));
  assert.equal((await pendingScopeProtections(directory)).pending.length, 0);
  await writeFile(path.join(directory, "scope-protections/note.sql"), sql + "\n");
  await assert.rejects(pendingScopeProtections(directory), /changed after migration generation/);
  assert.equal(await readFile(path.join(migrations, "0000_existing.sql"), "utf8"), "existing");
} finally {
  await rm(directory, { recursive: true, force: true });
}
