---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pnpm-workspace.yaml
  - package.json
  - turbo.json
  - tsconfig.json
  - .gitignore
  - .env.example
  - apps/app/package.json
  - apps/app/tsconfig.json
  - apps/app/next.config.ts
  - apps/app/src/app/layout.tsx
  - apps/app/src/app/page.tsx
  - apps/app/src/app/api/health/route.ts
  - packages/config/package.json
  - packages/config/tsconfig.base.json
  - packages/config/src/env.ts
  - packages/db/package.json
  - packages/db/tsconfig.json
  - packages/db/drizzle.config.ts
  - packages/db/src/index.ts
  - packages/db/src/client.ts
  - packages/db/src/schema.ts
  - packages/db/src/seed.ts
  - packages/ui/package.json
  - packages/ui/src/index.ts
  - AGENTS.md
autonomous: true
requirements:
  - BASE-01
  - BASE-02
  - BASE-03
  - BASE-04
  - DEV-01
  - DEV-02
  - DEV-03
  - DEV-04

must_haves:
  truths:
    - "Monorepo Turborepo com pnpm 10 e Node 22 instala sem warnings de resolução e gera pnpm-lock.yaml canônico"
    - "Migrações Drizzle exigem estritamente MIGRATION_DATABASE_URL (role vibe_starter_owner) sem fallback para DATABASE_URL"
    - "App runtime opera exclusivamente via DATABASE_URL (role vibe_starter_app com privilégios DML)"
    - "Next.js transpilePackages configurado para @vibe/db, @vibe/ui e @vibe/config"
    - "Wrapper Next (@vibe/db index) contém server-only, enquanto client.ts CLI/scripts opera sem server-only"
    - "Health check /api/health possui timeout nativo no driver (connect_timeout: 3) e payload de erro com mensagem fixa, sem vazar erro interno"
    - "Tabela app_settings adota chave textual como exceção deliberada de configuração interna, mantendo UUID como padrão de domínio"
    - "Página inicial apps/app/src/app/page.tsx consulta e renderiza dado persistido real de app_settings"
    - "Comandos explícitos de migração e seed fecham pool postgres no término"
    - "Seed repetido não duplica chave app_settings e encerra com código 0"
    - "Importação de @vibe/db em componente com 'use client' quebra o build Next.js via server-only"
    - "AGENTS.md documenta comandos, portas loopback e limites sem secrets nem caminhos absolutos do host"
  artifacts:
    - path: "pnpm-workspace.yaml"
      provides: "Definição de workspaces apps/* e packages/*"
    - path: "turbo.json"
      provides: "Pipelines build, dev, lint e db (db:generate, db:migrate, db:seed)"
    - path: "apps/app/next.config.ts"
      provides: "Configuração Next.js com transpilePackages: ['@vibe/db', '@vibe/ui', '@vibe/config']"
    - path: "apps/app/src/app/api/health/route.ts"
      provides: "Health check com driver timeout 3s, status 503 e mensagem fixa de erro"
    - path: "apps/app/src/app/page.tsx"
      provides: "Página Server Component que consulta app_settings persistido"
    - path: "packages/db/src/index.ts"
      provides: "Wrapper server-only para Server Components do Next.js"
    - path: "packages/db/src/client.ts"
      provides: "Cliente Drizzle desacoplado sem server-only para scripts CLI e migrações"
    - path: "packages/db/src/schema.ts"
      provides: "Schema Drizzle com tabela app_settings (key textual pk deliberada, value, updated_at)"
    - path: "packages/db/src/seed.ts"
      provides: "Seed idempotente com fechamento explícito de conexão"
    - path: "packages/config/src/env.ts"
      provides: "Validação Zod estrita para variáveis ativas (DATABASE_URL, MIGRATION_DATABASE_URL, NODE_ENV, PORT)"
  key_links:
    - from: "apps/app/src/app/page.tsx"
      to: "packages/db/src/index.ts"
      via: "importação server-side protegida por server-only"
    - from: "packages/db/src/seed.ts"
      to: "packages/db/src/client.ts"
      via: "acesso direto ao client standalone sem bloqueio server-only"
    - from: "packages/db/src/client.ts"
      to: "PostgreSQL dev-services (127.0.0.1:5432 / db vibe_starter / role vibe_starter_app)"
      via: "postgres.js com pool limitado (max: 10), connect_timeout de 3s e encerramento explícito em scripts"
    - from: "packages/db/drizzle.config.ts"
      to: "PostgreSQL dev-services (db vibe_starter / role vibe_starter_owner)"
      via: "MIGRATION_DATABASE_URL obrigatória sem fallback"
---

<objective>
Instalar monorepo Turborepo + pnpm 10 com Next.js 16, TypeScript 5.9.3, PostgreSQL 17 e Drizzle ORM. Operar sobre infraestrutura provisionada pelo owner: database `vibe_starter` com role de migração `vibe_starter_owner` e role de runtime `vibe_starter_app` (ambas NOSUPERUSER NOCREATEDB NOCREATEROLE). Sem comandos `db:create` no template. Migrações exigem estritamente `MIGRATION_DATABASE_URL` sem fallback. Next.js configurado com `transpilePackages`. Wrapper `server-only` para Next.js desacoplado do `client.ts` CLI. Health check `/api/health` com driver timeout e payload de erro fixo. Tabela concreta `app_settings` (chave textual como exceção explícita de config interna, mantendo UUID no domínio). Sem pacotes vazios auth/core na fase 1.

Nota de limitação: Generic-agent workaround ativo (gsd-planner executado sob diretrizes formais em ambiente sem typed-agent dispatch).

Purpose: Estabelecer fundação reprodutível, segura com duas roles (DDL vs DML) e verificável sem abstrações prematuras.
Output: Monorepo estruturado, pacotes `@vibe/config`, `@vibe/db`, `@vibe/ui`, Next.js 16 funcional e AGENTS.md.
</objective>

<execution_context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/phases/01-foundation/01-RESEARCH.md
</execution_context>

<context>
Decisões locked e infraestrutura provisionada:
- Stack: Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Turborepo 2.11.10, Drizzle ORM 0.45.4, Drizzle Kit 0.31.11, postgres 4.1.1, server-only 0.0.1, Zod 4.6.7.
- Next.js transpilation: `next.config.ts` define `transpilePackages: ['@vibe/db', '@vibe/ui', '@vibe/config']`.
- Isolamento de roles de banco:
  - Migrações (DDL): Exigem obrigatoriamente `MIGRATION_DATABASE_URL` (role `vibe_starter_owner`). Sem fallback para `DATABASE_URL`, impedindo execução com privilégios acidentais.
  - Runtime (DML): Executa via `DATABASE_URL` (role `vibe_starter_app`).
  - Ambas são NOSUPERUSER NOCREATEDB NOCREATEROLE com grants DML no schema public. Sem `db:create` no template.
- Arquitetura de fronteira DB:
  - `packages/db/src/client.ts`: Instância Drizzle e postgres.js pura, sem `import 'server-only'`, permitindo execução standalone em scripts CLI (`seed.ts`, migrations).
  - `packages/db/src/index.ts`: Entrypoint consumido por `apps/app`, importando `server-only` antes de re-exportar `db` e schemas.
- Health check resiliente e seguro:
  - Configuração do postgres.js inclui `connect_timeout: 3`.
  - `/api/health` retorna 503 com payload fixo `{ status: 'error', db: 'unreachable', message: 'Database connection failed' }`, sem vazar stack trace ou detalhes de conexão.
- Tabela de Configuração:
  - `app_settings` adota `key` varchar(64) como primary key textual, registrada como exceção deliberada para chave-valor de configuração interna do app. Entidades de domínio permanecem sob padrão UUID (PROJECT.md §2).
- Scripts e Encerramento: Scripts de seed e migração encerram explicitamente o pool com `await client.end()`.
- Variáveis de Ambiente: `packages/config/src/env.ts` valida estritamente apenas variáveis ativas (`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `NODE_ENV`, `PORT` loopback 127.0.0.1:3000).
- Verificações finais de runtime ficam a cargo do owner após conclusão das edições; sem comandos de validação midflight.
</context>

<tasks>

<task type="tracer">
  <name>Tracer: Monorepo Turborepo, Next.js 16 com transpilePackages e healthcheck com driver timeout</name>
  <files>
    pnpm-workspace.yaml,
    package.json,
    turbo.json,
    tsconfig.json,
    .gitignore,
    .env.example,
    packages/config/package.json,
    packages/config/tsconfig.base.json,
    packages/db/package.json,
    packages/db/tsconfig.json,
    packages/db/src/index.ts,
    packages/db/src/client.ts,
    apps/app/package.json,
    apps/app/tsconfig.json,
    apps/app/next.config.ts,
    apps/app/src/app/layout.tsx,
    apps/app/src/app/page.tsx,
    apps/app/src/app/api/health/route.ts
  </files>
  <action>
    Configurar monorepo pnpm (pnpm-workspace.yaml com 'apps/*' e 'packages/*') e Turborepo (turbo.json com pipelines build, dev, lint, db:generate, db:migrate, db:seed).
    Fixar TypeScript 5.9.3 e Node 22.23.2 com pnpm 10.32.1.
    Configurar `apps/app/next.config.ts` com `transpilePackages: ['@vibe/db', '@vibe/ui', '@vibe/config']`.
    Configurar `@vibe/config` com tsconfig base e validação env.
    Configurar `@vibe/db`:
      - `packages/db/src/client.ts`: instancia client postgres.js com `connect_timeout: 3`, `max: 10` e exporta função de encerramento `closeDb()`. Sem `server-only`.
      - `packages/db/src/index.ts`: entrypoint do Next.js contendo `import 'server-only'` que re-exporta `db` e schemas.
    Configurar `apps/app` em Next.js 16 (App Router).
    Implementar `apps/app/src/app/api/health/route.ts` com timeout ativo no driver, retornando 200 `{ status: 'ok', db: 'connected', latencyMs }` em sucesso ou 503 com mensagem estática fixa `{ status: 'error', db: 'unreachable', message: 'Database connection failed' }` em falha, sem expor mensagens de erro internas.
    Implementar `apps/app/src/app/page.tsx` como Server Component que consulta `app_settings` via `@vibe/db` e renderiza o valor persistido.
    Criar `.env.example` documentando `DATABASE_URL=postgresql://vibe_starter_app:***@127.0.0.1:5432/vibe_starter`, `MIGRATION_DATABASE_URL=postgresql://vibe_starter_owner:***@127.0.0.1:5432/vibe_starter` e `PORT=3000` sem segredos comitados.
    Evitar pacotes vazios auth/core e comandos de criação de banco com superuser.
  </action>
  <verify>
    <manual>Owner verifica no ciclo final: página renderiza app_settings persistido; health retorna 200 com DB disponível e 503 sanitizado sob falha dentro do deadline.</manual>
  </verify>
  <done>
    Monorepo e pacotes configurados; transpilePackages ativo; separação server-only/CLI implementada; health check com driver timeout e payload fixo pronto. Verificação runtime delegada ao ciclo do owner.
  </done>
</task>

<task type="auto">
  <name>Database: Schema app_settings, Migrations Drizzle com owner role obrigatória, Seed e Pool close</name>
  <files>
    packages/db/drizzle.config.ts,
    packages/db/src/schema.ts,
    packages/db/src/seed.ts,
    packages/config/src/env.ts
  </files>
  <action>
    Criar schema Drizzle em `packages/db/src/schema.ts` com tabela concreta `app_settings` (chave textual como exceção explícita de configuração interna):
      - `key` (varchar(64) primaryKey)
      - `value` (text not null)
      - `updated_at` (timestamp not null defaultNow)
    Configurar `drizzle.config.ts` apontando para schema e pasta `./migrations`, consumindo obrigatoriamente `process.env.MIGRATION_DATABASE_URL` sem fallback para `DATABASE_URL` (lançar erro explícito se ausente ao rodar migrações).
    Implementar script de seed em `packages/db/src/seed.ts` importando diretamente `packages/db/src/client.ts` (sem server-only) e inserindo chave `'app_name'` com valor `'Vibe Starter Kit'` usando `onConflictDoNothing({ target: appSettings.key })`.
    Garantir que `packages/db/src/seed.ts` chame `await client.end()` em bloco `finally` para fechar o pool e sair com exit code 0.
    Configurar `packages/config/src/env.ts` com validação Zod estrita para as variáveis ativas da fase 1: `DATABASE_URL` (string url obrigatória), `MIGRATION_DATABASE_URL` (string url obrigatória para scripts de migração), `NODE_ENV` (development/test/production), `PORT` (opcional número default 3000). Sem campos especulativos de integrações futuras.
  </action>
  <verify>
    <manual>Owner aplica migrations com role owner, executa seed duas vezes e confirma conteúdo preservado; role runtime não pode criar tabela; ausência de MIGRATION_DATABASE_URL falha claramente.</manual>
  </verify>
  <done>
    Schema concreto app_settings definido; migrations exigem MIGRATION_DATABASE_URL sem fallback; seed CLI standalone com fechamento de pool implementado; env validator restrito a variáveis ativas. Verificação runtime delegada ao ciclo do owner.
  </done>
</task>

<task type="auto">
  <name>Fronteiras e Governança: Proteção server-only, UI tokens e AGENTS.md</name>
  <files>
    packages/ui/package.json,
    packages/ui/src/index.ts,
    AGENTS.md
  </files>
  <action>
    Criar pacote `@vibe/ui` com tokens CSS e componentes básicos de layout sem dependências de banco de dados.
    Assegurar que `@vibe/db` utilize `server-only` no index para que tentativas de importação em componentes client (`"use client"`) falhem no build do Next.js (BASE-02).
    Atualizar `AGENTS.md` (DEV-01, DEV-03) descrevendo:
      - Arquitetura de workspaces e comandos canônicos (`pnpm install`, `pnpm --filter @vibe/db db:migrate`, `pnpm --filter @vibe/db db:seed`, `pnpm dev` em porta loopback livre).
      - Detalhes de separação de roles: `vibe_starter_owner` obrigatória para migrações e `vibe_starter_app` para runtime.
      - Regra de ouro: credenciais residem externamente; proibir leitura e impressão de segredos em transcripts ou logs.
      - Regra de chaves: `app_settings.key` é exceção interna; UUID é o padrão para entidades de domínio.
      - Lista de pacotes ativos (config, db, ui) e nota de que `auth` e `core` serão introduzidos em suas fases específicas.
  </action>
  <verify>
    <manual>Owner verifica types/build final e prova negativa de import client em fixture descartável. Conferir documentação contra scripts reais; não marcar concluído por existência de arquivos.</manual>
  </verify>
  <done>
    Fronteiras demarcadas; AGENTS.md atualizado com procedimentos reprodutíveis, distinção de roles e avisos legais/licenças registrados. Verificação runtime delegada ao ciclo do owner.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client Browser → Next.js Route Handler | Requisição HTTP para /api/health — tráfego externo sem autenticação |
| Next.js App → PostgreSQL | Conexão TCP via postgres.js usando role vibe_starter_app (DML restrito, NOSUPERUSER) |
| Migration Runner → PostgreSQL | Conexão DDL via vibe_starter_owner restrita ao schema public de vibe_starter sem fallback |
| Config Loader → Runtime Process | Leitura de process.env via injeção externa sem logging de credenciais |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-01-01 | Information Disclosure | `apps/app/src/app/api/health/route.ts` | Medium | mitigate | O endpoint de health check retorna mensagem de erro estática e fixa ('Database connection failed'), sem expor stack trace, connection string ou detalhes internos do banco em caso de 503. |
| T-01-02 | Information Disclosure | `packages/ui` / Client Components | High | mitigate | Bloquear via `server-only` no entrypoint de `@vibe/db` qualquer importação em componentes client. Validar via build com componente temporário. |
| T-01-03 | Denial of Service | `packages/db/src/client.ts` | Medium | mitigate | Configurar connect_timeout (3s) e pool max (10) no postgres.js para evitar conexões penduradas e exaustão do socket. |
| T-01-04 | Tampering | `packages/db/src/seed.ts` | Low | mitigate | Seed utiliza verificação de idempotência (onConflictDoNothing na chave app_settings.key) para impedir corrupção ou duplicação de dados em reinicializações. |
| T-01-05 | Information Disclosure | Tooling / Logs / Transcripts | High | mitigate | Proibir leitura ou output de credenciais do dev-services no console/transcript; carregar segredos via env externa. |
| T-01-06 | Privilege Escalation | Database Credentials | High | mitigate | Separação estrita: vibe_starter_app para DML da aplicação e vibe_starter_owner para migrações DDL. MIGRATION_DATABASE_URL é obrigatória para migrações sem fallback para DATABASE_URL. |
</threat_model>

<verification>
Comandos de verificação final da fase completa (a serem executados pelo owner/executor em ciclo único de runtime):
1. Instalação: `pnpm install` (gera pnpm-lock.yaml; subsequente: `pnpm install --frozen-lockfile`)
2. Migrações (role owner obrigatória): `pnpm --filter @vibe/db db:generate && pnpm --filter @vibe/db db:migrate`
3. Seed e Idempotência (role app): `pnpm --filter @vibe/db db:seed && pnpm --filter @vibe/db db:seed` (verifica código de saída 0 e encerramento limpo do pool)
4. Compilação Turborepo: `pnpm build`
5. Prova Negativa Client/Server: criar temporariamente componente `"use client"` importando `@vibe/db` e confirmar falha esperada no `pnpm --filter app build` (depois remover)
6. Smoke Runtime: `pnpm --filter app dev` (loopback 127.0.0.1:3000) e checar:
   - `curl -s http://127.0.0.1:3000/api/health` retorna 200 `{ status: "ok", db: "connected" }`
   - `curl -s http://127.0.0.1:3000/` retorna HTML contendo valor persistido `'Vibe Starter Kit'`
</verification>

<success_criteria>
- Monorepo Turborepo com Next.js 16 funcional, transpilePackages ativo e TypeScript 5.9.
- Banco `vibe_starter` operando com roles dedicadas: `vibe_starter_owner` obrigatória para migrações e `vibe_starter_app` para DML (ambas NOSUPERUSER).
- Pacote `@vibe/db` com wrapper `server-only` para Next.js e client standalone sem `server-only` para scripts CLI.
- Tabela `app_settings` persistida como exceção explícita de chave textual para config interna, mantendo UUID para o domínio.
- Sem pacotes vazios auth/core na fase 1.
- Migrações e seed executáveis por comando explícito, idempotentes e com encerramento de pool.
- Health check com driver timeout de 3s, status 503 e payload de erro fixo.
- AGENTS.md completo para orientar qualquer agente sem contexto prévio.
</success_criteria>

<output>
Ao final da execução, gerar `.planning/phases/01-foundation/01-SUMMARY.md`.
</output>
