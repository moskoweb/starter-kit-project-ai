---
phase: 05-cli
status: gaps_found
---
# CLI — evidências

- `@vibe/cli check-types` passou.
- `doctor --json` identificou estrutura/scripts e ausência de env sem imprimir valores.
- `model Note --preview --json` produz schema UUID/RLS; transpile sintático passou após corrigir chave duplicada do template.
- `create` gerou projeto personal fora do repo, preservando .env.example e removendo env real/planning/caches. Corrigida duplicação AGENTS na cópia.
- Resource Note --with-model gerou handlers/views/schema/registro; repetição recusada, sem sobrescrever.
- Derivado instalou deps offline, typecheck app passou, gerou SQL offline sem credenciais e aplicou migrations/seed em PostgreSQL/roles próprios.
- Browser no derivado: signup, verificação SMTP local, login, criação/edição/exclusão Note persistidos.
- Preview painel sales organizacional produziu config/registry sem gravação.
- Resource WorkItem sobre tasks com relação projects gerou e passou typecheck no derivado sem nova tabela.
- Resource Memo com --with-model --migration gerou schema e custom migration de proteção; app derivado passou typecheck, migrations aplicadas e alteração de owner rejeitada pelo banco com SQLSTATE23514.
- Self-check de snapshot/restore e hashes de proteções passou; preview não escreve, proteção modificada após geração é rejeitada.

Pendentes: smoke final de rollback por falha real de Drizzle e paridade visual dos templates após últimas alterações. Sem pacote publicado ou atualização automática.
