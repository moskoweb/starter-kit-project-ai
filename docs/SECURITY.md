# Security controls

## Request limits

`apps/app/src/lib/security/rate-limit.ts` provides shared server-side primitives. `apps/app/src/lib/security/rate-limit.test.ts` is a pure boundary/key-hash self-check runnable with `pnpm exec tsx apps/app/src/lib/security/rate-limit.test.ts`.

No endpoint integration is included: endpoint owners must call `enforceRateLimit` inside their authenticated transaction when their query uses RLS, with a scope key derived from trusted server context. Never use request-provided tenant/user identity as authorization context. Scope key is HMAC-SHA256 hashed using `RATE_LIMIT_SECRET` (minimum 32 characters); configure and rotate this secret consistently across app instances. Raw IP addresses and scope keys are not stored.

Limiter records are infrastructure data, not tenant data. Keep table access restricted to the application server role; do not expose limiter SQL or table access through public APIs. Add the table through the owning database migration workflow; this change deliberately adds no migration.


Windows are fixed UTC intervals. Each atomic insert/upsert increments a counter, resetting it when window changes; denied counts cap at `limit + 1` so repeated denied attempts cannot grow stored counts indefinitely. Denial returns `RateLimitExceeded` with `retryAfter` in seconds. Configure limit and window per operation. Expired rows need periodic cleanup; use `pnpm --filter @vibe/db db:rate-limit-cleanup` to delete at most 1,000 rows per invocation. Schedule repeated runs as needed; do not run unbounded deletes on request paths.

## Arcjet decision

Arcjet is not the default: it adds an external account/service dependency and can duplicate database-backed application limits. PostgreSQL provides shared counters across app instances without an in-memory-only fallback or extra provider dependency. This is not equivalent to a bot-defense service: database limits do not provide Arcjet's bot detection, reputation signals, or managed edge-layer protections. Deployments exposed to automated abuse may add a dedicated edge/bot provider as a separate control.
