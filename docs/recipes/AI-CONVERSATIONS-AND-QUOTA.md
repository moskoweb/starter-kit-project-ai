# Receita: conversas, runs e conciliação de quota

Estado do kit: `POST /api/ai` aceita um prompt, reserva quota conservadora em `ai_usage_daily` e devolve texto em stream. Não há histórico, não há registro de execução e a reserva **nunca é conciliada** com o uso real. Esta receita fecha essas lacunas.

Não adote se o produto só precisa de ações pontuais (resumir, classificar) sem histórico.

## Entidades

```text
ai_conversation              ai_run                          ai_message
  id                           id                              id
  organization_id (nullable)   conversation_id                  conversation_id
  owner_user_id                owner_user_id                    run_id (nullable)
  title                        organization_id                  role: user | assistant | tool
  status: active | archived    idempotency_key                  parts jsonb (texto, tool-call, tool-result)
  created_at, updated_at       status                           created_at
  deleted_at                   model_id, provider_id, source
                               reserved_output_tokens
                               input_tokens, output_tokens, cached_input_tokens
                               started_at, finished_at, error_code
```

- Mesmo padrão de RLS de `ai_usage_daily`: política por `app.current_user_id` e `app.current_tenant_id`, com `organization_id` nulo para contexto pessoal. Conversa organizacional pode ser compartilhada por papel. Decida cedo: privada por usuário (padrão seguro) ou visível à equipe.
- `parts` é JSON, tipo que o gerador da CLI não suporta. Escreva o schema Drizzle e as políticas RLS à mão. Resource só entra para listagem e arquivamento, sobre colunas de tipos suportados.
- Status de run: `reserved`, `running`, `completed`, `aborted`, `failed`, `expired`.
- `idempotency_key` com índice único por `(owner_user_id, idempotency_key)`. O cliente gera a chave por envio. Reenvio devolve o run existente em vez de gastar quota de novo.

## Fluxo do request

1. Autenticar e resolver tenant no servidor (`requireSession`, `withTenantScope`).
2. Validar origem, tamanho do body e schema.
3. **Na mesma transação:** aplicar rate limit, inserir `ai_run` em `reserved` e reservar quota. Se a chave de idempotência já existe, devolver o run existente.
4. Carregar o histórico **do banco**, nunca do cliente. Histórico enviado pelo cliente permite injetar mensagens com `role: assistant` ou `system`. O cliente envia só o novo texto e o id da conversa.
5. Truncar o histórico por orçamento de tokens (mais recentes primeiro, preservando instruções do servidor).
6. Gravar a mensagem do usuário e marcar o run como `running`.
7. Chamar `streamAiText`. Propague `request.signal` combinado com um deadline do servidor.
8. No fim do stream, gravar a mensagem do assistente e **conciliar** (seção abaixo).

Para o stream não morrer quando o navegador desconecta, consuma o stream no servidor até o fim (`result.consumeStream()` no SDK) e persista pelo `onEnd`. Sem isso, cancelar a aba deixa a mensagem sem gravar e a quota sem conciliar. Cancelamento explícito do usuário é outro caso e deve marcar `aborted`.

## Conciliação durável da quota

Reservar é fácil. Conciliar com segurança é o ponto frágil. Regras:

- A reserva usa o teto (por exemplo, duas etapas vezes o máximo de saída). Ao concluir, **ajuste** o contador para o uso real vindo do `usage` do SDK. A diferença volta ao orçamento.
- Operação idempotente por `run_id`. Faça `UPDATE ai_run SET status='completed', ... WHERE id=$1 AND status='running' RETURNING reserved_output_tokens` e só ajuste a quota se a linha foi atualizada. Dupla chamada do callback não devolve duas vezes.
- Provedor falhou ou conexão caiu **sem usage**: mantenha a reserva integral (política conservadora do kit) ou liquide por estimativa documentada. Escolha uma política e escreva-a.
- Campos de `usage` podem estar ausentes. Trate como desconhecido, não como zero.
- Callbacks (`onEnd`, `onAbort`, `onError`) **não sobrevivem** a queda do processo. Por isso existe o varredor.

### Varredor de runs expirados

Job recorrente no pg-boss (`@vibe/jobs`):

1. Seleciona `ai_run` em `reserved` ou `running` com `started_at` anterior ao deadline máximo mais margem.
2. Marca como `expired` e aplica a política de liquidação (reserva integral ou estimada) de forma idempotente.
3. Emite log estruturado (`logEvent`). Taxa alta de `expired` indica problema de infraestrutura.

Esse job precisa de um papel de servidor que acesse runs de vários tenants. Use função `SECURITY DEFINER` estreita ou o papel de worker dedicado do kit, sem dar ao runtime web um bypass de RLS.

## Contagem de quota

- Limites por usuário e tenant, diários, em requests e tokens. O kit já tem a base.
- Considere limite mensal por tenant e limite por plano. Guarde plano em tabela própria e leia no servidor.
- Quota consumida em contexto organizacional não deve vazar para outro tenant do mesmo usuário. O índice único já separa pessoal e por organização.
- Exponha o consumo ao usuário (restante hoje) via endpoint autenticado.

## Retenção e privacidade

- Por padrão **não** grave prompt de sistema, request cru nem resposta crua do provedor. O produto original gravava esses campos para depuração e precisou de job diário de purga com flag `preserved` para runs fixados. Só adote se tiver necessidade operacional real e então: TTL curto, purga por job, acesso restrito a admin, nunca no log.
- Conversas são dado pessoal. Planeje exportação e exclusão por titular, e política de retenção por tipo.
- Prompts e saídas vão ao provedor escolhido. Documente região, retenção do provedor e dados proibidos. O kit já exige isso antes de habilitar IA.

## Interface

- `AiAssistant` do kit é um componente de prompt único. Evolua para lista de conversas, mensagem em stream e botão de cancelar. Aborte ao desmontar e ao trocar de tenant ou conversa, como o componente atual já faz.
- Renderize só texto ou Markdown sanitizado. Nunca HTML do modelo.
- Mostre erros com a mensagem amigável do mapeador. Nunca `String(error)`.
- Para tools, renderize chamada e resultado como partes separadas, sem dados que o usuário não possa ver.

## Checklist de aceite

- [ ] Usuário A não lê conversa, run ou mensagem do usuário B nem de outro tenant (RLS e API).
- [ ] Reenvio com a mesma chave de idempotência não cria segundo run nem consome quota duas vezes.
- [ ] Histórico vem do banco. Mensagens `assistant` ou `system` enviadas pelo cliente são ignoradas ou rejeitadas.
- [ ] Concorrência: N requests paralelos não ultrapassam o orçamento.
- [ ] Conclusão normal ajusta a quota ao uso real, uma única vez.
- [ ] Abort do usuário, falha do provedor e queda do processo terminam em estado final com a política de liquidação aplicada.
- [ ] Varredor expira runs órfãos de forma idempotente.
- [ ] Desconexão do navegador não deixa run em `running` indefinidamente.
- [ ] Nenhum prompt, resposta ou argumento de tool aparece em logs.
