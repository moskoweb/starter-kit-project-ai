# Receita: base de conhecimento (CRUD) com RAG

Estado do kit: nenhum código de conhecimento, embeddings ou busca vetorial. Esta receita descreve um CRUD de bases e artigos, com versões, indexação assíncrona e busca híbrida, pronto para alimentar tools de IA.

Não adote se o produto não precisa que a IA consulte conteúdo próprio do tenant. Para poucos documentos pequenos, injetar o texto direto no prompt é mais simples e mais barato que RAG.

## Modelo mental: três camadas de conhecimento

| Camada | Dono | Escopo | Natureza |
| --- | --- | --- | --- |
| Base de conhecimento | Humanos do tenant | Tenant inteiro | Verdade estável, com revisão |
| Memória do agente | O agente, com revisão | Um agente | Aprendizado operacional ([AI-TOOLS-AND-AGENTS](AI-TOOLS-AND-AGENTS.md)) |
| Log diário | Automático | Sessão ou dia | Histórico bruto, descartável |

Mantenha a KB **separada** da definição do agente. Uma empresa tem um corpo de verdade. Duplicar por agente desincroniza. Agentes **assinam** bases.

## Entidades

```text
knowledge_base       id, organization_id, slug (único por tenant), name, description, language,
                     owner_user_id, is_primary, settings jsonb, deleted_at
knowledge_category   id, organization_id, knowledge_base_id, parent_id, slug, name, sort_order
knowledge_article    id, organization_id, knowledge_base_id, category_id, slug, title,
                     content (markdown), summary, tags text[], keywords text[],
                     status: draft | published | archived,
                     visibility: always_in_context | on_demand | rag_only,
                     audience text[]  ('*' = todos, ou slugs de agentes),
                     internal_only bool, size_bytes, priority,
                     author_user_id, published_at, published_by, deleted_at
knowledge_article_version  article_id, version_number, title, content, changelog, author_user_id
knowledge_chunk      id, organization_id, article_id, chunk_index, content, token_count,
                     embedding vector(N), embedding_model text, metadata jsonb
knowledge_proposal   (opcional) rascunho sugerido por agente, aguardando revisão humana
```

- Todas com RLS por tenant. `knowledge_chunk` carrega `organization_id` próprio para que a política não dependa de join.
- Artigo `audience` e `internal_only` controlam **quem lê**, e isso precisa valer na consulta, não só na interface.
- Gere bases, categorias e artigos com `vibe resource`. Colunas `text[]` e enums não são suportadas pelo gerador. Use `text` com separador validado ou escreva o model à mão.
- `vector` não existe no Drizzle por padrão. Declare o tipo customizado ou adicione a coluna por migration SQL escrita à mão e revisada. Habilite a extensão (`CREATE EXTENSION vector`) com o papel dono, não com o papel de runtime.

### Visibilidade

| Valor | Comportamento | Uso |
| --- | --- | --- |
| `always_in_context` | Entra no prompt do sistema, truncado por orçamento (por exemplo 8 KB) | Identidade da empresa, termos proibidos |
| `on_demand` | Carregado quando categoria, tag ou palavra-chave casam | FAQ, objeções |
| `rag_only` | Só via tool de busca | Base grande, histórico, documentação |

O orçamento de contexto é por agente. Seleção por orçamento: percorra por prioridade e pare quando somar o limite.

## Escrita: versões, publicação, auditoria

- Toda edição de artigo publicado grava `knowledge_article_version` na **mesma transação**. Snapshot imutável.
- Rollback cria **nova versão** com o conteúdo antigo, nunca apaga histórico.
- Só `published` é indexado e consultável. Rascunho e arquivado ficam fora da busca. Isso causa um caso de borda: base inteira em rascunho não retorna nada. Mostre isso na interface.
- Publicar, despublicar, arquivar e excluir geram evento de auditoria ([AUDIT-LOG](AUDIT-LOG.md)).
- Exclusão lógica (`deleted_at`) e remoção dos chunks.
- Permissões sugeridas: `owner` e `admin` fazem tudo. Um papel `kb_editor` cria, edita e publica sem excluir. `viewer` lê. Agente só lê (filtrado por audiência) e **propõe**.
- Tamanho de artigo recomendado abaixo de 10 KB. Acima disso, divida. Melhora a recuperação.

## Indexação (job)

Disparada ao publicar ou editar um artigo publicado. Nunca na requisição web.

```text
evento article.published|updated  ->  job kb.index {organizationId, articleId, contentHash}
job:
  1. carrega artigo no escopo do tenant; se não publicado, sai
  2. markdown -> texto puro
  3. divide em chunks (~512 tokens, sobreposição ~64), preferindo quebra em parágrafo
  4. gera embeddings em lote (provedor via AI-PROVIDERS, capacidade `embedding`)
  5. em UMA transação: apaga chunks do artigo, insere os novos
```

Regras aprendidas:

- **Idempotente.** Reexecutar produz o mesmo estado. Delete e reinserção na mesma transação, com `contentHash` para pular quando nada mudou.
- **Gere os embeddings antes de abrir a transação** de escrita. Chamada de rede dentro de transação segura conexão e estoura timeout. O produto original teve erro de timeout de transação por esse motivo.
- Aproximação de tokens por caracteres (cerca de 4 por token) é suficiente para chunking. Não traga tokenizer só para isso.
- Divida **conteúdo muito grande** em pedaços com limite máximo e sobreposição antes de enviar a um modelo (geração, resumo). Processe com concorrência baixa.
- Vetor com `NaN` ou `Infinity` é rejeitado. Valide `every(Number.isFinite)` antes de gravar.
- Falha de embedding não impede o artigo de ficar buscável por texto. Grave os chunks sem vetor e marque para reprocessar.
- Troca de modelo de embedding: ver [AI-PROVIDERS](AI-PROVIDERS.md). Grave `embedding_model`, compare dimensão na consulta e ofereça job de reindexação por base.
- Job de reindexação total, com limite de lote e retomada.

### Índices

```sql
CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_hnsw
  ON knowledge_chunk USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- FTS: coluna gerada usando só funções IMMUTABLE
ALTER TABLE knowledge_article ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('portuguese', coalesce(content, '')), 'B')) STORED;
CREATE INDEX knowledge_article_search_idx ON knowledge_article USING GIN (search_tsv);
```

Armadilhas de índice:

- `array_to_string` é `STABLE`, não pode entrar em coluna `GENERATED`. Para incluir tags na busca, concatene na consulta.
- Escolha a configuração de idioma (`portuguese`, `english`) por base. Uma configuração fixa prejudica bases em outro idioma.
- Índice HNSW com RLS: o planejador pode preferir varredura filtrada. Meça com `EXPLAIN` em volume realista. Se o filtro por tenant for muito seletivo, considere particionar ou usar índice parcial.
- Dimensão da coluna fixa. 1024 e 1536 são comuns. Escolha antes de popular.

## Busca híbrida (vetor + texto + RRF)

Uma tool `searchKnowledge({ query, topK, kbId? })` que:

1. Calcula o vetor da consulta. Se falhar, **segue só com texto**. Nunca invente vetor.
2. Define o conjunto elegível: tenant, status publicado, não excluído, bases assinadas pelo agente, audiência (`*`, vazia ou slug do agente).
3. Candidatos vetoriais: top 20 por distância cosseno, por artigo (menor distância entre chunks).
4. Candidatos textuais: `ts_rank` sobre título, tags e conteúdo, top 20.
5. Funde por **Reciprocal Rank Fusion**: `score = soma(1 / (60 + rank))` entre as duas listas. Ordena e limita a `topK`.
6. Se nada voltou, tenta busca por substring (`ILIKE`) como último recurso.
7. Devolve `{ articleId, title, snippet, score }`. Snippet é resumo ou começo do conteúdo, limitado.

Segurança da consulta:

- O filtro de elegibilidade é aplicado **em SQL**, antes da fusão. Filtrar depois vaza existência e custa mais.
- Execute dentro da transação com contexto RLS (`withTenantScope`). Nunca use papel com bypass.
- Parametrize tudo. A versão original montou parte da consulta com `$queryRawUnsafe` e lista de IDs em string. Em Drizzle use `sql` com parâmetros e `= ANY($1::uuid[])`. Nunca interpole entrada.
- Compare `vector_dims` para ignorar chunks de outro modelo durante migração.
- `topK` com teto (por exemplo 10). Query com teto de tamanho.
- O resultado é **dado não confiável** para o modelo. Conteúdo de artigo pode conter instruções. Ver prompt injection em [AI-TOOLS-AND-AGENTS](AI-TOOLS-AND-AGENTS.md).

Detecção de duplicata ao criar artigo: busca vetorial com limiar (cerca de 0,85 de similaridade cosseno) avisa "isso já existe, mesclar?". Se o embedding falhar, não bloqueie a criação.

## Fluxos úteis

- **Templates de base** ao criar a primeira (por exemplo comercial, suporte, em branco), com categorias e artigos-placeholder. Aceleram o onboarding.
- **Geração por IA** (a partir de URL, arquivo ou texto) como job assíncrono com status (`queued`, `running`, `completed`, `failed`), resultado e erro. Limite de tamanho de entrada. URL de entrada passa pela guarda de [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md). Arquivo passa por validação de tipo e tamanho do `@vibe/storage`.
- **Propostas de agente:** a tool `proposeKnowledgeArticle` cria `knowledge_proposal` pendente. Humano aprova e vira artigo. Nunca publique direto por ação do modelo.
- **Uso por run:** registre quais artigos foram usados em cada resposta (`knowledge_used`). Ajuda a depurar respostas erradas e a revisar a base.

## Interface (painel)

- Resources: Base, Categoria, Artigo com filtros por status, categoria, tag e visibilidade.
- Editor Markdown com pré-visualização e **sanitização** na renderização.
- Histórico de versões com diff.
- Indicador de indexação por artigo (pendente, indexado, falhou) e botão de reindexar.
- Estado vazio e de erro tratados.

## Checklist de aceite

- [ ] Tenant A nunca recupera artigo ou chunk do tenant B, por tool, API ou SQL direto.
- [ ] Artigo em rascunho, arquivado ou excluído não aparece na busca.
- [ ] Audiência respeitada: artigo restrito a um agente não aparece para outro.
- [ ] Editar publicado cria versão. Rollback gera nova versão.
- [ ] Reexecutar o job de indexação não duplica chunks nem muda o resultado.
- [ ] Falha do provedor de embeddings mantém busca textual funcionando.
- [ ] Troca de modelo de embedding não retorna resultados incoerentes.
- [ ] Consulta é parametrizada. Teste com aspas e SQL no texto da busca.
- [ ] Injeção em conteúdo de artigo não amplia privilégio do agente.
- [ ] `EXPLAIN` com volume realista usa os índices esperados.
