# Receita: conector de provedores de IA

Estado do kit: `@vibe/ai` lê **um** provedor OpenAI-compatible de variáveis de ambiente (`AI_*`). Serve para um produto com uma chave do operador. Esta receita descreve a evolução para produtos em que **cada tenant traz o próprio provedor**, a plataforma oferece um pool compartilhado e há fallback entre provedores.

Não adote se o produto usa um único provedor definido no deploy. Nesse caso o pacote atual basta.

## Conceitos

| Conceito | Descrição |
| --- | --- |
| Catálogo | Lista estática no código: id do provedor, rótulo, tipo de API, `baseURL` padrão, capacidades, modelos conhecidos, schema Zod da configuração |
| Credencial | Linha no banco com a configuração do provedor cifrada. Pertence a um tenant ou à plataforma |
| Resolver | Função que, dado tenant e capacidade, devolve a lista ordenada de modelos utilizáveis |
| Capacidade | `text`, `vision`, `embedding`, `transcription`. Cada uma tem resolução própria, pois nem todo provedor suporta todas |
| Origem | `tenant`, `platform` ou `env`. Devolvida junto com o modelo para auditoria, custo e depuração |

## Camadas de resolução

Ordem de tentativa, parando na primeira que atende:

1. **Credencial do tenant.** Admin do tenant cadastra a chave. Prioridade para quem paga a conta.
2. **Pool da plataforma.** Credenciais do operador, com `priority` e rodízio. Útil para planos incluídos ou período de teste.
3. **Variáveis de ambiente.** Fallback do deploy. É o comportamento atual do kit.

Regras:

- Deduplique por id de provedor. O mesmo provedor não aparece duas vezes na cadeia.
- Cada função de resolução declara quais camadas usa. Exemplo: um agente com provedor escolhido pelo admin usa só camadas 1 e 2. Geração de rascunho "qualquer LLM" usa 1, 2 e 3. Autoria de agente que usa a chave do tenant nunca cai em credencial da plataforma.
- O resultado inclui `source`. Registre-o no run para saber quem foi cobrado.
- Camada da plataforma desligável por configuração. Em self-hosted com chave única, só `env` existe.

## Use o AI SDK como abstração

O kit já depende de `ai` e `@ai-sdk/openai-compatible`. Não escreva uma interface própria de provedor (`complete()`, tipos de mensagem, tipos de tool). O `LanguageModel` do SDK já unifica streaming, tools, usage e abort. O produto original construiu uma interface própria antes de adotar o SDK e manteve duas camadas por muito tempo.

Esboço do contrato do resolver:

```ts
type Capability = "text" | "vision" | "embedding" | "transcription";
type Resolved = { model: LanguageModel; providerId: string; modelId: string; source: "tenant" | "platform" | "env"; credentialId?: string };

// Server-only. tenantId vem da sessão, nunca do request.
async function resolveModels(tx: TenantTransaction, tenantId: string | null, capability: Capability, opts?: { credentialId?: string; modelId?: string }): Promise<Resolved[]>;
```

Provedores compatíveis com OpenAI cobrem a maioria (OpenAI, Groq, OpenRouter, Ollama, xAI, vLLM) com só `baseURL` e chave. Anthropic e Google usam pacotes `@ai-sdk/*` próprios. Mantenha uma entrada de catálogo por provedor, cada uma com `build(config) => provider`.

## Modelo de dados

Duas tabelas com a mesma forma, ou uma com `organization_id` nulo para plataforma. Recomendado **duas tabelas**, porque as políticas de acesso diferem.

```text
ai_credential            (tenant)      ai_platform_credential   (plataforma)
  id uuid                                id uuid
  organization_id uuid  RLS tenant       provider text
  owner_user_id uuid                     display_name text
  provider text                          config_enc text
  display_name text                      priority int
  config_enc text   (ver SECRETS)        is_active bool
  default_model text                     last_used_at, last_error_at, last_error_code
  is_active bool                         request_count, token_count
  last_error_at, last_error_code
  created_at, updated_at, deleted_at
```

- `config_enc` guarda JSON cifrado conforme [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md). Nunca devolva a chave em leitura. Mostre só os últimos 4 caracteres.
- A tabela da plataforma **não é dado de tenant**. Conceda acesso a ela só a um papel de servidor dedicado ou a funções `SECURITY DEFINER` estreitas, usadas pelo resolver e pelo painel `admin`. Isso mantém a regra do kit de que superadmin não ganha bypass sobre dados dos tenants.
- Guarde `last_error_code` sanitizado, nunca o corpo do erro do provedor.
- Painéis: CRUD de credenciais do tenant via `vibe resource`, com campo de chave só de escrita. CRUD da plataforma no painel `admin`.

## Fallback e erros

Classifique o erro **antes** de decidir. Mapeamento recomendado:

| Sinal | Ação |
| --- | --- |
| 401, 403 | Credencial inválida. Marque `last_error_code`, tente a próxima, notifique o admin do tenant |
| 402 ou quota esgotada | Tente a próxima imediatamente, sem retry |
| 429 de rate limit | Retry curto com backoff e limite. Depois próxima |
| 5xx, timeout, rede | Próxima |
| 400 | Não faça fallback. É erro do request, repetir em outro provedor repete o erro |
| Erro depois de iniciar o stream | Não é possível trocar de provedor no meio. Termine o run com erro e registre |

Armadilhas reais:

- Alguns provedores respondem **429 para quota esgotada**. O SDK trata 429 como retriable e gasta tentativas inutilmente. Use um `fetch` customizado que reclassifica o corpo de quota esgotada (padrões como `insufficient_quota`, `quota exceeded`) para 402. O fallback assume na primeira falha.
- Mantenha `maxRetries: 0` como o kit faz hoje e implemente o retry na cadeia, onde o custo e o destino são visíveis.
- Mapeie erros de LLM em **um único módulo** com código estável (`LLM_NO_PROVIDER_CONFIGURED`, `LLM_QUOTA_EXHAUSTED`, `LLM_AUTH_FAILED`, `LLM_TIMEOUT`), mensagem amigável para o cliente e detalhe cru só no log do servidor. O produto original duplicou essa lógica em três rotas e elas divergiram.
- Nunca compare substrings de mensagens de erro. Use `status` numérico e códigos tipados (ver [LESSONS-LEARNED](LESSONS-LEARNED.md)).

## Normalização de `baseURL`

Erros recorrentes que custaram horas de depuração:

- Barra final duplicada (`/v1/` mais `/embeddings`).
- Ollama: o endpoint OpenAI-compatible fica em `/v1`. Algumas camadas acrescentam `/v1` e outras não, gerando `/v1/v1/embeddings` com 404. Defina **um** ponto onde o sufixo é aplicado e teste.
- Normalize na escrita da credencial e no resolver, com uma função única.

`baseURL` informada por tenant é **entrada não confiável**. O kit hoje exige que ela venha da configuração do deploy por esse motivo. Para aceitar URL de tenant, use obrigatoriamente a guarda de [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md): HTTPS, sem credenciais na URL, DNS resolvendo só para endereços públicos, sem redirects, timeout. Exceção para Ollama local em dev deve ser flag explícita de ambiente, nunca configuração de tenant.

## Capacidades além de texto

- **Visão.** Declare no catálogo quais modelos aceitam imagem. Se o provedor da conversa não suporta, degrade para descrição textual em vez de falhar. Arquivos PDF nativos só em provedores que suportam. Os demais recebem texto extraído.
- **Embeddings.** Veja a seção própria abaixo e [KNOWLEDGE-BASE-RAG](KNOWLEDGE-BASE-RAG.md).
- **Transcrição.** Resolução separada, porque o conjunto de provedores é outro. Mídia de entrada passa por job, nunca na requisição web.

## Embeddings: cuidados específicos

- A dimensão do vetor é fixa por coluna. Trocar de modelo ou provedor **invalida o índice**. Grave `embedding_model` e `dimensions` em cada chunk e rode reindexação ao mudar.
- Compare dimensões na consulta para não quebrar com chunks de modelos antigos durante a migração.
- Não use embedding falso como fallback em produção. O produto original usa um vetor determinístico de trigramas em desenvolvimento, e em produção **falha** quando não há provedor. Reproduza isso: em produção erro claro, em dev busca lexical.
- Falha ao gerar o vetor da **consulta** degrada para busca lexical. Nunca fabrique vetor.

## Uso e custo

- Registre por chamada: tokens de entrada e saída, tokens em cache, modelo, `source`, `credentialId`, latência.
- Custo em USD é opcional e exige tabela de preços mantida por você. Sem ela, registre só tokens.
- Contadores agregados por credencial da plataforma ajudam a decidir rodízio. Atualize em job, não na requisição.
- O limite diário de [AI-CONVERSATIONS-AND-QUOTA](AI-CONVERSATIONS-AND-QUOTA.md) vale por usuário e tenant. Limite por credencial é outra camada.

## Checklist de aceite

- [ ] Tenant A não lê, não lista e não usa credenciais do tenant B (teste negativo com RLS e com chamada direta).
- [ ] Chave nunca aparece em resposta de API, log, erro, bundle cliente ou auditoria.
- [ ] Cadeia respeita a ordem e deduplica por provedor.
- [ ] 402, 429 de quota, 401 e 5xx fazem a transição esperada. 400 não faz.
- [ ] Credencial inativa ou com erro é pulada e sinalizada ao admin.
- [ ] `baseURL` de tenant bloqueia localhost, IP privado, metadata de nuvem e redirect.
- [ ] Sem nenhum provedor configurado, a feature responde erro claro e o app inicia normalmente.
- [ ] Troca de modelo de embedding dispara reindexação e não quebra buscas.
- [ ] Smoke com provedor real: streaming, tool, cancelamento, erro redigido.
