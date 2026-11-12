# Primeira execução

Guia para uma cópia independente do kit. Comandos são instruções, não relatório de testes executados. Use banco novo e dados sintéticos; não use produção para aprender o fluxo.

## 1. Preparar ferramentas e criar projeto

Requisitos:

- Node.js >=22.23.0 e pnpm 10.32.1; confira `node --version` e `pnpm --version`.
- PostgreSQL 17 acessível, cliente `psql` e operador com permissão para criar banco e roles.
- Bash para exemplos de injeção de ambiente e senha por stdin.
- SMTP de desenvolvimento acessível para cadastro/verificação/recuperação. Mailpit é uma opção externa; não é instalado pela CLI.

A partir de um checkout do kit, com diretório pai do destino já existente:

```bash
pnpm install
pnpm exec tsx packages/cli/src/index.ts create ../meu-produto --profile hybrid --preview --json
pnpm exec tsx packages/cli/src/index.ts create ../meu-produto --profile hybrid --noninteractive
cd ../meu-produto
pnpm install
```

Troque `hybrid` por `personal` ou `organizations` conforme produto. O kit não traz domínio de exemplo: o template só tem o painel `admin` (`/admin`). `create` registra os painéis de trabalho do perfil, como `vibe panel` faria (`apps/app/src/lib/panels/<id>.config.ts` + import em `registry.ts`): `personal` → painel `app` em `/app`; `organizations` → painel `org` em `/org/<slug>`; `hybrid` → ambos. Destino deve não existir, não pode ser symlink nem ficar dentro do kit. CLI copia fonte, não `.git`, `.planning`, dependências, caches ou credenciais reais. O novo `AGENTS.md` é portátil; histórico e configuração de agentes do kit não são transferidos. Não há sincronização automática com upstream.

Não há `pnpm create` publicado nem necessidade de instalar `vibe` globalmente. Todos comandos CLI deste guia rodam pela fonte local.

## 2. Provisionar PostgreSQL

O kit **não cria banco nem roles**. Exemplo abaixo usa nomes novos `produto_owner`, `produto_app` e `meu_produto`; adapte nomes no SQL e nas URLs, sem misturar com outros projetos.

Abra `psql` com credencial administrativa pelo mecanismo do seu servidor. Não ponha senha em argumentos/histórico. Execute uma vez:

```sql
CREATE ROLE produto_owner LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE ROLE produto_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
\password produto_owner
\password produto_app
CREATE DATABASE meu_produto OWNER produto_owner;
REVOKE ALL ON DATABASE meu_produto FROM PUBLIC;
GRANT CONNECT ON DATABASE meu_produto TO produto_owner, produto_app;
\connect meu_produto
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO produto_app;
```

`\password` solicita e confirma senhas sem gravá-las no SQL. Guarde-as em secret manager ou arquivo privado local. Roles runtime não devem herdar owner, ser proprietárias das tabelas, ter `BYPASSRLS` ou privilégios administrativos. Não conceda role owner à role app. Owner migra; app só executa operações autorizadas de runtime.

PostgreSQL precisa permitir autenticação/conexão dessas roles conforme política do servidor. Este guia não altera `pg_hba.conf`, rede, TLS ou bancos compartilhados.

## 3. Configurar ambiente

Na raiz do **projeto derivado**, crie arquivo privado local a partir do exemplo:

```bash
cp .env.example .env.local
chmod 600 .env.local
openssl rand -base64 32
```

Edite `.env.local`; não publique saída do gerador nem comite arquivo. Configure:

```dotenv
DATABASE_URL=postgresql://produto_app:SENHA_URL_ENCODED@127.0.0.1:5432/meu_produto
MIGRATION_DATABASE_URL=postgresql://produto_owner:SENHA_URL_ENCODED@127.0.0.1:5432/meu_produto
PORT=3000
NODE_ENV=development
BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_SECRET='COLE_SEGREDO_ALEATORIO_GERADO_LOCALMENTE'
IDENTITY_PROFILE=hybrid
ORGANIZATION_MODE=multi
EMAIL_PROVIDER=smtp
EMAIL_FROM='Meu produto <no-reply@example.test>'
SMTP_HOST=127.0.0.1
SMTP_PORT=11025
SMTP_SECURE=false
STORAGE_ENABLED=false
AI_ENABLED=false
JOBS_ENABLED=false
WEBHOOKS_INBOUND_ENABLED=false
WEBHOOKS_OUTBOUND_ENABLED=false
NEXT_PUBLIC_ANALYTICS_ENABLED=false
OTEL_LOG_EXPORT_ENABLED=false
```

Valores em maiúsculas são marcadores: substitua-os. Senhas nas URLs precisam de percent-encoding quando contêm caracteres reservados. Preserve aspas de `EMAIL_FROM` e de outros valores com espaços ao usar arquivo como script Bash. Não execute arquivo recebido de terceiros sem leitura: `source` executa código.

Exemplo SMTP assume serviço local escutando porta 11025. Use porta real do seu serviço. Se optar por Mailpit com Docker disponível, em terminal separado:

```bash
docker run --rm --name meu-produto-mailpit \
  -p 127.0.0.1:11025:1025 -p 127.0.0.1:18025:8025 \
  axllent/mailpit:v1.27.4
```

Abra `http://127.0.0.1:18025` para ler mensagens sintéticas. Esse serviço não entrega email na internet. Para SMTP autenticado, informe `SMTP_USER` e `SMTP_PASSWORD` juntos; para Resend use `EMAIL_PROVIDER=resend` e chave própria. Sem fallback automático. [Contrato de email](EMAIL.md).

Injete arquivo **revisado e compatível com Bash** no terminal em que executará comandos:

```bash
set -a
. ./.env.local
set +a
```

Scripts de banco, CLI e worker não carregam `.env` automaticamente. `.env.local` na raiz também não configura sozinho o Next em `apps/app`. Repita injeção em cada terminal ou use secret manager. Não use `env`, `set` ou logs de debug para imprimir segredos.

Em desenvolvimento, este terminal contém credencial de migration para tarefas explícitas. Não reutilize esse conjunto completo de variáveis no runtime de produção. Para iniciar somente app local após migrations, remova credencial DDL do ambiente desse processo:

```bash
env -u MIGRATION_DATABASE_URL pnpm --filter app dev
```
Templates React Email ficam no próprio `packages/email`; não há app de email separado. Para revisar verificação, recuperação, convites e OTP com exemplos sintéticos, use `pnpm --filter @vibe/email preview` e abra `http://127.0.0.1:3005`. Preview não usa transporte nem envia emails. `@vibe/email/render` retorna HTML e texto para consumidores Node/worker; [EMAIL.md](EMAIL.md) descreve contrato.


Mantenha `BETTER_AUTH_URL`, URL no navegador e porta coerentes. Se escolher outra porta, altere `PORT` e `BETTER_AUTH_URL` antes de iniciar; reinicie processos após mudar ambiente.

## 4. Aplicar migrations e conceder grants

Em terminal com ambiente injetado:

```bash
pnpm --filter @vibe/db db:migrate
```

Template já contém migrations versionadas. Não gere novamente apenas para instalar. **Depois de alterar schema ou gerar model/resource**, fluxo é:

```bash
pnpm --filter @vibe/db db:generate
# Revisar SQL, snapshots e proteções de escopo gerados.
pnpm --filter @vibe/db db:migrate
```

Geração e aplicação são operações distintas. `db:migrate` recusa proteções de escopo pendentes; nunca edite histórico já aplicado nem remova triggers/policies para contornar erro.

Agora conecte `psql` ao banco `meu_produto` como owner/operador e conceda privilégios para instalação base. Não basta uma policy `TO public`: policy não concede grants SQL.

```sql
GRANT USAGE ON SCHEMA public TO produto_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public."user", public.session, public.account, public.verification,
     public.organization, public.member, public.invitation, public.two_factor
  TO produto_app;
GRANT SELECT, INSERT, UPDATE ON public.totp_replay TO produto_app;
GRANT SELECT, INSERT, UPDATE ON public.rate_limit_windows TO produto_app;
GRANT SELECT, INSERT ON public.event_outbox TO produto_app;
GRANT SELECT, DELETE ON public.notifications TO produto_app;
GRANT UPDATE (read_at) ON public.notifications TO produto_app;
```

Integrações opcionais, somente quando habilitadas (tabelas já existem pelas migrations; RLS continua aplicando escopo):

```sql
-- STORAGE_ENABLED=true (upload, confirmação, download e limpeza de anexos)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storage_objects TO produto_app;
-- PUSH_ENABLED=true (inscrições do navegador)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO produto_app;
-- AI_ENABLED=true (cota diária)
GRANT SELECT, INSERT, UPDATE ON public.ai_usage_daily TO produto_app;
-- WEBHOOKS_OUTBOUND_ENABLED=true (fila e status de entregas; worker provisionado à parte)
GRANT SELECT, INSERT, UPDATE ON public.webhook_deliveries TO produto_app;
-- WEBHOOKS_INBOUND_ENABLED=true (recibo idempotente)
GRANT SELECT, INSERT ON public.webhook_receipts TO produto_app;
```

Notificações podem ser consultadas mesmo sem fila habilitada, mas só serão produzidas pelo fluxo de eventos quando configurado. Não conceda `INSERT` nem `UPDATE` geral de notificações ao runtime app. Dados de identidade não usam RLS; acesso fica restrito ao servidor de autenticação. Tabelas de dados (geradas por `vibe resource --with-model` e integrações) usam FORCE RLS e escopo transacional derivado da sessão.

Novas tabelas geradas exigem grants próprios revisados. Não use `GRANT ALL ON ALL TABLES`, ownership ou `BYPASSRLS` para resolver erro de permissão. Integrações opcionais requerem grants/provisionamento adicionais nos guias específicos. Nenhum comando deste guia dá credencial SQL a browser ou usuário final.

## 5. Diagnóstico

```bash
pnpm exec tsx packages/cli/src/index.ts doctor
```

Não há seed: o kit não cria dados de demonstração. `doctor` verifica presença de arquivos/scripts e variáveis obrigatórias; não testa conexão, grants, SMTP nem segurança do deploy. Não imprime valores dos segredos.

## 6. Provisionar administrador explicitamente

Opcional para usuário comum; necessário para `/admin`. Use email próprio de desenvolvimento e senha nova de pelo menos 12 caracteres, nunca senha em argumento:

```bash
export ADMIN_EMAIL=admin@example.test
export ADMIN_NAME='Admin'
read -rs -p 'Senha do admin (mínimo 12 caracteres): ' ADMIN_INPUT
printf '\n'
printf '%s\n' "$ADMIN_INPUT" | pnpm --filter @vibe/auth seed:admin
unset ADMIN_INPUT ADMIN_EMAIL ADMIN_NAME
```

Com email novo, script cria usuário verificado e conta com senha. Com email existente, promove e verifica conta, mas **não redefine senha existente**. Admin global é privilégio administrativo, não bypass dos dados de domínio nem membership automático de organização.

## 7. Iniciar app e entrar

Em terminal com ambiente injetado:

```bash
env -u MIGRATION_DATABASE_URL pnpm --filter app dev
```

`pnpm dev` é atalho root equivalente a `pnpm --filter app dev`; inicia só aplicação Next.js. Worker, relay e previews têm comandos separados (`dev:worker`, `dev:relay`, `dev:web`, `dev:email`) e não iniciam automaticamente.

1. Abra `http://127.0.0.1:3000/login` e entre com admin provisionado. `/admin` mostra contagens administrativas.
2. Para conta comum, abra `/signup`, cadastre e siga link de verificação recebido no SMTP. Login exige email verificado. Não há conta demo nem senha padrão.
3. Em perfil `personal` ou `hybrid`, `/` leva a `/app`: painel vazio com boas-vindas e cartão da conta até você gerar resources (seção 9).
4. Em perfil `organizations` ou `hybrid`, use `/organizations` para criar organização; `/organizations/<slug>` administra dados, membros, convites, propriedade e exclusão conforme papel. No perfil `organizations`, usuário sem organização cai em `/onboarding` ao abrir `/`; com organização, em `/org/<slug>`.
5. Confira `/account`, `/security` e fluxos de recuperação/2FA conforme produto; não confunda email capturado localmente com entrega externa validada.

Para observar health:

```bash
curl -i http://127.0.0.1:3000/api/health
```

Espera-se 200 com `status: ok` e `db: connected`; banco indisponível retorna 503 com erro sanitizado. Health não prova grants de todas tabelas, autenticação ou entrega email.

## 8. Escolher perfil e organização única

- `personal`: somente dados pessoais.
- `organizations`: domínio exige organização/membership.
- `hybrid`: pessoal e organização, sem organização fictícia para representar usuário.

`ORGANIZATION_MODE=multi` é padrão. Para organização única, primeiro provisione organização e proprietário em etapa controlada em `multi`; obtenha UUID da organização existente, configure `ORGANIZATION_MODE=single` e `SINGLE_ORGANIZATION_ID`, reinicie. Single não cria organização/associação nem permite criação de outras organizações. Perfil continua independente. [Contrato e limites](SINGLE-TENANT.md).

Painéis ficam em `apps/app/src/lib/panels/registry.ts`: `/admin` sempre; `/app` e/ou `/org` conforme perfil escolhido no `create`. Para adicionar outro painel use `vibe panel`. Organização usa slug por padrão; `tenantIdentifier: "uuid"` troca formato de URL. Use builders de rota; identificador nunca é autorização. [Painéis](PANELS.md).

## 9. Criar primeiro resource

No projeto derivado (perfil `personal` ou `hybrid`, painel `app`):

```bash
pnpm exec tsx packages/cli/src/index.ts resource Note --model note --panel app --with-model --spec '{"scope":"personal","fields":{"title":{"type":"string","required":true}},"permissions":{"read":["personal"],"create":["personal"],"update":["personal"],"delete":["personal"]}}' --preview --json
```

Revise preview, execute mesmo comando sem `--preview`, gere/revise/aplique migrations. Como owner, conceda `SELECT, INSERT, DELETE` na tabela gerada e `UPDATE` só nos campos editáveis; preserve identidade/escopo imutáveis. Consulte nome SQL efetivamente gerado, não adivinhe pluralização. Entre e abra `/app/note` (slug = nome em kebab-case, sem pluralizar). Com `JOBS_ENABLED=true`, criar registro enfileira evento `note.created` na mesma transação.

Não execute `model Note` antes de `resource Note --with-model`: seriam duas tentativas de criar mesmo model. Para model existente, omita `--with-model` e forneça spec compatível. CLI recusa sobrescrita e schema não suportado. [Contrato completo, relações e proteções](CLI-RESOURCES.md).

## Site público e preview de email

Site Astro é opcional e separado da aplicação autenticada. Em outro terminal, sem credenciais de banco:

```bash
PUBLIC_APP_URL=http://127.0.0.1:3000 SITE_URL=http://127.0.0.1:4321 pnpm dev:web
```

Abra `http://127.0.0.1:4321`: rotas públicas `/`, `/getting-started`, `/en` e `/en/getting-started`, além de `/404`. `PUBLIC_APP_URL` deve apontar para origem real do Next.js, não para site Astro. `SITE_URL` define origem canônica pública; forneça origem real no build. São valores públicos, nunca coloque segredos neles.

```bash
PUBLIC_APP_URL=https://app.example.test SITE_URL=https://www.example.test pnpm --filter @vibe/web build
pnpm --filter @vibe/web preview
```

Build gera `apps/web/dist`; publique em hosting estático e configure fallback de erro `404.html`. Exemplos `.test` não são domínios de produção utilizáveis. Preview serve build local em loopback 4321, não é deploy de produção. Site estático não exige DB/auth/processo Node no servidor e não compartilha sessão do Next.js.

Para email, `pnpm dev:email` é atalho para `pnpm --filter @vibe/email preview`; abra `http://127.0.0.1:3005`. Exemplos são sintéticos, sem envio. Customizar preview não comprova render em todos clientes ou entrega SMTP/Resend. [Contrato](EMAIL.md).

## 10. Habilitar integrações somente quando necessárias

- **Storage:** bucket privado, configuração S3 e grants de `storage_objects`. [Storage](STORAGE.md), [endpoints](STORAGE-ENDPOINTS.md).
- **IA:** provedor/modelo reais e limites configurados; segredos server-only. [IA](AI.md), [endpoint](AI-ENDPOINT.md).
- **Jobs:** roles separadas, mesmo banco físico para domínio/fila, schema pg-boss provisionado, worker e relay supervisionados. [Eventos](EVENTS.md).
- **Webhooks:** segredos próprios, allowlist de destino e provisionamento de worker; outbound depende de jobs. [Integração](WEBHOOK-INTEGRATION.md).
- **Analytics/logs:** consentimento e hosts confiáveis; exportação é opcional. [Operação](OPERATIONS.md).

Para jobs, não basta trocar flag. Provisione login worker sem privilégios administrativos; configure `JOBS_MIGRATION_DATABASE_URL`, `JOBS_RUNTIME_ROLE`, `EVENTS_PROVISION_DATABASE_URL`, `EVENTS_WORKER_ROLE` e `WORKER_DATABASE_URL` conforme contratos. Conceda acesso pg-boss para cada role que usar a fila reexecutando provisionamento com role correta. Nunca injete credenciais provisionadoras no web/worker.

```bash
pnpm --filter @vibe/jobs provision
pnpm --filter @vibe/events provision
# Somente para outbound habilitado, após configurar suas variáveis:
pnpm --filter @vibe/webhooks provision
```

Em terminais/supervisor com ambiente runtime restrito e `JOBS_ENABLED=true`, execute da raiz:

```bash
pnpm --filter @vibe/worker dev "$PWD/apps/worker/src/handlers.ts"
# Outro processo:
pnpm --filter @vibe/worker relay
```

Use caminho absoluto do módulo; `--filter` muda cwd. `DATABASE_URL` no processo precisa dos direitos runtime de fila; `WORKER_DATABASE_URL` é login worker dedicado para efeitos/outbox. App/worker/relay são processos distintos. Notificação é interna para quem criou o registro; não é broadcast a todos membros nem email automático. Duplicação de transporte é esperada, efeito usa idempotência.

## 11. Verificar antes de publicar

Comandos disponíveis, **não executados por este guia**:

```bash
pnpm check-types
pnpm test
pnpm build
```

Root `test` só executa scripts dos manifests; não inclui todos testes sob `apps/app` e `tests/identity`. Testes de integração opt-in precisam de banco de teste dedicado e variáveis próprias. Consulte [aceite integrado](ACCEPTANCE.md), [testes de identidade](../tests/identity), contratos de cada integração e skips antes de afirmar conclusão.

Para testes de identidade, prepare **outro banco descartável**, aplique migrations/grants nele, inicie app apontando para esse banco e configure SMTP/Mailpit de teste. Somente nesse terminal isolado, ajuste URLs ao serviço iniciado:

```bash
IDENTITY_TEST_DATABASE=1 \
IDENTITY_TEST_BASE_URL=http://127.0.0.1:3000 \
IDENTITY_TEST_MAILPIT_URL=http://127.0.0.1:18025 \
pnpm exec tsx --conditions=react-server --test --test-concurrency=1 tests/identity/*.test.ts
```

Essa flag autoriza testes com escrita de fixtures no banco configurado; não a habilite no ambiente de produção. Não reaproveite banco de desenvolvimento com dados importantes. A suíte não equivale a aceite visual nem testes de provedores externos.

Execute também casos negativos de autorização/tenant, email real quando necessário, inspeção por teclado/mobile/temas/locale, falhas dos provedores e reinício/idempotência de worker. Nenhum teste unitário substitui serviço externo real.

Para produção, [DEPLOYMENT](DEPLOYMENT.md) descreve Docker/Compose/CI e gates. `Dockerfile`/Compose são exemplos, não deploy universal pronto. Configure TLS, rede, segredos runtime, backups/restauração, supervisão, migração controlada e privilégio mínimo. `pnpm --filter app build` seguido de `pnpm --filter app start` não resolve esses itens sozinho.

## Diagnóstico rápido

| Sintoma | Conferir |
| --- | --- |
| Variável ausente no script | Ambiente injetado no mesmo terminal; scripts não carregam dotenv |
| Erro ao fazer `source` | Arquivo é código shell; `EMAIL_FROM` e outros valores com espaços precisam de aspas |
| `doctor` passa mas operação falha | Diagnóstico não testa grants, DB, SMTP ou integração |
| `permission denied` SQL | Grants explícitos após migration; não promover runtime a owner |
| Migration recusa scope protection | Gerar/revisar migrations pelo comando canônico antes de aplicar |
| Login não conclui | Email verificado, SMTP acessível, origem/porta corretas e segredo válido |
| Admin não vê organização/dados | Papel global não cria membership nem bypass de domínio |
| Worker não inicia | `dev:worker` exige jobs habilitados, schema provisionado e ambiente runtime próprio |
| Single sem acesso | Organização preexistente, UUID correto e membership real; configuração não associa usuário |
| Integração sem credenciais | Manter desabilitada; não trocar por resposta simulada |
