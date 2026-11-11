# Push

`@vibe/push` uses official `web-push` library (`4.0.0`). `sendPush(subscription, payload)` reports successful upstream acceptance as `"sent"`, or invalidated subscription (`404`/`410`) as `"expired"`. It does not confirm delivery to a device. Other delivery and configuration errors throw safe generic errors. Caller owns retries.

`sendPush` fails with `PUSH_DISABLED` unless `PUSH_ENABLED=true`; disabled calls do not validate subscription or access network or VAPID configuration. VAPID credentials are read only after integration is enabled:

- `PUSH_VAPID_SUBJECT`: HTTPS contact URL or `mailto:` address.
- `PUSH_VAPID_PUBLIC_KEY`: URL-safe Base64 VAPID public key.
- `PUSH_VAPID_PRIVATE_KEY`: URL-safe Base64 VAPID private key.

`PUSH_ALLOWED_HOSTS` is optional comma-separated exact hostnames. Default allowlist: `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, and known Windows Notification Services hosts `wns2-bl2p.notify.windows.com`, `wns2-by2p.notify.windows.com`, `wns2-db5p.notify.windows.com`, `wns2-hp2p.notify.windows.com`, `wns2-mx2p.notify.windows.com`, `wns2-se2p.notify.windows.com`, `wns2-tp2p.notify.windows.com`. Set explicit provider hostnames when using another browser push service; entries are exact hostnames, not wildcard domains.

Subscriptions must use HTTPS, default port 443, no URL credentials, an allowlisted host, and valid `p256dh`/`auth` strings. Sender resolves and verifies every DNS address as public, pins HTTPS lookup to those addresses, and applies 10-second timeout. Redirects are not followed. Payload `url` must be a same-origin relative path; payload size is bounded. No push subscription storage or database is provided.
