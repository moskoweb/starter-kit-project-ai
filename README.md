# Vibe Starter Kit

**Base independente para criar produtos com IA — e produtos que usam IA.**

Um monorepo TypeScript com aplicação autenticada, PostgreSQL, painéis e ferramentas de geração. O objetivo tem duas frentes:

1. **Desenvolvimento assistido por IA:** código local legível, contratos de autorização, CLI para criar projetos e gerar models/resources/painéis, `AGENTS.md` e skills revisáveis. O agente trabalha no seu projeto, não em uma plataforma proprietária.
2. **IA dentro do produto:** integração opcional com provedor OpenAI-compatible, streaming e ferramentas com autorização no servidor. Não é necessária para usar autenticação, painéis ou CRUD.

O projeto criado recebe seu próprio código. Não depende de um serviço central do kit e não recebe atualizações automáticas. Não é um CMS, ORM próprio nem garantia universal de produção.

[Começar](docs/GETTING-STARTED.md) · [CLI](docs/CLI.md) · [Resources](docs/CLI-RESOURCES.md) · [Deploy](docs/DEPLOYMENT.md) · [Aceite](docs/ACCEPTANCE.md)

## O que está no código

- **Aplicação Next.js 16 / React 19:** App Router, Server Components, formulários, estados vazios/erro, navegação responsiva e `/api/health` com verificação do banco.
- **Identidade Better Auth:** cadastro, verificação de email, login/logout, recuperação, TOTP, email OTP, códigos de recuperação, organizações, convites e membros. Administrador global é provisionado explicitamente; não há conta ou senha padrão.
- **Ferramentas, sem domínio de exemplo:** nenhum CRUD de amostra para remover. Seu domínio nasce de `vibe resource` (model Drizzle + RLS + resource declarativo) com paginação, filtros, relações e autorização no servidor. PostgreSQL RLS e triggers protegem escopo pessoal/organizacional; UUID e prefixo de URL não concedem acesso.
- **Painéis configuráveis:** template registra só `admin` (`/admin`: usuários, organizações, métricas globais). `vibe create --profile` gera painel pessoal (`/app`), de organização (`/org/<slug>`) ou ambos, sem transformar contexto pessoal em organização fictícia. Admin global não tem acesso irrestrito aos dados dos tenants.
- **UI e painel:** shadcn/ui (`base-nova` sobre Base UI), Tailwind v4, Lucide, Sonner, Recharts. Painel inspirado no Filament: resources declarativos (tabela com busca, filtros, colunas, ação em massa; formulário; visualização), dashboard com widgets, busca global `⌘K`, seletor de workspace, notificações. Temas claro/escuro/sistema e locale `pt-BR`/`en`.
- **Geração revisável:** CLI cria cópia independente, models Drizzle com RLS, recursos CRUD e registro de painéis; preview e recusa de sobrescrita.
- **Integrações opt-in:** SMTP/Resend, armazenamento S3-compatible privado, IA, jobs pg-boss, notificações internas, webhooks, analytics com consentimento e exportação sanitizada de logs.

**Implementação não é aceite.** Instalação, migrations, grants, build, execução de containers, isolamento entre usuários/organizações e serviços externos precisam ser verificados no ambiente do projeto. Os comandos abaixo são instruções, não afirmação de execução nesta revisão documental. Consulte [limites e gates](#limites-e-verificação).

## Estrutura do monorepo

Nomes e scripts abaixo correspondem aos manifests dos workspaces; todos são privados. Pacotes locais não são serviços separados.

| Caminho | Nome no manifest | Responsabilidade | Scripts do workspace |
| --- | --- | --- | --- |
| `apps/app` | `app` | Aplicação Next.js autenticada, APIs e painéis | `dev`, `build`, `start`, `check-types` |
| `apps/web` | `@vibe/web` | Site público Astro estático, separado da aplicação autenticada | `dev`, `build`, `check`, `check-types`, `preview` |
| `apps/worker` | `@vibe/worker` | Consumidor de jobs e relay supervisionados | `dev`, `build`, `start`, `relay`, `check-types` |
| `packages/config` | `@vibe/config` | Ambiente validado com Zod e tsconfig compartilhado | `check-types`, `test` |
| `packages/db` | `@vibe/db` | Schema Drizzle, client, RLS, migrations e seed | `check-types`, `db:generate`, `db:migrate`, `db:seed`, `db:rate-limit-cleanup` |
| `packages/ui` | `@vibe/ui` | Primitivas e composição visual sem banco/autenticação | `check-types` |
| `packages/auth` | `@vibe/auth` | Better Auth, sessão, permissões e resolução de tenant | `check-types`, `seed:admin` |
| `packages/email` | `@vibe/email` | Templates React Email, render puro e transporte SMTP/Resend | `check-types`, `preview` |
| `packages/storage` | `@vibe/storage` | S3-compatible e validação de upload | `check-types`, `test` |
| `packages/jobs` | `@vibe/jobs` | Fila pg-boss e provisionamento separado | `check-types`, `test`, `provision` |
| `packages/ai` | `@vibe/ai` | Provedor OpenAI-compatible server-only | `check-types`, `test` |
| `packages/events` | `@vibe/events` | Outbox, notificações e relay | `check-types`, `test`, `relay`, `provision` |
| `packages/webhooks` | `@vibe/webhooks` | Recepção assinada, entrega e provisionamento | `check-types`, `test`, `provision` |
| `packages/observability` | `@vibe/observability` | Logs estruturados e exportação opcional | `check-types` |
| `packages/cli` | `@vibe/cli` | Executável local `vibe` | `build`, `check-types` |

## Quickstart: seu próprio projeto

Pré-requisitos: **Node.js >=22.23.0**, **pnpm 10.32.1** (versão fixada em `packageManager`), PostgreSQL 17 e acesso de operador para criar banco/roles. Docker é opcional; não substitui provisionamento e grants.

A CLI não está publicada como pacote público. A partir de um checkout do kit:

```bash
pnpm install
pnpm exec tsx packages/cli/src/index.ts create ../meu-produto --profile hybrid --preview --json
pnpm exec tsx packages/cli/src/index.ts create ../meu-produto --profile hybrid --noninteractive
cd ../meu-produto
pnpm install
```

O destino deve não existir, ficar fora do template e ter diretório pai existente. A cópia exclui credenciais `.env*` (exceto `.env.example`), dependências, caches, `.git`, `.planning` e índice CodeGraph; gera `AGENTS.md` portátil, grava perfil no exemplo de ambiente e registra os painéis do perfil (`personal` → `app` em `/app`; `organizations` → `org` em `/org/<slug>`; `hybrid` → ambos; `admin` sempre). Não copia o ambiente de preparação. Inicie histórico Git próprio se desejar.

Em seguida, siga [GETTING-STARTED](docs/GETTING-STARTED.md): provisionar roles, configurar ambiente, aplicar migrations, conceder grants, executar seed, provisionar admin e entrar. Resumo **após** esses preparativos:

```bash
pnpm --filter @vibe/db db:migrate
# Aplicar grants de runtime descritos no guia antes do seed.
pnpm --filter @vibe/db db:seed
pnpm --filter app dev
```

Abra `http://127.0.0.1:3000/login`. Sem admin provisionado, use `/signup` e conclua verificação de email no SMTP configurado. Não há credenciais de demonstração.

## Banco, ambiente e segredos

[`.env.example`](.env.example) é referência, não arquivo de credenciais utilizáveis. Substitua `change_me`, gere segredo próprio (`openssl rand -base64 32`) e mantenha arquivo real ignorado pelo Git ou use secret manager.

- `DATABASE_URL`: role runtime DML, `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`, sem propriedade de tabelas e sem herdar owner.
- `MIGRATION_DATABASE_URL`: role DDL separada, proprietária dos objetos do projeto; obrigatória para aplicar migrations, sem fallback para runtime. Não disponibilize no processo web.
- `BETTER_AUTH_URL`: origem real da aplicação, coerente com porta e hostname usados no navegador. `BETTER_AUTH_SECRET`: mínimo de 32 caracteres.
- Scripts de banco/CLI não carregam `.env` automaticamente. Injete configuração no processo; Next carrega seus próprios `.env*` em `apps/app`, mas isso não configura outros workspaces. [Guia](docs/GETTING-STARTED.md#3-configurar-ambiente) mostra injeção única.
- Flags opcionais ficam desligadas por padrão. Não exponha segredos em `NEXT_PUBLIC_*`, código client, imagens Docker, logs ou argumentos de geração.

Não existe `db:create`. As migrations não concedem automaticamente privilégios à role de runtime escolhida pelo operador. RLS não substitui grants SQL nem protege contra atacante com acesso SQL arbitrário às credenciais do servidor.

## Perfis e topologia

| Configuração | Comportamento |
| --- | --- |
| `IDENTITY_PROFILE=personal` | Dados pessoais; fluxos organizacionais desabilitados |
| `IDENTITY_PROFILE=organizations` | Operações de domínio exigem organização e membership |
| `IDENTITY_PROFILE=hybrid` | Contextos pessoal e organizacional reais, separados |
| `ORGANIZATION_MODE=multi` | Organizações múltiplas; padrão |
| `ORGANIZATION_MODE=single` | Somente organização existente em `SINGLE_ORGANIZATION_ID`; não cria organização/membership no startup |

Perfil e topologia são independentes. Em `single`, provisione primeiro organização e proprietário numa etapa controlada em `multi`, configure UUID e reinicie. Não é “uma organização por usuário”. [Contrato completo e fronteira das APIs](docs/SINGLE-TENANT.md).
Papéis organizacionais entregues são `owner`, `admin`, `member` e `viewer`, definidos em `packages/auth/src/permissions.ts`. Statement `data` de `canAccessScope(role, action)`: owner/admin têm CRUD, member não exclui e viewer só lê; resources gerados declaram permissões próprias por operação. Papéis são extensíveis no código; não há editor genérico de permissões dinâmicas habilitado por padrão. Papel global de usuário é separado de papel de membership.


## Painéis, resources e temas

Registro canônico: [`apps/app/src/lib/panels/registry.ts`](apps/app/src/lib/panels/registry.ts).

| Painel | Origem | Prefixo | Contexto |
| --- | --- | --- | --- |
| `admin` | Template (sempre) | `/admin` | Admin global |
| `app` | `create --profile personal\|hybrid` | `/app` | Usuário autenticado; ex. `/app/note` após `vibe resource Note` |
| `org` | `create --profile organizations\|hybrid` | `/org` | Membership; ex. `/org/minha-equipe/note` |

Painel organizacional declara `tenantIdentifier: "slug" | "uuid"`; padrão é slug. Trocar para UUID muda identificador da URL, não autorização. IDs/prefixos precisam ser únicos, não sobrepostos e não podem colidir com rotas reservadas. Use `buildPanelPath` em vez de concatenar caminhos. [Painéis](docs/PANELS.md).

**Model é schema Drizzle; resource compõe interface e operações.** Não há segunda camada ORM. Para trabalhar na CLI sem compilar:

```bash
pnpm exec tsx packages/cli/src/index.ts doctor
pnpm exec tsx packages/cli/src/index.ts panel sales --context organization --prefix /sales --preview --json
pnpm exec tsx packages/cli/src/index.ts model Note --spec '{"scope":"personal","fields":{"title":{"type":"string","required":true}}}' --preview --json
pnpm exec tsx packages/cli/src/index.ts resource Note --model note --panel app --with-model --spec '{"scope":"personal","fields":{"title":{"type":"string","required":true}},"permissions":{"read":["personal"],"create":["personal"],"update":["personal"],"delete":["personal"]}}' --preview --json
```

Exemplos acima são previews independentes. Para gerar Note com modelo e CRUD, execute **somente** comando `resource --with-model` sem `--preview`; não gere previamente o mesmo model. Revise arquivos e execute `pnpm db:generate`, revise SQL e aplique migrations separadamente. CLI recusa conflitos; não sobrescreve customizações. Resources gerados usam allowlists, autorização e contexto RLS, não inferem qualquer schema arbitrário. [Tipos, relações, limites e rollback](docs/CLI-RESOURCES.md).

Temas usam `@vibe/ui/theme.css`, tokens semânticos e CSS variables, não cópias de componentes por tema. Claro/escuro, densidade e raio são personalizáveis; shell persiste preferências por cookie. Locale base `pt-BR`, alternativa `en`; textos de domínio pertencem ao produto derivado. [UI](docs/UI.md) · [Localização](docs/I18N.md).

## Comandos

Na raiz, Turborepo executa scripts existentes nos workspaces:

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Inicia somente aplicação Next.js (`app`), sem worker/relay/preview |
| `pnpm dev:web` | Inicia site público Astro isolado |
| `pnpm dev:email` | Inicia preview React Email com exemplos sintéticos |
| `pnpm dev:worker` | Inicia worker com handlers reais; exige provisionamento e ambiente próprio |
| `pnpm dev:relay` | Inicia relay; exige provisionamento e ambiente próprio |
| `pnpm build` | Builds dos workspaces com script correspondente |
| `pnpm check-types` | Checagem TypeScript dos workspaces |
| `pnpm test` / `pnpm test:unit` | Suítes unitárias e self-checks de identidade, routing, limiter, validação, email e geração; sem integrações DB |
| `pnpm test:integration` | Identidade/RLS contra app, Mailpit e banco descartáveis; exige `IDENTITY_TEST_DATABASE=1` |
| `pnpm test:integration:events` | Concorrência de eventos contra banco/worker provisionados; exige `EVENTS_TEST_INTEGRATION=true` |
| `pnpm db:generate` | Gera SQL/snapshots e proteções de escopo pendentes; não aplica banco |
| `pnpm db:migrate` | Aplica migrations com credencial DDL |
| `pnpm db:seed` | Insere `app_name` se ausente, sem sobrescrever customizações |

Use `pnpm --filter <nome> <script>` para processos isolados. Exemplos:

```bash
pnpm --filter app dev
pnpm --filter app build
pnpm --filter app start
pnpm --filter @vibe/auth seed:admin       # ADMIN_EMAIL/ADMIN_NAME; senha por stdin
pnpm --filter @vibe/cli build
node packages/cli/dist/index.js --help
pnpm --filter @vibe/storage test
pnpm --filter @vibe/db db:rate-limit-cleanup
pnpm install --frozen-lockfile           # instalação reproduzível em CI
```

Não existe script root `lint`; não use `next lint` no Next.js 16.

## Integrações opcionais

| Integração | Ativação / contrato | Guia |
| --- | --- | --- |
| Email | `EMAIL_PROVIDER=smtp|resend`, `EMAIL_FROM` e configuração do provedor; necessário para fluxos de verificação/recuperação/convite; sem fallback automático | [Email](docs/EMAIL.md) |
| S3-compatible | `STORAGE_ENABLED=true`, bucket privado e credenciais próprias; URLs assinadas e vínculo autorizado a uma entidade (`entityType` + `entityId`) | [Storage](docs/STORAGE.md), [Endpoints](docs/STORAGE-ENDPOINTS.md) |
| IA | `AI_ENABLED=true`, provedor/modelo/chave próprios; limites e ferramentas server-side, sem chave pública | [IA](docs/AI.md), [Endpoint](docs/AI-ENDPOINT.md) |
| Jobs / notificações | `JOBS_ENABLED=true`, schema pg-boss provisionado, worker e relay separados; eventos `<entidade>.created` (ex. `note.created` dos resources gerados) notificam criador | [Eventos](docs/EVENTS.md), [Notificações](docs/NOTIFICATIONS.md) |
| Webhooks | Flags inbound/outbound independentes; assinatura, deduplicação e política de destino; outbound exige jobs | [Webhooks](docs/WEBHOOKS.md), [Integração](docs/WEBHOOK-INTEGRATION.md) |
| Analytics / logs | Analytics exige flag, configuração pública e consentimento; OTLP é exportador mínimo opcional, não SDK completo | [Operação](docs/OPERATIONS.md) |

Desabilitado não exige credencial de provedor. Habilitado inválido deve falhar claramente; nenhum sucesso simulado. Mailpit é ferramenta externa de desenvolvimento opcional, não prova de entrega SMTP/Resend na internet.

## Worker, relay e deploy

Aplicação web não consome fila. Após migrations e provisionamento explícito de roles/schemas, execute processos separados. Exemplo a partir da raiz, com ambiente restrito apropriado a cada processo:

```bash
pnpm --filter @vibe/jobs provision
pnpm --filter @vibe/events provision
# Se outbound estiver habilitado:
pnpm --filter @vibe/webhooks provision
pnpm --filter @vibe/worker dev "$PWD/apps/worker/src/handlers.ts"
# Outro terminal / supervisor:
pnpm --filter @vibe/worker relay
```

`handlers.ts` registra callbacks reais de notificação e webhook. Use caminho absoluto porque `--filter` muda diretório de execução. Worker exige `JOBS_ENABLED=true`, `WORKER_DATABASE_URL` dedicado e acesso à fila pela `DATABASE_URL` do seu processo. Provisionadores usam credenciais separadas (`JOBS_MIGRATION_DATABASE_URL`, `EVENTS_PROVISION_DATABASE_URL`) e roles explicitamente nomeadas; nunca execute provisionamento no startup. Entrega é ao menos uma vez com efeito idempotente, não promessa de exatamente uma execução.

[`Dockerfile`](Dockerfile) tem targets `app` e `worker`; [`compose.example.yml`](compose.example.yml) é exemplo com perfil `jobs` para worker/relay, não infraestrutura pronta. TLS, rede, backups/restauração, supervisão, limites de recursos, secret manager e validação real dos containers são responsabilidades do deploy. [Guia de deployment e gates](docs/DEPLOYMENT.md).

Compose usa arquivos runtime separados `.env.app.runtime` e `.env.worker.runtime`: nunca inclua credenciais de migrations/provisionamento nesses arquivos. `.env` serve somente para interpolação do deploy. Configuração pública de analytics e origem S3 para CSP são argumentos de build; alterações exigem recompilar imagem. pnpm autoriza scripts nativos somente de `esbuild` e `sharp`; novas exceções exigem revisão.

## Site público Astro

`apps/web` é frontend público estático separado do Next.js: landing page `/`, guia público `/getting-started`, versões inglesas `/en` e `/en/getting-started`, além de páginas de erro 404. Compartilha tokens visuais de `@vibe/ui`, não sessão nem conexão de banco. Não substitui painéis autenticados e não é servidor de autenticação.

```bash
PUBLIC_APP_URL=http://127.0.0.1:3000 SITE_URL=http://127.0.0.1:4321 pnpm dev:web
```

Abra `http://127.0.0.1:4321`. `PUBLIC_APP_URL` é origem pública do app usada em links; `SITE_URL` é origem canônica do site e deve ser fornecida no build. Não são segredos. Para publicar, configure origens reais, execute `pnpm --filter @vibe/web build` e hospede `apps/web/dist` em hosting estático com tratamento de `404.html`. Não precisa de DB, auth nem processo Node no deploy estático. `pnpm --filter @vibe/web preview` serve artefato localmente; não é servidor de produção.

Na validação local integrada do kit, site Astro passou checagem de tipos e build; home em português/inglês e guia foram inspecionados no navegador, incluindo layout mobile sem overflow horizontal e troca de tema. Preview React Email, renderização e fluxo real de autenticação com captura Mailpit também foram exercitados. Isso não comprova hosting de produção, entrega de email na internet ou integração com provedores externos.

## Email transacional e preview

`packages/email` reúne templates React Email para verificação, recuperação de senha, convite e OTP, renderização `{ subject, html, text }` e transporte SMTP/Resend. `@vibe/email/render` é entrypoint puro para Node/worker; transporte continua server-only. Preview usa exemplos sintéticos, não envia mensagens nem exige credenciais:

```bash
pnpm --filter @vibe/email preview
```

Abra `http://127.0.0.1:3005`. Personalize templates e conteúdo no projeto derivado, mantendo URLs confiáveis e sem segredos no preview. [Contrato de renderização e provedores](docs/EMAIL.md).

## Trabalho com agentes

[`AGENTS.md`](AGENTS.md) define arquitetura, segurança e regras de mudança. `.agents/skills/` traz `atomic-commits` (MIT) e `frontend-design` (Apache-2.0), skills locais revisadas; não instale coleções em massa.

GSD continua o trabalho em `.planning/`; projetos derivados começam histórico próprio, sem copiar planejamento ou índice do kit. Ferramentas externas são opcionais e devem ser instaladas no escopo do projeto quando suportado. Consulte [matriz, comandos oficiais, licenças, telemetria e riscos](docs/AGENT-TOOLS.md) antes de instalar.
## Limites e verificação

O kit entrega código e fluxos de exemplo, não certificação de segurança, operação ou compliance. Antes de publicar um produto:

- Executar tipos, testes disponíveis e build; verificar o conteúdo e os skips de cada suíte. Testes de integração exigem banco descartável e opt-in; não apontar para produção.
- Validar cadastro/email/login/recuperação/2FA, admin, organização única/múltipla, CRUD e casos negativos entre usuários e tenants.
- Inspecionar UI real: teclado, foco, mobile, temas, locale e estados de falha. Build não comprova acessibilidade.
- Exercitar storage, IA, webhooks, email e observabilidade com credenciais do projeto quando habilitados; ausência de credenciais é gate não executado, não aprovado.
- Validar container, CI, worker/relay, retry/idempotência, revogação de permissão, backup/restauração e configuração de produção separadamente.

`pnpm test` inclui os self-checks unitários canônicos, não os gates de integração opt-in. Os scripts de integração recusam execução sem habilitação explícita; skips não são aceite. Não há prova universal de produção nem autorização irrestrita para superadmin. Algumas notas técnicas de implementação registram estados anteriores; para aceite use código atual e evidência observada, não frases históricas de conclusão.

## Documentação

- **Primeira execução:** [GETTING-STARTED](docs/GETTING-STARTED.md)
- **Extensão:** [CLI](docs/CLI.md), [resources/painéis](docs/CLI-RESOURCES.md), [painéis](docs/PANELS.md)
- **Identidade:** [rotas](docs/AUTH-ROUTES.md), [single-tenant](docs/SINGLE-TENANT.md)
- **Interface:** [UI, resources e licença das adaptações](docs/UI.md), [localização](docs/I18N.md)
- **Operação:** [deployment](docs/DEPLOYMENT.md), [logs/analytics/SEO](docs/OPERATIONS.md), [controles de segurança](docs/SECURITY.md)
- **Aceite:** [roteiro integrado](docs/ACCEPTANCE.md), [testes de identidade](tests/identity)

Não há licença geral declarada no manifest raiz. Antes de redistribuir, defina licença do seu produto e preserve atribuições de dependências e adaptações; a licença das adaptações shadcn/ui está em `docs/UI.md`.
