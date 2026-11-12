# Aprendizados para projetos com agentes de IA

Lições de processo e engenharia de um produto multi-tenant maduro, desenvolvido com agentes de IA no dia a dia. Servem a qualquer projeto derivado do kit. Cada item diz **o que fazer**, **por quê** e **como o kit se relaciona**.

São recomendações. Adote as que fazem sentido e registre as decisões em `.planning/`.

## 1. Regras de agente que valeram a pena

### Regra de consulta em camadas

Para o agente que edita o código:

1. **Estrutura primeiro** (grafo de código, busca por símbolos). O kit já traz `.mcp.json` com CodeGraph.
2. **Decisões em seguida** (`.planning/`: roadmap, estado, decisões).
3. **Código como fonte de verdade**, com leitura direcionada para confirmar contratos antes de editar.

Se a ferramenta de grafo estiver ausente ou desatualizada, use busca e leitura direta e registre a limitação. Indisponibilidade da ferramenta não dispensa análise de impacto.

### Análise de impacto antes de editar "god nodes"

Liste os arquivos com muitos dependentes (acesso ao banco com RLS, contexto de autenticação, cifra, filas). Antes de alterá-los, consulte os consumidores. Com mais de 50 dependentes: feature flag, commits menores, aviso a quem trabalha em paralelo.

No kit, os candidatos naturais são `packages/db/src/tenant.ts`, `packages/auth/src/permissions.ts` e `apps/app/src/lib/security/rate-limit.ts`. Registre a lista no `AGENTS.md` do projeto.

### Regra dos três ou mais

Se o mesmo padrão de UI ou de lógica aparece **três ou mais vezes**, extraia componente ou função **na hora** e migre todas as ocorrências. Ressalva importante: semelhança textual entre contratos diferentes não é o mesmo padrão. Não una o que só se parece.

### Reuso antes de escrever

Mantenha no `AGENTS.md` uma tabela "padrão de UI, componente obrigatório, arquivo" (página, seção, tabela, tabs, diálogo, estado vazio). Agente que cria HTML cru para um padrão coberto causa retrabalho de revisão.

### Padrão obrigatório de rota

Uma sequência fixa e curta para toda rota protegida: autenticar, resolver tenant, verificar capacidade, executar dentro da transação com RLS, auditar, responder. Fixe isso como snippet no `AGENTS.md`. Exceções (bypass de RLS) exigem comentário justificando e ficam restritas a admin e jobs de manutenção. O kit já impõe isso por `requireSession`, `resolveTenant`, `withTenantScope` e `enforceRateLimit`.

### Proibições explícitas e absolutas

Uma tabela de comandos destrutivos que o agente **nunca** executa sem pedido direto do usuário naquela conversa (reset de migration, `db push --force-reset`, `DROP`, `TRUNCATE`, seeds e scripts `fresh`, `wipe`, `destroy`). Escreva o motivo ao lado de cada um. "Parece seguro" não é autorização. Acrescente a regra equivalente para push e deploy: build aprovado não autoriza push.

### Regras de comportamento do agente que reduzem risco

- Commits locais automáticos por mudança lógica. Push e deploy só por ordem explícita.
- Nunca `git add .` nem `git add -A`. Selecione caminhos e revise o diff staged. Preserve alterações staged de terceiros (outros agentes trabalham no mesmo repositório).
- Conventional commits, com mensagem que explica o porquê e o sintoma.
- Sem comentários óbvios, sem tratamento de erro para o impossível, sem compatibilidade retroativa que ninguém pediu.

## 2. Gate de validação

Defina uma ordem fixa e curta, e registre o que **não** foi executado:

1. Lint e formatação nos arquivos alterados (nunca em tudo, para não mexer em trabalho alheio).
2. **Type check sem cache incremental.** O cache `.tsbuildinfo` esconde erros nos consumidores de tipos alterados.
3. Testes afetados, mais regressão para bugs sutis.
4. Verificador de migration, se houver.

Mudança só de documentação exige revisão de consistência, caminhos citados e `git diff --check`.

Build de contêiner é gate de **prontidão de produção**, não de cada commit. Feche tarefas e commite local com checks aprovados, registre o build como pendente e rode-o sobre o conjunto final.

Em servidor compartilhado: validações pesadas em sequência com um `flock` comum, checagem de memória antes do build e nenhuma interrupção de serviços alheios.

Para o kit, a regra já existente é "ausência de credenciais é gate não executado, não aprovado". Estenda-a: teste pulado, mock de integração e build não provam comportamento.

## 3. Banco de dados e migrations

- **Migração idempotente.** Deploy repetido, rollback e ambientes paralelos reaplicam migrations. Use `IF NOT EXISTS`, `IF EXISTS` e blocos `DO $$` com checagem para políticas e constraints.
- **Verificador no CI** que reprova migration não idempotente ou perigosa. Rode antes do commit.
- Migration com erro nunca se resolve por reset nem apagando o registro de migrations. Escreva o procedimento de recuperação no `docs/`.
- **Papéis separados.** Um papel de migração (dono) e um papel de runtime sem `ALTER`. O produto original quebrou uma migration porque o runtime não tinha permissão. Documente qual conexão cada comando usa.
- **RLS por padrão, bypass como exceção documentada.** Em rota, bypass só para admin cross-tenant. Em job, só manutenção global. Sempre com comentário.
- **Três camadas de isolamento:** autorização na aplicação, filtro na consulta e RLS no banco. O kit já tem RLS e `withTenantScope`. Mantenha o filtro explícito por tenant nas consultas também. Uma camada falha, as outras seguram.
- Transação curta. Nada de chamada de rede, LLM ou upload dentro de transação.

## 4. Erros de integrações externas

Adaptadores de APIs de terceiros **não** concatenam texto na mensagem de erro (`"X falhou (400): ..."`). Crie uma classe por integração, estendendo `Error`, com `status` numérico e o corpo bruto:

```ts
export class ProviderError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message); }
}
```

Quem consome decide por `err.status` (401, 404, 429, 5xx), nunca por substring ou regex da mensagem. Mensagem para o usuário vem de um mapeador único. Detalhe cru fica só no log do servidor.

## 5. Jobs e filas

- **Todo handler é idempotente.** Filas entregam mais de uma vez após timeout ou falha de rede. Antes de repetir efeito externo, verifique que ele ainda não ocorreu (`externalId` persistido, status final).
- O kit usa pg-boss. Os princípios valem: chave de deduplicação (`singletonKey`), retry com backoff, limite de tentativas e fila de falhas.
- **Trabalhadores não importam React nem `app/*`.** Lógica compartilhada fica em pacote sem UI.
- **Tarefas de recuperação** (`recover-*`) varrem estados presos e reprocessam: entrega de webhook, sincronização, lembretes. Todo fluxo assíncrono que pode ficar preso precisa de seu recuperador, idempotente.
- **Tarefas de purga** para dado volátil (payloads de execução, validações antigas) com retenção explícita.
- Efeito colateral só depois do commit. Use outbox ou `defer`.
- Timeouts explícitos por job, concorrência por fila e métricas de fila.

## 6. Observabilidade e privacidade

- Logs estruturados com IDs e metadados. **Nunca** conteúdo de mensagem, transcrição, prompt ou resposta de modelo.
- Filtro de PII antes de qualquer envio de erro a terceiros ([SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md)).
- Nunca expor `organizationId` de outro tenant em respostas.
- Variáveis de ambiente só por módulo validado com schema (`@vibe/config`). Nunca `process.env` solto.

## 7. Documentação que ajudou os agentes

| Documento | Para quê |
| --- | --- |
| `AGENTS.md` enxuto | Regras obrigatórias, tabela de reuso, snippet de rota, proibições, gate. Remeter detalhes a `docs/` |
| `docs/skills/*` (padrões por tema) | Um arquivo por padrão recorrente (padrão de rota de API, multi-tenancy, filas, cifra, i18n, migrations, upload, UI). O agente carrega só o relevante, o que poupa contexto |
| ADRs curtos | Decisões como RLS, SSE, MCP stateless, com contexto e consequências |
| `SECURITY.md` por controle | Cada controle com o arquivo e o teste que o prova |
| Docs por capacidade (`MCP-SERVER`, `PUBLIC-API`, `AGENT_RUNTIME`) | Contrato público e limites, atualizados junto do código |
| Notas datadas (`...-2026-06.md`) | Auditorias e decisões pontuais, marcadas como históricas |

Armadilhas:

- **Estado histórico vira mentira.** Frases de conclusão em docs antigos enganam. O kit já alerta: "para aceite use código atual e evidência observada". Marque notas datadas como históricas.
- **Não mantenha listas ou contagens fixas** em guias (quantidade de filas, de rotas, de tabelas). Aponte a fonte atual.
- **Separe regras portáveis de infraestrutura local.** O `AGENTS.md` não deve misturar regras do produto com detalhes do servidor da máquina (portas, túneis, locks de memória). Coloque o segundo em arquivo próprio ignorado pelo derivado.
- Documentação de um repositório derivado precisa de revisão: as receitas deste diretório descrevem recursos que o derivado pode nunca implementar.

## 8. Armadilhas técnicas recorrentes

| Armadilha | Prevenção |
| --- | --- |
| Concatenar `$queryRawUnsafe` com listas de IDs | Sempre parametrizar. `= ANY($1::uuid[])` |
| Timeout de transação por chamada externa dentro dela | Rede antes ou depois, nunca dentro |
| Worker pega o job antes do commit ficar visível | Enfileirar depois do commit ou via outbox |
| Substring de mensagem para decidir fluxo | `status` e códigos tipados |
| Copiar lógica de erro de LLM em várias rotas | Um mapeador único |
| Duas abstrações de provedor convivendo | Use a do SDK desde o início |
| Estado em memória do processo (sessão MCP, cache) com várias réplicas | Stateless por padrão. Estado só com topologia declarada |
| Dados de depuração (prompt cru) guardados sem prazo | Não guardar por padrão. Se guardar, purga por job |
| Escopos de chave vazios significando "tudo" | Escopo explícito sempre |
| Teste de integração que mocka a integração | Integração real para aceite. Mock só em unitário |
| Modelo de IA escrevendo memória ou KB direto | Proposta com revisão humana |
| Segredo ou `.env` em commit | Hook local mais verificação no CI. Segredo vazado se rotaciona |

## 9. Processo com agentes em paralelo

- Vários agentes no mesmo repositório exigem disciplina de git (seleção de caminhos, preservar o índice alheio).
- Trabalho em fases pequenas, com plano, verificação e commit por fase. Use `.planning/` para isso. **Verifique** cada fase antes de marcá-la como feita e mantenha `STATE` e `ROADMAP` coerentes entre si. Fase "concluída" sem verificação é o descuido mais comum.
- Preview de desenvolvimento permanece de pé. Não reiniciar o servidor de dev a cada ajuste.
- Registre pendências de validação de forma explícita ao fechar a tarefa. "Feito" sem a lista do que não foi testado é afirmação sem evidência.
