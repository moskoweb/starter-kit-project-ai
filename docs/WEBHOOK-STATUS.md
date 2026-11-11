# Outbound webhook delivery status

Delivery history is available from the organization panel when `WEBHOOKS_OUTBOUND_ENABLED=true`. The status API returns only delivery ID, event, status, attempt count, next attempt time, creation time, and last HTTP status code. It never exposes payloads or destination URLs/secrets. Disabled outbound delivery returns `404`.

Owners and administrators can inspect delivery state and retry failed deliveries. Retry changes the existing failed delivery back to pending and schedules it immediately; it does not reset accumulated attempts or create a replacement history record. The UI asks for confirmation because delivery is at-least-once and retry can produce duplicate effects. Consumers should deduplicate using stable delivery/event IDs.

Destination URL and secret remain server-side operator configuration (`WEBHOOK_OUTBOUND_URL`, `WEBHOOK_OUTBOUND_SECRET`, `WEBHOOK_OUTBOUND_ALLOWED_HOSTS`). Client UI does not configure destination credentials.
