---
phase: "02"
name: "Identidade, email e isolamento"
created: 2026-11-11
---

# Phase 02 — Context

## Escopo e decisões autorizadas

AUTH-01–03, TEN-01–06, MAIL-01. Planejar somente; nenhuma implementação, build/teste ou edição de roadmap/state nesta atribuição. Fundação DB/config em execução; consumir APIs reais entregues, não criar segunda convenção.

- Better Auth 1.7.20 com Drizzle adapter oficial; plugins nativos admin, organization e twoFactor. `@vibe/auth` surge com responsabilidade concreta; exports server/client/standalone separados. Sem ORM/adapter próprios.
- UUIDv4 em auth, membership e domínio. Preferir `advanced.database.generateId:"uuid"` e geração nativa PostgreSQL17 (`gen_random_uuid`/Drizzle defaultRandom). Schema gerado pela CLI **auth@1.7.20**, conferido com getAuthTables da versão instalada; não lista manual parcial. `app_settings.key` continua exceção interna textual.
- PostgreSQL17 `vibe_starter`; migrations owner `vibe_starter_owner`, runtime DML `vibe_starter_app`, sem superuser. Runtime não recebe migration URL nem é owner/BYPASSRLS. Migrations novas, não alterar histórico.
- Global admin é `user.role`, membership role é `member.role`; nunca intercambiáveis. Cadastro público não atribui global role. Provisionamento administrativo por comando explícito sobre conta conhecida/verificada; não promover primeiro cadastro. Global admin não possui bypass implícito dos dados de tenants.
- Roles customizadas inicialmente em código usando createAccessControl + permissões nativas de organization. Owner/admin/member e custom viewer; sem editor visual, dynamic roles, teams ou billing inventado.
- Perfis personal/organizations/hybrid, referência hybrid. Personal não exige organização; dados pessoais organizationId NULL + ownerUserId. Receitas single-tenant (org existente explícita) e multi-tenant. Perfil altera APIs/fluxo servidor, não apenas menus.
- UI funcional nesta fase: signup/signin/logout, verificação/reenvio, forgot/reset, desafio e enrollment OTP/TOTP/backup/security, organizações/convites/membros/roles. Forms simples acessíveis antes dos painéis/temas ricos da fase3. Sem OAuth/login passwordless que contorne desafio 2FA.
- Recovery completo: verificação TOTP antes de ativar, OTP email como segundo fator, backup codes com consumo único/regeneração e disable com senha. Reset de senha revoga sessões, não remove2FA. Perda de todos fatores não oferece bypass público; procedimento manual de revalidação de identidade documentado. Replay e concorrência são provas bloqueantes, não pressupostos.

## RLS e autorização

- Tabelas Better Auth sem RLS nesta estratégia de integração; APIs nativas e controles servidor protegem auth/membership/convites. Não é alegação de que RLS nessas tabelas seja universalmente impossível.
- Domínio real `projects` e relação `tasks` começam nesta fase para continuar fase4, sem tenant_notes descartável. CRUD mínimo prova isolamento, não antecipa resource avançado.
- RLS em todas tabelas pessoais/tenant do domínio, USING/WITH CHECK fail-closed, owner/org imutáveis, relações não cruzam escopo. Contexto nulo nega. Policies usam NULLIF antes de cast UUID.
- Sessão autoritativa → resolver UUIDv4/slug → membership e permissão servidor → transação contextual → operações somente no tx. Helper interno não aceita IDs arbitrários do cliente. ActiveOrganizationId é preferência, não autoridade.
- Revalidar e bloquear membership na transação até commit para linearizar remoção/troca de role. Após revogação confirmada, próxima chamada com sessão antiga falha.
- Sempre setar ambos user e tenant via set_config(...,true), tenant vazio no modo pessoal. Mesmo commit/rollback elimina contexto. Sem SET de sessão, sem singleton mutable tenant; pool max5 existente. Concorrência e conexão reutilizada devem ser provadas.
- GUCs pressupõem app/role SQL confiáveis: credencial SQL arbitrária pode falsificar contexto. RLS cobre omissão de filtro, não comprometimento completo do runtime. Documentar limite, manter filtros explícitos na aplicação.

## Email e rotas

- Funções simples `sendMail` com SMTP ou Resend; sem classes/factory/fallback/retry cruzado. Resend real checa objeto error; erro sanitizado e logs sem endereço/body/token/url/segredo.
- Mailpit autorizado: SMTP127.0.0.1:11025, UI/API18025, v1.27.4; captura real sem envio externo. Config TLS externa explícita, nunca TLS desabilitado globalmente.
- Credencial/remetente/destinatário Resend solicitados apenas na verificação externa autorizada. Captura Mailpit não comprova entrega Resend.
- Contrato de tenant routing central `{prefix,identifier:slug|uuid}` por painel futuro; default org não é URL irreversível. Builder/resolver únicos, prefixo validado, slugs únicos/reservados/UUID-like rejeitados. Route Groups não criam prefixo nem autorização.

## Fora deste corte

Editor visual de roles; OAuth externo; billing; painéis/tema/charts completos; geradores; bypass global implícito; promessas Edge/PgBouncer não verificadas.

## Decisões materiais pendentes

Nenhuma para começar execução conservadora. Resend externo exige credencial e autorização no gate de verificação. Resultado de provas nativas OTP/TOTP/backup pode exigir extensão mínima de anti-replay/atomicidade antes do aceite, sem reduzir AUTH-02.
