# IA no servidor

`@vibe/ai` usa Vercel AI SDK oficial; autenticação, autorização, endpoint e reserva persistida de quota ficam no caller `apps/app/src/app/api/ai/route.ts`. Dependências consultadas no registry em 2026-11-11: `ai@7.0.169`, `@ai-sdk/openai-compatible@3.0.90` (Node >=22). Nenhum provider foi exercitado; smoke externo fica para validação final com credenciais autorizadas.

## Configuração

Somente servidor recebe estas variáveis, nunca prefixadas por `NEXT_PUBLIC_`:

```dotenv
AI_ENABLED=false
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=
```

`readAiConfig(env)` não lê `process.env` implicitamente. Desabilitado (`false` ou ausente), não requer credenciais e não cria provider. Outro valor de `AI_ENABLED` falha. Habilitado exige chave e modelo explícitos; `AI_BASE_URL` opcional usa `https://api.openai.com/v1`. URL precisa HTTPS sem credenciais, query ou fragmento. Escolher destino em configuração confiável de deploy; nunca permitir URL enviada por usuário. Compatibilidade Chat Completions, streaming, tools e usage dependem de provider/modelo escolhido; não há fallback para Gateway ou outro provider.

Import de produção: `@vibe/ai` contém `import "server-only"`. Import `@vibe/ai/implementation` existe exclusivamente para execução de testes/worker servidor sem marcador Next; também contém segredo quando configurado e **não pode entrar no bundle cliente**. Não serializar configuração, resposta bruta do provider, erros brutos ou variável de ambiente. Importar módulo não lê segredo nem inicia rede.

## Interface do pacote

- `readAiConfig(env: AiEnvironment): AiConfig`: união discriminada por `enabled`; estado habilitado contém `apiKey`, `baseURL`, `model`.
- `streamAiText<TOOLS extends ToolSet>(config, input: AiStreamInput<TOOLS>)`: retorna resultado real de `streamText`, com inferência das tools e métodos do SDK (`textStream`, `fullStream`, `toUIMessageStreamResponse`, `totalUsage`).
- `input`: `prompt`, `maxOutputTokens`, `abortSignal`, `onError` obrigatório; `instructions`, `tools`, `toolsContext`, `onEnd`, `onAbort` opcionais conforme tipos SDK. Contexto de tools é obrigatório quando SDK exige. Instructions são texto confiável do servidor; não usar instruções enviadas pelo cliente.
- Prompt texto não vazio, até 32.000 caracteres. `maxOutputTokens` inteiro de 1 a 4.096 **por etapa**; no máximo duas etapas, permitindo chamada de tool seguida de resposta. Reservar até duas vezes limite de saída, além da entrada e custos próprios das tools. Timeout total de 120s. Retries automáticos desativados para não repetir cobrança/efeitos implicitamente. Não aceitar limites de custo definidos livremente pelo cliente.
- `abortSignal` obrigatório: combinar `request.signal` e deadline do servidor; cancelamento propaga ao SDK. Tools precisam respeitar sinal e timeouts de seus próprios serviços. Cancelar não desfaz efeito já persistido nem garante custo zero.

### Ordem obrigatória no caller

1. Autenticar sessão, resolver usuário/tenant no servidor e verificar permissão de IA. Rejeitar acesso antes de construir tools ou iniciar geração. Cliente não escolhe escopo autorizado.
2. Validar tamanho do request e histórico, política de dados, plano/modelo e orçamento. Texto possui limite no pacote; caller deve controlar bytes do request, tokens de entrada e contexto retornado pelas tools. Este pacote não aceita mensagens multimodais/URLs nem busca arquivos automaticamente.
3. **Persistir reserva de quota atomicamente antes de `streamAiText`**, vinculada ao usuário/tenant e identificador idempotente da operação. Usar transação/atualização condicional no banco que rejeite concorrência acima do orçamento; não contador em memória. Considerar entrada, teto de duas etapas, tools, concorrência e falhas. Este pacote não oferece uma implementação fictícia de quota.
4. Construir somente tools autorizadas. Cada `execute` valida schema, revalida sessão/membership/permissão e escopo no momento da operação, aplica filtros de propriedade/tenant na consulta e verifica relações. Prompt/modelo não concede permissões. IDs vindos do modelo não são autorização. Tools de escrita exigem política de confirmação e idempotência próprias.
5. Iniciar stream e consumir resposta. Tratar erro antes dos headers e erro/cancelamento durante streaming. `onError` obrigatório recebe erro bruto apenas no servidor; registrar código sanitizado e ID de correlação, não `error`, prompt, argumentos, resultados, chave ou body do provider. Ao usar `toUIMessageStreamResponse`, fornecer `onError: () => "Não foi possível concluir a resposta."` para cliente; não retornar `String(error)`.
6. Conciliar reserva persistida idempotentemente em conclusão/abort/erro. `onEnd` recebe usage do SDK; `onAbort` recebe etapas concluídas. Campos de usage podem estar ausentes. Não liberar reserva integral automaticamente quando provider falha ou desconecta; contabilizar conservadoramente e reconciliar conforme política do provider. Callbacks não substituem mecanismo durável para queda do processo. Caller mantém operação pendente e rotina de conciliação.

### Tool tipada com autorização fornecida pelo caller

Exemplo de composição, não endpoint nem adapter de banco. Caller fornece função real que revalida autorização e consulta projeto no escopo; não há retorno falso nem armazenamento em memória.

```ts
import { tool } from "ai";
import { z } from "zod";

export function projectSummaryTool(
  readAuthorizedProject: (
    projectId: string,
    signal?: AbortSignal,
  ) => Promise<{ name: string; status: string }>,
) {
  return tool({
    description: "Consultar nome e status de projeto acessível nesta sessão.",
    inputSchema: z.object({ projectId: z.uuid() }).strict(),
    // readAuthorizedProject deve revalidar identidade, permissão e tenant,
    // validar projectId no servidor e projetar apenas campos permitidos.
    execute: ({ projectId }, { abortSignal }) =>
      readAuthorizedProject(projectId, abortSignal),
  });
}
```

Caller usa `tools: { projectSummary: projectSummaryTool(readAuthorizedProject) }` somente **após** passos 1–3. `readAuthorizedProject` deve lançar erro seguro em acesso negado; não retornar dados de outro escopo. Zod valida estrutura e UUID; callback de acesso continua responsável por validação de domínio e autorização. Não enviar session tokens, contexto interno ou colunas sensíveis ao modelo.

## Dados e observabilidade

Nenhum log é emitido pelo pacote; telemetria SDK explicitamente desabilitada, com gravação de entrada/saída desabilitada. Prompts, saídas e resultados das tools são enviados ao provider escolhido: definir retenção, região, consentimento e dados proibidos antes de habilitar. Erros e metadados SDK podem conter request sensível; não persistir resultado inteiro. UI não deve renderizar HTML do modelo sem sanitização.

### Endpoint e interface da aplicação

`POST /api/ai` entrega stream de texto real do provider, não resposta simulada. Mantém validação de origem/body, sessão, escopo, rate limit e reserva conservadora de quota antes de iniciar geração. `listAuthorizedProjects` consulta somente projetos autorizados. Reserva não é devolvida automaticamente em falha/cancelamento; conciliação durável continua prova pendente, não comportamento prometido.

`AiAssistant` em `apps/app/src/components/ai-assistant.tsx` recebe `enabled`, `tenantIdentifier` e `locale` opcional (`pt-BR` padrão). Owner monta componente no painel com flag resolvida no servidor; `enabled=false` não renderiza UI nem faz request. Não importar configuração secreta no cliente. Fetch envia prompt e identificador de tenant para `/api/ai`, decodifica stream incrementalmente e exibe somente texto React, sem HTML do modelo. Botão cancelar usa `AbortController`; desmontagem e troca de tenant também abortam e descartam estado anterior. Erros HTTP, inclusive 429, ficam visíveis; erros de rede interrompem resposta com aviso, sem substituir texto parcial por resposta fictícia. Transporte de texto puro não sinaliza de forma confiável toda falha do provider após headers: conferir logs de stream no smoke final.

Rotas AI e health emitem eventos `@vibe/observability` com UUID de request gerado no servidor, status e duração em milissegundos; `X-Request-Id` correlaciona resposta. AI registra entrega de headers separada de conclusão, erro ou cancelamento de stream. Nenhum prompt, resposta, dado de tool, segredo, erro bruto ou ID de usuário/tenant entra nesses eventos. Exportação opcional sanitizada é disparada sem await, não bloqueia streaming; entrega não é durável nem garantida quando processo encerra.

## Verificação

Nenhum teste, build, instalação ou smoke foi executado nesta edição. Typecheck prévio do projeto não prova integração externa. Smoke real final, com credenciais autorizadas, deve provar streaming incremental, tool autorizada, negativa cross-tenant, cancelamento no browser e provider, 429, erro redigido antes/depois dos headers, correlação de logs e conciliação durável concorrente de quota. Confirmar montagem pelo owner e ausência completa da UI/rede com flag desabilitada. AI-01/02/03 não ficam comprovados end-to-end sem essas evidências.

Fontes oficiais: [registry ai](https://registry.npmjs.org/ai/latest), [registry provider](https://registry.npmjs.org/@ai-sdk/openai-compatible/latest), [streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text), [OpenAI compatible](https://ai-sdk.dev/providers/openai-compatible-providers). Context7 não disponível no inventário desta sessão; documentação oficial e código da tag do registry consultados diretamente.
