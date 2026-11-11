---
phase: "04"
plan: "01"
type: execute
wave: 1
depends_on: ["02", "03"]
requirements: [RES-01, RES-02, RES-03, RES-04]
autonomous: true
---

# Phase 04 — Resource completo de referência

## Objetivo e pré-requisitos

Entregar projetos e tarefas utilizáveis ponta a ponta, antes de transformá-los em templates. Ler `04-CONTEXT.md`, contratos de identidade e painéis, AGENTS.md e scripts realmente entregues. **Fallback genérico (generic-agent workaround):** skills `gsd-plan-phase`/`gsd-discuss-phase` aplicadas por worker genérico; sem alegação de planner/checker tipados ou revisão independente.

Dependência bloqueante: fase 2 entrega domínio `projects/tasks`, transação autorizada, roles e RLS; fase 3 entrega componentes e registry/catch-all de painéis. Caminhos abaixo são destinos de implementação, não declaração de arquivos existentes. Reusar nomes/exportações finais dessas fases em vez de criar APIs paralelas. Não executar testes/builds no planejamento nem enquanto agentes editam dependências.

## Fronteiras e contratos

- Schema canônico permanece em `packages/db`; domínio em `domain-schema.ts` e agregador existente. Nenhuma migration para recriar tables. Mudança realmente necessária gera migration nova, revisada e aplicada separadamente pelo owner.
- Operações servidor em módulo local de domínio em `apps/app/src/lib/projects/` (ou módulo atual da fase 2), não pacote core especulativo. Reaproveitar handlers existentes, sem deixar endpoints antigos inseguros. DTOs explícitos de projeto/tarefa, queries Drizzle comuns e validação Zod no servidor.
- URLs e navegação passam por builder/resolver do registry fase 3. Dispatcher catch-all registra páginas list/new/detail/edit de ambos resources sob painel/contexto explícito. Prefixos públicos não ficam codificados nos forms/redirects; rotas reservadas continuam excluídas.
- Entrada list: página inteira positiva, tamanho limitado (default 20, máximo 100), busca limitada em texto, coluna/direção de sort allowlist e filtro de projeto para tarefas validado/autorizado. Inválidos retornam erro de validação, sem interpolar identificadores SQL. Resposta: rows com campos públicos, total, página e tamanho; ordenação default por criação e ID. Count usa exatamente filtros e escopo das linhas.
- Entrada de mutação: campos de negócio existentes, UUID estrito, limites de texto compartilhados entre Zod/form. Rejeitar campos extras e tentativas de alterar id/owner/organization/timestamps. Atualização de `projectId` só dentro do mesmo contexto; constraints/RLS continuam última barreira.
- Erros de validação são por campo; autenticação/autorização/not-found/conflito seguem contrato HTTP/action existente. ID alheio não revela nome, existência ou tenant. Erros SQL brutos não chegam ao cliente.

## Ordem de execução

### 1. Tracer: projeto pessoal completo e persistido — RES-01, RES-03

**Arquivos:** módulo servidor de projetos/handlers atuais, páginas registradas no catch-all, componentes locais do resource, dicionários locais.

1. Consumir contexto pessoal real sem exigir organização. Implementar list/create/view/edit/delete de projeto com sessão, permissão e transação existentes. Não substituir o schema iniciado na fase 2.
2. Form RHF usa schema compartilhado, mas servidor sempre valida novamente. Botões dependem da permissão para UX; chamadas diretas continuam protegidas. DTO de detalhes não inclui dados auth nem colunas privadas por spread.
3. Compor tabela, toolbar, infolist e confirmação de exclusão locais. Estados loading, vazio inicial, busca sem resultado, pending, erro e sucesso acessíveis; foco retorna ao acionador e labels traduzidas.
4. Invalidação/refresh após commit atualiza lista/detalhe sem exibir dados antigos de outro contexto. Excluir projeto com tarefas retorna conflito; nada de cascade novo.

**Gate antes de expansão:** owner cria projeto pela UI, recarrega, visualiza, edita, recarrega e exclui; request direto inválido não altera DB. Só avançar após tracer funcional, não após componente vazio.

### 2. Relação tasks e contexto organizacional — RES-01, RES-04

**Arquivos:** mesmos módulos/handlers de domínio, páginas de tarefas e registro/navegação dos painéis permitidos.

1. Completar list/create/view/edit/delete de tarefas usando campos existentes `title/projectId`. Picker de projeto consulta somente pais autorizados, com busca/paginação quando necessário; validar relação novamente na transação da mutação.
2. Reusar `project:create/read/update/delete` no pai para tarefas. Preservar papéis fase 2: viewer não escreve; global role não concede acesso implícito. Nenhuma nova matriz de roles ou bypass RLS.
3. Servir mesmo model no contexto pessoal e organizacional pelo mesmo domínio, não duplicar tabelas por painel. Links entre projeto/tarefa mantêm contexto; mudar URL/UUID/slug ou `activeOrganizationId` não concede acesso.
4. Tentar relações entre organizações e entre owners pessoais falha na aplicação e banco. Atualizar uma tarefa não pode mover owner/org. Requests concorrentes e conexão reutilizada mantêm contrato transacional da fase 2.

**Gate:** usuário de organização A não consulta/escolhe/altera pai ou filho B; usuário pessoal não usa pai de outro owner. Membro removido não continua escrevendo com sessão antiga.

### 3. Tabela servidor e bulk atômico — RES-02, RES-03

**Arquivos:** queries/validação/actions locais e composições de tabela fase 3; sem segundo framework de table.

1. Ligar TanStack Table instalada a `manualPagination`, `manualSorting` e filtragem manual conforme API efetiva instalada. URL serializa estado; servidor pagina e conta via Drizzle. Adicionar desempate por ID e validar filtros antes de query. Não presumir major v9 anotado em contexto antigo se fase 3 entregou outra versão estável.
2. Filtros: busca de nome para projetos/título para tarefas e projeto relacionado para tarefas. Usar campos reais, sem status ou metadados inventados. Filtro de pai alheio não retorna dados nem total privado.
3. Seleção usa UUIDs estáveis apenas da página atual; limpa em mudança de página/filtro/contexto. Bulk delete recebe lista única não vazia com limite 100; validar shape, deduplicar, buscar todos sob escopo/permissão e exigir cardinalidade completa antes de mutar.
4. Executar lote numa transação: qualquer ID ausente/alheio, permissão revogada ou projeto com tarefa aborta tudo. Sem relatório que enumere existência de IDs estrangeiros. Confirmar número selecionado na UI, prevenir duplo submit e mostrar erro preservando dados.
5. Widgets usam contagens autorizadas reais; não criar gráfico sem finalidade. Reutilizar ações/infolists/forms/data-table existentes; corrigir composição faltante no ponto de reuso em vez de duplicar primitivas.

**Gate:** dataset maior que duas páginas prova sem perdas/duplicação, filtros e count coerentes; lote misto conserva todos registros; lote válido remove somente selecionados autorizados.

### 4. Provas reproduzíveis e documentação — todos RES

**Arquivos a entregar:** `apps/app/tests/resources.integration.test.mjs`, README/docs canônicas já existentes, instruções de configuração de fixtures sem credenciais reais. Usar runner nativo `node:test` e `fetch`, sem adicionar framework só para estes checks. Reusar fixture/autenticação real fase 2; não burlar auth com headers de tenant nem mockar DB. Se fixtures existentes forem TypeScript, adaptar teste ao runner real entregue, registrando comando exato em docs antes do gate.

Teste deve construir usuários sintéticos e duas organizações com papéis distintos, contexto pessoal, mais de duas páginas e pais/filhos; usar API pública real e inspecionar persistência por leitura autorizada. Fixtures criadas/limpas apenas em banco de teste autorizado, sem limpar banco dev compartilhado. Runner recusa ausência de URL de app e consentimento de ambiente de teste. Cobrir:

| Requisito | Prova bloqueante |
|---|---|
| RES-01 | Cinco operações em ambos models; reload confirma persistência; body inválido/extra/owner forjado rejeitado; viewer e sessão ausente negados |
| RES-02 | Paginação estável, tamanho máximo, sort/filtro inválido, busca/count, seleção resetada na UI; bulk válido e lote misto/duplicado/oversized; rollback sem remoção parcial |
| RES-03 | Form errors/foco/teclado/mobile, infolist allowlist, widgets reais, confirmação e estados pendentes; sem exposição automática de schema |
| RES-04 | Relações cross-tenant/cross-owner negadas, projectId alheio negado, exclusão de pai com filhos bloqueada, mesmo model em painéis sem acesso implícito, revogação e troca concorrente de contexto |

**Comandos do owner após APIs e arquivo de teste implementados**, não comandos disponíveis nem executados neste planejamento:

```sh
RESOURCE_TEST_BASE_URL=http://127.0.0.1:3000 RESOURCE_TEST_ALLOW_WRITES=1 node --test apps/app/tests/resources.integration.test.mjs
pnpm check-types
```

Definir consumo dessas duas variáveis no teste entregue. App já deve estar iniciado conforme comando real `pnpm --filter app dev`, conectado a DB de teste autorizado; não iniciar segunda instância sobre serviço existente. Browser do owner verifica teclado/mobile, navegação e seleção; comando Node não comprova acessibilidade visual. `pnpm db:generate`/`pnpm db:migrate` já existem, mas não são necessários se schema inalterado; nunca aplicar DB como efeito de teste ou geração.

Atualizar docs existentes com rotas construídas pelo registry, permissões, DTOs, filtros, seleção/bulk, relação, conflito de exclusão, exemplos pessoais/tenant e comando real do teste. Handoff para fase 5 inclui caminhos finais e padrões editáveis aprovados; não entregar template que omita autorização.

## Critério de encerramento

Todos quatro requisitos demonstrados em app/DB reais, sem mocks, placeholders, endpoints legados inseguros ou engine. Owner registra comandos e resultados reais; falha em dependência bloqueia aceite. Nenhum requisito fica concluído apenas por plano escrito.
