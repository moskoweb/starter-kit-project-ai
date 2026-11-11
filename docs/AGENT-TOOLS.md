# Ferramentas e skills para agentes

Este guia distingue conteúdo já incluído no repositório de ferramentas opcionais. Nada aqui instala ferramentas automaticamente. Revise cada origem, licença, escopo, permissões e efeitos antes de executar instaladores; não instale coleções inteiras nem altere configuração global sem necessidade.

## Matriz de adoção

| Opção | Estado | Recomendação | Escopo / custo |
| --- | --- | --- | --- |
| `AGENTS.md` e `.planning/` | Incluídos no kit | Mínimo: ler instruções locais e usar continuidade GSD já existente | Arquivos do projeto; sem instalação |
| `atomic-commits` | Vendored em `.agents/skills/atomic-commits/` | Mínimo para mudanças com vários commits lógicos; leia skill antes de usar | Skill local, MIT, versão 1.0.0; sem scripts |
| `frontend-design` | Vendored em `.agents/skills/frontend-design/` | Mínimo quando criar ou reformular UI | Skill local modificada, licença Apache-2.0 em `LICENSE.txt`; sem scripts. Tokens e padrões do kit prevalecem |
| GSD Core | Não vendored; disponível no runtime atual não implica disponibilidade em outro runtime | Recomendado para projetos médios/grandes que precisam de planejamento e continuidade; menor escopo pode usar `.planning/` existente | Instalador pergunta runtime e escopo; selecione local/project quando oferecido |
| `find-skills` (Vercel) | Externo | Opcional para descobrir skills pertinentes; auditar cada skill antes da instalação | `npx skills` pode instalar no projeto ou ambiente do agente; escolher escopo explicitamente |
| React Best Practices (Vercel) | Externo; não incluído | Opcional para revisão de performance React/Next.js | Skill do repositório Vercel; instalar somente quando trabalho React justificar |
| CodeGraph | CLI observada em máquina de preparação, não garantida no projeto derivado | Opcional para navegar relações em bases maiores; confirmar resultados no código-fonte | Índice `.codegraph/` local; integração de agentes pode modificar configurações |
| RTK (Rust Token Killer) | Não vendored | Opcional; manter desativado até saída comprimida ser comparada com saída original | Proxy de comandos shell; hooks podem reescrever invocações |

**Mínimo recomendado:** instruções do projeto, planejamento próprio em `.planning/`, skills vendored aplicadas conforme gatilho; use GSD Core para projetos médios/grandes. **Opt-in:** CodeGraph, `find-skills`, React Best Practices e RTK. Nenhuma dessas ferramentas é dependência do produto.

## Continuidade GSD e projetos derivados

O GSD Core oficial usa `.planning/` para visão, requisitos, roadmap, estado de sessão, pesquisa e fases. Neste kit, `.planning/` pertence ao planejamento do próprio kit. Ao gerar projeto derivado, a CLI exclui `.planning/` e índice CodeGraph. Não copie histórico, roadmap ou estado do kit para produto novo; inicie planejamento independente quando necessário. Não mantenha estado concorrente em outro arquivo.

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
