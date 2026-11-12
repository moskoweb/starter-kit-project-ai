# Receita: tools, aprovação e agentes configuráveis

Estado do kit: `streamAiText` aceita `tools` do SDK, mas nenhuma vem registrada. Não há conceito de agente, memória nem aprovação humana. Esta receita cobre dois níveis, adotáveis separadamente:

1. **Registry de tools** com autorização e aprovação (serve a qualquer produto com IA que age).
2. **Agentes como dados** (nome, personalidade, tools permitidas, conhecimento, memória) editáveis no produto.

Não adote o nível 2 se o produto tem um único assistente fixo. O nível 1 já basta.

## Nível 1: registry de tools

### Contrato

```ts
type ToolDef<Args, Result> = {
  key: string;                        // estável, minúsculo, sem pontos (pontos reservados a tools MCP)
  description: string;                // para o modelo
  inputSchema: z.ZodType<Args>;       // .strict()
  readonly: boolean;                  // só lê? executa inline sem aprovação
  sensitive?: boolean;                // exige aprovação por padrão
  execute(args: Args, ctx: ToolCtx): Promise<Result>;
};

type ToolCtx = {
  tx: TenantTransaction;              // escopo RLS da sessão
  userId: string;                     // da sessão, nunca do modelo
  tenantId: string | null;
  runId: string;
  signal: AbortSignal;
  defer(fn: () => Promise<void>): void; // efeito colateral depois do commit
};
```

Regras:

- `ctx` vem sempre do servidor. O modelo só controla `args`. IDs recebidos do modelo são **entrada não confiável**: a consulta aplica filtro de tenant e propriedade, e relações são verificadas.
- Cada `execute` revalida permissão **no momento da execução** (papel atual, membership atual), não no momento em que a conversa começou.
- Resultado devolvido ao modelo é projeção mínima. Sem tokens de sessão, sem colunas sensíveis, sem dados de outro escopo.
- Erro de tool vira `tool_result` com `is_error`, nunca derruba o run. Mensagem segura, sem stack.
- Registre cada chamada em `ai_run_action`: `tool_key`, argumentos (ver privacidade), status, resultado resumido, latência.
- Registry em memória com `registerTool` e uma lista fechada no startup. Não carregue tools de caminho vindo de configuração.
- Teto de iterações do laço (padrão 4, máximo 10) e timeout total. O `streamAiText` do kit já limita a duas etapas. Aumentar exige reserva de quota proporcional.

### Efeitos colaterais

- Tools de escrita **não** disparam efeito externo dentro da transação. Use `defer` para executar após o commit, ou grave um evento com `enqueueEvent` (outbox atômico) e deixe o worker agir. O produto original sofreu corrida em que o worker pegava o job antes de o commit ser visível.
- Toda tool de escrita aceita chave de idempotência. Retry do modelo ou do job não duplica.
- Tools que chamam APIs externas respeitam `ctx.signal` e têm timeout próprio.
- Tools nunca fazem HTTP de volta para o próprio app. Chamam a camada de domínio direto, com o mesmo `ctx`.

### Permissão por agente ou por papel

Duas dimensões, ambas verificadas no servidor:

- **Escopo da tool:** `read`, `write`, `blocked`, por agente (ou por papel do usuário se não houver agentes).
- **Limite de taxa por hora** por tool e agente, usando `enforceRateLimit` do kit.

Ferramentas só aparecem para o modelo se o escopo permite. Tool bloqueada não é enviada ao provedor.

### Aprovação humana

Para tools `sensitive` ou marcadas por regra:

```text
planned -> awaiting_approval -> approved -> executed | failed
                             \-> rejected | expired
```

Pontos que exigem cuidado:

- **Claim atômico.** A aprovação executa `UPDATE ... SET status='approved', approved_by=$u, approved_at=now() WHERE id=$id AND status='awaiting_approval' RETURNING *` e só prossegue se retornou linha. Dupla aprovação, rejeição concorrente e timeout não sobrescrevem a decisão.
- **Autoridade do aprovador não substitui a do dono.** Aprovar não concede poder que o usuário da conversa não tinha. Reautorize a ação com o usuário original e verifique que o aprovador tem papel para aprovar.
- Se o processo cair depois do claim e antes do efeito, a ação fica `approved` sem retry automático. Reconcilie manualmente conferindo se o efeito já ocorreu (consulte outbox ou sistema externo). Documente esse comportamento. Retry cego duplica efeito.
- Mostre ao aprovador os argumentos reais e o efeito esperado, não só o nome da tool.
- Expiração por job.

### Prompt injection

- Mensagem de usuário, conteúdo de KB, resultado de tool e descrição de servidor MCP de terceiros são **dados**. Nenhum deles concede privilégio nem altera as instruções do servidor.
- Instruções do sistema são texto confiável montado no servidor. Cliente não envia `system`.
- Defesa real é a autorização na tool e a aprovação humana, não o texto do prompt. "Nunca revele X" no prompt não é controle de segurança.
- Teste negativo obrigatório: injete no conteúdo de KB e de mensagem uma instrução para chamar uma tool fora do escopo e confirme que a execução é negada.

## Nível 2: agentes como dados

### Entidade

```text
agent
  id, organization_id, slug (único por tenant), name, kind (tag semântica), description
  status: draft | active | paused | archived
  provider/model preferido, temperatura, max_output_tokens, max_tool_iterations
  soul jsonb        personalidade, tom, sempre fazer, nunca fazer
  identity jsonb    papel, responsabilidades, escopo, fora de escopo
  settings jsonb
  context_budget_kb, knowledge_budget_kb
agent_version      snapshot imutável da configuração + changelog (rollback)
agent_tool_permission   (agent_id, tool_key, scope, rate_limit_per_hour, config)
agent_approval_rule     (agent_id, tool_key, requires_approval, condition, approvers)
agent_knowledge_subscription (agent_id, knowledge_base_id, priority, enabled)
agent_memory_entry      ver abaixo
```

- `status != active` impede execução. Pausar é o primeiro botão de emergência.
- Toda edição grava `agent_version`. Execuções referenciam a versão usada, o que permite reproduzir e comparar.
- `soul` e `identity` em JSON validado por Zod no servidor. Limite de tamanho.
- Chave global de pausa por tenant (`ai_paused`), checada antes de qualquer run. É o **kill switch** do produto. Teste-o.
- Fallback de modelos por agente: lista ordenada (primário, fallback1, fallback2) resolvida por [AI-PROVIDERS](AI-PROVIDERS.md).

### Memória do agente

Quatro tipos práticos: `decision` (permanente), `lesson` (aprendizado), `glossary` (termos), `pending` (aguardando algo).

Campos: `title`, `body`, `tags`, `source`, `confidence`, `times_reinforced`, `expires_at`, `superseded_by`. Regras:

- Memória é **dado do tenant e do agente**, com RLS. Nunca compartilhe entre agentes sem decisão explícita.
- Escrita por agente passa por tool com aprovação ou fila de revisão. Memória escrita pelo próprio modelo é vetor de **envenenamento de prompt**: uma mensagem maliciosa pode virar "lição" permanente.
- Substituição em vez de edição (`superseded_by`) preserva histórico.
- Orçamento de contexto: injete só as entradas mais relevantes e recentes até o limite em KB.
- Registros diários (log por dia) são rascunho. Consolide periodicamente em job e descarte.

### Conhecimento do agente

Agente assina bases de conhecimento. Filtro de elegibilidade combina status publicado, audiência (`*` ou slug do agente) e assinatura. Detalhes em [KNOWLEDGE-BASE-RAG](KNOWLEDGE-BASE-RAG.md).

### Gatilhos

Defina e liste os pontos que iniciam um run: mensagem do usuário, evento de domínio (via outbox), agendamento (pg-boss), ação manual do admin. Todos entram por **uma** função (`runAgent(input)`) que valida status, kill switch, idempotência e cria o run. Entrada única evita caminhos que esquecem uma verificação.

### Avaliação contínua

- Conjunto de casos de regressão (entrada, tools esperadas, critérios) executado em job antes de publicar uma versão do agente.
- Amostragem de runs reais avaliada por modelo (relevância, concisão, tom) em job separado, resultado em campo do run. É observabilidade, não gate.
- Registre a versão do agente e do prompt em cada avaliação.

## Agentes de desenvolvimento versus agentes do produto

Não confunda. `AGENTS.md`, skills e `.planning/` orientam quem **constrói** o projeto. Agentes do produto são dado de runtime.

Se o produto oferece "agentes com identidade" ao usuário final, um conjunto simples de documentos por agente funciona bem como modelo mental e como exportação:

| Arquivo | Conteúdo |
| --- | --- |
| `SOUL` | Quem é, como opera, valores, tom, o que nunca e sempre faz (300 a 500 palavras) |
| `IDENTITY` | Nome, avatar, histórico curto |
| `AGENTS` (do agente) | Checklist de leitura por sessão, regras de memória, matriz do que pode e do que precisa pedir |
| `USER` | Contexto do usuário atendido, compartilhado entre agentes do workspace |
| `MEMORY` | Índice da memória, com arquivos por tópico |

Na prática, no produto essas peças viram colunas e linhas (`soul`, `identity`, `agent_memory_entry`). Níveis de autonomia (do "só sugere" ao "executa sem pedir") mapeiam para `scope` e regras de aprovação. Um comando `vibe agent` que gere esse esqueleto é uma extensão natural da CLI.

## Checklist de aceite

- [ ] Tool executa só com a sessão atual. Mudança de papel durante a conversa é respeitada.
- [ ] Argumento com ID de outro tenant ou de outro usuário retorna negado sem vazar existência.
- [ ] Tool de escrita é idempotente e não age antes do commit.
- [ ] Aprovação concorrente, dupla ou após expiração não executa duas vezes.
- [ ] Injeção via KB, mensagem e resultado de tool não amplia privilégio (teste negativo).
- [ ] Agente pausado e kill switch do tenant impedem runs.
- [ ] Teto de iterações e timeout encerram laços descontrolados.
- [ ] Versão do agente fica registrada em cada run e o rollback restaura a anterior.
- [ ] Nenhum argumento sensível de tool aparece em log.
