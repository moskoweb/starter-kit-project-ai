import path from "node:path";
import { assertSafeDestination, copyTemplate, type Profile, withStaging } from "./files.js";

export async function createProject(directory: string, profile: Profile, source = process.cwd()) {
  const target = await assertSafeDestination(directory);
  const root = path.resolve(source);
  if (target === root || target.startsWith(root + path.sep)) throw new Error("Destination cannot be inside source template");
  await withStaging(target, stage => copyTemplate(root, stage, profile));
  return target;
}
