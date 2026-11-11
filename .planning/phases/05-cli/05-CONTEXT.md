---
phase: "05"
name: "CLIs e geração"
created: 2026-11-11
---

# Phase 05 — Context

## Origem e modo

Contrato: PROJECT.md §6/D1/D3, REQUIREMENTS.md CLI-01–06, ROADMAP.md, fases 2–4. Decisões explícitas recebidas autorizam contexto sem novas perguntas. Skills lidas: `gsd-plan-phase` e `gsd-discuss-phase`. **Fallback genérico (generic-agent workaround):** worker genérico, sem execução tipada de gsd-planner/checker ou revisão independente. Só CONTEXT/PLAN autorizados; sem implementação, teste ou build nesta etapa.

## Decisões fixas

- Criar workspace local `packages/cli` com bin `vibe`; projeto gerado é cópia autônoma editável, sem núcleo remoto, registry publicado ou vínculo de atualização automática. Sem engine de resource, Active Record ou ORM próprio. Templates reproduzem código validado fase 4.
- Superfície planejada: `vibe create <directory> --profile personal|organizations|hybrid`; `vibe model <name> --spec <file>`; `vibe resource <name> --model <export> --panel <id> --spec <file>`; combinação `resource --with-model --migration`; `vibe migration generate --name <name>`; `vibe panel <id> --context global|personal|org --prefix <path>`; `vibe doctor`. Nomes acima são contrato a implementar, não comandos já existentes.
- Perfil altera configuração, rotas, onboarding e autorização existentes fase 2; não é só esconder menus. `organizations` suporta modo single/multi; single exige ID de organização explicitamente provisionada, nunca credencial ou UUID real copiado do kit. Hybrid é referência, não default silencioso em automação.
- Todas operações geradoras suportam `--preview`, `--non-interactive` e `--json`. Sem parâmetro obrigatório em modo não interativo: erro de entrada e nenhuma escrita; nunca prompt pendurado. Não existe `--force` para sobrescrever customização.
- Preview resolve e valida plano inteiro antes de escrever, mostrando caminhos relativos e diff/conteúdo sanitizado. Conflito, caminho inválido, arquivo desconhecido ou entrada inválida falha sem alterações. Detectar symlinks/path traversal, nomes reservados/duplicados, identificadores inválidos e caminhos fora da raiz. Não usar eval de spec nem montar shell com entrada interpolada.
- Specs JSON explícitas fornecem campos, relações, UI allowlists e permissões. Model usa tipos Drizzle suportados; schema/tipos inferidos são código comum. Resource para model existente exige mapeamento explícito dos exports/campos, não introspecção que exponha tudo nem nova tabela. Rejeitar combinação insegura/incompleta em vez de emitir TODO, permissões permissivas ou mocks.
- Contexto de dados obrigatório: pessoal, organizacional ou ambos compatível com painel/perfil. Reutilizar sessão, roles, RLS e relação tenant-safe fase 2; não inventar roles. Código de domínio gerado mantém filtros e transação contextual. Novo model pessoal/org recebe política, constraints e grants pelo mecanismo de migration existente, não apenas coluna tenantId.
- Migrations exclusivamente Drizzle Kit canônico. Generate não conecta/aplica schema ao DB nem edita migration aplicada. Apply permanece `pnpm --filter @vibe/db db:migrate`, explícito, fora dos comandos geradores. Sem `push`, auto-apply ou motor próprio de diff.
- Painel registra configuração no `panelRegistry` e dispatcher catch-all existentes, sem criar árvore pública de pastas conforme prefixo. Prefixos/IDs colidentes e rotas reservadas são rejeitados. Link builder e resolver compartilham configuração; contexto/política explícitos, sem privilégio inferido por pathname.
- Template exportado usa allowlist de conteúdo do produto. Excluir `.env` e variantes reais, credenciais, URLs/senhas locais, `.git`, `.planning`, `node_modules`, `.next`, `.turbo`, `.codegraph`, logs, dumps, cobertura, arquivos temporários e caches. `.env.example` só placeholders, sem segredos. Manter código/docs/licenças e lockfile necessários; docs geradas não apontam ao checkout original nem a `.planning` removida.
- Código gerado pertence ao usuário. Rerun em arquivo existente resulta conflito; não regenerar por cima de alteração manual. Sem updater ou merge mágico. Diagnóstico mostra chave/config faltante, nunca valor secreto.

## Fronteiras e aceite

Depende do padrão completo fase 4 e contratos finais fase 2/3. Não gerar abstrações em lugar de comportamento ainda não entregue. Fase 8 fará prova operacional final/release, mas fase 5 já deve gerar projeto externo instalável e resource funcional real; não adiar CRUD para fase 8.

CLI-01 projeto limpo com três perfis; CLI-02 model sem UI e migration separada; CLI-03 resource existente e combinação completa; CLI-04 painel inicia e aplica política; CLI-05 automação/erros sem overwrite; CLI-06 preview, preservação e diagnóstico seguro. Testes futuros criam diretórios temporários e app/DB autorizado; comandos só passam a existir após implementação descrita no plano.
