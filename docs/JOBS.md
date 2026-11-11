# Jobs duráveis e worker

## Estado da entrega

`@vibe/jobs` fornece produtor transacional, validação de envelope, provisionamento explícito e registro de callbacks. `@vibe/worker` fornece processo Node separado com encerramento controlado. **Nenhum handler de negócio é registrado por padrão.** Iniciar sem módulo de registro falha; não consome nem conclui jobs com noops.

Notificação persistida, autorização no momento da execução, entrega HTTP/SSRF, histórico de tentativas e seus schemas dependem dos módulos de integração da fase 6. Permanecem pendentes até conexão de callbacks reais e prova integrada. Estes utilitários não encerram JOB-01, NOTIF-01 ou HOOK-02. Nenhum install, build, teste, provisionamento ou smoke foi executado nesta implementação. Smoke externo permanece pendente por decisão do usuário.

## Dependência e ambiente

pg-boss fixado em **12.38.2**, PostgreSQL >=13, Node conforme engine da raiz (>=22.23.0). Não há Redis nem fila própria. Pacotes novos exigem instalação consolidada/lockfile pelo responsável da integração.

| Variável | Consumidor | Regra |
|---|---|---|
| `JOBS_ENABLED` | web/worker | `false` por padrão; somente `true`/`false`. Desligado não exige banco nem abre conexão. Processo worker exige `true`. |
| `DATABASE_URL` | web/worker | PostgreSQL com role runtime DML não administrativa e não owner do schema `pgboss`. Obrigatória somente ao habilitar jobs. |
| `JOBS_MIGRATION_DATABASE_URL` | comando provision | Credencial dedicada owner do schema da fila. Obrigatória somente neste comando; nunca injetar no web/worker. Não usa fallback para DATABASE_URL. |
| `JOBS_RUNTIME_ROLE` | comando provision | Nome da role runtime já existente, diferente do provisionador, sem superuser/CREATEDB/CREATEROLE; identificador minúsculo até 63 caracteres. |

Schema fixo: `pgboss`. Web/worker usam `migrate:false`, `createSchema:false`, `reindex:false`, `schedule:false`, `persistQueueStats:false`; não chamam `createQueue`. Supervisão mantém recuperação de leases e retenção, sem reconstrução de índices. `startJobs` verifica schema existente e rejeita role administrativa/owner ou com privilégios herdados de owner. Não usar `boss.start()` diretamente no runtime. Isso não substitui provisionamento seguro das roles: runtime não deve herdar outras roles privilegiadas nem ter CREATE em schema/banco.

## Provisionamento separado

Injetar variáveis por mecanismo de segredos do ambiente, sem incluir URL em comando/log. Com role runtime já criada:

```sh
pnpm --filter @vibe/jobs provision
```

Comando instala/atualiza schema próprio pg-boss e cria filas `notification` e `webhook-delivery` com partição por fila desabilitada. Concede USAGE no schema, DML nas tabelas e uso/leitura de sequências à role runtime; não concede propriedade, CREATE ou TRUNCATE. Reexecutar provisionamento após upgrades/mudanças de filas aplica grants aos objetos atuais. Schema da aplicação continua no fluxo Drizzle separado. Não chamar este comando no startup de app/container worker.

Runtime da fila é fronteira de serviço: role com DML no schema da fila pode ler jobs de vários usuários. Não expor conexão/SQL arbitrário a clientes; envelope não é autorização. Administrador deve limitar acesso ao processo e aos segredos. Concessões da aplicação/RLS continuam independentes.

## Produção atômica com postgres.js

Escolha: **adaptador transacional oficial `Db.executeSql`**, sem outbox adicional. API real `boss.send(name, data, { db })` recebe adaptador retornando `{ rows }`; `postgresTransactionAdapter` executa texto/valores parametrizados via `transaction.unsafe(text, values)` no `TransactionSql` fornecido pelo callback `sql.begin`. Não é integração Drizzle inventada e não troca driver.

```ts
import { createJobs, startJobs, sendJob } from "@vibe/jobs";

const boss = createJobs(() => { /* sinalizar falha sem logar erro bruto */ });
if (boss) await startJobs(boss);
// sql vem do cliente postgres.js canônico; autorização e contexto RLS são do domínio.
await sql.begin(async (transaction) => {
  // Executar mutação/autorização usando ESTA transação.
  // Drizzle pode ser ligado à mesma TransactionSql, não abrir outra transação.
  if (boss) await sendJob(boss, transaction, envelope);
});
// Encerrar boss no lifecycle da aplicação.
```

`sendJob` exige envelope v1 estrito: `type` (`notification` ou `webhook`), UUIDs `eventId`, `actorUserId`, `entityId`, `correlationId`, contexto `{kind:"personal"}` ou `{kind:"organization",organizationId}`. `entityId` de webhook identifica entrega persistida; dados/destino/segredo são buscados pelo handler. Contexto sempre derivado no servidor. Nunca incluir token/cookie/segredo/payload HTTP no job. Campos desconhecidos são rejeitados.

Await de enqueue deve ocorrer antes de sair do callback da mesma transação da mutação; rollback desfaz ambos. Não fazer commit seguido de `send`, não passar pool `sql` como transação, não usar transação Drizzle separada. Falha de enqueue aborta mutação. Ausência de ID é erro, não sucesso silencioso. Enqueue não faz dedupe de negócio: unicidade por evento/efeito deve existir no DB de domínio.

## Conexão de handlers reais

Criar módulo de registro pertencente à aplicação/integração; não a entrada de usuário. Exportar `handlers: JobHandlers` e, quando abrir pools próprios, `closeConnections: () => Promise<void>`.

Contrato exato:

```ts
type JobHandler = (
  envelope: JobEnvelope,
  job: { id: string; retryCount: number; signal: AbortSignal },
) => Promise<void>;
type JobHandlers = Partial<Record<"notification" | "webhook", JobHandler>>;
```

Owner pode registrar `handlers = { webhook: deliverWebhook }`, importando callback real da integração. Não registrar `notification` enquanto contrato DB/autorização/efeito idempotente não existir. Alternativamente importar `startWorker(handlers, closeConnections)` de `apps/worker/src/index.ts` em entrypoint concreto.

Handler resolve evento/entidade persistidos, revalida usuário/membership/permissão e aplica contexto RLS na transação da execução. Revogação deve registrar negação terminal auditável, não sucesso fictício nem retry infinito. Só resolver Promise depois do efeito/resultado durável. Erros transitórios rejeitam Promise. Usar `job.signal` para abortar IO quando lease encerrar. Idempotência é obrigatória porque crash pode ocorrer após efeito e antes de confirmação da fila.

Filas usam `retryLimit:5`, `retryDelay:10`, `retryBackoff:true`, `expireInSeconds:60`; cada aquisição traz lote 1 e concorrência local 2 por fila. `retryLimit:5` significa até cinco **retries além da tentativa inicial**. Integração webhook com teto de cinco tentativas totais/TTL de 24h deve aplicar contador/estado persistido único e concluir job após resultado terminal gravado; não multiplicar retry HTTP por retry da fila. Callback HTTP deve respeitar timeout total de 10s e política SSRF da fase 6. Esses comportamentos não são implementados pela fila.

## Comandos do processo

Após instalação consolidada, a partir de qualquer diretório, passar caminho **absoluto** do módulo de registro:

```sh
pnpm --filter @vibe/worker dev /absolute/path/to/registration.ts
pnpm --filter @vibe/worker build
pnpm --filter @vibe/worker start /absolute/path/to/registration.ts
```

`build` emite JS; `start` executa Node com loader `tsx` necessário às exportações TypeScript dos pacotes locais e módulo de registro. Distribuir workspace e dependências runtime junto ao artefato, não apenas `dist`. Não há consumidor no Next.js.

Erro de configuração/registro/schema ou startup retorna código não zero. Driver/import erros não são impressos crus para evitar segredos. Erro de fila/processo remove readiness e inicia encerramento; `SIGTERM`/`SIGINT` param aquisições e drenam via `boss.stop({graceful:true,timeout:30000})`, fechando pools do callback. Limite absoluto 35s encerra processo com erro se travado; deploy deve conceder pelo menos esse prazo. Job sem confirmação permanece sujeito à recuperação da fila, não promessa de exatamente uma execução.

API retornada por `startWorker`: `{ stop(): Promise<void>, isReady(): boolean }`. `worker_ready` só é emitido após start e registros; `isReady` vira false no encerramento/erro. Não há porta HTTP/health endpoint implícito. Supervisor deve tratar processo encerrado como indisponível; endpoint dedicado pode consumir API quando destino de deploy definir contrato.

## Verificação a executar pelo owner

Checks unitários: `pnpm --filter @vibe/jobs test`. Tipos: `pnpm --filter @vibe/jobs check-types` e `pnpm --filter @vibe/worker check-types`. Build: comando acima. Unitários não são evidência de durabilidade/entrega.

Com PostgreSQL real de teste e consentimento: provisionamento separado/repetido; runtime sem DDL e owner recusado; rollback de domínio+enqueue; reinício/lease expirado; dois workers concorrentes; efeito idempotente após crash; autorização revogada e matriz pessoal/tenants A/B. Só após callbacks reais conectar tracer de notificação/webhook e executar smoke externo autorizado. Não marcar integração pronta apenas por iniciar worker.

## Fontes da API

- [Tipos pg-boss no gitHead publicado de 12.38.2](https://raw.githubusercontent.com/timgit/pg-boss/fc78d0d95d4e62f0c3161e4da5b05e13408effe8/src/types.ts): `Db`/`IDatabase.executeSql`, `SendOptions.db`, `work`, retries e stop.
- [Implementação pública pg-boss](https://raw.githubusercontent.com/timgit/pg-boss/fc78d0d95d4e62f0c3161e4da5b05e13408effe8/src/index.ts): export nomeado `PgBoss`, BAM condicionado a `migrate`, APIs de runtime.
- Tipos locais `postgres@4.1.1`: `TransactionSql` e `unsafe(query, parameters)`.

Context7 não exposto nesta sessão; fontes primárias/versionadas e tipos do driver consultados diretamente. Compatibilidade documental não equivale a execução validada.
