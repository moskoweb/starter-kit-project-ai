# Receita: API pública com chaves e escopos

Estado do kit: sem API pública versionada nem chaves de API. Autenticação existente é a sessão Better Auth, voltada a navegador. Esta receita cobre uma API `/api/v1` para integrações máquina a máquina, com chaves por tenant, escopos, limite de taxa, idempotência e OpenAPI.

O Better Auth tem plugin de API keys. Avalie-o **antes** de implementar do zero. Esta receita descreve os requisitos que qualquer solução precisa cumprir, inclusive o plugin.

Não adote se o produto não tem integrações externas.

## Modelo de dados

```text
api_key
  id, organization_id, name
  key_prefix text UNIQUE      (primeiros ~20 chars, para localizar)
  key_hash text               (hash da chave completa)
  scopes text[]               (lista fechada; vazio NÃO significa tudo)
  status: active | revoked
  last_used_at, expires_at, revoked_at, rotated_at, replaced_by_id
  created_by_user_id, created_at
```

- RLS por tenant. Gere com `vibe resource`, com a chave exibida **uma única vez** na criação.
- Formato da chave: prefixo identificável mais parte aleatória de 32 bytes em base64url (por exemplo `sk_live_<random>`). Prefixo ajuda scanners de segredo (GitHub, hook de commit) a detectar vazamento.
- **Escopos vazios não devem significar "todos".** Isso é um padrão perigoso do produto original (chave "admin" implícita). Exija escopos explícitos e um escopo próprio para administrar chaves.
- Rotação cria nova chave e liga `replaced_by_id`. Revogação é imediata.

## Hash e verificação

- A chave tem alta entropia, então um hash rápido com segredo (HMAC-SHA-256 com pepper do servidor) ou `scrypt` é adequado. Não use hash reversível nem guarde a chave.
- Compare com `timingSafeEqual`.
- Localize por `key_prefix` e verifique **todos** os candidatos. Prefixos de formatos antigos e novos podem colidir.
- `scrypt` por requisição é caro. Se o volume for alto, use HMAC e/ou cache curto em memória do resultado positivo, invalidado na revogação.
- Pepper em variável de ambiente separada da chave de cifra de segredos. Rotação do pepper invalida chaves: planeje.

## Autenticação da requisição

Ordem recomendada:

1. Extrair `Authorization: Bearer`.
2. Localizar candidatos por prefixo, filtrando ativos e não expirados.
3. Verificar o hash.
4. Validar escopos da chave contra a lista fechada.
5. Aplicar limite de taxa por chave.
6. Executar a operação **no escopo do tenant da chave** (RLS).
7. Atualizar `last_used_at` de forma não bloqueante, com falha apenas logada.

Cuidados:

- A busca pré-tenant por prefixo é a **única** consulta que precisa enxergar chaves de todos os tenants. Faça-a com função `SECURITY DEFINER` estreita (ou papel dedicado) que devolve apenas `id`, `tenant`, `hash`, `scopes`, `expires_at`. O runtime web não deve ganhar bypass de RLS por causa disso.
- Resposta de erro **neutra**: 401 genérico para chave ausente, inválida ou expirada. 403 para escopo insuficiente. 404 para recurso inexistente **ou de outro tenant**, sem distinguir.
- Rate limit por chave, não por IP. Reaproveite `enforceRateLimit` do kit (janela fixa em Postgres, com HMAC da chave de escopo). Retorne `429` com `Retry-After`.
- Nunca registre a chave. Registre `apiKeyId`.

## Contrato da API

- Envelope: `{ data, meta: { requestId, timestamp } }`. Erros: `{ error: { code, message }, meta }`. Listas com `meta.pagination` (`page`, `perPage` de 1 a 100, `total`, `totalPages`) ou paginação por cursor para tabelas grandes.
- Sempre devolva `X-Request-Id` e use o mesmo id nos logs.
- IDs de caminho são UUID do recurso. Valide formato e consulte no escopo do tenant.
- Valide corpo com Zod estrito. Rejeite campos desconhecidos.
- Versione no caminho (`/api/v1`). Mudanças incompatíveis vão para `/v2`.
- Cada operação declara seu escopo (`<recurso>_read`, `<recurso>_write`, escopos de ação). O escopo e o contrato vivem **na mesma fonte** do OpenAPI.

### Idempotência

Operações que criam efeito (enviar mensagem, criar cobrança) aceitam `Idempotency-Key`:

- Repetir a mesma chave no mesmo recurso devolve a operação já registrada.
- Reutilizar a chave em outro recurso é `409`.
- Guarde a chave com índice único por `(tenant, recurso, chave)` e o resultado ou referência.
- Expire chaves antigas por job.

### OpenAPI e documentação

- Gere o OpenAPI de **uma fonte única** (esquemas Zod via gerador, por exemplo `zod-openapi`, ou arquivo mantido junto às rotas) e publique `/openapi.json`.
- UI interativa (Scalar ou similar) em `/docs`. Se o produto tem usuários não técnicos, esconda atrás de autenticação.
- Teste de contrato: toda rota registrada aparece no OpenAPI com escopo declarado, e todo escopo do OpenAPI existe na lista fechada. Falha o CI se divergir.
- O arquivo OpenAPI gigante (mais de 1.700 linhas no produto original) é sintoma de manutenção manual. Prefira gerar.

## Webhooks de saída

O kit já tem `@vibe/webhooks` (assinatura HMAC com timestamp, rejeição de destino interno, entrega via jobs). Para expor webhooks configuráveis pelo tenant na API:

- `POST /api/v1/webhooks` com `url`, `secret`, `eventTypes`, `status`, `retryPolicy`. Segredo cifrado e nunca devolvido.
- **Catálogo fechado e versionado de eventos** (`contact.created`, versão `v1`). Envelope mínimo: `eventId`, `type`, `version`, IDs da entidade, timestamp e lista de campos alterados. **Sem** corpo de mensagem, sem campos livres, sem segredos.
- Destino validado contra SSRF na escrita **e** antes de cada envio. Sem seguir redirects. HTTPS em produção.
- Assinatura sobre o corpo bruto, com timestamp: `HMAC(secret, "<timestamp>.<eventId>.<corpo>")`. Receptor valida janela de tempo e usa `eventId` como chave de idempotência. Retries preservam o `eventId`.
- Entrega concluída só com `2xx`. Retry com backoff e limite (por exemplo 6 tentativas).
- Histórico de entregas e tentativas **sem payload** e sem segredo: status, código HTTP, duração, erro sanitizado, próxima tentativa.
- Outbox transacional: o evento nasce na mesma transação da mudança (`enqueueEvent`). Job de recuperação reprocessa entregas presas.

## Interface

- Painel de chaves: criar (mostrar a chave uma vez, com aviso), listar (prefixo, escopos, último uso, expiração), rotacionar, revogar. Confirmação nas ações destrutivas.
- Painel de webhooks com teste de envio e histórico.
- Auditoria de criação, rotação, revogação e mudança de escopo ([AUDIT-LOG](AUDIT-LOG.md)).

## Checklist de aceite

- [ ] Chave nunca é armazenada nem logada. Só aparece na criação ou rotação.
- [ ] Chave expirada, revogada, com escopo inválido ou malformada retorna 401 neutro.
- [ ] Escopo insuficiente retorna 403. Recurso de outro tenant retorna 404.
- [ ] Rate limit por chave funciona entre réplicas e devolve `Retry-After`.
- [ ] Idempotência: repetição devolve o mesmo resultado, reuso indevido retorna 409.
- [ ] Toda rota está no OpenAPI com escopo, verificado por teste.
- [ ] Webhook para IP privado, localhost, metadata e redirect é recusado.
- [ ] Entrega duplicada do mesmo `eventId` não duplica efeito no receptor de exemplo.
- [ ] Revogar chave encerra sessões MCP ligadas a ela.
