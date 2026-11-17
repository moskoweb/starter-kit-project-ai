// Run from project root: node .agents/skills/shadcn/scripts/local-tooling.check.mjs [created-project]
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const lock = JSON.parse(read("skills-lock.json"));
for (const name of ["shadcn", "reui"]) {
  const content = read(`.agents/skills/${name}/SKILL.md`);
  assert.equal(createHash("sha256").update(content).digest("hex"), lock.skills[name].localSkillSha256, `${name}: reviewed local hash`);
  assert.match(content, /shadcn primeiro|shadcn First|depois buscar shadcn/);
  assert.match(content, /ReUI segundo|Se shadcn não atender, consultar ReUI/);
}
const config = JSON.parse(read(".mcp.json")).mcpServers;
assert.equal(config.shadcn.command, "pnpm");
assert.deepEqual(config.shadcn.args, ["dlx", "shadcn@4.23.0", "mcp", "--cwd", "apps/app"]);
assert.equal(config.reui.type, "http");
assert.equal(config.reui.url, "https://mcp.reui.io?style=base-nova");
assert.match(read("AGENTS.md"), /shadcn First/);
assert.match(read("AGENTS.md"), /ReUI segundo/);
for (const file of ["apps/app/components.json", "packages/ui/components.json"]) {
  const components = JSON.parse(read(file));
  assert.equal(components.style, "base-nova");
  assert.equal(components.registries["@reui"], "https://reui.io/r/{style}/{name}.json");
}
console.log("Local UI tooling policy, hashes and MCP config passed");
