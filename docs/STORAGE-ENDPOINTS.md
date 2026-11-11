# Endpoints de storage

Storage API usa `@vibe/storage` e `@vibe/db`. `STORAGE_ENABLED` ausente ou `false` retorna 404; credenciais S3 permanecem server-only. Bucket privado e CORS POST na origem do app obrigatórios. POST exige `Origin` exatamente igual à origem de `BETTER_AUTH_URL`, sem fallback para host do request; configuração inválida retorna 500. Ambos POST leem JSON por `readJsonLimited`, limite real de stream 2048 bytes (413 excedido, 400 JSON/MIME inválido). Ver [STORAGE.md](./STORAGE.md) para configuração/provedor.

## Initiate — POST `/api/storage`

Body estrito: `{ tenantIdentifier: string | null, projectId: UUID, contentType, size }`. `tenantIdentifier: null` significa projeto pessoal; organização exige identificador não vazio. MIME aceito segue allowlist `@vibe/storage`, tamanho 1..10 MiB. Revalida sessão/membership/policy `create` e projeto em `withAuthorizedProjects`, gera key UUID server-side, persiste pending com owner/org/project, MIME/size e expiração 5 minutos. Cota no escopo autorizado: cinco uploads pending e 50 MiB por user sob advisory transaction lock. Resposta inclui signed POST `url`, `fields`, `method: "POST"`, `expiresAt` ISO 8601 string, `object` (`key`, `bucket`, `namespace`, `namespaceId`, `contentType`, `size`) e metadata `id`. Client manda todos fields em FormData com `file` por último e então chama complete. Resposta `private, no-store`.

## List — GET `/api/storage?projectId=UUID[&tenantIdentifier=...]`

Revalida contexto de projeto com policy `read` e lista até 100 registros pending não expirados ou ready; não revela key/bucket. Resposta `{ items: [{ id, projectId, contentType, size, status, createdAt }] }` usa camelCase; `createdAt` serializa Date como ISO 8601 string. Para projeto pessoal omitir tenantIdentifier; vazio inválido. Pending aparece como pendente.

## Complete — POST `/api/storage/:id/complete`

Body estrito `{ tenantIdentifier: string | null }`, identificador não vazio. Revalida policy `update`, exige owner, pending não expirado, projeto no tenant consultado. Lock do registro e leitura/atualização de metadata ficam no mesmo contexto transacional autorizado. S3 HEAD precisa coincidir exatamente com tamanho e Content-Type; divergência retorna `UPLOAD_MISMATCH` e mantém pending para limpeza autorizada por policy `delete`, sem apagar com permissão apenas de update. Revalida prazo após HEAD com relógio atual do banco antes de marcar ready. Resposta `{ id, status: "ready" }` validada pela UI.

## Download — GET `/api/storage/:id/download[?tenantIdentifier=...]`

Revalida policy `read`, consulta ready e projeto no mesmo escopo; responde `{ url, expiresAt }`, com `expiresAt` ISO 8601 string, URL GET assinada attachment/no-store. Client nunca recebe credenciais nem key nesta operação. Schemas de initiate/download na UI conferem contratos nomeados do pacote storage.

## Limpeza de uploads expirados

`apps/app/src/lib/storage-cleanup.ts` exporta `cleanupExpiredStorageUploads(headers, tenantIdentifier)`, sem execução automática ou endpoint. Chamada explícita exige sessão e policy `delete`; transação instala somente escopo pessoal/tenant autorizado, sem bypass global. Processa até 100 pending expirados com `FOR UPDATE SKIP LOCKED`. Para cada metadata resolve namespace pelo owner/org persistido; `deleteObject` valida prefixo aprovado e UUID da key antes de contactar S3. Apaga metadata somente após delete S3 bem-sucedido. Falha interrompe/rollback e mantém metadata para nova chamada; nenhum fallback de sucesso. Chamadas repetidas drenam lote. Objetos sem metadata não são varridos.

## Schema / integração

`packages/db/src/storage-schema.ts` define FK owner/org/project, RLS equivalente ao scope pessoal/tenant usado por projects, membership check, limite SQL de tamanho e enum textual status. `packages/db/src/schema.ts` agrega schema. Não há migration neste escopo: owner deve gerar/aplicar migration antes de habilitar rotas. `apps/app` depende de `@vibe/storage`. Smoke S3 real permanece necessário; nenhum build/test foi executado.
