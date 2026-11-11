import { lstat, mkdir, readdir, readFile, rm, writeFile, rename } from "node:fs/promises";
import path from "node:path";

export async function snapshotFiles(directory: string): Promise<Map<string, Buffer | null>> {
  const files = new Map<string, Buffer | null>();
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Expected real directory: ${directory}`);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.set(file, null);
      for (const [key, value] of await snapshotFiles(file)) files.set(key, value);
    } else if (entry.isFile()) files.set(file, await readFile(file));
    else throw new Error(`Unsupported migration entry: ${file}`);
  }
  return files;
}

export async function restoreFiles(directory: string, before: Map<string, Buffer | null>) {
  const after = await snapshotFiles(directory);
  for (const [file, content] of [...after].reverse()) {
    if (!before.has(file)) await rm(file, { recursive: content === null });
  }
  for (const [file, content] of before) {
    if (content === null) await mkdir(file, { recursive: true });
    else await writeFile(file, content);
  }
}
export const profiles = ["personal", "organizations", "hybrid"] as const;
export type Profile = (typeof profiles)[number];

export async function assertSafeDestination(destination: string) {
  const target = path.resolve(destination);
  let ancestor = path.dirname(target);
  while (true) {
    const info = await lstat(ancestor);
    if (info.isSymbolicLink()) throw new Error(`Destination has symlink ancestor: ${ancestor}`);
    if (ancestor === path.dirname(ancestor)) break;
    ancestor = path.dirname(ancestor);
  }
  try {
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new Error(`Destination cannot be symlink: ${target}`);
    if (!info.isDirectory() || (await readdir(target)).length) throw new Error(`Destination exists and is not empty: ${target}`);
    throw new Error(`Destination already exists: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return target;
}

const excluded = new Set([".git", ".planning", "node_modules", ".next", ".turbo", "dist", ".codegraph", ".env", "DEVELOPMENT.md", "AGENT-BOOTSTRAP.md"]);
export async function copyTemplate(source: string, destination: string, profile: Profile) {
  const root = path.resolve(source);
  async function visit(from: string, to: string) {
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      if (from === root && entry.name === "AGENTS.md") continue;
      if (excluded.has(entry.name) || (entry.name.startsWith(".env") && entry.name !== ".env.example") || entry.name.endsWith(".tsbuildinfo")) continue;
      const src = path.join(from, entry.name), dest = path.join(to, entry.name);
      if (src === path.resolve(destination) || path.resolve(src).startsWith(path.resolve(destination) + path.sep)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await visit(src, dest);
      else if (entry.isFile()) await writeFile(dest, await readFile(src), { flag: "wx" });
    }
  }
  await visit(root, destination);
  const agents = `# Starter kit — agent instructions\n\n## Product and architecture\nIndependent starter kit for AI-assisted projects. Stack: Next.js, TypeScript, Turborepo, PostgreSQL, Drizzle, Better Auth, Tailwind and shadcn/ui. Profiles: personal, organizations and hybrid. Model is Drizzle schema; resource composes UI and operations. Do not build custom ORM or CMS.\n\n## Implementation\nReuse local code and installed libraries. Keep server authorization in every operation; treat URLs, submitted fields and tool arguments as untrusted. Apply scope to queries, relations, caches, files, jobs and AI tools. UUID is not authorization. Generate migrations with Drizzle; apply separately. Never overwrite customizations or applied history without consent. Keep secrets server-side.\n\n## Skills and tools\nRead applicable skill instructions before using a skill. Verify tool availability and inspect scripts/references before execution. Code indexes do not replace source reading or verification. Do not claim external services are connected without evidence.\n\n## Verification and operations\nUse the smallest sufficient checks; test negative authorization cases. Inspect UI changes and verify external integrations against real services. Preserve user changes and services. Never copy source infrastructure credentials, planning history or machine-specific paths into this project.\n`;
  await writeFile(path.join(destination, "AGENTS.md"), agents, { flag: "wx" });
  const env = path.join(destination, ".env.example");
  const content = await readFile(env, "utf8").catch(() => "");
  const kept = content.split(/\r?\n/).filter(line => !/^IDENTITY_PROFILE=/.test(line));
  await writeFile(env, [...kept, `IDENTITY_PROFILE=${profile}`, ""].join("\n"), { flag: "w" });
}

export async function withStaging<T>(target: string, work: (stage: string) => Promise<T>): Promise<T> {
  const stage = `${target}.tmp-${process.pid}-${Date.now()}`;
  try {
    await mkdir(stage, { recursive: false });
    const result = await work(stage);
    await rename(stage, target);
    return result;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}
