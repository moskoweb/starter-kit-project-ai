# Ciclo 1 — serviços

## Escopo revisado

Leitura de todas fontes, testes, manifests e tsconfigs em `packages/{events,jobs,webhooks,storage,ai,email,observability}` e `apps/worker`, incluindo templates de email e isolamento do preview. Regras: `AGENTS.md` e skill `gsd-code-review`.

## Correções

- **Warning — corrida de shutdown:** `apps/worker/src/index.ts` podia emitir `worker_ready` após sinal recebido durante registro assíncrono dos handlers. Segunda checagem de `stopping` impede readiness falsa.
- **Warning — cleanup omitido:** ambos entrypoints de relay ignoravam fechamento das conexões de domínio e remoção de listeners se `boss.stop()` rejeitasse. Cleanup agora fica em `finally` interno.
- **Warning — limite de confiança:** `webhookHandler` exportado confiava no envelope tipado, ao contrário de `processEvent`; validação runtime agora exige envelope webhook v1 antes de abrir conexão.
- **Warning — backoff:** job duplicado antigo podia consumir tentativa e fazer HTTP antes de `next_at` de entrega pendente. Handler agora respeita prazo antes de reenviar; relay continua responsável por novo enqueue quando prazo vence.
- **Warning — redirecionamento HTTP:** Resend e exportação OTLP seguiam redirects implicitamente. `redirect: "error"` impede POST de conteúdo sensível para destino redirecionado.

## Evidência de revisão

- Webhook outbound resolve A/AAAA, rejeita qualquer endereço não público, fixa lookup ao conjunto validado, exige HTTPS/allowlist, não segue redirects e limita body/resposta/tempo.
- Outbox e enqueue compartilham transação física; consumidor events valida autoridade persistida, contexto, revogação e unicidade da notificação. Webhook usa row lock e delivery ID estável, sem prometer exactly-once sobre HTTP.
- Configurações AI/jobs ignoram credenciais quando desabilitadas; storage só exige configuração ao executar operação. AI limita prompt/tokens/steps e desabilita retries/telemetria. URLs de AI/S3/OTLP são configuração do operador, não entrada de request.
- Email render escapa texto, valida URL/OTP e possui checks de HTML/texto, URLs perigosas e loopback em produção. SMTP possui timeout e valida cabeçalhos/aceitação.
- Storage valida namespace, UUID de chave, MIME e tamanho; URLs curtas e download attachment. Chamador continua responsável por autorização e confirmação de metadata.

## Validação

Nenhum teste, build, lint, install, provisionamento ou migration executado nesta tarefa. Nenhum serviço reiniciado; nenhum commit/push.

Owner deve executar check-types dos pacotes e worker, testes jobs/webhooks/storage/AI/events e `pnpm exec tsx packages/email/src/render.check.ts`; integração events requer banco descartável provisionado. Exercitar shutdown durante registro e rejeição de `boss.stop()`, e job duplicado antes de `next_at` em fixture isolada. Testes existentes não cobrem essas duas corridas de ciclo de vida.

## Limites

Nenhuma alteração de schema/migration nesta ownership. Restrição única para webhook pessoal comunicada pelo owner DB; implementação e validação pertencem àquela ownership. Nenhuma alegação de integração externa real ou entrega exatamente uma vez.
