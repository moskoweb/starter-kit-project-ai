import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateMigration } from "./model.js";
import { commitChanges } from "./panel.js";

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."));
await commitChanges([], false, generateMigration);
