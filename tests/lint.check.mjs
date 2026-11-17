import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { ESLint } from "eslint";

const root = process.cwd();
const directory = await mkdtemp(path.join(root, ".lint-check-"));
const eslint = new ESLint({ cache: false });
try {
  const fixture = path.join(directory, "fixture.tsx");
  const lint = () => {
    const result = spawnSync("pnpm", ["exec", "oxlint", "--max-warnings=0", fixture], { cwd: root, encoding: "utf8" });
    assert.equal(result.error, undefined);
    return result;
  };
  await writeFile(fixture, "export const identity = (value: any) => value;\n");
  const invalid = lint();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout + invalid.stderr, /no-explicit-any/);
  await writeFile(fixture, "export const identity = (value: string, _unused: string) => value;\n");
  assert.equal(lint().status, 0);
  const config = await eslint.calculateConfigForFile("apps/app/src/components/panels/team-switcher.tsx");
  assert.equal(config.rules["@typescript-eslint/no-explicit-any"][0], 0);
  for (const rule of ["react-hooks/rules-of-hooks", "react-hooks/purity", "jsx-a11y/alt-text", "@next/next/no-html-link-for-pages", "prefer-const"]) assert.notEqual(config.rules[rule][0], 0, rule);
  const ui = await eslint.calculateConfigForFile("packages/ui/src/components/button.tsx");
  assert.equal(ui.rules["react-hooks/purity"][0], 0);
  const cjs = await eslint.calculateConfigForFile("packages/email/preload.cjs");
  assert.equal(cjs.rules["@typescript-eslint/no-require-imports"][0], 0);
  const [result] = await eslint.lintText('export function ImageExample() { return <img src="/test.png" />; }', { filePath: fixture });
  assert.ok(result.messages.some(message => message.ruleId === "jsx-a11y/alt-text"));
  console.log("lint check passed: Oxlint rejects any, permits underscore; residual a11y/Next/Hooks and overrides retained.");
} finally { await rm(directory, { recursive: true, force: true }); }
