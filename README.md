# Vibe Starter Kit

Monorepo com Turborepo, Next.js 16, TypeScript 5.9.3, PostgreSQL 17 e Drizzle ORM.

## Workspaces

```text
apps/app          Next.js 16 (App Router, Server Components, /api/health)
packages/config   tsconfig base e validação Zod das variáveis de ambiente ativas
packages/db       Drizzle, schema app_settings, migrations, seed e client (entrypoint server-only)
packages/ui       Tokens CSS e primitivas de layout sem dependência de banco
```

## Pré-requisitos

- Node.js >= 22.23.0 e pnpm 10.32.1
- PostgreSQL 17 externo (ex.: 127.0.0.1:5432) com database `vibe_starter` já criado

## Banco de dados externo

O template não cria banco nem roles (sem `db:create`). Provisione fora do repositório duas roles `NOSUPERUSER NOCREATEDB NOCREATEROLE`:

- `vibe_starter_owner`: DDL/migrations. Usa `MIGRATION_DATABASE_URL` (obrigatória, sem fallback para `DATABASE_URL`).
- `vibe_starter_app`: DML do runtime e seed. Usa `DATABASE_URL`. Precisa de `SELECT/INSERT/UPDATE/DELETE` nas tabelas do schema `public` (grant após cada migration ou `ALTER DEFAULT PRIVILEGES` da owner).

## Variáveis de ambiente

Nenhum `.env` é carregado pelos scripts de `@vibe/db`. Injete as variáveis no shell, com `.env.example` como referência e o arquivo real fora do repositório:

```bash
set -a; . /caminho/externo/development.env; set +a
```

- `DATABASE_URL`: URL `postgres:`/`postgresql:` da role de runtime
- `MIGRATION_DATABASE_URL`: URL `postgres:`/`postgresql:` da role owner
- `PORT`: somente dígitos, 1-65535 (padrão 3000)
- `NODE_ENV`: `development`, `test` ou `production`

O Next.js carrega `.env*` de `apps/app` por conta própria; prefira a injeção explícita única.

## Comandos

```bash
pnpm install                              # gera/respeita pnpm-lock.yaml
pnpm install --frozen-lockfile            # CI
pnpm --filter @vibe/db db:generate        # gera SQL a partir do schema (exige MIGRATION_DATABASE_URL)
pnpm --filter @vibe/db db:migrate         # aplica migrations com a role owner
pnpm --filter @vibe/db db:seed            # insere app_name se ausente; não sobrescreve customizações
pnpm dev                                  # Next.js em 127.0.0.1:$PORT (padrão 3000)
pnpm check-types                          # tsc --noEmit em todos os pacotes
pnpm test                                 # testes node:test de limites de env
pnpm build
```

Health check:

```bash
curl -s http://127.0.0.1:3000/api/health
```

- 200: `{"status":"ok","db":"connected","latencyMs":N}`
- 503: `{"status":"error","db":"unreachable"}` (payload fixo, sem detalhes do driver). Limite de 3s para a query; `statement_timeout` e `query_timeout` no client cobrem consultas fora do health.

## Guias e aceite

- [Localização, temas e limites](docs/I18N.md)
- [CLI e comandos disponíveis](docs/CLI.md)
- [Deploy e gates externos](docs/DEPLOYMENT.md)
- [Roteiro de aceite integrado](docs/ACCEPTANCE.md) — roteiro a executar; não representa testes concluídos.

`pnpm test` executa testes disponíveis no workspace, não aceite integrado. Build, container, workflows externos e integrações sem credenciais próprias permanecem gates separados; consulte os guias antes de declarar conclusão.
## Limites da Fase 1

- Lint (ESLint) não configurado: `next lint` não existe no Next.js 16.
- `app_settings` usa chave textual (`varchar(64)`) deliberadamente por ser configuração interna; UUID para entidades de domínio entra na Fase 2.
- Identidade da Fase 2 está implementada separadamente; não implica conclusão/verificação da fundação.
- `@vibe/db` (entrypoint) importa `server-only`: importar em componente `'use client'` quebra o build. Scripts CLI usam módulos sem `server-only`.
- `start` não fixa hostname; defina-o no ambiente de deploy quando necessário.

## Identidade

`@vibe/auth` integra Better Auth 1.7.20 com adapter Drizzle e plugins admin, organization e twoFactor. Schema auth foi gerado/conferido pela CLI instalada; tabelas auth não usam RLS. `user.role` administra privilégio global; `member.role` governa somente organização. Cadastro rejeita campos privilegiados. Verificação de email é obrigatória antes login.

Configure `BETTER_AUTH_URL` e segredo próprio `BETTER_AUTH_SECRET` (mínimo 32 caracteres). Perfil `IDENTITY_PROFILE=personal|organizations|hybrid`: pessoal não exige organização, organizations exige contexto organizacional para operações de domínio, híbrido permite ambos. Variáveis de identidade são validadas somente ao usar módulo. Template entrega apenas `.env.example`, sem conta ou arquivo de credenciais real. Alterar ambiente requer reiniciar processo de desenvolvimento.

Email usa `@vibe/email`, provedor explícito `EMAIL_PROVIDER=smtp|resend`, `EMAIL_FROM` e configuração correspondente no exemplo. SMTP local pode usar Mailpit em `127.0.0.1:11025`, sem conta/autenticação. Resend exige chave somente se selecionado. Falha não tenta outro provedor. Smoke externo Resend depende de credenciais do projeto e não foi executado.

`withAuthorizedProjects(headers, tenantIdentifier|null, action, callback)` deriva usuário da sessão autoritativa, resolve organização por UUID/slug com membership e verifica permissão no servidor. Callback recebe apenas transação autorizada. `withTenantTransaction` é primitiva interna servidor: usuário deve vir de sessão, nunca do cliente. Membership é bloqueada/revalidada dentro transação e GUCs são locais. Use somente `tx` no callback, nunca client global. Superadmin não recebe bypass de domínio. `projects/tasks` possuem FORCE RLS para isolamento pessoal/organizacional; permissões de operação têm fonte única `packages/auth/src/permissions.ts`. Credencial SQL de runtime não é fronteira contra atacante com acesso SQL arbitrário, que poderia forjar GUCs; nunca expor conexão/query livre. Triggers/grants custom de migrations precisam ser preservados em futuras alterações Drizzle.

Relação tarefa/projeto: organização deve coincidir (comparação null-safe). Em contexto pessoal, dono também deve coincidir. Em organização, membro autorizado pode criar tarefa em projeto de outro membro; `task.ownerUserId` é usuário criador, não dono do projeto. Migration `0004_task_scope` corrige essa regra sem modificar migrations anteriores; RLS continua exigindo membership e autoria da inserção.

`totpReplayGuard` mantém somente último timestep aceito por usuário em `totp_replay`, com compare-and-set atômico. Mantém verificação criptográfica da biblioteca e janela nativa de ±1 timestep (30 segundos); passo já consumido ou anterior é negado também em desafios independentes/concorrentes. Falha posterior do endpoint não libera passo consumido (fail-closed); usuário aguarda próximo código ou usa recuperação. Reativar TOTP com novo segredo também não reutiliza timestep já consumido nesse usuário. Nunca persistir códigos ou segredo nesse guard.

Role runtime deve ser `NOSUPERUSER NOBYPASSRLS`, sem propriedade das tabelas. Policies `TO public` não concedem privilégios SQL. Após migration, owner do banco concede para role runtime escolhida (substitua `your_runtime_role`, identificador administrado, nunca entrada HTTP):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user", public.session, public.account, public.verification, public.organization, public.member, public.invitation, public.two_factor TO your_runtime_role;
GRANT SELECT, INSERT, DELETE ON public.projects, public.tasks TO your_runtime_role;
GRANT UPDATE (name, description, updated_at) ON public.projects TO your_runtime_role;
GRANT UPDATE (project_id, title, updated_at) ON public.tasks TO your_runtime_role;
GRANT EXECUTE ON FUNCTION public.identity_scope_immutable(), public.task_project_scope() TO your_runtime_role;
GRANT SELECT, INSERT, UPDATE ON public.totp_replay TO your_runtime_role;
```

Provisionamento global explícito, sem senha em argumentos/logs/histórico:

```bash
export ADMIN_EMAIL=admin@example.test ADMIN_NAME='Admin'
read -rs -p 'Senha: ' ADMIN_INPUT; printf '\n'
printf '%s\n' "$ADMIN_INPUT" | pnpm --filter @vibe/auth seed:admin
unset ADMIN_INPUT
```

Comandos de prova integrada, **não executados nesta implementação**; use DB de teste dedicado e ambiente injetado externamente, nunca produção:

```bash
pnpm --filter @vibe/db db:migrate
# Runtime role precisa grants do contrato banco acima após migration.
pnpm check-types
IDENTITY_TEST_DATABASE=1 IDENTITY_TEST_BASE_URL=http://127.0.0.1:3001 pnpm exec tsx --conditions=react-server --test --test-concurrency=1 tests/identity/*.test.ts
curl -s http://127.0.0.1:3001/api/auth/ok
curl -s http://127.0.0.1:18025/api/v1/messages
```

Testes criam emails/UUIDs próprios e removem somente fixtures próprias; não limpam inbox Mailpit. Inspeção UI deve cobrir cadastro, verificação, login/logout, recuperação, TOTP, email OTP, backup codes e gestão de organizações/convites/membros, incluindo erros e navegação por teclado. Aplicar migrations e executar provas são operações separadas; implementação não afirma aceite de fase nem conclusão de build de produção.
