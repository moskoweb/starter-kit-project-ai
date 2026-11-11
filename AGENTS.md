# Starter kit — instruções para agentes

## Estado e fontes canônicas

Este repositório tem fundação funcional, mas starter completo ainda está em implementação. Ler `.planning/STATE.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` e `.planning/ROADMAP.md` antes de alterar arquitetura. Pesquisa em `.planning/research/` distingue evidência de recomendação. Comandos existentes: `pnpm check-types`, `pnpm test`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`, `pnpm build`. Tipos, testes de ambiente, migrations, seed e tracer web foram exercitados; build final e demais gates consultáveis em VERIFICATION.md, nunca presumir aprovação.

Runtime usa `DATABASE_URL` com role DML; migrations exigem `MIGRATION_DATABASE_URL` separada. Injetar ambiente antes dos scripts, sem imprimir segredos. Neste checkout dev em 127.0.0.1:3001, infraestrutura documentada em `docs/DEVELOPMENT.md`. Preservar preview e hot reload.

## Produto e arquitetura

Template independente para projetos desenvolvidos com IA e com integrações opcionais de IA. Stack alvo: Next.js 16, TypeScript, Turborepo, PostgreSQL, Drizzle, Better Auth, Tailwind v4 e shadcn/ui. Node/Docker como deploy de referência. Pacotes locais não são serviços nem recebem atualizações centrais automaticamente.

Perfis pessoal, organizações e híbrido; single-tenant e multi-tenant. Tenancy configurada por painel. Superadmin global, admin de organização e roles personalizados têm escopos separados. Model é schema Drizzle com tipos; resource compõe interface e operações. Não criar ORM próprio ou módulo CMS.

## Implementação

- Reutilizar código local; depois shadcn; criar somente o necessário. Preservar `data-table/`, `form/`, `infolist/`, `widgets/`, `actions/`, sem pasta `filament/`.
- Themes por tokens e CSS variables. Acessibilidade, responsividade e estados de erro são requisitos.
- Bibliotecas existentes antes de abstrações próprias. Não instalar pacotes/skills em massa.
- Autorização no servidor em cada operação; URL, campos enviados pelo cliente e argumentos de tools são entradas não confiáveis.
- Aplicar escopo em consultas, relações, cache, arquivos, jobs e tools de IA. UUID não é autorização. Superadmin não implica bypass de dados sem política explícita.
- Gerar migrations pelo Drizzle; aplicar separadamente. Não alterar histórico aplicado nem sobrescrever customizações sem consentimento.
- Componentes client não importam banco ou segredos. Integração opcional desabilitada não exige credenciais; habilitada inválida falha claramente.

## Planejamento e delegação

GSD mantém continuidade em `.planning/`; não criar fonte concorrente de estado. Planejar antes de executar fases. Cada delegação define arquivos, contrato e aceite; um responsável integra mudanças compartilhadas.

Política aprovada: `nine-router/Tier-03` para tarefas mecânicas; `nine-router/Tier-02` para implementação delimitada; `nine-router/Tier-01` para arquitetura, segurança, integração e revisão. Modelos devem ser aprovados pelo runtime: nunca contornar gate, trocar silenciosamente ou afirmar uso com base no prompt. Probes de ambos tiers inferiores com leitura de arquivo passaram; configuração persistida no runtime do usuário, não transportada automaticamente aos projetos derivados. Evidências em `docs/AGENT-BOOTSTRAP.md`.

## Ferramentas e skills

CodeGraph correto: https://github.com/colbymchenry/codegraph. CLI local disponível na máquina de preparação, não garantida no projeto derivado. Usar `DO_NOT_TRACK=1 CODEGRAPH_TELEMETRY=0` nos comandos. Não rodar instalador global ou reconfigurar todos agentes automaticamente. Índice não substitui leitura de código e verificação; não alegar MCP conectado sem prova.

Skills locais devem ter origem/revisão/licença e gatilho claros. Scripts e referências transitivas precisam de leitura antes da execução. Não encadear compressores ou proxies. Archify fica fora da preparação inicial; reconsiderar no fechamento.

## Verificação e operação

Verificar comportamento alterado com menor cenário suficiente. Isolamento e permissões exigem casos negativos. UI exige inspeção real; feature externa exige integração real, não mock apresentado como pronta. Manter documentação e estado coerentes com evidência.

Preservar mudanças e serviços existentes. No servidor de desenvolvimento, seguir `/root/projects/DEVELOPMENT.md`; consultar `/root/projects/DEV-SERVICES.md` antes de integrar serviços compartilhados. Builds pesados exigem memória disponível e `flock /tmp/dev-heavy-validation.lock`. Não publicar portas fora de loopback, alterar Access/Tunnel, fazer push/deploy ou executar operação destrutiva sem autorização.

Projetos derivados devem substituir referências locais de infraestrutura por suas próprias instruções. Nunca copiar credenciais, índices, histórico de planejamento ou caminhos privados do kit para novo projeto.
