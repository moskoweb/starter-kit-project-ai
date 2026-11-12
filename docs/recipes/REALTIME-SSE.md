# Receita: tempo real com SSE e Postgres LISTEN/NOTIFY

Estado do kit: `@vibe/events` grava um outbox e notificações persistidas, com relay por job. O navegador não recebe eventos em tempo real: precisa recarregar ou fazer polling. Esta receita adiciona entrega ao vivo **sem Redis**, usando Server-Sent Events e `LISTEN/NOTIFY`.

Não adote se polling a cada alguns segundos atende. SSE traz custo operacional (conexões longas, réplicas, proxies).

## Arquitetura

```text
mudança no domínio
  -> transação grava a linha + evento (outbox)
  -> trigger ou o relay dispara pg_notify(canal, payload mínimo)
processo web
  -> UMA conexão dedicada com LISTEN
  -> broker em memória (EventEmitter) faz fan-out por canal
  -> cada conexão SSE assina o canal do seu escopo
navegador
  -> EventSource, reconecta sozinho, refaz a consulta ao receber evento
```

## Regras de design

- **Payload mínimo.** `NOTIFY` tem limite de cerca de 8 KB e não é durável. Envie apenas tipo, tabela, id e escopo. O cliente **rebusca** o dado pela API autenticada. Assim o canal nunca vaza conteúdo e a autorização continua na leitura.
- **Evento é dica, não fonte de verdade.** Cliente que perde eventos (reconexão, aba dormindo) refaz a consulta ao reconectar. Não construa lógica que dependa de entrega exata.
- **Canais por escopo:** por usuário (`user:<id>`), por tenant (`tenant:<id>`) e, se preciso, por recurso (`conv:<id>`). A assinatura é escolhida pelo **servidor**, a partir da sessão, nunca por parâmetro do cliente.
- **Autorize a assinatura.** Para canal de recurso, valide que o usuário pode ler aquele recurso (consulta com RLS) antes de assinar. Revalide em intervalos longos ou ao mudar papel.
- **Uma conexão `LISTEN` por processo**, não por cliente SSE. Reconexão automática com backoff quando cair, e re-`LISTEN` após reconectar.
- Todos os canais em **um** `LISTEN` multi-comando, para evitar dois `query` concorrentes na mesma conexão.
- **Conexão do listener usa o papel de runtime** (sem bypass). Ele só recebe notificações, não lê tabelas.
- Em pooler transacional (PgBouncer em modo transaction) `LISTEN` **não funciona**. Use conexão direta para o listener.

## Notificação disparada onde?

Duas opções:

1. **Trigger SQL** na tabela (`AFTER INSERT`) que chama `pg_notify`. Simples e atômico com a escrita. A notificação só é entregue no commit, o que é o desejado.
2. **Relay do outbox** (já existe em `@vibe/events`) chama `pg_notify` ao processar o evento. Mantém uma única origem de eventos e permite filtrar por tipo.

Prefira a 2 se o produto já usa o outbox, para ter um único caminho de eventos.

## Endpoint SSE

Pontos que importam em Next.js (Route Handler, runtime `nodejs`):

- Resposta `ReadableStream` com `content-type: text/event-stream`, `cache-control: no-store, no-transform`, `x-accel-buffering: no`.
- **Heartbeat** a cada 15 a 25 s (`: keepalive`) para proxies não derrubarem a conexão ociosa.
- Limpeza garantida ao abortar (`request.signal`), em erro de escrita e em `cancel()`: remove assinatura e timer. Vazamento de listener é o bug mais comum.
- Primeiro evento `ready`, para o cliente saber que conectou.
- `broker.setMaxListeners` elevado. Meça o consumo de memória por conexão.
- Limite de conexões por usuário e por processo. Rejeite excesso com 429.
- Autenticação por cookie de sessão (EventSource envia cookies no mesmo site). Verifique origem.
- Proxy reverso: desligue buffering e aumente `proxy_read_timeout`. Cloudflare Tunnel funciona, mas confirme timeout de conexão ociosa.
- Deploy com várias réplicas funciona, porque cada réplica tem seu `LISTEN`. Sem Redis.
- Desligar a feature não pode exigir nada: endpoint responde 404 e nenhuma conexão `LISTEN` abre.

## Cliente

- `EventSource` com `withCredentials` se o app e a API estiverem em origens diferentes.
- Hook `useSse(url, onEvent)` que fecha ao desmontar e **reabre ao mudar o escopo** (troca de tenant ou conversa). Descarte estado do escopo anterior.
- Ao receber o evento, invalide a consulta (TanStack Query, `router.refresh()`) em vez de aplicar o payload.
- Após reconexão (`open` depois de `error`), refaça a consulta para cobrir eventos perdidos.
- Debounce de rajadas.
- Respeite `document.visibilityState`: aba oculta pode pausar e retomar.

## Notificações persistidas

O kit já guarda notificações com RLS por destinatário. Combine: ao inserir a notificação, o evento ao vivo avisa o badge. Persistência continua sendo a verdade, SSE só acelera.

## Checklist de aceite

- [ ] Usuário A não recebe evento destinado ao usuário B nem a outro tenant. Teste com duas sessões simultâneas.
- [ ] Assinar canal de recurso sem permissão de leitura é negado.
- [ ] Payload do evento não contém conteúdo de negócio.
- [ ] Fechar a aba remove a assinatura (verifique contagem de listeners).
- [ ] Reiniciar o Postgres ou perder a conexão do listener recupera sozinho e o cliente reconsulta.
- [ ] Funciona com duas réplicas do app.
- [ ] Heartbeat mantém a conexão atrás do proxy real do deploy.
- [ ] Feature desligada não abre conexão nem expõe endpoint.
- [ ] Limite de conexões por usuário é aplicado.
