---
phase: "01"
name: "Fundação e contexto para agentes"
created: 2026-11-11
---

# Phase 1: Fundação e contexto para agentes — Context

## Decisions

- **Monorepo e pacotes:** Turborepo e pnpm 10.32.1; `apps/app` Next.js 16. Pacotes `db`, `ui` e `config` com responsabilidade concreta. `auth` surge na fase 2, sem pacote vazio antecipado.
- **Banco e migrations:** PostgreSQL 17.10 compartilhado no host, database isolado `vibe_starter`, role runtime DML `vibe_starter_app` e role migration `vibe_starter_owner`, ambas sem privilégios administrativos. Drizzle e driver postgres.js. Geração, aplicação e seed em comandos separados. Secrets injetados externamente, nunca versionados.
- **Isolamento client/server:** Componentes client NUNCA importam banco de dados ou credenciais privadas (BASE-02). Variáveis de ambiente validadas no servidor via Zod (`@vibe/config`).
- **Integrações opcionais:** Serviços opcionais desabilitados não exigem credenciais para inicialização do app (BASE-04).
- **Instruções canônicas:** Instruções em `AGENTS.md` sem dependência de caminhos da máquina local, prompts ocultos ou ferramentas mágicas (DEV-01, DEV-03).

## Discretion Areas

- Driver PostgreSQL: postgres.js para runtime Node escolhido; não afirmar compatibilidade Edge sem validação.
- Nomenclatura dos pacotes: `@vibe/config`, `@vibe/db`, `@vibe/ui`; `@vibe/auth` na fase 2.
- Schema inicial: `app_settings` com nome da aplicação e finalidade real na página inicial; seed idempotente. Sem tabela artificial apenas para comprovar migration.
- Escopo delimitado: não incluir stubs ou mocks de features futuras (auth, tenancy, shadcn complexo).

## Deferred Ideas (Out of Scope)

- Autenticação e Better Auth (Fase 2).
- Gestão de tenants/organizações e isolamento RLS (Fase 2).
- Componentes visuais shadcn e painéis (Fase 3).
- Resources e geradores CLI (Fases 4 e 5).
