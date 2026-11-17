import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const cli = path.join(root, "packages/cli/src/index.ts");
const seed = path.join(root, "packages/auth/src/scripts/seed-admin.ts");
const password = "synthetic-safe-password";
const run = (file: string, args: string[], env = process.env, input = `${password}\n`) => spawnSync(process.execPath, ["--import", "tsx", "--conditions=react-server", file, ...args], { cwd: root, env, input, encoding: "utf8" });
const args = ["make:admin", "--email", "admin@example.test", "--name", "Admin"];
for (const invalid of [[], ["--email", "a@b.test"], [...args.slice(1), "--password", password], [...args.slice(1), `--password=${password}`], [...args.slice(1), password]]) {
  const result = run(cli, ["make:admin", ...invalid]);
  assert.equal(result.status, 1);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(password));
}
const legacy = run(seed, ["--password", password]);
assert.equal(legacy.status, 1);
assert.ok(!legacy.stderr.includes(password));
const invalidSeed = run(seed, [], { ...process.env, ADMIN_EMAIL: "bad", ADMIN_NAME: "Admin", DATABASE_URL: "" });
assert.equal(invalidSeed.status, 1);
assert.match(invalidSeed.stderr, /Email inválido/);
const tmp = await mkdtemp(path.join(os.tmpdir(), "vibe-admin-check-"));
try {
  const stub = path.join(tmp, "pnpm");
  await writeFile(stub, `#!${process.execPath}
const assert = require('node:assert/strict');
assert.deepEqual(process.argv.slice(2), ['--filter', '@vibe/auth', 'seed:admin']);
assert.equal(process.env.ADMIN_EMAIL, 'admin@example.test');
assert.equal(process.env.ADMIN_NAME, 'Admin; $(touch SHOULD_NOT_EXIST)');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  assert.equal(input, 'synthetic-safe-password\\n');
  process.exit(Number(process.env.CHECK_EXIT));
});
`);
  await chmod(stub, 0o700);
  for (const status of [0, 7, 23]) {
    const result = run(cli, [...args.slice(0, -1), "Admin; $(touch SHOULD_NOT_EXIST)"], { ...process.env, PATH: `${tmp}:${process.env.PATH}`, CHECK_EXIT: String(status) });
    assert.equal(result.status, status, result.stderr);
    assert.ok(!`${result.stdout}${result.stderr}`.includes(password));
  }
  const missing = run(cli, args, { ...process.env, PATH: tmp + "/missing" });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Não foi possível executar/);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
console.log("make:admin check passed (argv rejection, stdin/env forwarding, no shell, exit codes).");
