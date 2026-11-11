---
phase: "07"
plan: "01"
type: execute
wave: 1
depends_on: ["02", "03", "04", "06"]
requirements: [AI-01, AI-02, AI-03, OBS-01, ANALYTICS-01, SEC-01, SEO-01]
autonomous: true
---

# Fase 07 — IA e operação segura

## Pré-requisitos e fronteiras

Ler PROJECT, REQUIREMENTS, 07-CONTEXT e handoffs de auth, config, resources e worker. Somente planejamento nesta entrega; não executar comandos/checks ou integrações externas. Plano por worker genérico, sem alegação de planner/checker tipado. Caminhos propostos abaixo se ajustam aos arquivos finais dessas fases, preservando uma convenção.

Reusar sessão/resolve-context/permissão e transação contextual com RLS da fase 2; não aceitar owner/tenant arbitrários de body ou modelo. Migrations novas pelo Drizzle, aplicação explícita pelo owner; não editar migrations aplicadas. Módulos exclusivos web ficam em `apps/app`; logs comuns ao worker podem usar módulo compartilhado concreto da fase 6. Não criar pacote/provider/interface só por helper.

## 1. Tracer: stream autorizado com quota persistida — AI-01, AI-03, OBS-01

**Arquivos/fronteiras:** `apps/app/src/lib/ai.ts`, `apps/app/src/app/api/ai/chat/route.ts`, página de demonstração registrada no painel/contexto já existentes, config/env, `packages/db/src/operations-schema.ts`, agregador/migrations, app package/lockfile, logger compartilhado app/worker.

1. Ler docs oficiais/tipos e pinar versões compatíveis `ai`, `@ai-sdk/react` e `@ai-sdk/openai`; registrar versões/Node suportado. Referência usa adapter OpenAI direto com modelo configurado por operador, allowlist de modelo; sem fallback, gateway obrigatório ou provider enviado pelo cliente. `AI_PROVIDER=disabled` default; desabilitado oculta UI e endpoint retorna capacidade indisponível sem chamada externa. Habilitado inválido falha com nome da variável, nunca valor secreto.
2. Endpoint POST exige sessão, acesso ao painel/contexto e feature AI permitida. Validar origem/CSRF para sessão-cookie conforme padrão existente, JSON estrito, tamanho máximo de body 64 KiB medido no stream, no máximo 20 mensagens e texto total 16 mil caracteres. Não aceitar mensagens system/developer, tool result ou histórico de autorização forjados; servidor constrói prompt e mensagens a partir do formato permitido. Sem anexos/URLs remotas neste exemplo.
3. Tables de quota/reserva/uso com chave de escopo pessoal/tenant e usuário, janela UTC, requestId único, estado e contagens. Reserva atômica via transação e constraint/lock/UPSERT condicional, não `SELECT` seguido de incremento concorrente. Defaults: 20 requests/h por usuário, 2 streams simultâneos por usuário, 100 mil tokens/dia por escopo; input máximo tokens configurado, output máximo 1024, deadline 60s. Reserva inclui upper bound conservador de input/output e overhead de tool/steps; se não for possível limitar input corretamente no modelo escolhido, reduzir contrato usando tokenizer compatível, não estimar segurança por caracteres. Negar antes do provider com 429/Retry-After e código seguro.
4. `streamText` e retorno oficial UI message stream da versão instalada; `AbortSignal` une disconnect/cancel e timeout, usa max output tokens e limite de passos conforme API instalada. Cancelar não inicia nova chamada nem reconecta automaticamente cobrando novamente. UI mostra streaming, stop, erro, retry manual e quota; retry recebe novo requestId, nenhuma promessa de idempotência de cobrança sem suporte do provider.
5. Finalização onFinish/onError/abort reconcilia reserva uma vez com usage real quando disponível, registra apenas contagens/modelo allowlisted/status/duração. Crash e usage desconhecido conservam débito reservado; rotina de recuperação libera slot de concorrência por lease expirado, mas não devolve orçamento desconhecido automaticamente. Um stream abandonado não prende slot para sempre. Não marcar cancelamento como custo zero.
6. Logger JSON gera correlationId UUID no servidor ou valida entrada confiável de comprimento/formato; resposta e envelope job preservam ID. Allowlist de campos, erro sanitizado antes de log e resposta; bloquear provider error bruto, header/body/cookie/prompt/output/URL assinada. stdout funciona sem conta. Correlacionar início/fim web e worker sem aceitar correlationId injetável com quebras de linha.

**Gate tracer:** com DB real e provider real autorizado no fechamento, usuário autorizado recebe stream progressivo, cancelamento chega ao provider, erro seguro não vaza chave; quota persiste após restart e duas instâncias não excedem concorrência/orçamento. Até fechamento, status **smoke OpenAI pendente**; teste local de quota não prova streaming externo.

## 2. Tool read-only e isolamento — AI-02, AI-03

**Arquivos/fronteiras:** `apps/app/src/lib/ai-tools.ts`, domínio/query de projetos existente, endpoint/página AI, testes integração de autorização.

1. Tool `listProjects` com `tool({inputSchema, execute})` conforme tipos pinados; entrada estrita de busca/tamanho com limite 10, sem SQL/tenantId/ownerId/URL/modelo. Saída DTO mínima id/nome, sem descrição sensível por default nem schema inteiro. Tools habilitadas explicitamente no servidor; não permitir seleção cliente de tool arbitrária.
2. Capturar contexto autenticado no endpoint e revalidar sessão/membership/permissão `project:read` **em cada execução**, usando mesma transação autorizada do domínio. Não manter transação DB aberta durante chamada do modelo ou stream. Após revogação confirmada, tool nega mesmo se stream iniciou antes. Modelo não muda contexto via argumentos/prompt ou ID de sessão.
3. Limitar sequência a no máximo 3 passos, 2 chamadas de tool e tempo comum da requisição; confirmar forma nativa de limite e contador server-side conforme SDK pinado. Retornos de tool são dados não confiáveis para modelo, nunca instruções; nenhuma tool de escrita, navegação externa, shell ou SQL livre. Tratamento de negação/validação não expõe existência de projeto alheio.
4. UI explica que conteúdo permitido é enviado ao provider; feature opt-in controlada por projeto, sem persistir conversas por default. Documentar campos enviados, quem controla modelo, retenção real do provider, exclusão quando persistência for adicionada e limites da proteção contra prompt injection. Não afirmar que system prompt protege acesso.

**Gate:** chamada direta de execução com inputs inválidos/tenant forjado negada; contexto pessoal/A/B e usuário com papéis distintos retorna somente projetos autorizados, revogação interrompe tool futura; prompt pedindo dados B não altera escopo. Prova de permissão via DB real não depende do modelo escolher tool; smoke final adicional confirma tool chamada pelo provider real.

## 3. Logs e captura opcional de erros — OBS-01

**Arquivos/fronteiras:** logger compartilhado usado por app/worker, `apps/app/src/instrumentation.ts` e arquivos Sentry recomendados na versão pinada somente se necessários, bootstrap worker, config/env/docs.

1. Reusar logger concreto já existente; escolher Pino somente se JSON/serialização/redaction existentes não atendem. Padronizar service, environment, correlationId, jobId/eventId quando aplicável, operation, durationMs, status, safeErrorCode. Substituir logs brutos das integrações afetadas, não criar middleware que capture tudo.
2. `ERRORS_PROVIDER=disabled|sentry`; desabilitado não inicia SDK nem envia telemetria. Sentry server/worker opcionais com `sendDefaultPii:false`, sem replay, profiling, body, session replay nem tracing automático. `beforeSend`/scrubbing removem headers/URL query/user email/body e contexto não allowlisted, inclusive breadcrumbs. CorrelationId em tag segura; stack revisada não inclui segredo. Client reporting só se deliberadamente habilitado e sanitizado; DSN público não se confunde com auth token de upload.
3. Source-map upload opcional em build/release explícito; auth token só CI, nunca runtime/client ou `.env.example` preenchido. Worker captura falha real segura sem engolir erro da fila. Logs locais continuam funcionais se Sentry indisponível; captura de erros não altera sucesso/falha de negócio nem gera loop.

**Gate:** log web/job correlacionado e JSON parseável, teste com sentinelas falsas comprova ausência de token/prompt/email nos logs/eventos; captura real Sentry fica pendente até gate externo, não simular como prova. Sem conta, web/worker iniciam com captura desligada.

## 4. PostHog com opt-in prévio — ANALYTICS-01

**Arquivos/fronteiras:** `apps/app/src/components/analytics-consent.tsx`, boundary client e módulo `analytics.ts` server/client separados, layout público adequado, config/env, dicionários/docs.

1. Ler APIs da versão pinada de `posthog-js`; inicialização lazy somente após consentimento explícito. Sem autocapture, pageview automático, replay, feature flags/pesquisas automáticas ou identificadores antes de consentir. Host PostHog configurado/validado para região selecionada; não hardcodar US para projeto EU.
2. Banner/settings acessíveis aceitam/recusam com mesma clareza; persistir versão de consentimento e permitir retirada. Antes de consentir e após recusar, nenhuma request PostHog, cookie ou storage de tracking. Retirada para transporte, limpa estado/identidade conforme API real e bloqueia eventos; logout reseta identificação sem atribuir eventos ao próximo usuário.
3. Evento explícito `reference_project_created` após commit, somente com consentimento, propriedades allowlist sem título/descrição/email/tenant nome/prompt. Escolher captura client para esse evento após confirmação do servidor, sem enviar evento server-side duplicado; ID pseudônimo não contém email. Definir prevenção de repetição por refresh sem prometer exactly-once de analytics.

**Gate:** inspeção real de rede/storage antes do consentimento, após recusa/retirada e logout comprova zero coleta; aceite produz evento único observável no PostHog real no fechamento. Mock de SDK não encerra requisito. Feature desabilitada não baixa SDK de analytics nem exige chave.

## 5. Headers e limitador compartilhado — SEC-01

**Arquivos/fronteiras:** `apps/app/next.config.ts`, proxy/handlers atuais onde realmente necessário, módulo `apps/app/src/lib/rate-limit.ts`, operations-schema/migrations, env/docs, políticas auth fase 2.

1. Registrar avaliação Arcjet: não adotar como dependência obrigatória; alternativa PostgreSQL cobre limites distribuídos e evita conta adicional, mas não substitui proteção DDoS/CDN. Não adicionar chave Arcjet fantasma. Reaproveitar limitador auth com backend DB se seguro; substituir configuração memory-only de auth quando houver mais de uma instância. Não deixar endpoint auth vulnerável enquanto protege só demo.
2. Bucket/contador PostgreSQL com chave hash de operação e usuário/escopo, ou IP normalizado para endpoint não autenticado; janela e incremento atômicos, expiração/index e limpeza pelo worker sem bloqueio global. IP só de proxy confiável configurado, não confiar `X-Forwarded-For` de origem pública. DB indisponível falha fechado nos endpoints protegidos com 503 seguro, não fallback Map que contorna limite. Hash com segredo de rate limit para minimizar dados pessoais; retenção curta.
3. Matriz explícita: auth login/reset/OTP conforme políticas da fase2, AI requests/quota, presign/complete, inbound hook por endpoint/IP e mutações sensíveis. Limites diferentes e configuráveis por operação, retorno 429/Retry-After sem revelar bucket de outro usuário. Hooks assinados ainda recebem limite de bytes e rate limit antes de trabalho caro; rate limit não concede autorização.
4. Headers: nosniff, Referrer-Policy, Permissions-Policy mínima, frame-ancestors/CSP e proteção frame compatível, HSTS somente HTTPS produção. CSP com fontes/connect-src mínimos para S3/AI/analytics/Sentry habilitados, sem wildcard genérico ou `unsafe-eval` produção; nonce se necessário deve cobrir render/hidratação realmente usada. Não gerar nonce estático ou CSP incompatível com streaming Next.js. Rotas privadas/auth com no-store conforme contrato, sem cache público de sessão.

**Gate:** dois processos web no mesmo DB compartilham limite, restart não zera janela, spoof de forwarded header não contorna; auth/reset/OTP e endpoints listados retornam 429 correto. Browser verifica headers e app funcional sem violações CSP indevidas, tanto com features desligadas como ligadas. Nenhum controle substitui auth/RLS.

## 6. SEO apenas público — SEO-01

**Arquivos/fronteiras:** metadata de layout/páginas públicas existentes, `apps/app/src/app/{robots.ts,sitemap.ts}`, JSON-LD da landing se houver entidade real, layouts privados, config/env.

1. `metadataBase` usa URL pública validada, title/description/canonical/locale por página; preview deploy não indexável. Só URLs públicas allowlisted entram no sitemap, sem varrer registry de painéis/resources nem consultar registros privados.
2. Robots permite superfícies públicas pertinentes e desaconselha privadas; privado recebe `noindex,nofollow` via metadata/header sem depender de robots como autorização. Nenhum nome/slug/id privado em sitemap, metadata ou JSON-LD.
3. JSON-LD apenas entidade real Organization/WebSite conforme dados configurados, sem reviews/ratings inventados. Serialização segura escapa `<` para evitar fechar script; validar URLs e campos. Não criar CMS/blog ou páginas de conteúdo artificiais para preencher requisito.

**Gate:** HTML público renderiza metadata/canonical/JSON-LD válidos, sitemap contém só allowlist pública, privado não vaza dados para crawler anônimo; locale e URL produção/preview respeitados.

## 7. Ambiente, documentação e aceite

**Arquivos:** `.env.example`, validador canônico, docs existentes de desenvolvimento/integrações/segurança/deploy; testes reais nos runners já entregues. Sem segredos reais ou nova `.env`.

| Ramo condicional | Variáveis mínimas propostas |
|---|---|
| IA OpenAI | `AI_PROVIDER=disabled`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` opcional só origem autorizada por operador, `AI_MODEL`, `AI_ALLOWED_MODELS`, `AI_MAX_INPUT_TOKENS`, `AI_MAX_OUTPUT_TOKENS=1024`, `AI_MAX_STEPS=3`, `AI_TIMEOUT_MS=60000`, `AI_REQUESTS_PER_HOUR=20`, `AI_MAX_CONCURRENT=2`, `AI_DAILY_TOKEN_BUDGET=100000` |
| Logs | `LOG_LEVEL=info`, `SERVICE_NAME`, `LOG_FORMAT=json`; sem flag de logar prompts como default |
| Sentry | `ERRORS_PROVIDER=disabled`, `SENTRY_DSN` server/worker, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`; `NEXT_PUBLIC_SENTRY_DSN` só se client opt-in definido; `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` apenas upload CI opcional |
| PostHog | `NEXT_PUBLIC_ANALYTICS_ENABLED=false`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_CONSENT_VERSION`; documentar chave pública de ingestão versus segredo administrativo que não existe no cliente |
| Segurança/SEO | `RATE_LIMIT_ENABLED=true`, `RATE_LIMIT_HASH_SECRET`, `TRUSTED_PROXY_CIDRS`, limites por operação definidos no módulo/receita, URL pública canônica já existente (não duplicar `APP_URL`), `SEO_INDEXABLE=false` em preview |

Completar `.env.example` cumulativamente com todos ramos das fases anteriores, comentários de dependência e receitas específicas AWS/S3 compatível, SMTP/Resend, OpenAI/PostHog/Sentry. Nenhum segredo de provedor é exigido quando ramo está desligado; segurança básica/DB não é opcional por ausência de provedor. `OPENAI_BASE_URL` não é entrada do usuário e exige validação/allowlist para não virar SSRF ou exfiltração de chave. Garantir que flags públicas e privadas não divergem em build/runtime e documentar rebuild quando necessário.

**Provas planejadas do owner:** testes integração DB reais de quota concorrente, revogação tool e rate limit multiinstance; teste de redaction com sentinelas; inspeção browser de stream/cancel, consentimento/rede, CSP e SEO. Fixtures só em DB autorizado, com limpeza de dados próprios. Definir comandos reais após arquivos existirem e executar uma rodada integrada após implementação completa, não durante edição de agentes. Nenhum build/test executado neste planejamento.

**Encerramento e pendências:** cada requisito recebe evidência real, comando/ambiente/data e limitação. **Smoke externo OpenAI, PostHog e Sentry quando habilitado PENDENTE POR DECISÃO DO USUÁRIO**, apenas fechamento após implementação completa; pedir contas/autorização só nesse gate, dados sintéticos mínimos, custo explicitado. Não encerrar AI-01/02, ANALYTICS-01 ou captura externa OBS-01 por mocks, imports, typecheck, SDK desativado ou evento local. Handoff fase 8 preserva pendência e não anuncia release verificado enquanto faltar prova exigida.
