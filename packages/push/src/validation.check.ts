import { validatePushSubscription } from "./transport";
import { createECDH, randomBytes } from "node:crypto";

const originalHosts = process.env.PUSH_ALLOWED_HOSTS;
process.env.PUSH_ALLOWED_HOSTS = "push.example.test";
const curve = createECDH("prime256v1");
const valid = { endpoint: "https://push.example.test/valid-endpoint-hash", keys: { p256dh: curve.generateKeys().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
if (validatePushSubscription(valid).endpoint !== valid.endpoint) throw new Error("PUSH_VALIDATION_CHECK_FAILED");
for (const invalid of [
  { ...valid, endpoint: "http://push.example.test/valid-endpoint-hash" },
  { ...valid, endpoint: "https://user@push.example.test/valid-endpoint-hash" },
  { ...valid, endpoint: "https://push.example.test:444/valid-endpoint-hash" },
  { ...valid, keys: { ...valid.keys, auth: "invalid" } },
]) {
  let rejected = false;
  try { validatePushSubscription(invalid); } catch { rejected = true; }
  if (!rejected) throw new Error("PUSH_VALIDATION_CHECK_FAILED");
}
if (originalHosts === undefined) delete process.env.PUSH_ALLOWED_HOSTS;
else process.env.PUSH_ALLOWED_HOSTS = originalHosts;
