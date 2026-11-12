import path from "node:path";
import { assertSafeDestination, copyTemplate, type Profile, withStaging } from "./files.js";
import { commitChanges, panelChanges, type PanelOptions } from "./panel.js";

/** Workspace panels generated per identity profile; the template itself ships only the admin panel. */
export const profilePanels: Record<Profile, PanelOptions[]> = {
  personal: [{ id: "app", label: "Personal", prefix: "/app", context: "personal" }],
  organizations: [{ id: "org", label: "Organization", prefix: "/org", context: "organization", identifier: "slug" }],
  hybrid: [
    { id: "app", label: "Personal", prefix: "/app", context: "personal" },
    { id: "org", label: "Organization", prefix: "/org", context: "organization", identifier: "slug" },
  ],
};

/** Register the profile's panels in a project directory, exactly like `vibe panel` (`<id>.config.ts` + registry import). */
export async function registerProfilePanels(directory: string, profile: Profile) {
  const cwd = process.cwd();
  process.chdir(directory); // Generators resolve and guard paths relative to the project root.
  try {
    for (const panel of profilePanels[profile]) await commitChanges(await panelChanges(panel), false);
  } finally { process.chdir(cwd); }
}

export async function createProject(directory: string, profile: Profile, source = process.cwd()) {
  const target = await assertSafeDestination(directory);
  const root = path.resolve(source);
  if (target === root || target.startsWith(root + path.sep)) throw new Error("Destination cannot be inside source template");
  await withStaging(target, async stage => {
    await copyTemplate(root, stage, profile);
    await registerProfilePanels(stage, profile);
  });
  return target;
}
