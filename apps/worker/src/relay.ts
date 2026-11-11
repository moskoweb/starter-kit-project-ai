import { setTimeout } from "node:timers/promises";
import { createJobs, startJobs } from "@vibe/jobs";
import { relayPending } from "@vibe/events/relay";
import { relayWebhookDeliveries } from "@vibe/webhooks/delivery";
import { closeConnections } from "./handlers";
import { sendPendingPush, closePushConnection } from "@vibe/push/delivery";

const stop = new AbortController();
const shutdown = () => stop.abort();
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
const boss = createJobs(() => { console.error("RELAY_QUEUE_ERROR"); shutdown(); });
try {
  if (!boss) throw new Error("JOBS_DISABLED");
  await startJobs(boss);
  console.info("relay_ready");
  while (!stop.signal.aborted) {
    await relayPending(boss);
    if (process.env.WEBHOOKS_OUTBOUND_ENABLED === "true") await relayWebhookDeliveries(boss);
    if (process.env.PUSH_ENABLED === "true") await sendPendingPush();
    await setTimeout(1000, undefined, { signal: stop.signal }).catch(() => {});
  }
} catch {
  console.error("RELAY_FAILED");
  process.exitCode = 1;
} finally {
  try {
    await boss?.stop();
  } finally {
    await Promise.all([closeConnections(), closePushConnection()]);
    process.removeListener("SIGTERM", shutdown);
    process.removeListener("SIGINT", shutdown);
  }
}
