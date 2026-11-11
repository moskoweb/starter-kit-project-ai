import { createJobs, getJobsConfig, startJobs, registerJobHandlers, type JobHandlers } from "@vibe/jobs";

export async function startWorker(handlers: JobHandlers, closeConnections: () => Promise<void> = async () => {}) {
  if (!getJobsConfig()) throw new Error("Worker requires JOBS_ENABLED=true");
  if (!Object.values(handlers).some((handler) => typeof handler === "function")) {
    throw new Error("No job handlers configured; provide real handlers with the worker registration module");
  }
  let stopping: Promise<void> | undefined;
  let ready = false;
  const boss = createJobs(() => {
    console.error("worker_queue_error");
    process.exitCode = 1;
    void stop().catch(() => { console.error("worker_shutdown_error"); });
  })!;
  const stop = (): Promise<void> => {
    ready = false;
    if (!stopping) {
      const deadline = setTimeout(() => { console.error("worker_shutdown_deadline"); process.exit(1); }, 35000);
      deadline.unref();
      stopping = boss.stop({ graceful: true, timeout: 30000 }).finally(closeConnections).finally(() => {
        clearTimeout(deadline);
        process.removeListener("SIGTERM", onSignal);
        process.removeListener("SIGINT", onSignal);
        process.removeListener("uncaughtException", onFatal);
        process.removeListener("unhandledRejection", onFatal);
      });
    }
    return stopping;
  };
  const onSignal = () => { void stop().catch(() => { process.exitCode = 1; console.error("worker_shutdown_error"); }); };
  const onFatal = () => { process.exitCode = 1; console.error("worker_process_error"); onSignal(); };
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);
  process.once("uncaughtException", onFatal);
  process.once("unhandledRejection", onFatal);
  try {
    await startJobs(boss);
    if (stopping) throw new Error("Worker stopped during startup");
    await registerJobHandlers(boss, handlers);
    if (stopping) throw new Error("Worker stopped during startup");
    ready = true;
    console.info("worker_ready");
  } catch {
    await stop();
    throw new Error("Worker startup failed; check provisioned pg-boss schema, runtime grants and handler registration");
  }
  return { stop, isReady: () => ready };
}
