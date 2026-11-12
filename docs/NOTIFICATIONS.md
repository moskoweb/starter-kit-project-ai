# Notifications

Personal notifications use `@vibe/db/events-schema` `notifications`, recipient/tenant row-level security, and persisted `read_at`. `@vibe/events` `markNotificationRead` performs single-item read updates. API derives recipient only from verified `requireSession`; request body never accepts recipient ID.

## Routes

- `GET /api/notifications?tenantIdentifier=<optional>&page=1`: requires session; resolves organization membership when identifier supplied and requires an organization context for organization-profile deployments. Reads within `withTenantTransaction`, no scope-permission gate. Returns `{ items, unreadCount, page, pageSize: 20 }`; items sorted newest first and paginated in batches of 20. Unread count covers current user and active tenant, not just current page. `Cache-Control: no-store`.
- `POST /api/notifications`: requires exact same-origin `Origin` and session. Strict JSON body supports `{ id, tenantIdentifier? }` to persist read timestamp for one UUID or `{ markAll: true, tenantIdentifier? }` to persist all current-scope unread timestamps. Other body shapes rejected. RLS confines updates to authenticated recipient and tenant.
- `POST /api/notifications/[id]/read`: same handler contract, intended for `{ id, tenantIdentifier? }`; ID must be UUID. Also applies origin check.

All POST requests reject bodies larger than 4 KiB. GET page is limited to 1,000,000 to keep SQL offsets within safe integer range.

## UI

`Notifications` client component accepts server-provided `{ tenantIdentifier: string | null, locale: "pt-BR" | "en" }`. It fetches without cache, aborts on unmount/scope change, supports persisted single/all read actions, displays unread count, localized labels and dates, loading, empty, and error states. It uses no transient success/toast claims. Shell integration remains owned by panel shell task.
