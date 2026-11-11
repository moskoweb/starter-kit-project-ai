# Webhooks

`@vibe/webhooks` provides raw-byte HMAC signing/verification, envelope validation, IP validation, and one bounded HTTPS delivery attempt. It does not create endpoints, persist receipts, or run a worker. Caller owns destination provisioning, durable delivery state, scheduling, and retry policy.

## Signed requests

Signature is lowercase hexadecimal HMAC-SHA256 over UTF-8 decimal Unix timestamp, a literal `.`, then exact raw request body bytes:

```ts
import { signPayload, verifySignature } from "@vibe/webhooks";
const signature = signPayload(secret, rawBody, timestampSeconds);
const valid = verifySignature(secret, rawBody, timestampSeconds, signature);
```

Send `X-Webhook-Timestamp` as seconds and `X-Webhook-Signature: sha256=<hex>`. Verify against the unchanged raw body before JSON parsing; reject timestamps more than 300 seconds from current time. Comparison uses constant-time equality. Both operations enforce 256 KiB body maximum. Keep each endpoint secret in a secret manager; provision and rotate out-of-band; never log secrets, signatures, or request bodies.

## Envelope

Envelope shape: `{ id, event, createdAt, data }`. `id` is UUID; producer must use stable ID for each logical event. `event` must be in caller's explicit allowlist; `data` schema remains event-specific and caller validates it. `validateEnvelope` checks structural fields and event allowlist, not event-specific data semantics. Caller MUST deduplicate receipt processing by envelope `id` and commit receipt/idempotency marker atomically with its effect. Delivery is at-least-once; duplicate sends are expected.

`deliverWebhook` requires caller-persisted `deliveryId` (UUID) and `createdAt` for stable envelope identity across attempts, plus explicit event allowlist. Caller MUST reuse both values on retry; transport never generates replacement IDs. It also takes `allowedHosts`, the trusted hostname allowlist.

Caller MUST provision allowed destination hostnames from trusted operator configuration, never request/job input. `deliverWebhook` requires HTTPS, hostname exact match against allowlist, no credentials or nonstandard port, resolves A and AAAA records, rejects the destination if any answer is private/reserved, and pins connection lookup to the validated answers. TLS SNI uses original hostname. Redirects are not followed. Connection timeout is 10 seconds; response body is capped at 64 KiB. Delivery returns only safe status and HTTP status code; transport errors do not expose error contents or secrets.

Results: `delivered` for 2xx; `retryable` for 408, 429, 5xx and network/timeout errors; `terminal` for other HTTP responses and oversized responses. DNS/config rejection throws safe fixed error code before sending. No internal retries: durable queue caller classifies and schedules retries, persists attempts/receipts, and enforces idempotency. Never provide untrusted destination hostnames or wildcard allowlists.

## Checks

`packages/webhooks/test/security.test.ts` contains pure signature tamper/expiry, body-size, envelope allowlist, and IP-classification assertions. Do not execute tests during package authoring; no network is used by this test.
