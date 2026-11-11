# Fundação de agentes

## Estado observado em 2026-11-11

- `AGENTS.md` criado antes da fundação da aplicação.
- CodeGraph correto: https://github.com/colbymchenry/codegraph . Substitui referência anterior ao site de produto hospedado; avaliação anterior não se aplica a este CLI.
- CLI já existente em `/usr/bin/codegraph`, versão `1.6.2`, comprovada com `DO_NOT_TRACK=1 CODEGRAPH_TELEMETRY=0 codegraph --version`. Nenhuma instalação global necessária ou executada.
- Fonte oficial documenta indexação local, integração MCP e telemetria: https://raw.githubusercontent.com/colbymchenry/codegraph/main/TELEMETRY.md . Processamento local não significa ausência de telemetria. Desativar por ambiente; não alterar configuração global de outros projetos.
- Após criação da fundação, `codegraph index` indexou 16 arquivos, 102 nós e 144 arestas. `codegraph query getDb` retornou função em packages/db/src/client.ts:31 e import na página. Handshake MCP stdio também comprovado (serverInfo1.6.2 e tools/list). Tool não carregada dinamicamente no harness atual; CLI funcional. Snapshot deve ser sincronizado após mudanças.
- Archify fora do bootstrap por decisão do usuário; avaliar novamente no fechamento, sem dependência obrigatória.

## Teste do provider nine-router

Tentadas chamadas de subagentes com seletores exatos `nine-router/Tier-02` e `nine-router/Tier-03`.

Primeiro bloqueio: `task.perCallModel: off`. Habilitação temporária na sessão permitiu chegar ao segundo gate, que recusou ambos: modelo não aprovado para agente `task`. Mensagem informa que modelo precisa constar de papel de chat configurado fora do projeto, frontmatter de agente bundled/user-level ou ser modelo do pai. Catálogo/credenciais não são aprovação.

Após autorização explícita, configurados papéis `default=nine-router/Tier-01`, `slow=nine-router/Tier-02`, `smol=nine-router/Tier-03`, seleção por chamada habilitada e allowlist restrita aos dois tiers inferiores. Usuário confirmou persistência; três configurações salvas no runtime global.

Probes `Check02` e `Check03` concluídos com seletores exatos e leitura real deste arquivo. Tier-02 retornou versão CodeGraph `1.6.2`; Tier-03 retornou decisão de excluir Archify do bootstrap. Gate de roteamento resolvido. Prova demonstra chamada e ferramenta de leitura, não qualidade de implementação de módulos complexos.

## Ordem de preparação

1. Contrato AGENTS.md e documentação de ferramentas.
2. Aprovar roteamento por tiers no runtime.
3. Revisar e ativar skills concretas e integração CodeGraph em escopo local; preservar instalações existentes.
4. Provar consulta em pequeno código de teste antes de declarar indexação funcional.
5. Detalhar fase 1 e preparar GSD Autonomous. Não iniciar execução integral sem os gates de runtime e planejamento.

GSD já está disponível no ambiente desta sessão; instalação/reprodutibilidade no template ainda precisa de contrato próprio. Não copiar indiscriminadamente toda instalação global para o repositório.

## Configuração local de MCP (CodeGraph 1.6.2)

- CLI inspecionado: `codegraph 1.6.2` expõe `codegraph serve --mcp` com opções `--no-watch` e `--path <path>` (não aceita `--project` nem flag `--no-telemetry`).
- Configuração declarada exclusivamente em `.mcp.json` na raiz do repositório, sem modificar arquivos globais de outros agentes/projetos:
  - Comando: `codegraph`
  - Argumentos: `["serve", "--mcp", "--path", "."]`
  - Ambiente: `DO_NOT_TRACK=1` e `CODEGRAPH_TELEMETRY=0`
- Observação sobre `--no-watch`: a flag `--no-watch` foi usada pelo Owner exclusivamente no teste smoke de handshake em subprocesso para encerramento determinístico. Na configuração padrão do `.mcp.json`, o file watcher é mantido ativo para que o índice acompanhe alterações de código durante o desenvolvimento. Em sistemas de arquivos lentos (ex.: WSL2 `/mnt`), `--no-watch` pode ser configurado, exigindo refresh explícito via `codegraph sync`.
- Procedimento de prova de MCP já realizado pelo Owner via subprocess stdio:
  - Envio de JSON-RPC `initialize` (protocolVersion `2024-11-05`), `notifications/initialized` e `tools/list`
  - Resposta confirmada com `serverInfo: { name: "codegraph", version: "1.6.2" }` e lista de ferramentas com `codegraph_explore`
  - Processo encerrado ordenadamente após handshake
  - Delimitação de escopo: prova demonstra capacidade do servidor stdio; a tool não está carregada no runtime deste agente.

## Skills concretas instaladas (.agents/skills)

Revisão realizada para evitar pacotes em massa, scripts com dependências externas quebradas ou coleções globais não auditadas. Instalado conjunto mínimo em `.agents/skills/`:

1. **atomic-commits**
   - Origem: `https://github.com/nullswan/atomic-commits.git`
   - Commit de referência: `b1428499726d0efd3b2c914e58a7279c707538e0` (folder hash: `9ddb320b9ef0f0c9f05650c32d92e58ba1fab193`)
   - Licença: MIT (texto integral obtido da raiz do repositório de origem e salvo em `.agents/skills/atomic-commits/LICENSE`, Copyright 2026 nullswan)
   - Estrutura: `.agents/skills/atomic-commits/SKILL.md`, `.agents/skills/atomic-commits/LICENSE` e `.agents/skills/atomic-commits/references/advanced.md`
   - Uso: Gatilhos para particionamento e estruturação de commits atômicos (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`). Zero dependências de runtime ou scripts.
   - Modificação local: Removido passo `git push` incondicional; adicionada política explícita exigindo autorização separada do usuário antes de qualquer push (`git push` nunca automático).

2. **frontend-design**
   - Origem: `https://github.com/anthropics/skills.git` (plugin: example-skills)
   - Commit de referência: `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (folder hash: `0d5b74a14bdf3ebcd64f352d06376a2ef05ed296`)
   - Licença: Apache-2.0 (cópia integral preservada em `.agents/skills/frontend-design/LICENSE.txt`)
   - Estrutura: `.agents/skills/frontend-design/SKILL.md` e `.agents/skills/frontend-design/LICENSE.txt`
   - Uso: Diretrizes de design visual deliberado, sistemas de tipos, paletas e hierarquia visual para construção de interfaces no kit. Zero dependências de scripts.
   - Modificação local: Adicionada seção de precedência para dashboards/painéis internos (tokens, Tailwind v4, shadcn/ui, acessibilidade e densidade de dados locais prevalecem; sem impor seções hero, fontes externas ou riscos visuais desnecessários).

## Comandos para o Owner provar integridade das skills locais

```bash
# Provar integridade dos arquivos e licenças das skills instaladas
test -f .agents/skills/atomic-commits/SKILL.md && test -f .agents/skills/atomic-commits/LICENSE && echo "atomic-commits OK"
test -f .agents/skills/frontend-design/SKILL.md && test -f .agents/skills/frontend-design/LICENSE.txt && echo "frontend-design OK"
```
