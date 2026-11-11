# Cycle 1 — revisão dos provedores

Escopo: `packages/storage`, `packages/ai`, `packages/email` e `packages/observability`. Revisão estática; nenhum teste, build ou instalação executado.

## Achados e correções

- **AI — fronteira SSR contornável.** `packages/ai/package.json` exportava `./implementation` sem `server-only`, permitindo importar streaming/configuração diretamente fora do entrypoint protegido. Removido export adicional; import público único `.` aponta para `src/server.ts`.
- **Observability — campos aprovados aceitavam dados arbitrários.** Sanitização anterior deixava strings livres em `event`/IDs (incluindo conteúdo sensível e quebras de linha) e valores inválidos em métricas. Agora exige formato restrito para nomes de evento e IDs, nível conhecido, duração finita não negativa e status inteiro 0–599; campos não permitidos/valores inválidos são omitidos. Tabela estática usa `Record` e checagem de propriedade própria.

## Estado por pacote

- **Storage:** config exige `STORAGE_ENABLED=true` e valida credenciais só quando habilitado; URLs assinadas curtas, limite de upload, timeout/retry único e validação de namespace/key observados. Contexto autorizado continua requisito do chamador; prefixo não substitui autorização. Sem correção adicional identificada na leitura estática.
- **AI:** configuração desabilitada não requer chave; habilitada valida URL HTTPS sem credenciais/query/fragment. Streaming limita saída a 4096 tokens, prompt a 32.000 caracteres, dois passos, retries desativados, timeout e propagação de cancelamento; telemetria desabilitada. A API ainda exige ao chamador autenticação, autorização, quota e tratamento de callbacks.
- **Email:** templates de verificação, reset, convite e OTP têm validação de URL/dados e renderização HTML/texto; transporte escolhe explicitamente SMTP ou Resend, aplica timeout, valida aceitação SMTP e uniformiza erro de entrega para não expor detalhes/segredos. Nenhum fallback automático.
- **Observability:** exportação OTLP desabilitada por padrão, endpoint HTTPS validado, timeout e falhas sanitizadas; logs limitados a campos aprovados.

## Limites da revisão

Não foram exercitados provedores reais nem chamadas externas. Configuração SMTP/Resend habilitada e entregabilidade permanecem sem verificação de integração; observabilidade não define backend além de OTLP/HTTP. Nenhum teste/build/install executado por solicitação.
