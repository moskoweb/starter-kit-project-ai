# Receita: segredos por tenant, guarda de saída (SSRF), scrub de PII e hook anti-segredo

Quatro controles pequenos que as outras receitas assumem. Cada um é independente.

## 1. Cifra de segredos por tenant

Estado do kit: o kit evita guardar segredos de terceiros. Credenciais vêm de variáveis de ambiente. Esta receita é necessária quando o **tenant** cadastra chaves (provedor de IA, webhook, servidor MCP, integração).

Se o provedor de infraestrutura oferece cofre (KMS, Vault, secret manager), use-o e guarde só a referência. A cifra de aplicação abaixo é o mínimo viável quando não há cofre.

### Algoritmo

AES-256-GCM com IV aleatório de 12 bytes por operação e `authTag` de 16 bytes. Use `node:crypto`. Sem dependência nova.

### Três defeitos do desenho original a evitar

| Defeito | Consequência | Correção |
| --- | --- | --- |
| Chave mestra aceita texto livre e deriva com `scrypt` e **salt fixo** no código | Chaves fracas passam sem aviso e o salt público não protege | Exija 32 bytes em base64 e falhe no startup se for diferente. Gere com `openssl rand -base64 32`. Sem derivação por padrão |
| Blob sem **versão de chave** | Rotação da chave mestra obriga recifrar tudo de uma vez, sem como saber qual chave abre qual linha | Prefixe o blob com `v1:<keyId>:`. Mantenha um chaveiro com várias chaves. Cifra com a atual, decifra com qualquer |
| Sem **AAD** (dados autenticados adicionais) | Um blob pode ser copiado de uma linha para outra (de outro tenant ou outra coluna) e decifra normalmente | Passe `setAAD("<tenantId>:<tabela>:<coluna>:<idDaLinha>")`. Blob movido falha na autenticação |

### Contrato

```ts
type Aad = { tenantId: string; table: string; column: string; rowId: string };
encryptSecret(plain: unknown, aad: Aad): string;   // "v1:<keyId>:<iv>:<tag>:<ct>" em base64url
decryptSecret<T>(blob: string, aad: Aad): T;       // falha com erro tipado, sem vazar conteúdo
needsRotation(blob: string): boolean;              // keyId diferente do atual
```

- Chave em `APP_SECRETS_KEYS` (JSON `{ "k1": "<base64>" }`) e `APP_SECRETS_CURRENT=k1`. Leitura validada em `@vibe/config`. Sem a variável, a feature que depende dela fica desligada, e o app inicia.
- Chave **nunca** no banco, no log ou no cliente. Módulo `server-only`.
- Rotação: adiciona `k2`, muda `CURRENT`, job recifra linhas com `needsRotation`. Remove `k1` depois que nenhuma linha usar.
- Backup do banco sem a chave é inútil, e chave perdida significa segredos perdidos. Documente onde a chave é guardada e como é recuperada.

### Regras de uso

- **Escrita apenas.** API devolve só metadados e os últimos 4 caracteres. Nunca o segredo.
- Decifrar o mais tarde possível, manter em memória pelo menor tempo, nunca logar.
- Sem segredo em `localStorage`, bundle cliente, URL ou mensagem de erro.
- Erro de decifração é erro **tipado** (`SecretDecryptError`) com o id da linha, sem conteúdo. Marque a credencial como inválida e peça nova ao usuário.
- Teste com vetor conhecido, blob adulterado (falha), blob de outra linha (falha pelo AAD) e rotação.

## 2. Guarda de URL de saída (SSRF)

Qualquer URL fornecida por tenant ou usuário que o **servidor** vai acessar (webhook, servidor MCP, `baseURL` de provedor, importação por URL) exige a mesma guarda. `@vibe/webhooks` do kit já rejeita destinos internos. Extraia a lógica para uma função única e reaproveite nas outras features, em vez de copiar.

### Regras

1. `new URL()` com tratamento de erro. Mensagem amigável, sem eco da entrada.
2. Rejeite usuário e senha na URL.
3. Só `https:` em produção. `http:` apenas fora de produção.
4. Rejeite `localhost` e `*.localhost`.
5. Se o host é IP literal, valide contra a lista de bloqueio.
6. Se é nome, resolva **A e AAAA** e rejeite se **qualquer** endereço for bloqueado. Zero endereços também é rejeição.
7. Faça a conexão **no endereço validado** (resolver customizado do cliente HTTP, por exemplo `undici` com `lookup`). Resolver de novo depois da checagem permite **DNS rebinding**. Este é o ponto que mais falha.
8. `redirect: "manual"`. Se for seguir redirect, revalide cada salto com todas as regras.
9. Timeout (10 a 30 s), limite de tamanho de resposta (por exemplo 1 MB) e limite de redirects.
10. Valide no cadastro **e** a cada chamada.

### Faixas a bloquear

IPv4: `0.0.0.0/8`, `10/8`, `100.64/10` (CGNAT), `127/8`, `169.254/16` (inclui metadata de nuvem em `169.254.169.254`), `172.16/12`, `192.0.0/24`, `192.168/16`, `198.18/15`, multicast e reservados (`>= 224`).

IPv6: `::`, `::1`, `fe80::/10`, `fc00::/7`, `fec0::/10`, `ff00::/8`, e IPv4 mapeado (`::ffff:a.b.c.d`) reavaliado como IPv4.

Atenção a formas alternativas de IP (decimal, octal, hexadecimal): `new URL` normaliza a maioria, mas teste. Rejeite `%` de zona em IPv6.

### Exceção de desenvolvimento

Ollama ou serviço local em dev: flag **de ambiente do servidor** (`ALLOW_PRIVATE_OUTBOUND=1`), nunca configuração de tenant e nunca ativa em produção (falha no startup se `NODE_ENV=production`).

### Testes

Tabela de casos: IPs privados, loopback, link-local, metadata, IPv6 mapeado, hostname que resolve a IP privado, hostname com um endereço público e outro privado, redirect para interno, credenciais na URL, esquema `file:` ou `gopher:`.

## 3. Scrub de PII em observabilidade

Se o produto enviar erros a um serviço (Sentry ou similar), configure o filtro **antes** de ligar o serviço, via `beforeSend` e `beforeBreadcrumb`:

- Redija por **chave** (correspondência parcial, sem diferenciar maiúsculas): `password`, `secret`, `token`, `authorization`, `api[-_]?key`, `cookie`, `session`, `email`, `phone`, `body`, `text`, `message`, e os nomes de campo de dados pessoais do produto.
- Aplique em `request.data`, `request.headers`, `extra`, `contexts` e `breadcrumb.data`, com limite de profundidade.
- Descarte `query_string` inteira (costuma carregar tokens).
- Reduza `event.user` a `{ id }`.
- Em produção, redija mensagens de breadcrumb de console.
- Prefira **lista de bloqueio ampla** mais revisão a cada campo novo. Aviso: filtro por chave não pega dado pessoal em **valor** (um e-mail dentro de texto livre). Evite enviar texto livre em `extra`.
- Teste com payload sentinela e confirme que nenhum valor sensível sai.

## 4. Hook de pré-commit contra segredos

O produto original bloqueia segredos antes de entrarem no histórico, com `.githooks/pre-commit` ativado por `git config core.hooksPath .githooks` no `prepare` do `package.json`.

O hook faz três verificações:

1. **Nome de arquivo:** bloqueia `.env*` (exceto `.env.example`), `*.bak`, `*.old`, `*.orig`, `*.pem`, `*.key`, `*.p12`, `id_rsa`, `id_ed25519`, `*.tfvars`, `credentials*.json`, `secret*.yaml`.
2. **Conteúdo adicionado** (só linhas `+` do diff staged): padrões de chaves conhecidas (Anthropic `sk-ant-`, OpenAI `sk-`, Stripe `sk_live_`, Groq `gsk_`, AWS `AKIA`, tokens GitHub `ghp_`, Slack `xox`, blocos `PRIVATE KEY`).
3. **`gitleaks`**, se instalado, em modo `protect --staged`.

Notas:

- Hook local é defesa leve: `--no-verify` o contorna. Repita a verificação no CI (job `gitleaks` ou similar) como barreira real.
- Inclua o **prefixo de chave do seu produto** nos padrões (por exemplo `sk_live_`).
- Falso positivo: o hook deve orientar o que fazer, sem pedir bypass por padrão.
- Segredo que já foi commitado é **segredo vazado**. Rotacione. Reescrever histórico não basta.
- Em repositórios derivados, o `.gitignore` já deve cobrir `.env*` exceto `.env.example`.

## Checklist de aceite

- [ ] Chave mestra inválida impede a feature de iniciar, com erro claro. App sem a feature inicia normalmente.
- [ ] Blob adulterado e blob copiado para outra linha falham na decifração.
- [ ] Rotação de chave: blobs antigos decifram, novos usam a chave atual, job recifra.
- [ ] API e logs nunca contêm segredo (teste com valor sentinela).
- [ ] Guarda SSRF passa na tabela de casos, inclusive rebinding com resolver fixo.
- [ ] Flag de saída privada falha no startup em produção.
- [ ] Scrub de PII remove todos os campos sentinela do evento enviado.
- [ ] Hook bloqueia um arquivo `.env` e uma chave falsa de teste. CI repete a checagem.
