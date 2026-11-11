import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function pendingScopeProtections(dbDirectory) {
  const directory = path.join(dbDirectory, "scope-protections");
  const manifest = JSON.parse(await readFile(path.join(dbDirectory, "migrations/meta/scope-protections.json"), "utf8").catch(error => { if (error.code === "ENOENT") return "{}"; throw error; }));
  const entries = await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; });
  const pending = [];
  for (const entry of entries) {
    const name = entry.name;
    if (!entry.isFile() || !/^[a-z][a-z0-9_]*\.sql$/.test(name)) throw new Error(`Invalid scope protection: ${name}`);
    const sql = await readFile(path.join(directory, name), "utf8"), hash = createHash("sha256").update(sql).digest("hex");
    if (manifest[name] && manifest[name] !== hash) throw new Error(`Scope protection changed after migration generation: ${name}`);
    if (!manifest[name]) pending.push({ name, sql, hash });
  }
  for (const name of Object.keys(manifest)) if (!entries.some(entry => entry.name === name)) throw new Error(`Missing scope protection source: ${name}`);
  return { manifest, pending };
}
