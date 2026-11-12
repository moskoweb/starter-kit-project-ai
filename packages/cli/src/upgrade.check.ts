import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProject } from "./create.js";
import { runUpgrade } from "./upstream.js";

// CI runners have no git identity; this check and the merge commit `runUpgrade` creates use a throwaway one.
Object.assign(process.env, { GIT_AUTHOR_NAME: "check", GIT_AUTHOR_EMAIL: "check@vibe.test", GIT_COMMITTER_NAME: "check", GIT_COMMITTER_EMAIL: "check@vibe.test", GIT_CONFIG_NOSYSTEM: "1" });
const g = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim();
const tmp = await mkdtemp(path.join(os.tmpdir(), "vibe-upgrade-")), kit = path.join(tmp, "kit"), project = path.join(tmp, "project"), cwd = process.cwd();
const log = console.log;
try {
  await mkdir(path.join(kit, "apps/app/src/lib/panels"), { recursive: true });
  await mkdir(path.join(kit, ".planning"));
  await mkdir(path.join(kit, "packages/db/migrations"), { recursive: true });
  await writeFile(path.join(kit, "apps/app/src/lib/panels/registry.ts"), 'export const reservedPanelRoutes = ["api"] as const;\nexport const registry: readonly PanelConfig[] = validatePanels([\n  { id: "admin", label: "Admin", prefix: "/admin", context: "global" },\n]);\n');
  await writeFile(path.join(kit, "lib.ts"), "a\nb\nc\n");
  await writeFile(path.join(kit, ".planning/x.md"), "1");
  await writeFile(path.join(kit, "packages/db/migrations/0000.sql"), "s");
  g(kit, "init", "-qb", "main"); g(kit, "add", "-A"); g(kit, "commit", "-qm", "v1"); g(kit, "remote", "add", "origin", kit);

  await createProject(project, "personal", kit);
  assert.equal(JSON.parse(await readFile(path.join(project, ".vibe-kit.json"), "utf8")).commit, g(kit, "rev-parse", "HEAD"), "create records kit base");
  g(project, "init", "-qb", "main"); g(project, "add", "-A"); g(project, "commit", "-qm", "init");
  await writeFile(path.join(project, "lib.ts"), "LOCAL\nb\nc\n"); g(project, "commit", "-qam", "local");

  await writeFile(path.join(kit, "lib.ts"), "a\nb\nUPSTREAM\n");
  await writeFile(path.join(kit, "new.ts"), "n");
  await writeFile(path.join(kit, ".planning/x.md"), "2");
  g(kit, "add", "-A"); g(kit, "commit", "-qm", "v2");
  console.log = () => {};
  process.chdir(project);
  await runUpgrade([]);
  assert.equal(await readFile("lib.ts", "utf8"), "LOCAL\nb\nUPSTREAM\n", "three-way merge keeps local and upstream edits");
  assert.equal(await readFile("new.ts", "utf8"), "n");
  assert.equal(g(project, "ls-files", ".planning"), "", "kit-only paths stay out");
  assert.equal(JSON.parse(await readFile(".vibe-kit.json", "utf8")).commit, g(kit, "rev-parse", "HEAD"), "base advances");
  g(project, "commit", "-qm", "upgrade"); g(project, "switch", "-q", "main"); g(project, "merge", "-q", "--ff-only", `chore/upgrade-kit-${g(kit, "rev-parse", "--short=7", "HEAD")}`);

  await writeFile(path.join(kit, "packages/db/migrations/0000.sql"), "changed"); g(kit, "commit", "-qam", "v3");
  await assert.rejects(runUpgrade([]), /modified existing migrations/, "applied migrations are immutable");
  await writeFile("dirty.txt", "x");
  await assert.rejects(runUpgrade([]), /clean/);
} finally {
  console.log = log;
  process.chdir(cwd);
  await rm(tmp, { recursive: true, force: true });
}
