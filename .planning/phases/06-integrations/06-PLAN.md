---
phase: "06"
plan: "01"
type: execute
wave: 1
depends_on: ["02", "03", "04"]
requirements: [STORE-01, NOTIF-01, JOB-01, HOOK-01, HOOK-02]
autonomous: true
---

# Fase 06 — Storage, notificações, jobs e webhooks

## Contrato de execução

Ler PROJECT, REQUIREMENTS, 06-CONTEXT e handoffs de identidade/painéis/resources. Caminhos abaixo são destinos propostos: adaptar nomes às exportações finais, sem segunda convenção de auth, config ou DB. Planejamento somente; nenhum comando deste plano foi executado. Worker genérico escreveu plano; não alegar planner/checker tipado ou revisão independente.

Reutilizar migrations Drizzle, `schema.ts`, `getDb/getSql/closeDb` e transação autorizada da fase 2. Todas tabelas de integração com dados de usuário preservam contexto pessoal ou tenant, UUIDs canônicos, FKs/índices, policies RLS e grants mínimos. Config e SDKs server-only/lazy; cliente recebe DTO explícito. Não criar providers/classes abstratos.

## 1. Tracer durável: ação autorizada gera notificação — JOB-01, NOTIF-01

**Arquivos/fronteiras:** `apps/worker/{package.json,tsconfig.json,src/index.ts}`, pacote compartilhado concreto `packages/core/src/{jobs,notifications}.ts` apenas se necessário entre executáveis; `packages/db/src/integration-schema.ts`, agregador/migrations; app actions/list/read de notificações e páginas registradas no registry; root scripts/turbo e lockfile.

1. Confirmar tipos e export de `pg-boss@12.38.2` instalado e PostgreSQL efetivo >=13; pin exato. Adicionar comando explícito de provisionamento schema pg-boss com role de migração e configuração documentada. Web/worker iniciam sem DDL; migration ausente gera diagnóstico, não criação silenciosa. Runtime worker tem acesso a filas necessárias, não credencial de migration.
2. Escolher evento real do resource (projeto criado) e produzir job em **mesma transação** da mutação. Usar integração transacional oficial pg-boss/Drizzle confirmada no pacote; se não suportar driver instalado, usar outbox Drizzle transacional e relay worker para pg-boss com chave única e marcação após enqueue. Não fazer commit seguido de `send` sem outbox: crash perderia evento. Não trocar driver nem inventar assinatura de adaptador.
3. Envelope validado/versionado: tipo allowlisted, eventId, actorUserId, contexto pessoal/organizationId, entityId, correlationId. Sem cookies, tokens, prompt ou credenciais. Producer determina contexto, nunca body cliente. Worker resolve evento e entidade persistidos; revalida usuário ativo/membership/permissão na transação da execução. Evento de sistema usa handler explícito com política limitada. Revogação marca resultado negado/cancelado auditável, sem retentativa infinita.
4. Notificação persistida com recipientUserId, contexto, eventId, tipo, conteúdo mínimo seguro, createdAt/readAt e unicidade `(eventId, recipientUserId)`. Inserção e marcador de efeito em uma transação. Reexecução após crash não duplica notificação. Destinatário calculado por regra do evento, não arbitrário pelo cliente.
5. Worker registra error handler antes de start, cria filas por provisionamento/rotina controlada, trabalha lotes limitados, usa retryLimit=5/retryDelay=10/retryBackoff=true e timeout de job explícito. SIGTERM para novas aquisições, drena com prazo e fecha DB; falha não engolida, job fica recuperável. Expor health/readiness sem segredos e scripts reais `dev/build/start` independentes; sem consumidor no Next.js.
6. UI reaproveita dropdown/list/table/paginação da fase 3: unread count real, loading/empty/error, marcar individual ou todas próprias com transação e filtros de destinatário/contexto. Outra pessoa não pode ler/marcar por troca de UUID; usuário não altera payload/destinatário.

**Gate tracer do owner:** app grava projeto e evento, worker parado mantém pendente; reiniciar worker cria exatamente uma notificação persistida; repetir job conserva uma linha; recipient lê/recarrega/marca lida, outro usuário não. Não expandir integração antes desse fluxo real.

## 2. Objetos S3 privados — STORE-01

**Arquivos/fronteiras:** `apps/app/src/lib/storage.ts`, endpoints storage initiate/complete/download no router existente, UI de anexo do resource, integration-schema/migration, config/env e `.env.example`; SDK `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/s3-request-presigner` com versões compatíveis pinadas após leitura de tipos.

1. Metadata: id, escopo/owner, resourceId autorizado, chave aleatória server-side, tamanho/tipo esperados, estado pending/ready, timestamps/expiração. Nome original tratado como texto, nunca chave/path; default máximo 10 MiB, allowlist image/png,image/jpeg,application/pdf, sem SVG/HTML executável. Validar UUID, MIME, tamanho e permissão em initiate; limitar pendentes/bytes por escopo no DB.
2. Gerar POST assinado 60s com bucket/chave fixos e conditions de tipo e `content-length-range`; bucket privado e sem ACL pública. CORS só origens configuradas, sem wildcard de credenciais. Documentar compatibilidade POST exigida; não enfraquecer limite com PUT que só confia no tamanho declarado pelo cliente.
3. Complete verifica novamente permissão, metadata pending e HEAD real (tamanho/tipo/chave); incompatível não vira ready, agenda limpeza idempotente. Não anunciar MIME como proteção de conteúdo; downloads via attachment e tipos seguros. Limpeza de pending expirado por worker e lifecycle para órfãos, com prefixo exclusivo e prazo documentado; não deletar objetos fora do prefixo gerado.
4. Download reautoriza resource e metadata ready a cada solicitação, retorna GET presign 60s e `Cache-Control: private,no-store` na resposta da aplicação. URL é bearer até expirar: documentar impossibilidade de revogar imediatamente. Cliente não fornece endpoint/bucket/chave; não persistir URLs assinadas nem incluí-las em logs.

**Gate:** upload/download real autorizado, objeto oversized/MIME indevido negado pelo storage e servidor, complete forjado falha, troca de id cross-owner/cross-tenant falha, pending/órfãos limpos sem apagar ready. S3 externo aguarda gate final; prova local compatível deve identificar servidor real usado, sem alegar AWS validada.

## 3. Entrada assinada e idempotente — HOOK-01

**Arquivos/fronteiras:** `apps/app/src/app/api/webhooks/inbound/[endpointId]/route.ts`, módulo local webhooks, integration-schema/migration, config/env/docs; não capturar rota auth/painéis.

1. Endpoint provisionado por operador associa ID público, segredo e contexto/recurso permitido. Não tomar tenant/owner do payload como autoridade; sem endpoint universal de escrita. Contrato JSON estrito com evento `notification.requested`, recipient permitido e externalEventId limitado, sem campos extras.
2. Antes de parse/DB, limitar body a 256 KiB inclusive stream/chunked, ler bytes exatos, exigir timestamp dentro de 5 min e HMAC SHA-256 de `timestamp + '.' + rawBody`; aceitar apenas formato/encoding fixos, usar `timingSafeEqual` com tamanho validado. Rotação com chave atual/anterior explícita e prazo, sem logar assinatura/segredo/body. Desabilitado responde 404 sem inicializar provedor.
3. Transação grava recibo único `(endpointId, externalEventId)` com hash do body e efeito/job/outbox. Repetição de mesmo evento/body retorna sucesso anterior, conflito de mesmo ID com body diferente rejeita sem efeito. Concorrência usa unique constraint, não SELECT seguido de INSERT desprotegido. Assinatura inválida/payload inválido não grava efeito. Responder 2xx só após commit durável; falha transitória 5xx permite remetente tentar novamente.

**Gate:** assinatura válida altera uma vez; duplicatas concorrentes e crash/retry mantêm único efeito; bytes alterados, timestamp expirado, ID conflitante, body grande ou contexto forjado não alteram domínio.

## 4. Saída durável e segura — HOOK-02

**Arquivos/fronteiras:** módulo compartilhado jobs/webhooks, `apps/worker/src/handlers/webhooks.ts`, schema de subscriptions/events/deliveries/attempts e migrations, tela autorizada de status/retry no painel, config/docs.

1. Destinos e segredos provisionados por operador autorizado no contexto; UI não permite que qualquer membro transforme servidor em proxy. Mutation real de resource gera evento+delivery/outbox atômicos; corpo versionado allowlist sem auth/colunas privadas. UUID de entrega permanece igual em retries; unique `(eventId, subscriptionId)`.
2. Worker aplica política SSRF do CONTEXT **a cada tentativa**. Usar biblioteca/agent instalado com lookup/conexão fixada ao IP aprovado e hostname TLS original; confirmar API antes de escolher dependência. Bloquear redirects, proxies ambientais não controlados, IPs IPv4/IPv6 privados/mapeados/reservados, credenciais URL e DNS misto público/privado. Não substituir controle por regex de hostname. Timeout total 10s, resposta lida até 64 KiB; nunca guardar body de resposta por padrão.
3. Assinar bytes serializados estáveis com HMAC SHA-256, cabeçalhos deliveryId/timestamp/signature; segredo individual, fora do job e log. Registrar attempt/status/código HTTP/erro seguro/duração/próximo retry, não URL query secreta nem payload.
4. 2xx conclui; erro de rede/timeout, 408,429,5xx retentam com backoff/jitter e Retry-After limitado; demais 4xx falham terminalmente. Máximo cinco tentativas, TTL de 24h, falha final visível. Reenqueue manual exige permissão, preserva deliveryId e histórico, não oculta risco de efeito duplicado no receptor. Um mecanismo controla retries; não multiplicar retry HTTP com retry da fila sem contagem única persistida.

**Gate:** receptor real controlado comprova assinatura e deliveryId, falhas transitórias/reinício retentam, terminal fica visível; timeout e body enorme limitados; redirects, localhost, metadata, IPv6 privado e DNS rebinding bloqueados antes da conexão. Teste de receptor local exige override exclusivo de ambiente de teste, nunca produção.

## 5. Ambiente, docs e evidências

**Arquivos:** `.env.example`, config/env canônico, docs existentes de desenvolvimento/deploy/integrações, `apps/app/tests/integrations.integration.test.mjs` e testes do worker conforme runner entregue. Não criar framework novo só para testes. Cada variável documenta consumidor, default, condição e segredo; nenhum valor real.

| Ramo | Variáveis propostas; ajustar nomes ao contrato canônico |
|---|---|
| Jobs | `JOBS_ENABLED=false`, `JOBS_DATABASE_URL` opcional herdando DATABASE_URL, `JOBS_SCHEMA=pgboss`, `WORKER_CONCURRENCY`, `WORKER_SHUTDOWN_TIMEOUT_MS`; role de provisionamento separada, nunca exposta ao app |
| Storage | `STORAGE_ENABLED=false`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_SESSION_TOKEN` opcional, `S3_ENDPOINT` só compatível, `S3_FORCE_PATH_STYLE=false`, `S3_ALLOWED_ORIGINS`, `STORAGE_MAX_BYTES=10485760`, `STORAGE_PENDING_MAX_BYTES`, `STORAGE_PENDING_MAX_COUNT`; AWS pode usar cadeia IAM em vez de chaves estáticas |
| Hooks | `WEBHOOKS_INBOUND_ENABLED=false`, `WEBHOOKS_OUTBOUND_ENABLED=false`, `WEBHOOK_INBOUND_SECRET`, `WEBHOOK_INBOUND_PREVIOUS_SECRET` opcional/expiração, `WEBHOOK_OUTBOUND_SECRET`, `WEBHOOK_ALLOWED_HOSTS`, `WEBHOOK_TEST_ALLOW_PRIVATE=false`; exemplo referência único, assinatura por endpoint/subscription no provisionamento, sem segredo no DB em claro |

Se segredos específicos forem persistidos para múltiplos endpoints/subscriptions, definir referência a secret manager ou criptografia autenticada server-side com chave dedicada `WEBHOOK_SECRETS_ENCRYPTION_KEY` antes de migration; nunca inventar placeholder de integração. Branches desligados não exigem essas chaves. Hooks/jobs dependentes habilitados sem fila configurada falham cedo; não cair em execução síncrona fake.

**Provas planejadas para owner após implementação:** PostgreSQL real de teste autorizado; matriz pessoal/A/B, revogação, rollback de enqueue, dois workers concorrentes, kill/restart, duplicate effect, pool reutilizado e migrations repetidas por comando separado. Exercitar UI com teclado/mobile e requests diretos. Testes criam/limpam só fixtures próprias em DB de teste autorizado e recusam ausência de consentimento; não limpar DB compartilhado. Rodada única integrada após agentes encerrarem, com comandos reais definidos na implementação e resultados registrados; sem builds/tests neste planejamento.

**Encerramento:** rastrear cada STORE/NOTIF/JOB/HOOK por evidência e limitações; docs registram instalação sem contas, schema pg-boss versus Drizzle, roles, CORS, quotas, semântica de entrega, replay, SSRF, worker e recuperação. **Smoke externo S3/webhooks PENDENTE POR DECISÃO DO USUÁRIO até fechamento após implementação completa.** Não solicitar credenciais agora, não substituir por mocks, não marcar requisitos externamente verificados antes da prova real. Handoff fase 8 conserva gate aberto.
