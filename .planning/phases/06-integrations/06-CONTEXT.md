# Fase 06 — Integrações duráveis

## Objetivo e limites

Cobrir STORE-01, NOTIF-01, JOB-01, HOOK-01 e HOOK-02 de REQUIREMENTS.md. PROJECT.md prevalece: integrações opcionais, Node/Docker, PostgreSQL/Drizzle, contexto pessoal sem organização fictícia e tenant autorizado. Este documento autoriza planejamento, não implementação. Nenhum código de integração, conta, segredo, migration aplicada ou teste executado nesta entrega.

## Decisões

- Fila: **pg-boss 12.38.2**, PostgreSQL já exigido pelo kit; Redis não será dependência. Registry consultado em 2026-11-11 informa Node >=22.12.0 e licença MIT; raiz exige Node >=22.23.0. README oficial exige PostgreSQL >=13. Fixar versão no momento da implementação e preservar licença. Compatibilidade documental não comprova runtime.
- API confirmada: `PgBoss`, `start`, `createQueue`, `send`, `work` com lote de jobs; opções `retryLimit`, `retryDelay`, `retryBackoff`, `expireInSeconds` e `singletonKey` presentes nos tipos do commit publicado. Dedupe da fila não substitui idempotência de negócio.
- Worker separado em `apps/worker`; app só produz jobs. Rotina web não inicia consumidor nem executa `setInterval` para imitar worker. Sem jobs habilitados, app inicia sem processo worker nem conta externa.
- Migração do schema próprio pg-boss será comando explícito de provisionamento, separado de migrations Drizzle da aplicação. Runtime usa `migrate:false`/`createSchema:false` conforme tipos confirmados; não dar DDL automático aos processos. Não editar migrations aplicadas.
- Reaproveitar contexto/transação autorizado entregue pela fase 2: sessão, permissão, membership atual, contexto pessoal/tenant e RLS local por transação. Worker revalida autorização ao executar ação de usuário, não confia em payload de fila nem em sessão antiga. Jobs de sistema têm tipos/autoridades explícitos, não bypass global genérico.
- Funções concretas, sem classes StorageProvider/QueueProvider/WebhookProvider ou pacote por helper. Código compartilhado app/worker justifica único módulo em pacote existente ou `packages/core` somente se fronteira real exigir; não introduzir ciclo db/auth.
- Storage: SDK AWS S3, bucket privado, presigned POST com tamanho máximo imposto pela policy para upload de referência, GET assinado curto só após autorização. Nunca URL pública permanente como controle de acesso. Metadata persistida identifica owner/tenant, chave gerada no servidor e estado pending/ready; cliente não escolhe bucket/chave/owner.
- Notificações: linhas persistidas por destinatário; listagem/paginação e marcar lida com autorização do destinatário. Toast apenas feedback. Poll/refresh nativo basta; realtime não requerido.
- Inbound: segredo HMAC SHA-256 específico por endpoint, timestamp e raw bytes, comparação constante, janela de replay e limite de body. Evento externo único por origem; efeito e recibo na mesma transação. Segredo não equivale a contexto tenant fornecido pelo body.
- Outbound: evento e entrega duráveis na mesma transação de negócio; tentativas por worker, assinatura de bytes enviados, ID estável de entrega e timestamp novo por tentativa. Entrega pelo menos uma vez; receptor precisa deduplicar. Nunca prometer exatamente uma vez na rede.
- SSRF: HTTPS em produção, sem userinfo/fragmento/porta arbitrária, allowlist de destinos autorizada por operador, DNS e todos IPs validados na execução; bloquear redes privadas, loopback, link-local, IPv6 e endereços reservados/metadata. Fixar conexão ao IP validado com hostname/TLS original, sem redirects; só checar URL antes de `fetch` não basta contra rebinding. Allowlist de desenvolvimento explícita, isolada e proibida em produção.

## Configuração e prova

`.env.example`, não `.env`: flags desligadas por padrão; validação somente do ramo selecionado; segredos nunca `NEXT_PUBLIC_*`. S3 AWS e S3 compatível são receitas distintas, endpoint/path-style/CORS explícitos. Habilitar integração inválida falha com nomes de variáveis, sem valores secretos; desabilitada não importa/inicializa SDK ou exige conta.

Smoke externo real **PENDENTE POR DECISÃO DO USUÁRIO**, somente no fechamento após implementação completa e autorização das contas/destinos. Testes reais PostgreSQL locais provam durabilidade/isolamento, não provam S3 externo nem entrega pública. Mocks não encerram requisitos. Fase 8 conserva pendência até registro de evidências reais.

## Fontes verificadas

- https://registry.npmjs.org/pg-boss/latest — 12.38.2, engines, licença e gitHead.
- https://raw.githubusercontent.com/timgit/pg-boss/master/README.md — API básica e PostgreSQL >=13; branch móvel, conferir pacote pinado antes de implementar.
- https://raw.githubusercontent.com/timgit/pg-boss/fc78d0d95d4e62f0c3161e4da5b05e13408effe8/src/types.ts — opções e `IDatabase.executeSql`, transações e manutenção da versão consultada.
- https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html — policy POST e condições.

Context7 não exposto entre ferramentas desta sessão; referências primárias consultadas diretamente. Fonte README por tag v12.38.2 não disponível (404); tipos do gitHead publicado usados para versão, sem inferir assinatura de adaptador Drizzle não consultada.
