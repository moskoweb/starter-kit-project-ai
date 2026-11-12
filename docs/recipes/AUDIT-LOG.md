# Receita: trilha de auditoria

Estado do kit: log estruturado (`logEvent`) e exportação opcional em `@vibe/observability`, sem trilha de auditoria persistida. Log não é auditoria: some com a retenção, não é consultável pelo tenant e não prova quem fez o quê.

Adote quando houver administração por tenant, chaves de API, papéis, dados pessoais ou exigência de conformidade. Para um protótipo de usuário único, não adote.

## Dois níveis

| Nível | Quem vê | Exemplos |
| --- | --- | --- |
| Tenant | Admins do tenant | Membro convidado, papel alterado, chave criada ou revogada, artigo publicado, agente pausado |
| Plataforma | Operadores da plataforma | Superadmin concedido, tenant criado ou suspenso, impersonação, credencial da plataforma alterada |

Mantenha **duas tabelas**. A de plataforma não tem `organization_id` de tenant e não é legível pelo papel de runtime dos tenants. Misturar numa tabela com `organization_id` nulo foi o desenho original, mas obriga políticas RLS com exceções. Duas tabelas são mais simples de provar.

## Modelo

```text
audit_event
  id uuid, occurred_at timestamptz default now()
  organization_id uuid          (tenant; RLS)
  actor_user_id uuid null       (null = sistema)
  actor_kind: user | api_key | system | agent
  actor_api_key_id uuid null
  target_user_id uuid null
  action text                   'dominio.entidade.acao', minúsculo, com pontos
  entity_type text, entity_id text
  payload jsonb                 diff mínimo e metadados, SEM segredos nem conteúdo
  ip inet null, user_agent text null, request_id text null
platform_audit_event            mesma forma, sem organization_id
```

- Índices: `(organization_id, occurred_at desc)`, `(organization_id, entity_type, entity_id)`, `(action)`.
- **Append-only por permissão.** O papel de runtime tem `INSERT` e `SELECT`, e **não** tem `UPDATE` nem `DELETE`. Reforce com trigger que lança erro em `UPDATE` e `DELETE`. A purga por retenção roda com um papel de manutenção separado.
- RLS: `SELECT` só para admins do tenant (papel verificado na política ou na camada de consulta). `INSERT` exige que `organization_id` seja o tenant da sessão.

## Convenção de ação

`domínio.entidade.ação`, tudo minúsculo, só pontos. Mantenha o catálogo em **um** arquivo com tipo união, para o compilador impedir ação inventada:

```ts
export const AUDIT_ACTIONS = ["member.invited", "member.role_changed", "api_key.created", "api_key.revoked", "knowledge_article.published"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
```

Documente quais ações são obrigatórias por área (identidade, chaves, dados, IA, integrações).

## Como gravar

```ts
recordAudit(tx, { action: "api_key.revoked", entityType: "api_key", entityId: id, payload: { name } })
```

- Aceite a **transação do chamador**. Auditoria na mesma transação da mudança garante que não existe mudança sem registro nem registro de mudança que não ocorreu. O produto original gravava fora da transação e engolia erros, o que aceita perder eventos.
- Decida a política por ação e escreva-a:
  - **Crítica** (permissão, chave, exclusão, exportação): falha na gravação **aborta** a operação.
  - **Informativa** (leitura, visualização): melhor esforço, com log de aviso.
- Capture IP, user agent e `requestId` dos headers no servidor. Em jobs, receba por parâmetro.
- Resolva IP com cuidado: só confie em `x-forwarded-for` atrás de proxy conhecido. O kit não resolve IP de cliente hoje: defina uma função única para isso e reaproveite no rate limit.

## O que registrar e o que nunca registrar

Registre: ator, ação, entidade, diff de campos não sensíveis, motivo informado.

Nunca registre: senhas, tokens, chaves, segredos, corpo de mensagens, prompts, argumentos de tools, dados pessoais desnecessários. Para campo sensível alterado, registre só `changed: ["email"]`.

Redija `payload` por lista de permissão por ação, não por lista de bloqueio.

## Retenção e privacidade

- Defina retenção por nível (por exemplo, 13 meses no tenant, 5 anos na plataforma) e implemente em job com papel de manutenção.
- Direito de exclusão do titular conflita com imutabilidade. Registre o `actor_user_id` como identificador opaco e anonimize quando o usuário for excluído, preservando a existência do evento.
- Exportação para o tenant em CSV ou JSON, paginada, com os mesmos filtros de leitura.

## Interface

- Resource de leitura no painel do tenant: filtros por ação, ator, entidade e período. Detalhe mostra o `payload`.
- Painel `admin` mostra `platform_audit_event`. Acesso de superadmin a dados de tenant exige ação explícita, motivo e registro (ver regra do kit de que superadmin não ganha bypass).

## Checklist de aceite

- [ ] `UPDATE` e `DELETE` em `audit_event` falham para o papel de runtime.
- [ ] Tenant A não lê eventos do tenant B. Membro sem papel de admin não lê eventos.
- [ ] Ação crítica sem registro aborta a operação (teste forçando falha de insert).
- [ ] Ação inventada não compila.
- [ ] Nenhum segredo, prompt ou corpo de mensagem em `payload` (teste com valores sentinela).
- [ ] Operação revertida por erro não deixa evento órfão.
- [ ] Job de retenção usa papel próprio e respeita os prazos.
