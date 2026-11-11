---
phase: 02-identity
plan: 01
type: execute
wave: 1
depends_on: [01-foundation]
autonomous: true
requirements: [AUTH-01, AUTH-02, AUTH-03, TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-06, MAIL-01]
files_modified:
  - packages/auth/package.json
  - packages/auth/tsconfig.json
  - packages/auth/src/auth.ts
  - packages/auth/src/index.ts
  - packages/auth/src/client.ts
  - packages/auth/src/permissions.ts
  - packages/auth/src/session.ts
  - packages/auth/src/tenant.ts
  - packages/auth/src/mail.ts
  - packages/auth/src/scripts/provision-admin.ts
  - packages/db/src/schema.ts
  - packages/db/src/auth-schema.ts
  - packages/db/src/domain-schema.ts
  - packages/db/src/client.ts
  - packages/db/src/index.ts
  - packages/db/package.json
  - packages/db/migrations/
  - packages/config/src/env.ts
  - apps/app/package.json
  - apps/app/next.config.ts
  - apps/app/src/app/api/auth/[...all]/route.ts
  - apps/app/src/app/(auth)/
  - apps/app/src/app/account/security/
  - apps/app/src/app/organizations/
  - apps/app/src/app/invitations/[id]/
  - apps/app/src/app/[...tenantPath]/
  - apps/app/src/lib/tenant-routing.ts
  - apps/app/src/lib/projects.ts
  - apps/app/src/app/api/projects/
  - apps/app/tests/identity/
  - .env.example
  - README.md
  - docs/IDENTITY.md
  - pnpm-lock.yaml
must_haves:
  truths:
    - Usuário usa forms reais para cadastro/login/logout/verificação/reset e 2FA/recovery.
    - Cadastro público e tenant admin nunca obtêm privilégio global.
    - Usuário pessoal opera sem organização; membership/roles distintos são verificados por operação.
    - CRUD e relações negam acesso cross-tenant/cross-owner inclusive chamada direta e SQL sem contexto.
    - GUCs são locais à transação, sem leak no pool após commit/rollback e concorrência.
    - SMTP real Mailpit e contrato Resend real possuem falha visível sem fallback duplicador.
---

# Phase 02 — Plano executável

## Objetivo e pré-condição

Entregar AUTH-01–03, TEN-01–06 e MAIL-01, não apenas pacote/API. Ler AGENTS, PROJECT, REQUIREMENTS e 02-CONTEXT/RESEARCH. Fundação está em implementação: integrar somente depois do handoff; preservar `getDb/getSql/closeDb`, schema agregador `schema.ts`, `appSettings`, migrations aplicadas e exports atuais. Nenhum roadmap/state alterado por este plano. Decisões conservadoras autorizadas; sem implementação durante planejamento.

Arquivos listados são destinos propostos, não alegação de existência. Reusar convenções que fundação entregar. Não criar pacote core, auth adapter próprio, ORM, classes de transporte ou editor visual. APIs e fontes no RESEARCH são contrato; confirmar assinatura na versão **pinada** antes de escrever chamadas.

## Ordem de execução (dependências reais)

### 1. Tracer completo: cadastro → email real → login → sessão protegida → logout

**Arquivos:** `packages/auth/{package.json,tsconfig.json,src/{auth,index,client,mail,session}.ts}`, config/env, db/auth-schema/schema/migrations, apps/app/api/auth, `(auth)/{sign-up,sign-in,verify-email}`, root dependências/lock/.env.example.

1. Criar workspace concreto `@vibe/auth`; exports server/client/standalone script distintos. Server entry usa `server-only`; client não importa config privada/db. Server auth factory lazy `getAuth()` para não exigir DB/SMTP durante build; CLI schema usa configuração completa importável sem ciclo db↔auth. Não inicializar transporte não selecionado.
2. Pin `better-auth@1.7.20`, `@better-auth/drizzle-adapter@1.7.20`; SMTP `nodemailer@10.5.0`, Resend `resend@6.38.0`. Conferir types Nodemailer no registry (não presumir major igual). `drizzleAdapter(getDb(), {provider:"pg",schema})`; `advanced.database.generateId:"uuid"` usa tipo UUID e geração nativa PostgreSQLv4. Validar versão em todas tabelas/FKs.
3. Configurar email/password `enabled`, `requireEmailVerification:true`, `revokeSessionsOnPasswordReset:true`; `emailVerification.sendOnSignUp:true`. Callbacks verificação/reset/invitation/OTP usam função `sendMail` await. `BETTER_AUTH_SECRET` mínimo32, URL/origens/callbacks validados, sem wildcard trusted origins; cookies seguros em produção e rate limiting nativo habilitado no teste de auth. Sem OAuth/passwordless neste corte: email OTP é segundo fator, evita bypass 2FA por login passwordless.
4. Adicionar plugins completos antes de gerar schema: admin, organization (se perfil permite), twoFactor. Gerar schema pelo `auth@1.7.20 generate` com flags confirmadas em `--help`; não redigir lista parcial manual. CLI gera arquivo `auth-schema.ts`; comparar `getAuthTables` com schema exportado, índices e FKs; checklist RESEARCH identifica omissões conhecidas. `schema.ts` reexporta auth/domain e mantém appSettings. Drizzle gera nova migration e SQL explícito grants runtime; aplicar é gate do owner, nunca na edição. Nenhum auth migrate/DDL no startup.
5. Função simples de envio com assinatura mensagem→`{id}`. SMTP usa `createTransport`, timeouts e TLS configurável; Mailpit11025 local. Resend checa `{error}` retornado; nenhuma fallback/retry. Config condicional `EMAIL_PROVIDER`, `EMAIL_FROM`, SMTP e RESEND_API_KEY. Falha retorna `EMAIL_SEND_FAILED`, logs somente provider/código seguro; nunca erro bruto/endereço/body/OTP/url. Templates text+html escapam entradas. README/.env.example sem segredos.
6. `toNextJsHandler(getAuth())` no handler Node GET/POST. Client HTTP Better Auth trata cookies. Sessão protegida usa `getSession` com headers atuais, banco autoritativo sem cookie cache para permissão; proxy/cookie-only serve só UX. Forms reais: signup/login/logout, reenvio verificação, callback sucesso/expiração, mensagens genéricas e acessíveis; sem signup com role.

**Gate owner após integração de todas tarefas:** usuário sintético cadastra por browser, Mailpit captura email, link verifica, login concede sessão; não verificado bloqueado; logout invalida acesso server direto. Email indisponível produz erro sanitizado e nenhuma segunda mensagem por outro provedor. Gate tracer obrigatório antes de declarar expansão pronta; não executar checks midflight.

### 2. Recuperação e 2FA completos, sem bypass

**Arquivos:** auth config/mail/client; `(auth)/{forgot-password,reset-password,two-factor}`, `account/security`, testes auth.

1. Forms forgot/reset consomem `requestPasswordReset/resetPassword`, callback allowlist; revogar sessões existentes no reset. Email inexistente mantém resposta genérica. Usuário com 2FA não perde exigência ao redefinir senha.
2. `twoFactor({issuer,skipVerificationOnEnable:false,otpOptions:{sendOTP,period:3,allowedAttempts:5,storeOTP:"hashed"}})`; defaults de lockout nativo preservados. Client enrollment `enable({password,method:"totp"})`, confirmação `verifyTotp`, desafio `sendOtp/verifyOtp`, backup `verifyBackupCode`, regenerar com senha, desabilitar com senha. `trustDevice:false` em provas, sem dispositivo confiável obrigatório. URI local/texto copiável; QR somente local, se necessário dependência mínima já revisada.
3. Security UI mostra estado e confirmação, backup codes uma vez/cópia/download local; não persistir no browser/log. Regenerar invalida antigos. Perda de todos fatores: não conceder bypass por email/reset; procedimento operacional exige revalidação manual de identidade e revogação de sessões, sem endpoint público de remoção 2FA. Documentar teto e operação explícita.
4. Desafio 2FA não concede sessão parcial. Códigos inválidos/expirados/reusados, desafios consumidos, consumo simultâneo de backup/OTP e TOTP replay são gates. Se a versão pinada permitir TOTP replay entre desafios, extensão mínima atomiza último timestep aceito por usuário e bloqueia repetição (não duplicar algoritmo criptográfico). Se consumo nativo não for atômico, correção deve serializar verificação por usuário/registro; não estreitar teste.

### 3. Organização, roles, privilégio global e UI real

**Arquivos:** `permissions.ts`, auth/tenant/session/provision-admin; `organizations`, `invitations/[id]`, security/forms, config; testes roles.

1. Compor `defaultStatements`/roles nativas com `project:[create,read,update,delete]`. Roles em código: owner preserva gestão nativa completa; admin preserva gestão permitida pelo plugin; member cria/lê/edita projeto, não remove membros; custom viewer só lê projeto e não gere membros. Passar `ac,roles` server e client. Nenhum billing/outro domínio não solicitado. Toda operação usa permissão server, não visibilidade de botão.
2. Telas criar/listar organização, selecionar contexto (preferência), detalhes/members, convidar, aceitar/rejeitar, cancelar/reenviar convite, remover membro e alterar role. APIs nativas com headers e organizationId explícito. Convite email com data.id/email/organization/inviter; aceitação exige email verificado correspondente, convite pending/não expirado. Proteger último owner conforme plugin; sem atribuição de global role por membership.
3. Perfil enum `personal|organizations|hybrid` (referência hybrid), modo `single|multi`. Personal não registra plugin/endpoints organization; schema pode compartilhar tabelas sem exigir org. Single usa organização existente configurada, desativa criação pública e força ID autorizado no servidor; sem criar org fictícia para pessoal. Multi permite listas próprias. Receitas e exemplos verificáveis docs.
4. Admin nativo `defaultRole:"user",adminRoles:["admin"]`; limitar permissões globais, não habilitar impersonação por necessidade inexistente. Provisionar explicitamente usuário existente/verificado por UUID/email via script `provision-admin --confirm` operado por responsável, sem senha argv/log. Se criar conta, usar BetterAuth API para hash, jamais Drizzle password bruto. Promoção auditável sem segredos; idempotente e pool fechado. Não promover primeiro cadastro nem domínio/email automático. Runtime não recebe migration URL. Script sem import server-only do Next.
5. Negar mutação de user.role/banned/2FA flags em signup/update-user/update-session. Aceite aceita rejeição HTTP ou default seguro, nunca privilégios persistidos. Admin global não recebe membership nem bypass de domínio implícitos.

### 4. Domínio continuado, resolver e RLS transacional

**Arquivos:** db/domain-schema/migration; auth/tenant; `apps/app/src/lib/{projects,tenant-routing}.ts`, api/projects, tenant catch-all e área pessoal; testes isolamento.

1. `projects` com uuid id, organizationId nullable, ownerUserId obrigatório, name/description/timestamps. `tasks` com uuid id, projectId, mesmo organizationId/ownerUserId, title. São modelos reais reaproveitados fase4; UI aqui mínima para criar/listar/editar/remover projeto e vincular tarefa, sem resource/tabela avançada. Relação pai-filho protege escopo em app e constraint/trigger banco incluindo NULL pessoal, bloqueando FK cross-tenant/cross-owner.
2. Server routing config `{prefix,identifier:"slug"|"uuid"}` com builder central; prefixo configurável por futuro painel, default `org`. Catch-all valida segmentos contra config (route group não gera prefixo). UUIDv4 estrito, slug normalizado/único, reservado/UUID-like proibido; slug e id resolvem mesmo tenant. Não depender de `activeOrganizationId` mutável para autorizar rota, e não setar sessão globalmente a cada request. Prefixo diferente deve gerar links e resolver corretamente.
3. API `requireSession → resolveTenant → membership/permissão → transação contextual → operação(tx)`. Session userId nunca vem de body. Revalidar membership/role na transação com lock `FOR SHARE` até commit, linearizando revogação/role changes: acesso iniciado antes pode terminar; novas operações após remoção confirmada falham. Pessoal valida owner e tenant NULL. Helper com contexto interno não exportado como função que aceita IDs arbitrários do cliente. Nunca chamar getDb dentro callback transacional.
4. Em toda transação, set_config local parametrizado para **ambos** user e tenant (tenant vazio no pessoal). Erro/rollback também limpa. Sem SET de sessão ou conexão sticky; max5 existente. Sem bypass global. Policies USING fail-closed e WITH CHECK por operação com `NULLIF(current_setting(...,true),'')::uuid`; INSERT exige owner atual; owner/org imutáveis por trigger/GRANT UPDATE apenas campos editáveis. Atualizações não movem projeto/tasks para outro escopo. `ENABLE/FORCE RLS`, TO runtime, confirmar NOBYPASSRLS/não owner e grants DML; auth tables sem RLS por escolha explícita. Migration com owner existente sem superuser.
5. RLS é defesa contra omissão de filtro no servidor confiável; role SQL com liberdade de setar GUC pode falsificar contexto. Documentar limite, não afirmar proteção contra credencial runtime comprometida. Queries Drizzle ainda filtram escopo e relações. Workers futuros devem usar mesmo fluxo transacional.

### 5. Provas, documentação e handoff

**Arquivos:** `apps/app/tests/identity/{auth,organizations,isolation,mail}.test.ts`, package scripts, README/.env.example/docs/IDENTITY.md. Preferir Node `node:test`/assert via tsx instalado, sem framework novo. Script proposto `pnpm --filter app test:identity`; dados sintéticos namespaced, cleanup apenas dados do teste. Separar provas DB/runtime sem importar server-only em contexto inválido. Browser owner para UI; testes HTTP preservam cookie jars distintos e headers origin reais. Não criar mocks apresentados como integração.

**Matriz bloqueante (owner executa uma vez após todas edições):**

| Requisito | Prova positiva | Provas negativas obrigatórias |
|---|---|---|
| AUTH-01 | Browser signup→Mailpit verificação→login→logout; request/reset reais | Não verificado; sessão ausente/forjada/expirada/revogada; token reset/verificação inválido/expirado/reusado; reset revoga outras sessões; callback externo negado |
| AUTH-02 | Enrollment TOTP confirmado; email OTP real; recovery backup e regeneração/disable | Desafio não cria sessão; OTP inválido/expirado/replay; TOTP inválido/fora janela/replay; backup inválido/replay/antigo após regenerar; consumo simultâneo concede no máximo uma sessão; lockout; reset não desativa2FA |
| AUTH-03 | Script explícito idempotente promove conta conhecida; ação global autorizada | Signup/update-user/update-session role/flags injetados; tenant owner/admin chamam endpoints globais; global admin sem membership não lê domínio |
| TEN-01/02 | A owner de Org1/viewer Org2, B member Org1/owner Org2; convites e role custom server | Convite outro email/expirado/reusado/cancelado; não membro convida/remove/troca role; viewer muta; último owner protegido; remoção/role change afeta próxima chamada com sessão original |
| TEN-03 | Personal sem org; single org existente com múltiplos usuários; hybrid multi | Personal chama organization endpoints; single tenta criar/selecionar outra org; organização fictícia não é criada |
| TEN-04 | CRUD projects/tasks por escopo | Ler/listar/criar/editar/apagar A→B e pessoalA→pessoalB via HTTP direto; ID/body adulterado; bulk/relação cruzada; mudar owner/org; SQL runtime sem filtro e contexto errado não retorna linhas nem aceita escrita |
| TEN-05 | UUIDv4 e slug mesmo org; prefix diferente gera links corretos | UUID inválido/v7, slug duplicado/reservado/UUID-like; slug/id alheio; segmentos traversal/encoded slash; slug concorrente tem um sucesso e conflito seguro |
| TEN-06 | Promise.all de ≥50 operações intercaladas A/B/pessoal, pool max1 para forçar reúso e max5 para paralelo | Após commit e rollback consultar sem GUC retorna zero; alternar tenant→pessoal→tenant sem resíduo; erro durante tx; membro revogado depois de resolver e antes de operar; ambas GUCs limpas |
| MAIL-01 | Mensagens verificação/reset/convite/OTP via SMTP Mailpit e conteúdo/recipient conferidos na API | SMTP indisponível e Resend erro retornado/throw: erro sanitizado, zero fallback, logs sem token/body/segredo; provider desativado não exige key |

**Gate externo separado:** owner solicita RESEND_API_KEY + remetente verificado + destinatário autorizado somente ao testar Resend; envio real e provider id recebido. Mailpit não comprova Resend; se credencial ausente, marcar verificação externa bloqueada, não simular nem declarar entrega integral do adapter. Nenhum envio/custo externo sem autorização.

**Comandos owner planejados:** install lockfile, auth CLI generate/schema check, Drizzle generate/apply separado, test:identity, check-types e build canônico sob lock cooperativo de host; uma rodada integrada. Não executar build/lint/testes durante edição dos agentes. Nenhum check foi executado por este planejamento.

**Docs obrigatórias:** configuração/profiles, roles globais vs memberships, APIs e UI, recovery sem bypass, SMTP/Mailpit e Resend, prefix resolver, geração/migrations, RLS/pool/limites SQL, comandos de provisionamento e resultados reais das provas. Não marcar requisito concluído só por arquivo criado.

## Riscos e decisões necessárias

- APIs documentadas correntes podem divergir do pin1.7.20: CLI/getAuthTables e tipos instalados são gate antes de schema; não copiar exemplos de main cegamente.
- Anti-replay/consumo concorrente dos fatores é risco bloqueante; provar nativo antes de extensão mínima. Não ignorar TOTP por ser time-based.
- Nenhuma decisão funcional adicional do usuário necessária para iniciar. Apenas credencial/autorização Resend no gate externo; comprometimento de credencial SQL está fora da garantia do RLS por GUC e explicitamente documentado.
