# Operations

## Structured logs

Use `@vibe/observability` `logEvent` with approved fields only: `level`, `event`, `requestId`, `userId`, `tenantId`, `duration`, and `status`. Do not log raw errors, prompts, headers, credentials, or arbitrary request objects. User/tenant IDs are optional; include them only when permitted by deployment privacy policy.

OTLP/HTTP JSON export remains disabled by default. Enable with `OTEL_LOG_EXPORT_ENABLED=true` and `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://<trusted-collector>/v1/logs`. Exporter accepts HTTPS endpoints only, uses a 2-second timeout, and drops failed exports. This minimal fetch exporter is not a complete OpenTelemetry SDK or OTLP semantic-convention implementation.

Health e AI já usam `logEvent` e exportação opcional sanitizada. Cada request gera UUID próprio no servidor e expõe `X-Request-Id`; eventos contêm apenas `level`, `event`, `requestId`, `status` e `duration` em ms. `health_request` registra 200/503. `ai_request` registra status de entrega dos headers; `ai_stream_end`, `ai_stream_error` e `ai_stream_abort` registram ciclo do stream (499 representa cancelamento, não novo status HTTP após headers). Exportação dispara sem await e falha não interrompe resposta nem stream. Fire-and-forget não garante entrega após término de processo; coletor externo não foi exercitado.

## Analytics

Analytics remains disabled unless `NEXT_PUBLIC_ANALYTICS_ENABLED=true`, `NEXT_PUBLIC_POSTHOG_KEY`, and `NEXT_PUBLIC_POSTHOG_HOST` are configured. `AnalyticsConsent` also requires explicit browser decision stored as `analytics-consent=accepted`; call `setAnalyticsConsent(true)` only from a clear consent control. Denial is stored locally. The component is not mounted by this change; application owner must mount it only where appropriate. PostHog autocapture and person profiles are disabled; never send email or identify users.

When disabled, component makes no analytics network request. PostHog script and capture endpoint must use a trusted HTTPS host. Public variables are bundled client-side; key and host are not secrets.

## SEO and public origin

Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin. Sitemap includes homepage only; missing or invalid config produces an empty sitemap. Robots disallows app, administration, organization, account, auth, and API-auth paths. Never derive canonical URLs from the incoming Host header.

Homepage inclui JSON-LD `WebSite` somente quando `NEXT_PUBLIC_SITE_URL` é origem HTTPS válida, sem credenciais, caminho além de `/`, query ou fragmento. JSON escapa `<` antes de entrar no script. Dados publicados limitam-se a contexto/tipo Schema.org e origem pública; não incluem configuração do banco, sessão, tenant ou nome privado da aplicação.

## Security headers

`apps/app/src/lib/security/headers.ts` exports proposed baseline headers for integration by the configuration owner. CSP restricts scripts and connections to same-origin and permits inline script/style for Next compatibility; `unsafe-eval` is development-only. Set `S3_PUBLIC_UPLOAD_ORIGIN` to the exact HTTPS origin used for browser uploads; when analytics is enabled, configured `NEXT_PUBLIC_POSTHOG_HOST` origin is added. These origins are validated and no HTTPS wildcard is allowed. Development allows localhost websocket HMR. CSP is not XSS protection or strict CSP: strict CSP requires per-request nonce generation and propagation through Next rendering; that is not implemented. This module does not alter `next.config`.

## Provas pendentes de operação

Sem testes, build, instalação ou smoke nesta edição. Validação externa final deve verificar health 200/503, UUID/status/duração em logs e ausência de segredos; streaming AI real, cancelamento, 429 e erro sanitizado; exportação habilitada/desabilitada e coletor indisponível sem bloquear stream; JSON-LD com URL válida e ausência com URL inválida. Owner deve montar `AiAssistant` apenas com flag habilitada resolvida no servidor. Smoke com credenciais e provider autorizado é responsabilidade da validação final, não requisito para introduzir resposta simulada.
