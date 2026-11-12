import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

const run = promisify(execFile);
export const kitFile = ".vibe-kit.json";
export const upstreamRemote = "kit";
const sha = /^[0-9a-f]{40}$/;
const remoteUrl = /^(https:\/\/|git@|ssh:\/\/|file:\/\/|\/)[^\s]+$/;
const kitOnly = [".planning", ".mcp.json", "DEVELOPMENT.md", "AGENT-BOOTSTRAP.md"]; // Mirrors copyTemplate exclusions that are tracked in git.

/** Records which kit commit a derived project started from; the merge base for future upgrades. */
export type KitInfo = { repository: string; branch: string; commit: string };

async function git(cwd: string, args: string[]) {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 64 * 1024 * 1024 });
  return stdout.trim();
}

/** Reads origin URL, branch and HEAD of the template checkout; null when it is not a git checkout. */
export async function readKitInfo(source: string): Promise<KitInfo | null> {
  try {
    const [repository, branch, commit] = await Promise.all([git(source, ["remote", "get-url", "origin"]), git(source, ["rev-parse", "--abbrev-ref", "HEAD"]), git(source, ["rev-parse", "HEAD"])]);
    return remoteUrl.test(repository) && sha.test(commit) && /^[\w./-]+$/.test(branch) ? { repository, branch: branch === "HEAD" ? "main" : branch, commit } : null;
  } catch { return null; }
}

export async function writeKitInfo(directory: string, info: KitInfo) {
  await writeFile(path.join(directory, kitFile), JSON.stringify(info, null, 2) + "\n", { flag: "wx" });
}

function parseKitInfo(raw: string): KitInfo {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error(`${kitFile} is invalid`);
  const { repository, branch, commit } = value as Record<string, unknown>;
  if (typeof repository !== "string" || !remoteUrl.test(repository) || typeof branch !== "string" || !/^[\w./-]+$/.test(branch) || typeof commit !== "string" || !sha.test(commit)) throw new Error(`${kitFile} is invalid`);
  return { repository, branch, commit };
}

/**
 * `vibe upgrade`: three-way merge of upstream kit changes into a derived project on a dedicated branch.
 * Git owns the merge; conflicts are left for the developer/agent (see .agents/skills/upgrade-kit). Never commits or pushes.
 */
export async function runUpgrade(argv: string[]) {
  const { values } = parseArgs({ args: argv, options: { ref: { type: "string" }, json: { type: "boolean" }, preview: { type: "boolean" } } });
  const cwd = process.cwd();
  const info = parseKitInfo(await readFile(path.join(cwd, kitFile), "utf8").catch(() => { throw new Error(`${kitFile} not found: run upgrade from a project created by \`vibe create\``); }));
  if (await git(cwd, ["status", "--porcelain"])) throw new Error("Working tree must be clean before upgrade");
  const target = values.ref ?? info.branch;
  if (!/^[\w./-]+$/.test(target)) throw new Error("Invalid --ref");
  const remotes = (await git(cwd, ["remote"])).split("\n");
  if (!remotes.includes(upstreamRemote)) await git(cwd, ["remote", "add", upstreamRemote, info.repository]);
  else if (await git(cwd, ["remote", "get-url", upstreamRemote]) !== info.repository) throw new Error(`Remote "${upstreamRemote}" points elsewhere than ${kitFile}.repository`);
  await git(cwd, ["fetch", "--no-tags", upstreamRemote, target]);
  const upstream = await git(cwd, ["rev-parse", "FETCH_HEAD"]);
  if (upstream === info.commit) { report(values.json, { status: "up-to-date", commit: upstream }); return; }
  await git(cwd, ["cat-file", "-e", `${info.commit}^{commit}`]).catch(() => { throw new Error(`Base commit ${info.commit} not in upstream history`); });
  const log = await git(cwd, ["log", "--oneline", `${info.commit}..${upstream}`]);
  const changedMigrations = (await git(cwd, ["diff", "--name-only", "--diff-filter=MDR", info.commit, upstream, "--", "packages/db/migrations/*.sql"])).split("\n").filter(Boolean);
  if (values.preview) { report(values.json, { status: "preview", from: info.commit, to: upstream, commits: log.split("\n"), changedMigrations }); return; }
  if (changedMigrations.length) throw new Error(`Upstream modified existing migrations (${changedMigrations.join(", ")}); escalate instead of merging. See .agents/skills/upgrade-kit/SKILL.md`);
  const branch = `chore/upgrade-kit-${upstream.slice(0, 7)}`;
  await git(cwd, ["switch", "-c", branch]);
  // Projects start as a copy without kit history: record the base as an ancestor once (tree unchanged), so git diffs base..upstream onto local work.
  if (!await git(cwd, ["merge-base", "HEAD", info.commit]).catch(() => "")) await git(cwd, ["merge", "-s", "ours", "--allow-unrelated-histories", "-m", `chore: adopt kit base ${info.commit.slice(0, 7)}`, info.commit]);
  const failure = await git(cwd, ["-c", "merge.conflictStyle=zdiff3", "merge", "--no-ff", "--no-commit", "--no-rerere-autoupdate", upstream]).then(() => null, (error: Error) => error);
  if (failure && !await git(cwd, ["rev-parse", "-q", "--verify", "MERGE_HEAD"]).catch(() => "")) throw failure; // Merge never started (not a conflict).
  // Kit-only files that `vibe create` never copies stay out, unless the project owns a file at that path.
  for (const file of (await git(cwd, ["diff", "--name-only", info.commit, upstream, "--", ...kitOnly])).split("\n").filter(Boolean)) {
    if (!await git(cwd, ["cat-file", "-e", `HEAD:${file}`]).then(() => true, () => false)) await git(cwd, ["rm", "-fq", "--ignore-unmatch", "--", file]);
  }
  const conflicts = (await git(cwd, ["diff", "--name-only", "--diff-filter=U"])).split("\n").filter(Boolean);
  // `git rm` above settles kit-only modify/delete conflicts; anything left is for the developer.
  await writeFile(path.join(cwd, kitFile), JSON.stringify({ ...info, branch: target, commit: upstream }, null, 2) + "\n");
  await git(cwd, ["add", kitFile]);
  report(values.json, { status: conflicts.length ? "conflicts" : "merged", branch, from: info.commit, to: upstream, conflicts, next: "Resolve per .agents/skills/upgrade-kit/SKILL.md, verify, then commit `chore: upgrade kit to <sha>`" });
}

function report(json: boolean | undefined, data: Record<string, unknown>) {
  console.log(json ? JSON.stringify(data, null, 2) : Object.entries(data).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join("\n  ") : String(value)}`).join("\n"));
}
