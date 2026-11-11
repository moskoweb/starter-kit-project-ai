import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { getJobsConfig, type JobHandlers } from "@vibe/jobs";
import { startWorker } from "./index.js";

async function main() {
  if (!getJobsConfig()) throw new Error("Worker requires JOBS_ENABLED=true");
  // Operator-owned source module, never request/job input. No built-in fake handlers.
  const modulePath = process.argv[2];
  if (!modulePath) throw new Error("No job handlers configured. Pass an operator-owned module exporting handlers and optional closeConnections: pnpm --filter @vibe/worker start ./path/to/registration.ts");
  const registration = await import(pathToFileURL(resolve(modulePath)).href) as {
    handlers?: JobHandlers; closeConnections?: () => Promise<void>;
  };
  if (!registration.handlers || typeof registration.handlers !== "object" || Array.isArray(registration.handlers)) throw new Error("Registration module must export handlers");
  if (registration.closeConnections !== undefined && typeof registration.closeConnections !== "function") throw new Error("Registration closeConnections must be a function");
  await startWorker(registration.handlers, registration.closeConnections);
}

main().catch((error: unknown) => {
  // Only own diagnostics are logged; imported/driver errors may contain secrets.
  console.error(error instanceof Error && (error.message.startsWith("Worker ") || error.message.startsWith("No job handlers") || error.message.startsWith("Registration ") || error.message.startsWith("JOBS_") || error.message.startsWith("DATABASE_URL")) ? error.message : "Worker startup failed; inspect registration and database configuration");
  process.exitCode = 1;
});
