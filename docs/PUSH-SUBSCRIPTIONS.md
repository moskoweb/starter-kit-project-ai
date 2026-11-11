# Push subscriptions

Web Push is optional and disabled unless `PUSH_ENABLED=true`. Configure `PUSH_VAPID_SUBJECT`, `PUSH_VAPID_PUBLIC_KEY`, and `PUSH_VAPID_PRIVATE_KEY` in the server environment. `GET /api/push` requires an authenticated session and returns public VAPID key only while enabled; private key never leaves server.

The settings component requests notification permission only after explicit user action. It waits for `navigator.serviceWorker.ready` with a 10-second timeout, subscribes using the public key, and persists the browser subscription through the same-origin API. API validates subscription endpoint and keys through `@vibe/push`; transport additionally validates destination DNS when sending.

Subscriptions are scoped to authenticated user and optional authorized organization, protected by tenant transaction context and RLS membership checks. Endpoint has global uniqueness: a subscription already owned by another user or organization is rejected rather than transferred. Sign out does not transfer or delete endpoint ownership; disable notifications while signed in to remove server record and browser subscription. Unsubscribe affects only current user's current scope.

Delivery rows are unique by `(event_id, subscription_id)` and retain status, attempt count, scheduled retry time, lease expiry, and last error for durable worker processing. API does not send push messages. Worker owns delivery processing, retries, and removal after provider 404/410.

Push requires secure context and browser support. Permission denied cannot be overridden by the app; user must change browser/site notification settings. iOS Web Push requires supported iOS version and installed Home Screen web app. Delivery is at-least-once; notifications can be delayed, duplicated, or dropped by browser/OS policies.
