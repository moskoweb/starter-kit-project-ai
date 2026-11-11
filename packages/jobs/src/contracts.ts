export const queueNames = {
  notification: "notification",
  webhook: "webhook-delivery",
} as const;

export type JobType = keyof typeof queueNames;
export type JobEnvelope = {
  version: 1;
  type: JobType;
  eventId: string;
  actorUserId: string;
  context: { kind: "personal" } | { kind: "organization"; organizationId: string };
  entityId: string;
  correlationId: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key));

export function parseJobEnvelope(value: unknown, expectedType?: JobType): JobEnvelope {
  if (!object(value) || !keys(value, ["version", "type", "eventId", "actorUserId", "context", "entityId", "correlationId"]) ||
      value.version !== 1 || (value.type !== "notification" && value.type !== "webhook") ||
      (expectedType && value.type !== expectedType) ||
      ![value.eventId, value.actorUserId, value.entityId, value.correlationId].every((id) => typeof id === "string" && uuid.test(id)) ||
      !object(value.context)) throw new Error("Invalid jobs v1 envelope");
  const context = value.context;
  if (!(context.kind === "personal" && keys(context, ["kind"])) &&
      !(context.kind === "organization" && keys(context, ["kind", "organizationId"]) && typeof context.organizationId === "string" && uuid.test(context.organizationId))) {
    throw new Error("Invalid jobs authorization context");
  }
  return value as JobEnvelope;
}
