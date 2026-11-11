import { processEvent, closeConnections as closeEvents } from "@vibe/events/worker";
import { webhookHandler } from "@vibe/webhooks/delivery";
import { closeWorkerConnection } from "@vibe/webhooks/worker-connection";
import type { JobHandlers } from "@vibe/jobs";

export const handlers: JobHandlers = {
  notification: processEvent,
  webhook: webhookHandler,
};
export async function closeConnections() {
  await Promise.all([closeEvents(), closeWorkerConnection()]);
}
