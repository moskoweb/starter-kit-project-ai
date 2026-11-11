---
phase: "05"
plan: "01"
type: execute
wave: 1
depends_on: ["04"]
requirements: [CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06]
autonomous: true
---

# Phase 05 — CLIs e geração

## Objetivo e gates de entrada

Gerar projeto independente, model Drizzle, resource completo, migration e painel com código editável e políticas reais. Ler `05-CONTEXT.md`, padrão aprovado fase 4, contratos finais de auth/contexto/RLS/painéis e AGENTS.md. **Fallback genérico (generic-agent workaround):** skills GSD lidas e aplicadas por worker genérico; não há alegação de execução tipada nem revisão independente de gsd-plan-checker.

Fase 4 precisa ter CRUD e bulk aprovados antes de capturar templates. Caminhos abaixo são entregáveis propostos, não APIs já existentes. Se export/schema/helper final mudou durante implementação anterior, adaptar templates aos nomes reais; não manter segunda convenção ou compatibilidade obsoleta.

## Contrato público a implementar

Workspace `packages/cli`, nome `@vibe/cli`, bin `vibe`, ESM Node 22. Preferir `node:util.parseArgs`, `node:fs/promises`, `node:path` e `node:child_process`; sem framework de CLI se parser nativo basta. Build TypeScript com tooling do workspace; bin compilado em `dist/index.js`, script `build` concreto. Templates são arquivos do produto, não interpretador de DSL em runtime da aplicação.

| Comando planejado | Entrada obrigatória e efeito |
|---|---|
| `vibe create <directory> --profile <personal|organizations|hybrid>` | Copia template independente, adapta perfil real; `--organization-mode single|multi` quando aplicável; single deixa requisito de provisionamento explícito, sem org herdada |
| `vibe model <name> --spec <json>` | Schema Drizzle e tipos inferidos; sem páginas/UI; `--migration` opcional gera SQL, nunca aplica |
| `vibe resource <name> --model <export> --panel <id> --spec <json>` | Resource sobre export existente, sem duplicar tabela |
| `vibe resource <name> --with-model --panel <id> --spec <json> --migration` | Model + resource + nova migration Drizzle, valida conjunto antes de escrita |
| `vibe migration generate --name <name>` | Invoca geração canônica Drizzle no workspace DB; sem conexão/apply |
| `vibe panel <id> --context <global|personal|org> --prefix <path>` | Configuração/registro e páginas iniciais funcionais com acesso escolhido; org aceita `--identifier slug|uuid` |
| `vibe doctor` | Diagnóstico de estrutura, versão/configuração e referências; sem exibir segredos nem mutar |

Geradores aceitam `--preview --non-interactive --json` (flags independentes); `--help` descreve exemplos e requisitos. Preview não cria projeto, pasta de destino, migration, journal ou cache persistente. Em modo interativo, perguntar apenas entradas ausentes; nunca inferir permissões/escopo. Em não interativo, ausência resulta erro. Sem `--force`/overwrite automático.

JSON de saída: `command`, `status`, `changes` (caminhos relativos e operação), `diagnostics` (código/mensagem/campo seguro). Sucesso exit 0; entrada inválida 2; conflito 3; configuração/pré-requisito ausente 4; falha de IO/subprocesso 1. Erro de item preserva plano inteiro. Logs de subprocessos devem ser sanitizados; JSON sem banners e sem valores de env.

Specs JSON são entrada de geração, não engine de produto: validar versão e propriedades desconhecidas. Model declara nome SQL/export, campos com tipo/nullability/default permitidos e relações explícitas; contexto é obrigatório para dado protegido. Resource declara export de model, campos de list/form/detail, labels, filtros/sort allowlists e vínculo às permissões existentes. Exigir regra de leitura/escrita e relação autorizada; nunca gerar `allowAll`, TODO ou formulário vazio quando informação faltar. Suportar tipos e relações efetivamente provados pelo domínio fase 4; documentar limites e rejeitar tipos não suportados com erro acionável, sem reduzir as capacidades listadas nos requisitos.

## Tarefas em ordem

### 1. Tracer: resource sobre projects existente — CLI-03, CLI-05, CLI-06

**Arquivos:** `packages/cli/{package.json,tsconfig.json,src/index.ts}`, módulos pequenos somente onde responsabilidade concreta exigir, templates de resource baseados no código fase 4.

1. Implementar parsing/validação, localizar raiz pelo workspace sem depender do cwd do kit, resolver painel/model existentes e ler spec sem executá-la. Validar nomes TS/SQL, caminhos, segmentos e limites antes de qualquer escrita. Rejeitar traversal absoluto/relativo, symlink dentro/fora da raiz, colisão case-insensitive, ID/prefixo reservado e saída fora do workspace.
2. Montar plano de arquivos completo em memória; validar conflitos em todos arquivos e registros. Alterações em arquivos de usuário só em pontos explícitos e estruturais já existentes, com precondição inequívoca. Se não reconhecer estrutura editada, retornar conflito, nunca substituição por regex ampla. Sem markers scaffolding ou updater permanente só para facilitar gerador.
3. Gerar páginas list/create/view/edit, form, tabela server-side, infolist, validação/DTOs/actions/bulk e registro no painel escolhido a partir do padrão fase 4. Recursos com nomes distintos reutilizam model `projects` sem novo schema/migration. Contexto e permissão são explícitos; não expor colunas automaticamente.
4. Preview apresenta mesmo conjunto/diff que execução produziria, sem escrever destino. Antes de commit revalidar precondições. Usar staging temporário e criação exclusiva; reverter somente arquivos criados/alterados pela própria transação se falhar. Preservar permissões/conteúdo pré-existente e não apagar mudanças concorrentes. Nenhuma dependência é instalada implicitamente.

**Gate tracer:** gerar segundo resource sobre projects em checkout temporário, inspecionar zero nova tabela, iniciar app e executar CRUD real com auth/RLS. Preview tem zero diff no destino; rerun retorna conflito e preserva hash dos arquivos. Não ampliar geradores antes desse fluxo funcionar.

### 2. Model, relações e migration canônica — CLI-02, CLI-03, CLI-06

**Arquivos:** templates de schema/domínio e integração DB no CLI; pacote DB somente para ponto de extensão concreto necessário.

1. Model isolado gera tabela Drizzle, exports e tipos `$inferSelect/$inferInsert`, sem Active Record, repository genérico ou UI. Defaults UUIDv4 e campos tenant/owner seguem fase 2. Schema agregador registra novo arquivo sem duplicação.
2. Relação declarada gera FK/constraint/política equivalente ao exemplo validado, incluindo escopo pessoal NULL. Exigir pai existente/compatível, usar helpers existentes e fornecer RLS USING/WITH CHECK, imutabilidade de escopo e grants runtime. Não gerar tabela tenant desprotegida para depois corrigir manualmente.
3. Combinação `--with-model --migration` usa mesmo pipeline de model e resource, sem duas definições ou duplicação. Campos de negócio vêm da spec, não defaults inventados. Permissão de model novo usa mapeamento explícito à política de acesso existente; não cria outra matriz de papéis.
4. Executar Drizzle Kit via argumentos separados (`shell:false`) e configuração canônica, nunca motor próprio de diff. Generate roda sobre schema/staging e gera novos SQL/journal/snapshot, preservando migrations antigas byte a byte. Preview não altera journal real. Se generate falhar, nenhum conjunto parcial é promovido.
5. Não chamar `db:migrate`, `push`, seed ou healthcheck de DB em generate. Se config atual exigir migration URL até para geração offline, separar validação de schema daquela exigida no apply, mantendo apply estritamente em `MIGRATION_DATABASE_URL`, sem fallback runtime. Não imprimir URL. SQL extra de RLS usa mecanismo de migration custom da versão instalada, conferido em help/docs oficiais durante implementação, não script de diff próprio.

**Gate:** model-only não cria UI; resource sobre model existente não muda schema; generate funciona sem banco acessível e não muda DB; SQL novo contém proteção de tenant. Banco só muda após comando explícito do owner. Migration aplicada antiga e customizações conservam hashes após geração/rerun.

### 3. Painéis configuráveis — CLI-04, CLI-05

**Arquivos:** templates de painel e integração com registry/dispatcher reais fase 3.

1. Gerar config com id, contexto, prefixo, navegação/theme/i18n locais e regra de acesso explícita; global usa política global existente, personal exige sessão, org exige membership/permissão. Sem shell público ou métrica falsa para parecer completo.
2. Registrar no catch-all e registry existentes; prefixo é valor de config, não nome de pasta pública nem rewrite para route group que não existe na URL. Links/resolver usam builder único. Validar prefixo normalizado e sobreposição com painéis/rotas reservadas.
3. Criar painel em prefixo customizado, mudar apenas config e provar páginas/links/refresh continuam funcionando. Adicionar resource ao painel prova registro real. Chamada direta não autenticada ou sem membership continua negada.

**Gate:** coexistem painéis existentes e gerado, sem privilégio herdado ou colisão; prefixo custom não exige mover arquivos.

### 4. Projeto/perfis e limpeza de template — CLI-01, CLI-06

**Arquivos:** templates/exportação em `packages/cli`, docs/configuração de produto existentes.

1. Empacotar allowlist de arquivos necessários ao produto. Não copiar checkout inteiro e depois tentar negar segredos. Template inclui lockfile, código editável, migrations, licenças/atribuições e docs de operação; não inclui `.planning`, `.git`, `.env` real/variantes, node_modules, `.next`, `.turbo`, `.codegraph`, logs, dumps, coverage ou caches. `.env.example` contém placeholders somente.
2. Remover dos arquivos exportados caminhos absolutos, DB/org IDs/URLs/creds do kit, referências a histórico de planejamento e tooling pessoal `.mcp.json`. Preservar skills/documentação de produto apenas quando portáveis/licenciadas; documentação copiada não pode exigir `.planning` ausente. Não copiar credencial autorizada de teste como default.
3. Destino já existente não vazio é conflito; preview não cria destino. Nome de projeto é validado, arquivos package/config têm identidade correta. Instalação é ação explícita do usuário, não side effect oculto.
4. Perfis usam mecanismo real fase 2: personal não exige organização nem endpoints/onboarding org; organizations remove fluxo pessoal e aceita single/multi; hybrid preserva ambos. Migrations compartilhadas podem manter tabelas auth sem forçar uso. Single documenta provisionamento explícito antes de iniciar fluxo organizacional; nunca replica org do kit.
5. `doctor` informa requisitos ausentes por nome (Node/pnpm/config/exports), sem conteúdo de secrets; sem auto-fix destrutivo ou conexão desnecessária ao banco.

**Gate:** criar fora do repositório três perfis e verificar estrutura/fluxos reais, sem referências ao checkout. Pelo menos hybrid instala, migra explicitamente e executa CRUD gerado em banco autorizado. Outros perfis comprovam onboarding/negações pertinentes, não somente build.

### 5. Provas e documentação de uso — todos CLI

**Entregar:** `packages/cli/tests/cli.integration.test.mjs` com `node:test`, filesystem temporário e subprocessos reais; README/docs existentes com CLI, schema da spec, exemplos completos, erros/códigos e operação generate/apply. Não criar teste que só procure strings em templates.

Testes do CLI cobrem comandos/flags, ausência de campos em modo não interativo sem prompt, JSON/códigos, preview sem escrita, nomes/traversal/symlinks, destino existente, conflito em arquivo intermediário, falha de geração sem commit parcial, preservação de hashes/migrations, exports únicos e diagnóstico sem segredos. Criar fixture local editável com campos/relações/permissões completos; testes não dependem de nome arbitrário ainda inexistente. Scan do template gerado procura paths/segredos **sintéticos plantados na origem de teste**, `.planning` e caches; nunca imprimir segredo real.

**Comandos do owner após bin e teste implementados**, não disponíveis nem executados por este plano:

```sh
pnpm --filter @vibe/cli build
node --test packages/cli/tests/cli.integration.test.mjs
node packages/cli/dist/index.js --help
pnpm check-types
```

Teste usa `process.execPath` e caminho absoluto do bin compilado para rodar create/model/resource/migration/panel em diretórios temporários; não depende de bin global instalado. Para gate externo real, owner usa CLI compilado em diretório fora do kit, `pnpm install --frozen-lockfile`, configura URLs novas sem logá-las, então executa no **projeto gerado**:

```sh
pnpm --filter @vibe/db db:migrate
pnpm --filter app dev
```

Migração é decisão explícita antes do segundo comando, em DB isolado autorizado. Confirmar fluxo auth/CRUD/relação/bulk via teste real fase 4 copiado/adaptado ao projeto e browser, com comando documentado naquele resultado. Gerar migration antes do apply e comparar estado do banco comprova separação; teste de filesystem sozinho não comprova isso. Verificação de profiles/painéis inclui chamadas diretas não autorizadas. Não inventar `test:cli`/`test:resources` sem scripts implementados.

## Matriz de encerramento

| Requisito | Evidência exigida |
|---|---|
| CLI-01 | Três perfis independentes, ausência de credenciais/planning/caches, app fora do kit com CRUD real |
| CLI-02 | Schema Drizzle/tipos sem UI; nova migration offline; apply separado |
| CLI-03 | Resource completo sobre model existente sem duplicação e combinação completa funcional |
| CLI-04 | Painel registrado em catch-all, prefixo configurável, política aplicada em request direto |
| CLI-05 | Flags não interativas, códigos estáveis, nomes inválidos/conflitos sem overwrite |
| CLI-06 | Preview fiel sem escrita, hashes/customizações/migrations preservados, doctor sanitizado |

Nada de publicar pacote, push, expor serviço ou instalar ferramenta global nesta fase. Sem sync/update engine. Owner registra resultados reais após integração; nenhum requisito concluído por existir template ou comando no plano.
