# CLI de recursos e painéis

Execute CLI compilada a partir da raiz do projeto. Todos comandos são não interativos; `--noninteractive` torna essa intenção explícita. `--json` retorna caminhos/conteúdo sem segredos. `--preview` valida precondições e mostra plano sem escrever.

```sh
vibe panel sales --context organization --prefix /sales --preview --json
vibe panel sales --context organization --prefix /sales --noninteractive
vibe resource Note --model note --panel personal --with-model --spec '{"scope":"personal","fields":{"title":{"type":"string","required":true},"done":{"type":"boolean","default":false}},"permissions":{"read":["personal"],"create":["personal"],"update":["personal"],"delete":["personal"]}}' --preview --json
```

`--spec` aceita JSON inline ou caminho UTF-8 JSON. Mesmo comando sem `--preview` grava plano. `--with-model` usa `renderModel`, registra export no schema e exige nome de export camelCase de Name. Sem flag, nenhum arquivo de banco é criado/alterado.

## Spec explícita

`scope`: `personal`, `organizations` ou `hybrid`. `fields` é allowlist tanto de leitura como escrita. Nunca se inferem campos de tabela, credenciais ou campos sensíveis. `id`, `organizationId` e `ownerUserId` são reservados e nunca vêm do formulário.

Tipos de recurso suportados: `string` (varchar), `text`, `integer`, `boolean`, `uuid` com relação explícita; `required`, `optional`, `default` seguem model spec. Timestamp editável, arrays, enums e JSON são rejeitados. `permissions` deve declarar exatamente `read`, `create`, `update`, `delete`, cada um com array de papéis entre `personal`, `owner`, `admin`, `member`, `viewer`; array vazio nega operação. Não há permissão implícita para admin organizacional. Contexto global não suporta CRUD gerado.

Model existente suportado: export direto `pgTable(...).enableRLS()` do agregador `packages/db/src/schema.ts`, UUID `id`, `ownerUserId`, `organizationId`, políticas explícitas `pgPolicy` ou helper `policies(table)` do domínio existente; builders devem coincidir com spec. Campos obrigatórios sem default fora da allowlist são rejeitados. Tabelas sem RLS, exports indiretos, sintaxe customizada, modelos com relações obrigatórias omitidas são rejeitados; CLI não tenta interpretar JavaScript arbitrário. Revisar políticas de modelo existente antes de gerar: parser não prova semântica SQL.

Relação existente: adicionar UUID em `fields` e `relations: { "projectId": { "model": "projects", "label": "name" } }`. FK deve existir explicitamente no modelo e apontar para `id` de tabela RLS com owner/organização. Opções vêm de consulta autorizada no mesmo tenant, limitadas a 100; formulário usa select, filtro usa UUID validado, actions verificam pai visível antes da escrita. Assim `--model tasks` funciona com `title: text` e `projectId: uuid`, sem duplicar tabelas. `--with-model` com relações exige primeiro modelo com FK existente; renderModel não fabrica relações.

## Arquivos e execução

Cada resource gera um arquivo `apps/app/src/lib/resources/definitions/<kebab-name>.ts` que exporta `defineResource(...)` (ver `docs/UI.md`, seção Resources declarativos). Conteúdo:

- Colunas, filtros por relação, formulário e infolist derivados da spec, com rótulos `{ "pt-BR", en }` para traduzir depois.
- Consulta com allowlist de campos, busca escapada no primeiro campo textual, ordenação só por colunas conhecidas e paginação `10/25/50/100`.
- Mutações validam schema estrito no servidor e devolvem `fieldErrors`. Autorizam papel e escopo dentro da transação RLS e verificam se o registro pai está visível antes de escrever.

O painel monta lista, criar, visualizar e editar a partir da definição; não há views geradas.

Registro canônico: `apps/app/src/lib/panels/resources.ts`. A CLI adiciona import explícito e a entrada `{ kind: "resource", definition, panelIds }`; não existe descoberta dinâmica. `kind: "custom"` continua disponível para páginas com `render(ResourceContext)` próprio. Ícone padrão gerado: `settings`; troque por uma chave de `components/panels/nav-icons.ts`.

`panel` gera `<id>.config.ts`, importa no registry e registra config. Contexto organização usa identificador slug. Prefixos reservados, duplicados e sobrepostos são rejeitados; formato estrutural inesperado do registry falha fechado.

Escrita usa preflight completo, arquivos novos com no-overwrite, lock `.vibe-cli.lock`, comparação do conteúdo anterior e rollback em erro. Não executar editores concorrentes sobre registry/schema/migrations durante geração. Processo morto abruptamente pode deixar lock; investigar antes de removê-lo. `--with-model` grava também `packages/db/scope-protections/<table>.sql`, trigger que impede alteração de `owner_user_id` e `organization_id`. `--migration` é opcional: executa geração canônica agora; sem flag, executar `pnpm db:generate` depois. Esse comando de desenvolvimento usa tsx/CLI e Drizzle para gerar schema seguido de custom migrations registradas para proteções pendentes; mantém hashes SHA-256 em `migrations/scope-protections.json`. Proteção incorporada não pode ser alterada/removida silenciosamente; `db:migrate` recusa proteção pendente. Geração exige config padrão `out: "./migrations"`, funciona offline e nunca aplica SQL. Preview não executa Drizzle nem escreve lock/manifest/arquivos. Falha reverte recurso/modelo/registries, diretórios novos e snapshot dos artefatos de migração. Aplicar pelo workflow normal do projeto; histórico aplicado do kit permanece intacto.

`create` aceita `--preview --json --noninteractive`; preview não copia arquivos. `doctor` relata somente presença de configuração, scripts e módulos (nunca valores), devolve exit code 1 se faltar requisito. Exportar variáveis no shell antes do diagnóstico; ele não carrega `.env`.

## Verificação manual reproduzível

Em cópia descartável, rodar comando Note com preview e confirmar nenhum arquivo criado; rodar sem preview, repetir e exigir recusa por conflito. Rodar `pnpm db:generate` e conferir migration de tabela antes da custom migration de trigger. Antes de gerar, `db:migrate` deve recusar proteção pendente; após geração, alterar fonte SQL deve falhar fechado. Forçar falha de Drizzle após criar artefato e conferir rollback de schema, recursos, journal, snapshots e diretórios novos. Abrir `/app/note`, criar, editar e excluir linha autenticado. Tentar sessão de outro usuário e confirmar isolamento RLS. Em transação RLS autorizada, tentar trocar owner, organização e converter pessoal para organização; trigger deve recusar com `23514`, mesmo entre organizações acessíveis. Em painel organização, testar viewer negando create/update/delete e membro de outra organização sem acesso. Conferir labels pt/en e relação tasks existente. Build/test não foram executados por este trabalho.
