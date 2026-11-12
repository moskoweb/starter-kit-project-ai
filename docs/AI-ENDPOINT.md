# Endpointo de IA

`POST /api/ai` recebe JSON `{ "prompt": "...", "tenantIdentifier": "slug-ou-uuid" }`. `tenantIdentifier` é opcional; nunca é tratado como identidade ou escopo autorizado: `requireSession` e `withTenantScope(..., "read", ...)` autenticam e validam tenant antes do stream. Sem `AI_ENABLED=true`, responde 404 antes de exigir provider credentials.

Servidor requer `AI_API_KEY`, `AI_MODEL` e opcional `AI_BASE_URL` quando IA habilitada (detalhes em [AI.md](./AI.md)). `AI_MAX_OUTPUT_TOKENS` padrão 1024, faixa 1–4096 por etapa (pacote admite até duas etapas); `AI_DAILY_MAX_REQUESTS` padrão 30; `AI_DAILY_MAX_OUTPUT_TOKENS` padrão 20000. Quota diária por usuário e tenant é reservada atomicamente em `ai_usage_daily` dentro da transação com contexto RLS, antes do provider, reservando teto de duas etapas. Quando limites não comportam reserva ou quota esgota, retorna 429. Reservas são conservadoras; falha/abort não reduz quota automaticamente, evitando liberação indevida. Falha pré-stream interna retorna erro genérico.


`packages/db/src/ai-schema.ts` declara tabela Drizzle com UUID, escopo, índices únicos parciais para tenant nulo/não nulo e RLS. Não criar migration nem editar journal nesta etapa; schema/migration gerados pelo owner posteriormente. Quota contabiliza reservas conservadoras; sem reconciliação post-stream nesta implementação.

Dependências: app `@vibe/ai`, `@vibe/auth`, `@vibe/db`, `@vibe/config`, `drizzle-orm`, `zod`; DB schema depende de `drizzle-orm`. Smoke externo permanece pendente de credenciais/provider: provar streaming real, ferramenta, negação cross-tenant, cancelamento e quota concorrente. Nenhuma geração simulada.
