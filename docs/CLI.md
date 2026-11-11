# CLI

Run local CLI through `pnpm exec tsx packages/cli/src/index.ts`.

- `create <dir> --profile personal|organizations|hybrid` copies source kit into a new directory.
- `doctor` verifica estrutura, scripts e presença de configuração sem imprimir valores; configuração ausente retorna erro acionável.
`model Name --spec JSON [--preview] [--json] [--migration]` generates and registers a Drizzle schema. Inline spec: `{"scope":"personal|organizations|hybrid","fields":{"title":{"type":"string","required":true},"createdAt":{"type":"timestamp","default":"2026-01-01T00:00:00Z"}}}`. Supported types: string, text, integer, boolean, timestamp, uuid. Every generated table has owner identity and RLS. `personal` permits owner-only rows with no organization; `organizations` requires organization and membership; `hybrid` permits either owner-only or organization-member rows. Generator also writes `packages/db/scope-protections/<table>.sql`: database trigger rejects changes to owner and organization, including transitions between personal and organization scope. Preview writes nothing, including with `--migration`. Optional `--migration` invokes canonical generation immediately; otherwise run `pnpm db:generate` later. This development command requires CLI source, tsx and drizzle-kit; it generates schema migration first, then registered Drizzle custom migrations for pending protections. SHA-256 manifest in `migrations/meta/scope-protections.json` tracks incorporated SQL; changed or missing incorporated sources fail closed. `pnpm db:migrate` refuses pending protections. Neither generator applies migrations or edits applied kit history.

Resource e painel: ver [CLI-RESOURCES.md](CLI-RESOURCES.md). Geração de projeto foi exercitada em diretório externo, com banco separado, autenticação e CRUD gerado. Preview e conflito de repetição também foram exercitados. Não há sincronização automática com o kit.

Configuração real é fornecida somente no projeto derivado. `.env.example` é preservado; `.env`, histórico `.planning`, caches e dependências instaladas não são copiados. Atualizações do kit exigem migração revisada manualmente.
