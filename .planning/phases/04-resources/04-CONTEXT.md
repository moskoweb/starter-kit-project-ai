---
phase: "04"
name: "Resource completo de referência"
created: 2026-11-11
---

# Phase 04 — Context

## Origem e modo

Contrato: PROJECT.md, REQUIREMENTS.md (RES-01–04), ROADMAP.md, 02-CONTEXT/PLAN e 03-CONTEXT/PLAN. Instruções explícitas desta atribuição fecham decisões abaixo; sem nova rodada de perguntas. Skills lidas: `gsd-plan-phase` e `gsd-discuss-phase`. **Fallback genérico (generic-agent workaround):** planejamento por worker genérico, não execução tipada de gsd-planner/gsd-plan-checker; não alegar revisão independente nem garantias desses agentes. Só arquivos CONTEXT/PLAN autorizados; nenhuma implementação ou verificação executada.

## Decisões fixas

- `projects` e `tasks` são domínio real iniciado na fase 2. Continuar schema, migrations, UUIDv4, permissões, helpers de contexto e RLS existentes. Não criar segundo modelo, tabela de exemplo substituta, adapter ou ORM.
- Referência híbrida: projetos pessoais (`organizationId IS NULL`, `ownerUserId` da sessão) e organizacionais. Tasks pertencem a projeto no mesmo escopo. IDs, owner e organização não são campos editáveis enviados pelo cliente. `projectId` só aceita pai autorizado no mesmo escopo.
- Reutilizar matriz `project:create/read/update/delete` e papéis da fase 2. Tasks seguem autorização do projeto pai; não inventar namespace paralelo de roles. Leitura em painel global não implica autorização sobre tenant. Mesmo model pode ter páginas em mais de um painel, sempre com autorização explícita por operação.
- Toda leitura, contagem, opção de relação e mutação entra por sessão autoritativa, resolução de contexto, permissão e transação contextual existentes. Revalidar membership conforme contrato fase 2; usar somente `tx`, filtros explícitos e RLS. Não aceitar tenant/owner arbitrários nem reutilizar contexto mutável global.
- CRUD completo para projetos e tarefas: list/create/view/edit/delete, persistência real, erros e not-found sem vazamento, validação servidor allowlist. Usar campos existentes; não adicionar domínio de negócio só para demonstrar widgets.
- Tabelas TanStack com paginação, filtros e ordenação **servidor**. URL contém estado validado; ordenação determinística com desempate por ID. Count e linhas compartilham escopo/filtros. Não carregar tudo no browser para paginar.
- Seleção em lote somente IDs explícitos selecionados; trocar contexto/filtro/página limpa seleção. Sem promessa implícita de selecionar dataset inteiro. Bulk delete confirma contagem e revalida cada ID e permissão no servidor. Lote inválido, misto ou não autorizado falha integralmente, sem mutação parcial nem identificar registro estrangeiro.
- Excluir projeto com tarefas deve ser recusado com conflito e instrução de excluir tarefas primeiro; preservar constraint existente e não introduzir cascade destrutivo. Essa regra vale para exclusão individual e bulk.
- Forms RHF + Zod, infolists, actions, widgets e tabela reutilizam componentes locais fase 3 e tokens/i18n `pt-BR`/`en`. Campo sensível não vira UI por introspecção do schema. DTOs de saída são allowlists.
- Rotas usam catch-all/dispatcher e `panelRegistry` com prefixo configurável e builder/resolver únicos. Nada de pastas públicas fixas `/org`, `/app` ou `/admin` como autorização. Consumir contrato final fase 3; documentação antiga que propõe rewrite para route group não substitui catch-all funcional.
- `ResourceDefinition` é metadado TypeScript mínimo. Páginas, formulários, queries e actions são código comum editável; não engine reflexiva, DSL de runtime, ORM próprio ou geração de forms a partir de todas colunas.

## Fronteiras

Fase 2 possui auth, memberships, roles, schema inicial e RLS; fase 3 possui shell, routing/prefixos e primitivas. Fase 4 integra e amplia resource, não reimplementa tais sistemas. Erro encontrado nessas dependências deve ser corrigido pelo dono antes do aceite; nunca mascarado com bypass ou mock. Fase 5 gera padrão já validado aqui. Storage, jobs, webhooks, IA e engine de filtros arbitrários ficam fora.

## Aceite e prova

RES-01: CRUD de ambos models, validação servidor e autorização de todas operações. RES-02: filtros/ordenação/paginação/count/seleção corretos e bulk atômico por escopo. RES-03: composição dos componentes existentes e allowlists de campos. RES-04: relação tenant-safe, escopo pessoal e reutilização entre painéis sem privilégio implícito.

Plano cria teste de integração executável com runner nativo Node contra app e PostgreSQL reais. Comando futuro só vale após arquivo e APIs implementados; não apresentar script inexistente como já disponível. Nenhum teste/build rodado nesta etapa.
