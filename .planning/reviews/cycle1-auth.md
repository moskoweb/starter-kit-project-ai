# Ciclo 1 — auth, db, config, identity

## Achados corrigidos

| Severidade | Evidência anterior | Correção / regressão |
| --- | --- | --- |
| Média | `packages/auth/src/permissions.ts`: acesso `roles[name]` alcançava propriedades herdadas (`constructor`, `toString`, `__proto__`, `hasOwnProperty`); chamada de `authorize` inexistente lançava erro em vez de negar role desconhecida. | `Object.hasOwn` antes do lookup. `tests/identity/config.test.ts` cobre quatro nomes herdados e mantém composição de roles. |
| Média | `packages/config/src/identity.ts` aceitava UUID uppercase; `packages/auth/src/single-tenant.ts` e hooks de `auth.ts` comparam IDs textualmente com IDs normalizados retornados pelo PostgreSQL. Configuração válida negava organização correta no modo single. | Normalização lowercase na fronteira de configuração; regressão em `tests/identity/config.test.ts`. |
| Média | `packages/db/src/webhook-schema.ts`: índice único `(actor_user_id, organization_id, event_id)` aceita várias linhas com `organization_id IS NULL`, pois NULLs são distintos por padrão. | Índice parcial único `(actor_user_id, event_id) WHERE organization_id IS NULL`. Migration nova `0007_lucky_living_lightning.sql`; teste negativo real em `tests/identity/tenant-rls.test.ts` exige SQLSTATE `23505` para duplicata pessoal. Índice tenant preservado. |

## Escopo examinado

- Auth: cadastro privilegiado, sessão autoritativa sem cookie cache, verificação de email, separação global/organização, permissões compostas, perfis personal/organizations/hybrid, single/multi, boundary de IDs/slugs/invitations/members e seed admin explícito.
- TOTP: guard anterior ao endpoint nativo, consumo atômico monotônico por usuário, desafios independentes e concorrência, compatibilidade de descriptografia com Better Auth instalado. Endpoint nativo mantém challenge, limites de tentativas, lockout e emissão de sessão. Falha nativa posterior mantém timestep consumido por desenho fail-closed.
- DB: membership e usuário bloqueados com `FOR SHARE`, ban ativo, contexto local de transação, RLS pessoal/tenant e ausência de bypass para admin global; triggers de imutabilidade/parent scope, constraints de membership, armazenamento, eventos, IA e webhooks; scripts runtime/migration separados e scope-protections.
- Migrations `0000`–`0006` não editadas. Nenhuma migration aplicada. Gerador canônico offline executado: `pnpm --filter @vibe/db db:generate`; criou somente índice novo e metadados incrementais.

## Limites e comandos do owner

Nenhum teste, build, lint ou typecheck executado nesta tarefa. Revisão estática não prova aprovação runtime. Roles de domínio continuam responsabilidade do callback autorizado; RLS isola escopo, não substitui autorização de ação.

Antes de aplicar `0007`, verificar duplicatas existentes com conta operacional autorizada (não apagar dados automaticamente):

```sql
SELECT actor_user_id, event_id, count(*)
FROM webhook_deliveries
WHERE organization_id IS NULL
GROUP BY actor_user_id, event_id
HAVING count(*) > 1;
```

Se houver resultados, reconciliar registros conforme histórico de entregas antes da migration; criação do índice falha sem perda de dados. Aplicar separadamente com `MIGRATION_DATABASE_URL` injetada, sem imprimir credenciais:

```sh
pnpm --filter @vibe/db db:migrate
pnpm --filter @vibe/auth --filter @vibe/db --filter @vibe/config check-types
pnpm exec tsx --test tests/identity/config.test.ts
```

Depois de migration e app local com mesmo ambiente, DB runtime DML sem BYPASSRLS, Mailpit local e perfil hybrid/multi para cenários de organizações:

```sh
IDENTITY_TEST_DATABASE=1 pnpm exec tsx --test --test-concurrency=1 tests/identity/*.test.ts
```

Serviços e credenciais preservados; sem commits/push pelo agente.
