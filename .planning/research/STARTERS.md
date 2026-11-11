# Starters e referências de componentes

Pesquisa: 2026-11-11. Contrato: `.planning/PROJECT.md`, lido integralmente. Escopo: pesquisa e planejamento; nenhuma instalação, cópia de starter, implementação, build, teste ou formatter executado.

## Resultado recomendado

**Reaproveitamento seletivo; não fazer fork integral de nenhum dos quatro starters.** Criar futuramente template próprio mínimo Next.js 16/Turborepo, com Better Auth e Drizzle, usando bibliotecas existentes. Isso não significa reimplementar tabelas, autenticação ou gráficos.

- **next-forge:** principal referência de fronteiras `apps/` versus `packages/`, não base a clonar integralmente.
- **Kiranism:** principal referência visual de dashboard, tabelas e navegação; extrair somente componentes aprovados.
- **kriasoft:** referência de integração Better Auth/Drizzle e disciplina de migrations; não transportar arquitetura SPA/Workers.
- **Blazity:** referência seletiva de operação, ambiente, testes e observabilidade; não transportar tooling inteiro.
- **Filament:** referência de experiência de recursos e geradores, nunca dependência PHP ou arquitetura Active Record.
- **TanStack Table + shadcn + Recharts:** composição canônica proposta. Cult UI e Evil Charts entram por componente, quando primitives locais/shadcn não bastarem.

Recomendação não altera decisões de PROJECT.md nem autoriza implementação. Distribuição continua template copiado, projetos autônomos, sem núcleo publicado ou sincronização obrigatória com upstream.

## Como interpretar evidências

- **Observado:** conteúdo publicado em README, manifest, documentação ou licença nas URLs abaixo. Declarações de autores sobre produção, performance ou segurança não são validação independente.
- **Recomendação:** julgamento de adequação ao contrato, incluindo custo qualitativo de adaptação.
- **Não verificado:** funcionamento real, lockfiles resolvidos, compatibilidade completa entre versões, cobertura de testes, segurança, acessibilidade, performance, frequência de manutenção e ausência de vulnerabilidades.

URLs de branches e documentação são mutáveis. Versões abaixo são declaradas nos manifests consultados, não versões instaladas ou aprovadas. Antes de copiar código, fixar commit/tag e revisar arquivos concretos e dependências transitivas. Context7 não estava exposto no inventário de ferramentas desta pesquisa; fontes primárias foram acessadas diretamente.

## Matriz dos quatro starters

| Referência | Observado nas fontes | Reaproveitamento recomendado | Conflitos/riscos e custo de fork |
|---|---|---|---|
| **Kiranism / next-shadcn-dashboard-starter** | README apresenta dashboard Next 16, shadcn sobre Base UI, Tailwind v4, Clerk, organizações e billing. Manifest: Next `16.4.2`, React `19.3.0`, Table `^9.3.1`, Form `^1.33.5`, Query `^5.104.2`, Recharts `3.10.1`; scripts usam Bun/Oxlint/Oxfmt. README inclui RBAC de navegação client-side e demonstração de chat IA com conversa predefinida, sem modelo/API. | Layout, navegação, estados de página, composição de data table, tokens e exemplos de dashboard. Selecionar arquivos sem vínculo com Clerk; reescrever integração de sessão para Better Auth no projeto futuro. | **Alto como fork completo; médio como extração visual.** Clerk/Billing não satisfazem direção Better Auth; manifest não entrega integração Drizzle/Turborepo. RBAC visual não comprova autorização de servidor. Query/Form/estado global não devem entrar automaticamente. Demo IA não atende integração real de IA. [README](https://github.com/Kiranism/next-shadcn-dashboard-starter/blob/main/README.md), [manifest](https://github.com/Kiranism/next-shadcn-dashboard-starter/blob/main/package.json). |
| **kriasoft / react-starter-kit** | README: React 19 SPA, TanStack Router, Astro marketing, Hono/tRPC, três Cloudflare Workers, service bindings, Better Auth e Drizzle/Neon. Raiz usa Bun workspaces, sem Turborepo declarado. API: Better Auth `^1.7.4`, Drizzle `^0.45.2`; DB: drizzle-kit `^0.31.10`, Postgres e CUID2. README diferencia `db:push` local de migrations staging/produção. | Organização de auth/schema, separação de configuração por ambiente e comandos de geração/aplicação de migrations. Consultar integração real antes de transportar trechos. | **Muito alto como fork completo; médio para referências de dados/auth.** Router/SPA/Vite e Workers não são Next App Router/Node Docker. Billing, Terraform, Hyperdrive, R2 e deploy triplo excedem padrão simples. CUID2 não é direção UUID. Plugins de organização não provam isolamento. [README](https://github.com/kriasoft/react-starter-kit/blob/main/README.md), [raiz](https://github.com/kriasoft/react-starter-kit/blob/main/package.json), [API](https://github.com/kriasoft/react-starter-kit/blob/main/apps/api/package.json), [DB](https://github.com/kriasoft/react-starter-kit/blob/main/db/package.json). |
| **vercel / next-forge** | Monorepo Turborepo; apps executáveis e pacotes compartilhados. App: Next `16.1.6`, React `19.2.4`, Tailwind `^4.2.1`. Raiz: Turbo `^2.8.14`, Bun `1.3.10`; comandos de banco usam Prisma. README inclui Clerk, Stripe, CMS, colaboração e vários provedores. | Fronteiras de app/UI/auth/db/config, imports workspace e tarefas Turbo. Extrair convenções que tenham responsabilidade concreta; manter app/API juntos quando deploy separado não for necessário. | **Alto como fork completo; baixo/médio para organização.** Trocar Clerk e Prisma implica mudar consumidores, schemas e migrations, não apenas renomear pacotes. CMS deve sair; pagamentos/colaboração não são requisitos implícitos. Scripts Bun e vários serviços não são contrato pnpm/Node automaticamente. `engines.node >=18` da raiz e Node 20+ do README não comprovam mínimo compatível com Next 16. [README](https://github.com/vercel/next-forge/blob/main/README.md), [raiz](https://github.com/vercel/next-forge/blob/main/package.json), [app](https://github.com/vercel/next-forge/blob/main/apps/app/package.json). |
| **Blazity / next-enterprise** | README: Next 15, Tailwind v4, pnpm, Vitest/RTL/Playwright, Storybook, OpenTelemetry, health checks e opções Terraform/AWS. Manifest: Next `15.5.18`, pnpm `10.0.0`, Node `>=20`, scripts `next lint`, `postinstall` com patch-package. README identifica mantenedores. | Estratégia de checks, validação de ambiente, health checks e observabilidade; adaptar só o necessário ao deploy Node/Docker. | **Alto como fork completo; baixo/médio para receitas.** Exige migração Next 16, revisão de lint/configs/patches e criação das fronteiras Turbo/auth/db. Não importar infraestrutura AWS, Storybook e release automation sem necessidade. Lighthouse perfeito é alegação do README, não medição desta pesquisa. [README](https://github.com/Blazity/next-enterprise/blob/main/README.md), [manifest](https://github.com/Blazity/next-enterprise/blob/main/package.json). |

**Manutenção:** manifests e documentação mostram opções atuais publicadas, não SLA nem evidência de resposta a incidentes. Não foi auditado histórico de commits/releases dos quatro projetos. Quantidade de estrelas, lista de mantenedores e promessa “production-ready” não substituem validação. O custo de manter cópias será do kit; não assumir atualizações automáticas.

## Matriz de referências funcionais

| Referência | Observado | Recomendação e riscos |
|---|---|---|
| **Filament resources 5.x** | [Overview oficial](https://filamentphp.com/docs/5.x/resources/overview): resources são classes para CRUD de models Eloquent; separa `Pages`, `Schemas` e `Tables`. Geração combina resource, model, migration e factory; detalhes/View são opcionais por flag; variantes simples usam modais. Forms e infolists compartilham schemas de apresentação. | Adotar experiência e separação de responsabilidades, não classes estáticas PHP, Livewire/Eloquent ou Active Record. No kit, model = schema Drizzle e tipos; resource = UI/operações de domínio em painel. CRUD aprovado deve incluir listagem, criação, edição e detalhes. Campos expostos, filtros/actions/permissões exigem configuração explícita; banco não autoriza exposição automática. Fazer CRUD real antes de extrair gerador. |
| **TanStack Table** | [README](https://github.com/TanStack/table/blob/main/README.md): headless, sorting/filtering/grouping/selection, server-side friendly; core independente de framework. README atual menciona v9 para skills versionadas. | Direção canônica de tabelas, com primitives shadcn e adaptador React. Paginação/filtros server-side não são implementados nem autorizados pela biblioteca: validar colunas/operadores e aplicar tenant no servidor. Fixar versão antes de copiar receitas v8/v9; não misturar APIs. |
| **TanStack Virtual** | [README](https://github.com/TanStack/virtual/blob/main/README.md): virtualização headless de listas/grids e medição de tamanhos. | Opcional quando volume medido justificar; paginação simples primeiro. Risco: foco, teclado, leitura assistiva e tamanhos dinâmicos. Alegações de 60 FPS/tamanho no README não foram medidas. |
| **TanStack Query** | [README](https://github.com/TanStack/query/blob/main/README.md): cache, sincronização de estado remoto, mutations, cancelamento, paginação e refetch. | Somente fluxos client-side que precisem disso. Não duplicar indiscriminadamente cache/obtenção de dados nativos do Next. Chaves e invalidação devem preservar usuário/tenant; limpar ou separar cache na troca de contexto. |
| **TanStack Form** | [README](https://github.com/TanStack/form/blob/main/README.md): headless, tipagem, campos aninhados, validação síncrona/assíncrona com debounce. [Comparação oficial](https://tanstack.com/form/latest/docs/comparison) avisa que tabela está incompleta/não totalmente precisa. | Candidato, não decisão fechada. Comparar com React Hook Form no mesmo CRUD: arrays/objetos, erros de servidor, validação compartilhada, campos condicionais, acessibilidade e manutenção. Não usar tabela promocional como prova de superioridade nem instalar ambos como padrão. |
| **TanStack Router/Start** | READMEs do ecossistema descrevem Router como routing tipado e Start como full-stack SSR/streaming; kriasoft usa Router. | Não adotar ao lado de Next: segunda arquitetura de roteamento contraria contrato. Demais produtos TanStack também não entram por associação de marca. |
| **shadcn Charts** | [Chart oficial](https://ui.shadcn.com/docs/components/chart) redireciona para variante Base UI, documenta Recharts v3, composição direta, `ChartContainer`, tooltip, tokens e dimensão mínima; [galeria indicada](https://ui.shadcn.com/charts/area). | Fonte canônica de charts locais. Escolher primitives compatíveis com UI do kit; copiar somente componentes usados. Tokens semânticos light/dark, labels/legendas e alternativa textual/tabular quando necessária. Acessibilidade não se resolve apenas com cor ou animação. |
| **Recharts** | shadcn usa componentes Recharts diretamente, sem exigir outra camada de charting. [Repositório](https://github.com/recharts/recharts). | Um motor padrão. Fixar versão compatível com componentes copiados; manter fronteira client estreita e entregar dados serializáveis/autorizados pelo servidor. Não confundir licença do wrapper com dependências transitivas. |
| **Cult UI** | [Site](https://www.cult-ui.com) e [README](https://github.com/nolly-studio/cult-ui/blob/main/README.md): registry shadcn que copia código; Tailwind v4/tokens shadcn; maioria anima com Motion. [Manifest](https://github.com/nolly-studio/cult-ui/blob/main/package.json) é do monorepo do catálogo, com Turbo/pnpm; não é lista mínima de dependências de cada componente. Site também promove AI SDK Agents pago. | Referência complementar, não novo design system nem starter. Verificar dependências de cada item, teclado/foco, reduced motion, SSR/hidratação e custo client. Não copiar manifest do site. Licença do repositório gratuito não deve ser estendida a produtos pagos ou assets externos. |
| **Evil Charts** | [Site](https://evilcharts.com) identifica gráficos React sobre **Recharts e Apache ECharts**. [README](https://github.com/legions-developer/evilcharts/blob/main/README.md) descreve tipos, efeitos e animação; [manifest](https://github.com/legions-developer/evilcharts/blob/main/package.json): Next `^16.2.11`, Recharts `3.8.0`, ECharts `^6.1.0`, Motion e dependências do catálogo. | Selecionar variantes **Recharts**, reusando charts/tokens locais. Não importar ECharts por copiar galeria inteira. Caso gráfico futuro exija outro motor, justificar e revisar licença/dependências separadamente. Animação, tooltip, contraste, desempenho e reduced motion precisam validação por item. |

## Licenças verificadas e limites

Textos legais abaixo foram consultados diretamente; todos os textos listados são MIT. MIT permite uso, modificação e distribuição, inclusive comercial, **exigindo manter aviso de copyright e texto de permissão em cópias ou porções substanciais**. Copiar somente um componente não elimina automaticamente a obrigação. Não há garantia do software. Não é parecer jurídico.

| Origem | Texto consultado | Copyright observado / limite |
|---|---|---|
| Kiranism | [LICENSE](https://github.com/Kiranism/next-shadcn-dashboard-starter/blob/main/LICENSE) | 2023 Kiranism. |
| kriasoft | [LICENSE](https://github.com/kriasoft/react-starter-kit/blob/main/LICENSE) | 2014-present Konstantin Tarkus, Kriasoft. |
| next-forge | [license.md](https://github.com/vercel/next-forge/blob/main/license.md) | 2025 Vercel. `LICENSE` maiúsculo retornou 404; nome real confirmado na listagem do repositório. |
| Blazity | [LICENSE](https://github.com/Blazity/next-enterprise/blob/main/LICENSE) | 2023 Blazity. |
| Filament | [LICENSE.md, branch 4.x](https://github.com/filamentphp/filament/blob/4.x/LICENSE.md) | Filament. Endpoint de licença apontou 4.x, enquanto referência funcional é documentação 5.x. Consulta da árvore 5.x retornou 403. **Licença de um snapshot 5.x não verificada; não usar resultado 4.x como autorização específica para copiar 5.x.** Não se propõe copiar PHP. |
| TanStack Table | [LICENSE](https://github.com/TanStack/table/blob/main/LICENSE) | 2016 Tanner Linsley. |
| TanStack Query | [LICENSE](https://github.com/TanStack/query/blob/main/LICENSE) | 2021-present Tanner Linsley. |
| TanStack Form | [LICENSE](https://github.com/TanStack/form/blob/main/LICENSE) | 2021-present Tanner Linsley. |
| TanStack Virtual | [LICENSE](https://github.com/TanStack/virtual/blob/main/LICENSE) | 2021-present Tanner Linsley. Não generalizar para todo produto/ecossistema TanStack. |
| shadcn/ui | [LICENSE.md](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) | 2023 shadcn. |
| Recharts | [LICENSE](https://github.com/recharts/recharts/blob/main/LICENSE) | 2015-present recharts. |
| Cult UI | [LICENSE.md](https://github.com/nolly-studio/cult-ui/blob/main/LICENSE.md) | 2023 Jordan-Gilliam. Produtos pagos vinculados, marcas e assets externos não auditados. |
| Evil Charts | [LICENSE](https://github.com/legions-developer/evilcharts/blob/main/LICENSE) | 2026 Gurbinder. Licenças de ECharts e demais transitivas não auditadas nesta pesquisa; não aprovar sua redistribuição apenas pela MIT do catálogo. |

Antes de copiar/publicar: registrar origem, commit, arquivos e modificações; conservar avisos; revisar exceções por arquivo, imagens, fontes, ícones e dependências; escolher licença do código próprio sem apagar direitos de terceiros. Não há decisão de licença do próprio kit aqui.

## Estratégia de composição proposta

1. **Fundação mínima:** Next 16/Turborepo, um app inicialmente, pacotes locais somente com responsabilidade concreta. Confirmar pnpm/Node e versões em conjunto; não transplantar lockfiles ou configurações divergentes dos quatro starters.
2. **Identidade e dados nativos da direção escolhida:** Better Auth/Drizzle/PostgreSQL. Reutilizar APIs oficiais e estudar kriasoft, sem copiar seu runtime. Sessão, membership, acesso ao painel e autorização de operação são controles separados. Validar isolamento em operações pessoais e tenant-scoped, incluindo relações cruzadas, cache e jobs.
3. **UI seletiva:** primitives locais/shadcn primeiro; extrair de Kiranism composição visual útil sem Clerk, billing, demos e dependências não necessárias. Preservar `data-table/`, `form/`, `infolist/`, `widgets/`, `actions/`, sem pasta intermediária `filament/`.
4. **CRUD de referência:** tabela/form/detalhes/actions com validação de servidor, escopo e permissões. Só depois derivar gerador; nenhuma exposição automática de campos sensíveis. Migrations pelo Drizzle, gerar separado de aplicar, sem sobrescrever histórico aplicado ou customizações silenciosamente.
5. **Gráficos:** shadcn/Recharts como padrão; Evil Charts Recharts e Cult UI por necessidade concreta. Não manter dois wrappers idênticos nem dois motores sem requisito.
6. **Operação:** aproveitar ideias next-forge/Blazity de ambientes, limites de pacotes e checks; Node/Docker é contrato inicial. Providers e worker durável opcionais. Não transformar monorepo em obrigação de microserviços.

### Quando reconsiderar fork

Fork integral só compensa se requisito futuro aceitar maior parte da arquitetura upstream e custo de remoção/migração for demonstravelmente menor que extração seletiva. Hoje: Kiranism diverge em auth; kriasoft em framework/runtime; next-forge em auth/ORM/escopo; Blazity em versão/fundação SaaS. Nenhum entrega simultaneamente contrato completo de Next16/Turbo/BetterAuth/Drizzle, perfis híbridos e CRUD gerado com isolamento demonstrado. Isso é avaliação de adequação das fontes, **não prova de ausência de features em todo o código**.

## Critérios para etapa futura de validação

Não executados nesta pesquisa:

- Fixar snapshots; conferir lockfile, peer dependencies, advisories e requisitos reais Node/Next/React/Tailwind.
- Validar build/runtime Node Docker e fronteiras server/client; não tratar presença de dependência no manifest como compatibilidade provada.
- Testar cenário pessoal, organização A/B e superadmin explícito; operações de leitura/escrita, filtros, relações, cache e troca de tenant.
- Comparar Form/RHF com mesmo resource completo; verificar UX de erro, teclado, foco e validação no servidor.
- Verificar responsividade, contraste, reduced motion e alternativa acessível dos charts; medir custo antes de Virtual ou motor adicional.
- Revisar diff e provenance de cada trecho importado, incluindo remoção de integrações desnecessárias e preservação legal.

Pesquisa fecha recomendação de composição e matriz de licenças; não fecha versões de instalação, biblioteca de forms, política RLS ou licença própria do kit.
