# Changelog

## 0.1.0 — 2026-11-12

- Monorepo Next.js 16, TypeScript, Turborepo, PostgreSQL 17, Drizzle ORM com RLS (`FORCE ROW LEVEL SECURITY`) e Better Auth (email/senha, verificação, TOTP, Google opcional, organizações e convites).
- Painéis declarativos (`definePanel`: `admin` sempre; `app` e `org` gerados por perfil) e CRUD declarativo estilo Filament (`defineResource`: filtros, paginação, ordenação, dialog de criar/editar, ações por registro e métricas).
- CLI `vibe`: `create` (grava base `.vibe-kit.json`), `panel`, `model`, `resource`, `upgrade` (merge de três vias das atualizações do kit) e `doctor`.
- Integrações opt-in fail-closed: email (SMTP/Resend + React Email), storage S3 presigned com quota, IA (`@ai-sdk` com streaming e rate limit), jobs e eventos outbox via `pg-boss`, webhooks assinados (outbound com proteção SSRF e inbound idempotente), Web Push VAPID, observabilidade (logs estruturados, Sentry, OTLP, PostHog) e site Astro.
- UI shadcn `base-nova` sobre Base UI, seis temas e suporte PT-BR / EN-US.
- Skills vendored para agentes: `shadcn`, `frontend-design`, `atomic-commits`, `security-audit` e `upgrade-kit`.
