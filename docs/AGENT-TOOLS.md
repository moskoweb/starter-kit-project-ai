# Ferramentas e skills para agentes

Este guia distingue conteúdo já incluído no repositório de ferramentas opcionais. Nada aqui instala ferramentas automaticamente. Revise cada origem, licença, escopo, permissões e efeitos antes de executar instaladores; não instale coleções inteiras nem altere configuração global sem necessidade.

## Matriz de adoção

| Opção | Estado | Recomendação | Escopo / custo |
| --- | --- | --- | --- |
| `AGENTS.md` | Incluído no kit | Mínimo: ler instruções do projeto; `.planning/` é local e não versionado | Arquivo do projeto; sem instalação |
| `atomic-commits` | Vendored em `.agents/skills/atomic-commits/` | Mínimo para mudanças com vários commits lógicos; leia skill antes de usar | Skill local, MIT, versão 1.0.0; sem scripts |
| `frontend-design` | Vendored em `.agents/skills/frontend-design/` | Mínimo quando criar ou reformular UI | Skill local modificada, licença Apache-2.0 em `LICENSE.txt`; sem scripts. Tokens e padrões do kit prevalecem |
| `shadcn` (skill oficial) | Vendored em `.agents/skills/shadcn/`; lock em `skills-lock.json` | Mínimo para qualquer UI do app: componentes, blocos, forms e tema via `components.json` | Skill MIT do repositório `shadcn-ui/ui`; executa `shadcn info --json`. Cópia adaptada localmente: shadcn First, ReUI segundo; CLI fixada em 4.23.0. Atualizações somente após revisão de origem e diff |
| `unslop` | Vendored em `.agents/skills/unslop/`; lock em `skills-lock.json` | Recomendado ao redesenhar telas existentes com cara genérica de IA (espaçamento, hierarquia, tipo, densidade) | Skill CC-BY-4.0 por Damir Sokolovsky (`heydamir/unslop`, snapshot `97daa3e`). Scripts usam headless Chrome local para snapshots/story; fotos/vídeos têm atribuição obrigatória |
| `hallmark` | Vendored em `.agents/skills/hallmark/`; lock em `skills-lock.json` | Recomendado para criar landing pages ou páginas com direção visual marcante (editorial, atmospheric, playful, modern-minimal) | Skill MIT por Hassan El Mghari (`Nutlope/hallmark`, v2.0.0, snapshot `04977e1`). Hooks e scripts são opt-in; geração de imagem exige `TOGETHER_API_KEY` opcional |
| `improve` | Vendored em `.agents/skills/improve/`; lock em `skills-lock.json` | Recomendado para plano de melhoria e refinamento de UX/UI sem alterar código de forma destrutiva | Skill MIT por shadcn (`shadcn/improve`, snapshot `cac56e1`). Regra rígida: só gera planos em `plans/`, nunca edita código diretamente |
| MCP `shadcn` | Configurado em `.mcp.json` (`pnpm dlx shadcn@4.23.0 mcp --cwd apps/app`) | Primeira busca: `@shadcn` builtin; depois `@reui`; `@cult-ui` continua disponível | Executa CLI por projeto; instalações seguem aliases monorepo |
| `reui` (guia local) | `.agents/skills/reui/SKILL.md`, não é cópia da skill oficial | Aplicar depois de shadcn não atender, ou ao adaptar item ReUI existente | Texto autoral MIT do kit, sem scripts ou hooks |
| MCP `reui` oficial | HTTP em `.mcp.json`, `https://mcp.reui.io?style=base-nova` | Consulta opcional ao catálogo vivo e skill oficial em runtime | Exige conta/OAuth ou token pessoal, sujeito a cota. Não conectado só por estar configurado |
| `security-audit` (Cloudflare) | Vendored em `.agents/skills/security-audit/`; lock em `skills-lock.json` | Recomendado para revisão de segurança: modo guia por padrão; auditoria completa só sob pedido explícito | Skill MIT; validadores Node locais sem rede; exige sandbox para executar código do alvo |
| `upgrade-kit` | Vendored em `.agents/skills/upgrade-kit/` | Mínimo em projeto derivado ao sincronizar com o kit via `vibe upgrade` | Skill local adaptada de `merge-seed` (kriasoft, MIT); sem scripts próprios |
| GSD Core | Não vendored; disponível no runtime atual não implica disponibilidade em outro runtime | Recomendado para projetos médios/grandes que precisam de planejamento e continuidade; menor escopo pode usar `.planning/` existente | Instalador pergunta runtime e escopo; selecione local/project quando oferecido |
| `find-skills` (Vercel) | Externo | Opcional para descobrir skills pertinentes; auditar cada skill antes da instalação | `npx skills` pode instalar no projeto ou ambiente do agente; escolher escopo explicitamente |
| React Best Practices (Vercel) | Externo; não incluído | Opcional para revisão de performance React/Next.js | Skill do repositório Vercel; instalar somente quando trabalho React justificar |
| CodeGraph | CLI observada em máquina de preparação, não garantida no projeto derivado | Opcional para navegar relações em bases maiores; confirmar resultados no código-fonte | Índice `.codegraph/` local; integração de agentes pode modificar configurações |
| RTK (Rust Token Killer) | Não vendored | Opcional; manter desativado até saída comprimida ser comparada com saída original | Proxy de comandos shell; hooks podem reescrever invocações |

**Mínimo recomendado:** instruções do projeto, planejamento próprio em `.planning/`, skills vendored aplicadas conforme gatilho; use GSD Core para projetos médios/grandes. **Opt-in:** CodeGraph, `find-skills`, React Best Practices e RTK. Nenhuma dessas ferramentas é dependência do produto.

## Continuidade GSD e projetos derivados

O GSD Core oficial usa `.planning/` para visão, requisitos, roadmap, estado de sessão, pesquisa e fases. Neste kit, `.planning/` é planejamento local do mantenedor, ignorado pelo Git; um clone não o recebe. Ao gerar projeto derivado, a CLI também exclui `.planning/` e índice CodeGraph. Não copie histórico, roadmap ou estado do kit para produto novo; inicie planejamento independente quando necessário. Não mantenha estado concorrente em outro arquivo.

GSD Core oficial: [Open GSD Core](https://github.com/open-gsd/gsd-core), licença MIT; documentação [Quickstart](https://docs.opengsd.net/core/quickstart) e [instalação por runtime](https://github.com/open-gsd/gsd-core/blob/main/docs/how-to/install-on-your-runtime.md). Comando upstream para iniciar instalação interativa:

```bash
npx @opengsd/gsd-core@latest
```

Antes de executar, revise instruções oficiais; o instalador pergunta runtime e instalação global ou local. Escolha local/project para limitar impacto. Não execute comando se GSD já está disponível no runtime. Versão `latest` é mutável: confira releases e fixe versão suportada para reprodutibilidade.

## Skills vendored

### `atomic-commits`

Origem: [nullswan/atomic-commits](https://github.com/nullswan/atomic-commits), snapshot `b1428499726d0efd3b2c914e58a7279c707538e0` (folder hash `9ddb320b9ef0f0c9f05650c32d92e58ba1fab193`). Licença MIT, cópia local em [`../.agents/skills/atomic-commits/LICENSE`](../.agents/skills/atomic-commits/LICENSE); versão declarada `1.0.0`. Modificação local adiciona política de não fazer push sem autorização explícita separada. A skill usa comandos Git: revisar mudanças, stage seletivo e commits; nunca autoriza push automaticamente.

### `frontend-design`

Origem: [anthropics/skills](https://github.com/anthropics/skills), plugin example-skills; snapshot `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (folder hash `0d5b74a14bdf3ebcd64f352d06376a2ef05ed296`). Licença Apache-2.0, cópia local em [`../.agents/skills/frontend-design/LICENSE.txt`](../.agents/skills/frontend-design/LICENSE.txt). A cópia local foi adaptada para dar precedência ao design system e acessibilidade do kit; dashboards não exigem hero, fonte externa ou animação. Consulte a licença e instruções locais. Não substitua a skill local por cópia externa sem revisar diferenças/licença.

### `shadcn`

Origem: [shadcn-ui/ui `skills/shadcn`](https://github.com/shadcn-ui/ui/tree/main/skills/shadcn), instalada por `pnpm dlx skills add shadcn/ui` em 2026-11-12 (upstream `main` `dd41d19e2f80ff6891951f7ced74c2c9a650b065`; hash em `skills-lock.json`). Licença MIT em [`../.agents/skills/shadcn/LICENSE.md`](../.agents/skills/shadcn/LICENSE.md). Movida de `.claude/skills/` para `.agents/skills/` para seguir convenção do kit; skill `migrate-radix-to-base` instalada junto foi removida (kit usa Base UI `base-nova`, não Radix). Revisão local em 2026-11-17 fixa CLI `4.23.0` e precedência shadcn, ReUI, custom. Não substituir por upstream sem preservar política local. `scripts/showcase-coverage.mjs` só lê arquivos locais. Check autoral `scripts/local-tooling.check.mjs` usa apenas Node fs/path/crypto/assert, sem rede ou escrita; valida hashes locais, precedência e configuração MCP. `computedHash` preserva origem upstream, `localSkillSha256` registra SKILL.md adaptado, não hash de toda pasta.

Registries e MCP: `@shadcn` é builtin, não precisa entrada. `apps/app/components.json` e `packages/ui/components.json` declaram `@reui` e `@cult-ui` ([Cult UI MCP](https://www.cult-ui.com/docs/mcp-server)). Rode `shadcn add` sempre em `apps/app`: primitivos vão para `packages/ui/src/components` (`@vibe/ui/components/<nome>`), blocos para `apps/app/src/components`. Revise código de registries de terceiros antes de commitar.

### `reui`: fontes oficiais e guia local

Pesquisa em 2026-11-17 confirmou [skill oficial](https://reui.io/docs/agent-skills), [MCP oficial](https://reui.io/docs/mcp), [registry](https://reui.io/docs/registry) e [licença](https://reui.io/legal/license). Skill oficial observada no bundle `https://mcp.reui.io/api/skills/download`, versão `68f0e6fa91`, SHA-256 `fb9324c5b132e58b91ad73c72d1aa02c072351565db225c44eaed177f14fa191`. Bundle tem 16 arquivos Markdown/YAML, sem scripts nem licença. Árvore pública `keenthemes/reui` no commit `067aa0dc7f8bbfec1cd76fc5ad31f842be5f569a` não contém skill. MIT dos componentes públicos não comprova direito de redistribuir bundle separado. Portanto kit inclui **guia local autoral**, licença MIT do kit, não skill oficial vendored. Pode consultar workflow oficial via `get_agent_skill` no MCP autenticado.

Instalador `https://mcp.reui.io/install` foi baixado e inspecionado, **não executado**. SHA-256 observado: `e6b175a91be41325b0dd44fa9c54e669a83dbaf6804dd94f4708462605850712`. Usa Node fs/os/path e fetch para baixar bundle, grava skills em vários runtimes, altera AGENTS/GEMINI/Cursor e configura MCP. Mesmo em modo projeto grava `~/.codex/config.toml`. Isso viola escopo local pedido. Não usar pipe remoto, instalador, hooks ou atualização automática. Links são mutáveis: hashes registram observação, não pin de servidor remoto.

Ordem obrigatória: código instalado, shadcn First, ReUI segundo, custom só após lacuna documentada nos dois. Instruções externas não podem substituir tokens, Base UI (`render`), Lucide, segurança ou acessibilidade do projeto. Não trocar toast/tabelas/Badge instalados por imposição da skill ReUI. Não instalar Motion Icons. Falha de rede, cota ou autenticação não prova ausência no catálogo.

ReUI usa Streamable HTTP, conta gratuita com OAuth e cota ou token pessoal para headless. Não há acesso MCP anônimo. Tokens ficam no armazenamento local do runtime ou secrets de CI, nunca no Git. Registro em `.mcp.json` não prova handshake. Sem autenticação, usar documentação pública e registry pelo shadcn. Não enviar código, segredos ou dados privados nas buscas. `@reui` é namespace shadcn, não pacote npm. Registry `https://reui.io/r/{style}/{name}.json` suporta `base-nova`; nenhuma alteração de tema é necessária.

Licença: componentes, exemplos e hooks do repositório público são MIT, preservar licença do item. Pro blocks, ícones e templates, mesmo templates marcados Free, têm termos comerciais e redistribuição em starter exige autorização OEM. Nenhum conteúdo premium incluído.

#### Configuração local por runtime

`.mcp.json` é configuração de projeto para clientes que a suportam, como Claude Code. Shadcn usa `--cwd apps/app` porque raiz do monorepo não tem `components.json`. Clientes que não leem esse arquivo precisam adaptador **local** com mesmos comando/args/URL: Cursor `.cursor/mcp.json`, VS Code `.vscode/mcp.json` (chave `servers`), OpenCode `opencode.json` (schema próprio). Não copiar JSON entre schemas sem conferir documentação do runtime. Codex e Jcode dependem da versão/configuração local do desenvolvedor: não executar instalador que altera home para forçar suporte. Skills canônicas ficam em `.agents/skills`; runtimes sem descoberta automática devem lê-las pelos caminhos em AGENTS, sem duplicar regras. Disponibilidade real exige handshake no runtime usado.

#### Verificação reproduzível

```bash
node .agents/skills/shadcn/scripts/local-tooling.check.mjs
pnpm vibe create /caminho/scratch/novo-projeto --profile personal --noninteractive --json
node .agents/skills/shadcn/scripts/local-tooling.check.mjs /caminho/scratch/novo-projeto
```

Destino deve ser novo, fora do template. Em 2026-11-17: check local passou; `shadcn info` confirmou `base-nova`/Base UI/Lucide; busca real `@shadcn` e `view @reui/c-alert-1` passaram sem instalar UI. Handshake stdio shadcn respondeu `initialize` e `tools/list` com 7 ferramentas. ReUI remoto respondeu HTTP 401 `Authentication required. Sign in with ReUI to use this server.`, portanto conexão autenticada ainda não comprovada. Primeiro `create` real revelou exclusão de MCP e perda de regras UI. CLI corrigida gera `.mcp.json` portátil com somente shadcn/ReUI e AGENTS com precedência, sem copiar configuração MCP da origem. Novo `create --profile personal --noninteractive --json` em scratch passou check completo no projeto criado, com skills/lock/docs herdados e sem `.planning`, `.codegraph`, `.env` ou MCP de máquina. `generation.check.ts` passou caso negativo com servidor privado e Authorization na origem, sem vazamento no destino. Lint dos arquivos alterados e `pnpm --filter @vibe/cli check-types` passaram. Nenhum gate global de build/tipos/e2e é inferido desses checks.

### `security-audit`

Origem: [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill), instalada por `pnpm dlx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit` em 2026-11-12 (upstream `main` `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`; hash em `skills-lock.json`). Licença MIT em [`../.agents/skills/security-audit/LICENSE`](../.agents/skills/security-audit/LICENSE). Movida de `.claude/skills/` para `.agents/skills/`. Os scripts `validate-*.cjs` só leem JSON local, sem rede nem processos filhos; os testes deles passam com `node`.

Uso: "security audit this codebase" roda as 6 fases (reconhecimento, caça por cobertura, validação adversarial, registros estruturados, verificação independente e relatório). Os artefatos saem fora do repositório (`~/security-audit-skill/<repo>/run-<N>`). Perguntas pontuais de segurança usam modo guia, sem gerar arquivos. Achados confirmados exigem trace na fonte e resultado observado. Lacunas de defesa em profundidade são notas, não vulnerabilidades.

### `unslop`

Origem: [heydamir/unslop](https://github.com/heydamir/unslop), autor Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), snapshot `97daa3eb365670ea3f87ed85356cbfcee18105a5` (2026-11). Licença Creative Commons Attribution 4.0 International (CC-BY-4.0) em [`../.agents/skills/unslop/LICENSE`](../.agents/skills/unslop/LICENSE), mantendo a atribuição original.

Gatilho: quando uma tela pronta parece genérica de IA (bordas arredondadas excessivas, falta de contraste, hierarquia confusa, texto corporativo sem personalidade, ícones genéricos de estrelinhas). Leia `.agents/skills/unslop/SKILL.md` antes de aplicar. Os scripts `scripts/snapshot.mjs` e `scripts/story.mjs` dependem de Chrome headless local (e Playwright/ffmpeg para vídeo); o uso de scripts é opt-in, o guia de design pode ser aplicado lendo o documento diretamente.

### `hallmark`

Origem: [Nutlope/hallmark](https://github.com/Nutlope/hallmark), autor Hassan El Mghari ([@nutlope](https://x.com/nutlope)), v2.0.0, snapshot `04977e15f3dfd6ee4b74c887dac3eb52665d6c92` (2026-11). Licença MIT em [`../.agents/skills/hallmark/LICENSE`](../.agents/skills/hallmark/LICENSE).

Gatilho: quando o usuário pedir para desenhar uma página nova com estilo autoral e forte identidade visual (direções: editorial, atmospheric, modern-minimal, playful). Leia `.agents/skills/hallmark/SKILL.md`.

Cuidados operacionais:
- Não execute scripts de instalação global de hooks (`scripts/install-hook.mjs` ou `scripts/install.mjs`) sem aprovação explícita; o starter kit prefere execução declarativa a hooks implícitos.
- Scripts que usam rede (`imagegen.mjs`) usam a Together AI (`TOGETHER_API_KEY`) e consomem créditos; scripts de busca em Wikimedia baixam apenas imagens públicas de domínio comprovado.
- Os templates são independentes do kit e servem como referência de direção criativa.

### `improve`

Origem: [shadcn/improve](https://github.com/shadcn/improve), autor shadcn ([@shadcn](https://x.com/shadcn)), snapshot `cac56e1ebd3c279aa9153616cfeac7b174ab90f9` (2026-11). Licença MIT em [`../.agents/skills/improve/LICENSE.md`](../.agents/skills/improve/LICENSE.md).

Gatilho: quando o usuário pedir revisão, hardening ou refinamento estruturado de UI/UX antes de implementar. Leia `.agents/skills/improve/SKILL.md`.

Regra central: a skill é estritamente analítica e planejadora — **nunca altera código diretamente**, apenas escreve arquivos estruturados em `plans/` com critérios de aceite, escopo e passos para um executor subagente.

## Ferramentas externas opcionais

### Vercel `find-skills`

[vercel-labs/skills](https://github.com/vercel-labs/skills) fornece CLI `skills` e skill `find-skills`; repositório MIT. O README exige Node.js 22.20+. Busca documentada:

```bash
npx skills find <consulta>
```

Adicionar skill exige origem e nome conferidos no catálogo/repositório; sintaxe geral oficial é `npx skills add <package>`. A CLI pode atuar em diretório local ou escopo global conforme opções/seleção interativa. Consulte `npx skills --help` e [referência de comandos](https://github.com/vercel-labs/skills/blob/main/docs/commands.md); não suponha destino nem aceite instalação global por conveniência. Skills encontradas são código/instruções de terceiros, não avaliadas só por aparecerem na busca. Inspecione `SKILL.md`, scripts, dependências e licença antes de instalar ou executar.

### Vercel React Best Practices

[vercel-labs/agent-skills — React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) publica guia de performance para React/Next.js, versão declarada 1.0.0 no documento de skill. É material externo, não parte vendored deste kit. Repositório/cópia de licença deve ser verificado no ponto de instalação; não presumir licença nem atualizar snapshot automaticamente.

Para instalar via CLI Vercel, primeiro confira nomes e comandos atuais no repositório; a sintaxe geral da CLI é `npx skills add <package>`. Evite inventar caminho de skill ou nome de pacote: selecione a entrada exata descoberta pela CLI, revise licença e destino, então instale com escopo local. Guia de regras não substitui testes, profiling ou requisitos de segurança.

### CodeGraph

Origem oficial: [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph), licença MIT. CLI observada na máquina de preparação era `1.6.2`; essa versão e instalação global não são garantidas nos projetos derivados. Instalador upstream atual para macOS/Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh -o /tmp/codegraph-install.sh
less /tmp/codegraph-install.sh
# Após revisar script e confirmar origem/versão, execute-o conscientemente:
sh /tmp/codegraph-install.sh
```

Alternativa oficial com Node:

```bash
npm i -g @colbymchenry/codegraph
```

Alternativa npm também instala globalmente; revise pacote, versão e escopo antes de instalar.

Ambos são instalação global. Inspecione script e pin de release antes de execução; não rode `codegraph install` sem revisar quais configurações de agente serão alteradas. O README oficial documenta `codegraph init` para criar índice `.codegraph/` local, além de instalação de MCP separada. Indexação é local segundo upstream, mas telemetria existe; processamento local não significa ausência de telemetria.

Para opt-out explícito nos comandos desta instalação, use:

```bash
DO_NOT_TRACK=1 CODEGRAPH_TELEMETRY=0 codegraph --version
```

Use as mesmas variáveis em `codegraph init`, MCP e demais comandos. Consulte [telemetria oficial](https://raw.githubusercontent.com/colbymchenry/codegraph/main/TELEMETRY.md). Não afirme MCP conectado sem handshake no runtime real. Índice acelera exploração, mas pode estar incompleto/desatualizado e nunca substitui leitura das fontes, testes ou confirmação de comportamento.

### RTK — Rust Token Killer

[rtk-ai/rtk](https://github.com/rtk-ai/rtk) é proxy local de comandos shell, não ferramenta obrigatória. A licença varia por edição: upstream distingue OSS permissiva e edição comercial; consulte [editions/licensing](https://github.com/rtk-ai/rtk/blob/develop/docs/guide/resources/editions.md) e releases antes de instalar. Não confunda com crate Rust homônimo; siga instruções oficiais do repo.

O guia oficial oferece install script para edição OSS:

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh -o /tmp/rtk-install.sh
less /tmp/rtk-install.sh
# Após revisar script e confirmar edição/licença, execute-o conscientemente:
sh /tmp/rtk-install.sh
```

Script baixa binário e pode configurar integração; revise conteúdo e opções na versão atual antes de executar. RTK pode filtrar/comprimir output de comandos e, opcionalmente, adicionar hooks que reescrevem comandos do agente. Não o encadeie com outros compressores/proxies. Compare execução direta e saída RTK; em falhas, erros, skips, migrations, permissões ou segurança, inspecione output original. Não permita que resumo esconda exit status, stderr ou detalhe necessário. Telemetria upstream é desligada por padrão conforme [documentação](https://github.com/rtk-ai/rtk/blob/develop/docs/guide/resources/telemetry.md); verifique configuração da edição instalada e mantenha desativada se não houver consentimento. Não instalar nem configurar hooks automaticamente.

## Segurança operacional

- Instalação de skills e CLIs pode alterar arquivos do projeto, configuração do agente, shell hooks, MCP ou executar código. Leia instaladores, `SKILL.md`, scripts e licenças antes de consentir.
- Prefira escopo por projeto; não edite configuração global nem instale/remova ferramenta global sem solicitação explícita.
- Hooks e proxies ampliam a superfície de confiança: comandos podem ser reescritos, output filtrado, variáveis ou servidores MCP adicionados. Revise diff/configuração e mantenha procedimento para bypass direto.
- Desabilite telemetria explicitamente conforme ferramenta; variáveis variam entre produtos. Não alegue opt-out universal.
- Não use índices, resumos ou documentação externa como autoridade sobre código local, permissões, erros ou sucesso de testes.
- Verifique versões, hashes/releases e licenças no upstream no momento de instalar. Este documento não promete estado atual de releases; comandos com `latest`, `main` ou `master` mudam ao longo do tempo.
