# Phase 01: Fundação e contexto para agentes - Research

**Researched:** 2026-11-11
**Domain:** Monorepo Turborepo + Next.js 16 + Drizzle ORM + PostgreSQL 17 + TypeScript 5.9
**Confidence:** HIGH
**Limitation Notice:** Generic-agent workaround ativo (papel gsd-phase-researcher executado inline com instruções gsd-planner/gsd-core).

<user_constraints>
## User Constraints (PROJECT.md, REQUIREMENTS.md, Revisão Tier01 & Infraestrutura Provisionada)

### Locked Decisions
- Next.js 16.4.6 e TypeScript 5.9.3 (estável, sem risco de incompatibilidade TS7 no Next 16).
- Monorepo Turborepo 2.11.10: aplicações executáveis separadas de pacotes compartilhados (PROJECT.md §2).
- PostgreSQL 17.10 em dev-services (127.0.0.1:5432).
- Infraestrutura DB provisionada pelo owner:
  - Database: `vibe_starter`
  - Role de migração (DDL): `vibe_starter_owner` (via `MIGRATION_DATABASE_URL`)
  - Role de aplicação (DML): `vibe_starter_app` (via `DATABASE_URL`)
  - Ambas são `NOSUPERUSER NOCREATEDB NOCREATEROLE` com grants DML no schema `public`.
  - Sem `db:create` no template.
- Gerenciamento de credenciais: Credentials residem fora do repositório em `/root/.local/share/vibe-stater-kit/development.env` (chmod 600). NUNCA ler ou expor valores em transcripts ou logs. O ambiente injeta externamente `DATABASE_URL` e `MIGRATION_DATABASE_URL`.
- Pacotes vazios proíbidos na Fase 1: SEM pacote `core` ou `auth` sem código real. Pacotes surgem quando têm responsabilidade concreta (PROJECT.md §3).
- Gerenciador de pacotes: pnpm (versão fixada 10.32.1, lockfile canônico) com Node 22.23.2. Prova com `pnpm install --frozen-lockfile` após lock criado.
- Pacotes com fronteiras estritas: `packages/ui`, `packages/db`, `packages/config` (BASE-02).
- Bloqueio de código client: uso obrigatório do pacote `server-only` no entrypoint de `@vibe/db` do Next.js. Prova negativa via build com componente temporário `'use client'` importando o DB.
- Tabela real concreta: em vez de stubs fictícios (`system_meta`), criar `app_settings` (`key`, `value`, `updated_at`). Página inicial do Next.js consulta e exibe configuração persistida.
- Encerramento de pool: scripts de migração e seed encerram explicitamente o cliente com `await client.end()`.
- Resiliência de health check: `/api/health` implementa timeout de 3 segundos e retorna 503 quando banco inacessível ou timing out.
- Validação de ambiente: apenas variáveis ativas (`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `NODE_ENV`, `PORT` loopback livre). Sem esquemas especulativos de integrações futuras.
- Sem builds repetidos durante edição (midflight); verificações executadas em bloco ao final da fase.
- AGENTS.md orienta agentes sem depender de caminhos locais nem prompts ocultos (DEV-01, DEV-03).
</user_constraints>

<architectural_responsibility_map>
## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Next.js App Shell (`apps/app`) | Frontend Server (Node) | Browser/Client | Executável principal Next.js 16 com App Router, `/api/health` e página inicial server component conectada com role `vibe_starter_app`. |
| Database Client & Schema (`packages/db`) | Database/Storage | Backend Server | Acesso isolado a PostgreSQL 17 no db `vibe_starter`. Protegido por `server-only`. |
| UI Tokens Boundary (`packages/ui`) | Browser/Client | Frontend Server | Tokens de design e primitivas sem dependência de banco. |
| Shared Config (`packages/config`) | Build / Tooling | Frontend Server | tsconfig base, linting e validação Zod estrita de variáveis de ambiente. |
</architectural_responsibility_map>

<research_summary>
## Summary

Pesquisa técnica para montagem da fundação do starter kit em monorepo pnpm + Turborepo. Stack canônica ajustada e verificada:
- Node.js 22.23.2 + pnpm 10.32.1
- Next.js 16.4.6 + React 19.3.1 + TypeScript 5.9.3
- Turborepo 2.11.10
- Drizzle ORM 0.45.4 + Drizzle Kit 0.31.11 + postgres 4.1.1 + server-only 0.0.1
- Tailwind CSS 4.3.5 + Zod 4.6.7
- PostgreSQL 17.10 (dev-services 127.0.0.1:5432, banco dedicado `vibe_starter` com roles `vibe_starter_owner` e `vibe_starter_app` provisionadas pelo owner)

Princípio: mínimo real funcional. Nenhum componente decorativo falso e nenhum pacote vazio (`auth` e `core` ficam para suas fases concretas). Tabela real `app_settings` persistida e exibida no Next.js. Rota de saúde com timeout de 3s e 503.

**Primary recommendation:** Adotar monorepo pnpm com pacotes `@vibe/*`, isolar acesso ao banco em `@vibe/db` via `server-only`, conectar ao database `vibe_starter` com role de migração (`vibe_starter_owner`) e role de runtime (`vibe_starter_app`), e fechar conexões explicitamente nos scripts.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.4.6 | Framework React full-stack | Padrão do projeto, App Router nativo, Turbopack. |
| `react` | 19.3.1 | Biblioteca UI | Dependência base do Next.js 16. |
| `react-dom` | 19.3.1 | DOM renderer para React | Par obrigatório do React 19. |
| `turbo` | 2.11.10 | Monorepo task runner | Cache de build e orquestração de scripts entre pacotes. |
| `typescript` | 5.9.3 | Tipagem estática | Versão estável com compatibilidade comprovada no Next.js 16. |
| `drizzle-orm` | 0.45.4 | ORM TypeScript leve | Schemas tipados e queries SQL sem abstrações pesadas. |
| `drizzle-kit` | 0.31.11 | CLI de migrations para Drizzle | Geração e aplicação explícita de migrations SQL. |
| `postgres` | 4.1.1 | Driver PostgreSQL rápido | Driver puro TS/JS para Node/ESM sem dependência nativa pesada. |
| `server-only` | 0.0.1 | Barreira de import client | Força erro de compilação se módulo for importado em Client Component. |
| `zod` | 4.6.7 | Validação de schema e env | Validação estrita de variáveis de ambiente no startup. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | 18.0.10 | Carregamento de variáveis de ambiente | Carregamento de `.env` em scripts de seed e CLI do db. |
| `@types/node` | 26.6.6 | Tipos para Node runtime | Necessário para Node 22 e scripts. |
| `@types/react` | 19.x | Tipos para React 19 | Tipos TypeScript no app. |

**Installation Command:**
```bash
pnpm install
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Data Flow Diagram

```text
[ Browser / Client ]
        │
        ├── HTTP GET /api/health ─────────────────────────────┐
        │   (timeout de 3s; 200 ok ou 503 em falha)           │
        ▼                                                     ▼
[ Next.js 16 App Router (apps/app) ]              [ Route Handler /api/health ]
  (src/app/page.tsx - Server Component)                       │
        │                                                     │
        │ (importa 'server-only' no entrypoint)               │
        ▼                                                     ▼
[ @vibe/db (packages/db/src/index.ts) ] ◄─────────────────────┘
        │
        ▼ (SQL SELECT contra app_settings via postgres.js)
[ PostgreSQL 17 (dev-services 127.0.0.1:5432 / db vibe_starter / role vibe_starter_app) ]
        │
        ▲ (retorna registro { key: "app_name", value: "Vibe Starter Kit" })
[ apps/app/page.tsx renderiza a configuração persistida ]
```

### Monorepo Structure

```text
.
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── tsconfig.json
├── .gitignore
├── .env.example
├── apps/
│   └── app/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── src/
│           └── app/
│               ├── layout.tsx
│               ├── page.tsx
│               └── api/
│                   └── health/
│                       └── route.ts
├── packages/
│   ├── config/
│   │   ├── package.json
│   │   ├── tsconfig.base.json
│   │   └── src/
│   │       └── env.ts
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts
│   │   │   ├── schema.ts
│   │   │   └── seed.ts
│   │   └── migrations/
│   │       └── 0000_initial.sql
│   └── ui/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
└── AGENTS.md
```

### Pattern 1: Role Separation (`vibe_starter_owner` vs `vibe_starter_app`)
- DDL / Migrations: `drizzle-kit` utiliza `MIGRATION_DATABASE_URL` conectando como `vibe_starter_owner`.
- DML / Runtime: Next.js utiliza `DATABASE_URL` conectando como `vibe_starter_app` com privilégios limitados de leitura e escrita.
- Ambas as roles são `NOSUPERUSER NOCREATEDB NOCREATEROLE`.

### Pattern 2: Server-Only Barrier & Negative Build Proof (BASE-02)
O entrypoint de `@vibe/db` importa `server-only`. Qualquer import acidental em arquivo com `'use client'` aborta a compilação do Next.js. Prova via componente de teste no build.

### Pattern 3: Clean Process Exit & Explicit Pool Close
Scripts de migração e seed chamam `await client.end()` no bloco `finally` para evitar processos travados em execuções de automação e CI.

### Pattern 4: Strict Active-Only Env Validation
`packages/config/src/env.ts` valida apenas o que está em uso: `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `NODE_ENV` e `PORT` (loopback 127.0.0.1:3000).

### Anti-Patterns to Avoid
- **Privilégios de Superuser no Template:** Embutir `db:create` ou comandos administrativos no template do app.
- **Pacotes Vazios:** Criar `packages/auth` ou `packages/core` sem implementação real na Fase 1.
- **Stubs Artificiais:** Criar tabelas abstratas sem valor de negócio em vez de dados reais como `app_settings`.
- **Segredos em Logs/Transcript:** Nunca imprimir senhas de `.dev-services/.env` ou `/root/.local/share/vibe-stater-kit/development.env` em logs ou respostas.
- **Processos Pendurados:** Deixar pools postgres abertos ao término de scripts de automação.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client import protection | Scripts grep em CI | `import 'server-only'` | Validação em tempo de build nativa do compilador Next.js. |
| Schema diff e SQL generator | Scripts manuais de migração | `drizzle-kit generate` | Mantém snapshots sincronizados com o código TypeScript. |
| Monorepo task pipeline | Scripts bash encadeados | `turbo` | Trata grafo de dependências e cache de compilação. |
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Hang no encerramento de scripts Node
**What goes wrong:** `pnpm db:seed` completa as queries mas o processo não finaliza no terminal.
**Prevention:** Chamar `await client.end()` explicitamente no bloco `finally` de scripts CLI.

### Pitfall 2: Timeout de healthcheck travando o worker
**What goes wrong:** Banco fora do ar faz `/api/health` esperar 30s pelo timeout do socket TCP.
**Prevention:** Implementar timeout de 3 segundos via `AbortSignal`/`Promise.race` retornando 503 imediato.

### Pitfall 3: Import cruzado client -> database
**What goes wrong:** Componente client importa tipo ou função de `@vibe/db`, vazando dependência de Node.
**Prevention:** `server-only` no topo do entrypoint de `@vibe/db`.
</common_pitfalls>

<sources>
## Sources
### Primary
- npm registry queries (2026-11-11): next@16.4.6, react@19.3.1, typescript@5.9.3, drizzle-orm@0.45.4, drizzle-kit@0.31.11, turbo@2.11.10, postgres@4.1.1, server-only@0.0.1.
- PostgreSQL 17.10 dev-postgres (127.0.0.1:5432, banco dedicado vibe_starter com roles vibe_starter_owner e vibe_starter_app provisionadas pelo owner).
- Diretrizes de revisão técnica Tier01 e credenciais externas via agent Main.
- `.planning/PROJECT.md` & `.planning/REQUIREMENTS.md`: Escopo e requisitos BASE-01 a BASE-04 e DEV-01 a DEV-04.
</sources>

<metadata>
**Research date:** 2026-11-11
**Valid until:** 2026-12-31
</metadata>
