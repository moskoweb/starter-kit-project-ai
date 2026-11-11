# Deployment

These files are deployment examples, not production-ready infrastructure. Review resource limits, network exposure, database backup/restore, TLS, and secret provisioning for your environment before deployment.

## Docker

Build app image with `docker build --target app -t vibe-app .`; worker with `docker build --target worker -t vibe-worker .`. Node runtime is pinned to 22.23.2. Next standalone output is enabled and observed build contains `apps/app/server.js` under `.next/standalone`. Worker target compiles TypeScript and registers notification and webhook handlers from `/workspace/apps/worker/src/handlers.ts`. These facts do not establish successful container build, startup, or end-to-end delivery; container validation remains a gate.

Builder installs workspace development dependencies because app and worker compile from TypeScript. Runtime secrets belong only in environment at container start; never pass secrets as Docker build arguments or bake them into images. Worker runtime retains workspace dependencies and loads `tsx` for current TypeScript registration module.

App build accepts only non-secret public configuration: `--build-arg NEXT_PUBLIC_ANALYTICS_ENABLED=true --build-arg NEXT_PUBLIC_POSTHOG_KEY=... --build-arg NEXT_PUBLIC_POSTHOG_HOST=https://... --build-arg S3_PUBLIC_UPLOAD_ORIGIN=https://...`. Compose forwards these variables from its interpolation environment. Analytics and CSP are compiled into the app artifact: changing them requires rebuilding, not merely restarting containers.

## Compose example

Run `docker compose -f compose.example.yml up -d` after provisioning roles and injecting variables. `.env.example` contains no credentials. Compose interpolation requires administrator password for PostgreSQL and non-owner `DATABASE_URL`. Keep these deployment inputs outside container runtime files. Create `.env.app.runtime` containing only app runtime settings; create `.env.worker.runtime` for `--profile jobs` containing only worker/relay runtime settings. Never put `MIGRATION_DATABASE_URL`, database administrator passwords, queue-provisioning URLs or other DDL credentials in either runtime file. `WORKER_DATABASE_URL` is required by worker startup when jobs are enabled, not while loading the default profile. Apply migrations and provision queues explicitly before startup. Ports bind to loopback; worker and relay use jobs profile. Healthcheck calls `/api/health`, including DB connectivity. Resource caps are examples, not sizing guidance.

Worker startup requires `JOBS_ENABLED=true`, valid database configuration, provisioned pg-boss schema, and real handler registration. Configure required auth/storage/AI integrations before enabling it. Queue primitives/process wiring do not imply completed notification or webhook business integrations; see [JOBS.md](JOBS.md).

## CI

GitHub Actions workflow installs with frozen lockfile, then runs type checks, repository tests, and build once. PostgreSQL service is available for database-backed tests. Tests must explicitly scope integration tests to this service; CI supplies no external-service credentials and does not treat mocks as integration evidence. Workflow configuration is not evidence that a successful CI run occurred. Gates requiring absent integrations remain explicit; do not bypass them.

`pnpm test` runs `test:unit`: workspace unit suites plus identity configuration, routing, limiter, resource validation, email render and CLI generation checks. It excludes the opt-in events database suite. `pnpm test:integration` requires `IDENTITY_TEST_DATABASE=1`, a disposable migrated database, running test app and Mailpit; it runs identity/RLS scenarios and fails before execution when opt-in is absent. `pnpm test:integration:events` requires `EVENTS_TEST_INTEGRATION=true` and provisioned disposable PostgreSQL/worker roles. These are separate gates; unit success is not integration evidence. CI currently runs RLS directly, not app/Mailpit or events integration.

pnpm permits install scripts only for `esbuild` (Vite/Astro tooling) and `sharp` (Next image optimization) through `onlyBuiltDependencies`. Other dependency scripts remain blocked; review each new native requirement before extending this allowlist.

## Required deployment gates

- Validate real runtime secrets, schema provisioning, database grants, and deployment-specific operational controls before production use.
- Validate Docker image build and runtime startup separately from local Next build.
- Exercise auth email provider, storage backend, AI provider and other external services with project-owned credentials where enabled; absent credentials means gate not run, not passed.
- Run integrated acceptance, including negative authorization/tenant isolation cases, using [ACCEPTANCE.md](ACCEPTANCE.md). Never treat documented commands or implemented code alone as acceptance evidence.
