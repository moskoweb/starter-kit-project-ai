# Cycle 1 — queues, webhooks, worker

Escopo lido: todos os fontes de `packages/events/src`, `packages/jobs/src`, `packages/webhooks/src` e `apps/worker/src`, mais testes existentes para entender contratos. Nenhum teste/build executado; owner valida.

## Achados

- **Webhook retry em falha de entrega**: `webhookHandler` mantém falhas retryable em `pending`, mas `relayWebhookDeliveries` só reenfileira após `next_at`; após enviar, status vira `queued` por 15 min. Comportamento recuperável por polling, porém atraso fixo de 15 min domina o backoff de 30s–24h do handler. Mensagem pg-boss rejeitada também aborta transação inteira, preservando estado para retry posterior. Sem perda do registro.
- **Webhook stable ID e assinatura**: `deliverWebhook` assina bytes exatos do envelope JSON, usando `row.id` e `row.created_at` como ID/data estáveis entre tentativas; timestamp da assinatura é por tentativa. Correto para deduplicação e janela anti-replay.
- **SSRF**: destino exige HTTPS, hostname allowlist, sem user/pass ou porta não padrão; DNS A/AAAA resolvido e todos endereços precisam ser IP unicast público; request fixa lookup aos endereços aprovados, sem redirect configurado. Não identifiquei bypass evidente no código lido.
- **Events relay**: `sendJob` e atualização outbox ocorrem no mesmo Postgres transaction via savepoint. Erro de dispatch reverte savepoint e salva estado retry/backoff na transação externa; `dispatched` volta a ser elegível depois de 15 min se fila não completar. Worker valida envelope contra outbox e usa transação serializable. Sem necessidade aparente de schema adicional.
- **Jobs config**: `JOBS_ENABLED=false` retorna `null` antes de exigir `DATABASE_URL`; modo opcional não exige credenciais. `startJobs` falha explicitamente se invocado desabilitado.
- **Worker shutdown**: `startWorker` possui parada graceful idempotente e deadline; relay standalone só aborta loop e aguarda `boss.stop`/fechamento DB. Não encontrei espera/cancelamento de operação relay em curso, mas stop é chamado após loop concluir.

## Correção

`createDelivery` agora valida `WEBHOOKS_OUTBOUND_ENABLED` (`true`/`false`) e recusa enfileirar quando desabilitado, antes de exigir configuração/segredos. Evita gravar entregas que não podem ser processadas quando integração está explicitamente desligada.

## Pendência operacional

Verificar decisão de produto para janela de 15 minutos de leases `dispatched`/`queued`: polling recupera registros após lease, mas recuperação pode demorar. Nenhuma migration solicitada ou adicionada.