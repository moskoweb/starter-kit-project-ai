# Starter kit — instruções para agentes

## Estado e fontes canônicas

Starter kit (scaffolding no estilo Filament): fornece infraestrutura, painel admin e CLI; não traz domínio de exemplo. Se existir planejamento local em `.planning/` (não versionado), ler `STATE.md`, `PROJECT.md`, `REQUIREMENTS.md` e `ROADMAP.md` antes de alterar arquitetura. Comandos existentes: `pnpm check-types`, `pnpm test`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm lint`, `pnpm dev`, `pnpm build`, `pnpm test:e2e`. Nunca presumir aprovação de gates: rodar e reportar.

Runtime usa `DATABASE_URL` com role DML; migrations exigem `MIGRATION_DATABASE_URL` separada. Injetar ambiente antes dos scripts, sem imprimir segredos. Infraestrutura da máquina de desenvolvimento fica em instruções locais não versionadas, nunca neste repositório.

## Produto e arquitetura

Template independente para projetos desenvolvidos com IA e com integrações opcionais de IA. Stack alvo: Next.js 16, TypeScript, Turborepo, PostgreSQL, Drizzle, Better Auth, Tailwind v4 e shadcn/ui. Node/Docker como deploy de referência. Pacotes locais não são serviços nem recebem atualizações centrais automaticamente.

Perfis pessoal, organizações e híbrido; single-tenant e multi-tenant. Tenancy configurada por painel. Superadmin global, admin de organização e roles personalizados têm escopos separados. Model é schema Drizzle com tipos; resource compõe interface e operações. Não criar ORM próprio ou módulo CMS.

Kit entrega ferramentas, sem domínio de exemplo. Template registra só painel `admin` (`/admin`). Painéis de trabalho vêm da CLI: `create --profile` gera `app` (`/app`, pessoal) e/ou `org` (`/org/<slug>`); outros via `panel`. CRUD via `resource` (com `--with-model` para tabela nova). Código localiza painéis por `context`, nunca por id fixo, e trata ausência. Detalhes em `docs/PANELS.md` e `docs/CLI-RESOURCES.md`.

## Implementação

- UI: ler `.agents/skills/shadcn/SKILL.md` e `docs/UI.md`. Primitivos shadcn estilo `base-nova` sobre Base UI: compor com `render`, nunca `asChild`. CRUD novo = `defineResource` em `apps/app/src/lib/resources/definitions/` (padrão Filament), gerado por `pnpm vibe resource`, nunca página manual. Faltando primitivo: `pnpm dlx shadcn@4.23.0 add <item>` em `apps/app` (registries `@shadcn`, `@cult-ui`). Ícones: somente `lucide-react` (`iconLibrary: lucide`); SVG próprio só para logos de marca que o Lucide não tem.
- Skills de design e UX (leia a respectiva `SKILL.md` antes de aplicar; detalhes em `docs/AGENT-TOOLS.md`):
  - `.agents/skills/hallmark/SKILL.md`: nova página pública, landing page ou direção visual autoral (editorial, atmospheric, modern-minimal, playful). Não rodar hooks/scripts de instalação global; geração de imagem Together AI opcional.
  - `.agents/skills/unslop/SKILL.md`: des-slopizar telas existentes com cara genérica de IA (espaçamento, contraste, hierarquia, tipo, densidade, cópia). Scripts locais com Chrome headless são opt-in; guia de design aplica direto no código.
  - `.agents/skills/improve/SKILL.md`: plano de melhoria e refinamento estruturado de UI/UX. Regra rígida: gera planos em `plans/`, **nunca edita código diretamente**.
- Segurança: para revisão, auditoria ou dúvida de vulnerabilidade, ler `.agents/skills/security-audit/SKILL.md` (modo guia por padrão; auditoria completa só sob pedido explícito, artefatos fora do repositório).
- Themes por tokens e CSS variables. Acessibilidade, responsividade e estados de erro são requisitos.
- Capacidades opcionais não entregues (provedores de IA por tenant, conversas, tools/agentes, KB/RAG, MCP, API com chaves, SSE, auditoria, cifra de segredos, guarda SSRF): ler a receita em `docs/recipes/` antes de implementar. Receita é orientação, não código existente. Não implementar sem o projeto precisar.
- Bibliotecas existentes antes de abstrações próprias. Não instalar pacotes/skills em massa.
- Autorização no servidor em cada operação; URL, campos enviados pelo cliente e argumentos de tools são entradas não confiáveis.
- Aplicar escopo em consultas, relações, cache, arquivos, jobs e tools de IA. UUID não é autorização. Superadmin não implica bypass de dados sem política explícita.
- Gerar migrations pelo Drizzle; aplicar separadamente. Não alterar histórico aplicado nem sobrescrever customizações sem consentimento.
- Componentes client não importam banco ou segredos. Integração opcional desabilitada não exige credenciais; habilitada inválida falha claramente.

## Planejamento e delegação

GSD mantém continuidade em `.planning/`; não criar fonte concorrente de estado. Planejar antes de executar fases. Cada delegação define arquivos, contrato e aceite; um responsável integra mudanças compartilhadas.

Modelos e tiers de agente são configuração do runtime de quem desenvolve: nunca contornar gate de aprovação, trocar silenciosamente ou afirmar uso com base no prompt.

## Ferramentas e skills

CodeGraph correto: https://github.com/colbymchenry/codegraph. CLI local disponível na máquina de preparação, não garantida no projeto derivado. Usar `DO_NOT_TRACK=1 CODEGRAPH_TELEMETRY=0` nos comandos. Não rodar instalador global ou reconfigurar todos agentes automaticamente. Índice não substitui leitura de código e verificação; não alegar MCP conectado sem prova.

Skills locais devem ter origem/revisão/licença e gatilho claros. Scripts e referências transitivas precisam de leitura antes da execução. Não encadear compressores ou proxies. Archify fica fora da preparação inicial; reconsiderar no fechamento.

Recomendações e instalação ficam em `docs/AGENT-TOOLS.md`. Não confundir ferramenta instalada na máquina com parte do template. GSD organiza planejamento; CodeGraph auxilia navegação; RTK é opt-in para reduzir saída, preservando stderr, códigos de saída e acesso bruto. Skills de React/Next, acessibilidade e design são carregadas conforme tarefa. Regras de segurança, requisitos do produto e componentes locais prevalecem sobre personas e preferências externas. Nenhum instalador/hook global, proxy ou atualização automática sem autorização específica.

## Verificação e operação

Verificar comportamento alterado com menor cenário suficiente. Isolamento e permissões exigem casos negativos. UI exige inspeção real; feature externa exige integração real, não mock apresentado como pronta. Manter documentação e estado coerentes com evidência.

Preservar mudanças e serviços existentes. Builds pesados exigem memória disponível. Não publicar portas fora de loopback, fazer push/deploy ou executar operação destrutiva sem autorização.

Projetos derivados devem substituir referências locais de infraestrutura por suas próprias instruções. Nunca copiar credenciais, índices, histórico de planejamento ou caminhos privados do kit para novo projeto.
