# Receita: MCP (servidor do produto e cliente para agentes)

Estado do kit: sem código MCP. O `.mcp.json` do repositório configura MCP para **quem desenvolve** (CodeGraph, shadcn). Esta receita trata de MCP **dentro do produto**, em duas direções independentes:

1. **Servidor MCP do produto:** expõe tools e recursos do seu domínio a agentes e clientes externos, autenticados por chave de API.
2. **Cliente MCP dos agentes:** deixa os agentes do produto usar tools de servidores MCP cadastrados pelo tenant, com CRUD desses servidores.

Adote só o que o produto precisa. Os dois lados são independentes.

## Parte 1: servidor MCP do produto

### Transporte e autenticação

- Use o SDK oficial `@modelcontextprotocol/sdk` com transporte **Streamable HTTP** em um único endpoint (`/mcp`). Para Next.js use o transporte web-standard (`WebStandardStreamableHTTPServerTransport`).
- MCP e a sessão web (Better Auth) são **fronteiras independentes**. Autentique com `Authorization: Bearer <chave>` em **toda** requisição, inclusive depois de `initialize`. A chave define tenant e escopos. Ver [PUBLIC-API-KEYS](PUBLIC-API-KEYS.md).
- `Mcp-Session-Id` seleciona uma conexão local. Nunca é autenticação, autorização nem memória de conversa.
- Escopo mínimo `mcp_read` para acessar. Cada tool **revalida** seu próprio escopo no `execute`.

### Stateless por padrão

O modelo com sessão em memória exige uma única réplica e reinício derruba as sessões. É frágil.

- **Prefira stateless** (uma instância de servidor e de transporte por requisição, sem `sessionIdGenerator`) quando as tools não precisam de notificações servidor-cliente. Funciona com várias réplicas e sem estado.
- Se precisar de sessão: exija flag explícita (`MCP_STATEFUL_ENABLED`) mais declaração de topologia (`single_replica`). Sem a declaração, falhe fechado com 503. Sessão expirada, revogada, de outra chave ou perdida após restart devolve 404 e o cliente reinicia com `initialize`. Não prometa replay de eventos.
- Em sessão stateful, vincule a sessão ao `apiKeyId` e ao tenant, e encerre sessões quando a chave for rotacionada ou revogada.

### Tools

```ts
server.registerTool("contacts.list", {
  title: "List contacts",
  description: "List contacts scoped to the API key tenant.",
  inputSchema: { search: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).optional() },
}, async (input) => {
  requireScopes(ctx, ["contacts_read"]);
  return withTenant(ctx.tenantId, (tx) => listContacts(tx, input)).then(asText);
});
```

Regras:

- Lista **curada** de tools. Não gere tools automaticamente de todo o OpenAPI.
- Cada tool: schema Zod estrito com limites, escopo próprio, consulta no escopo do tenant da chave, retorno mínimo.
- Tools não fazem HTTP de volta para o próprio app. Chamam a camada de domínio.
- Escrita exige idempotência (`idempotencyKey` no schema) e entra por outbox ou fila.
- Sem tools de bulk, administração entre tenants, restauração ou operações destrutivas. Ausência é decisão de segurança. Documente-a.
- Tool nunca devolve segredo, hash de chave ou dados de outro tenant.
- Recursos MCP (`resources/list`, `resources/read`) podem publicar o catálogo OpenAPI derivado da **mesma** fonte do `/openapi.json`. Não mantenha uma lista copiada.

### Observabilidade

Registre em auditoria: sessão criada, encerrada, expirada, rotacionada, revogada ([AUDIT-LOG](AUDIT-LOG.md)). Métricas por tool, sem argumentos nem resultados no log.

## Parte 2: cliente MCP dos agentes

Permite que um agente use tools de servidores externos (calendário, CRM, busca) cadastrados pelo tenant.

### Entidades

```text
mcp_server        id, organization_id, name, url, transport (streamable_http), auth_config_enc,
                  is_active, last_checked_at, last_error_code, tools_cache jsonb
agent_mcp_server  agent_id, mcp_server_id, tools_enabled text[]   (vazio = todas habilitadas)
```

- `auth_config_enc` cifrado conforme [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md). Nunca devolvido.
- CRUD via `vibe resource` com botão **Testar conexão** que faz o handshake e mostra a lista de tools.
- Apenas HTTP(S). **Não suporte stdio**: executar processo local escolhido por tenant é execução remota de código.

### Handshake de teste

1. `initialize` (captura `Mcp-Session-Id` se houver).
2. `notifications/initialized`.
3. `tools/list`.

Classifique falhas em categorias úteis ao usuário: URL inválida, host bloqueado, não resolvido, timeout, 401 ou 403, resposta HTML (página de login ou erro, comum quando a URL aponta para um site e não para o endpoint MCP), JSON inválido. Cada uma com mensagem amigável.

### Segurança obrigatória

- **SSRF.** Toda URL cadastrada passa pela guarda de [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md): HTTPS em produção, sem credenciais na URL, DNS para endereços públicos, `redirect: "manual"`, timeout (por exemplo 30 s) e limite de tamanho de resposta. Revalide **no momento da chamada**, não só no cadastro, por causa de DNS rebinding.
- **Servidor MCP de terceiros é não confiável.** Nome, descrição e schema de tools são texto vindo de fora e vão para o prompt. Podem conter injeção. Trate como dado.
- **Nomes com prefixo.** Namespace de tool `mcp.<prefixo-do-id>.<slug>.<tool>` evita colisão com tools locais e entre servidores. Tools locais nunca usam ponto no nome.
- **Allowlist por agente** (`tools_enabled`). Servidor anexado não significa todas as tools liberadas.
- **Aprovação humana** para tools MCP de escrita ou de efeito externo, via o mesmo fluxo de [AI-TOOLS-AND-AGENTS](AI-TOOLS-AND-AGENTS.md).
- Falha de MCP nunca derruba o run. Volte `tool_result` com erro seguro para o modelo reagir.
- Não repasse credenciais do usuário final ao servidor. Use a credencial cadastrada para aquele servidor.
- Limite o número de servidores por agente e o tamanho do schema de tools enviado ao modelo.

## Checklist de aceite

- [ ] Sem `Authorization` válido, nenhuma tool nem recurso responde, inclusive após `initialize`.
- [ ] Chave sem o escopo da tool recebe negativa. Chave do tenant A não alcança dados do tenant B.
- [ ] Chave revogada ou rotacionada encerra sessões e passa a falhar.
- [ ] Servidor responde com mais de uma réplica no modo stateless.
- [ ] URL de servidor cliente para localhost, IP privado, metadata de nuvem, redirect e DNS rebinding é bloqueada.
- [ ] Tool de servidor externo com instrução maliciosa na descrição não amplia privilégio.
- [ ] Tool MCP de escrita exige aprovação quando configurado.
- [ ] Timeout e falha de servidor externo viram erro de tool, não erro de run.
- [ ] Nenhum segredo de servidor MCP aparece em API, log ou erro.
