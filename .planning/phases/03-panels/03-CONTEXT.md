---
phase: "03"
name: "Painéis, componentes e temas"
created: 2026-11-11
status: planned-awaiting-identity
---

# Phase 3 — Context

## Escopo e autorização

Somente planejamento nesta entrega. Nenhum código, instalação, teste ou build autorizado nesta fatia. Execução da fase 3 depende da identidade, memberships e isolamento da fase 2 integrados e verificados. Não criar mocks de sessão nem implementar Better Auth nesta fase.

Fontes: [PROJECT](../../PROJECT.md), [REQUIREMENTS](../../REQUIREMENTS.md), [STARTERS](../../research/STARTERS.md). Cobertura: PANEL-01/02, UI-01/02/03/04, I18N-01. Pesquisa documental não comprova compatibilidade em runtime.

## Decisões

- Kiranism é referência de composição sóbria: sidebar, breadcrumbs, hierarquia de dados e estados. Não copiar starter, Clerk, billing ou tooling. Antes de copiar componente, fixar snapshot, revisar dependências/licença e preservar avisos.
- Reuso: componente local → shadcn → criação mínima. `packages/ui/src/components/{ui,data-table,form,infolist,widgets,actions}`; sem namespace `filament`. Criar componentes usados, não catálogo antecipado.
- Tokens semânticos CSS/Tailwind v4 controlam cores, tipografia, raios, densidade e séries de charts. Light/dark e overrides por `data-panel` sem duplicar componentes.
- React Hook Form + Zod é escolha única de forms. Evidência mínima: receita oficial shadcn para RHF demonstra Controller/Field e erros; TanStack Form também tem receita, portanto não alegar dependência obrigatória do shadcn em RHF. RHF permite aproveitar composição conhecida sem introduzir segundo sistema. Antes de instalar, confirmar peers da versão escolhida e demonstrar um campo, erro de servidor e campo condicional com mesmo comportamento acessível. Não instalar ambos. Fontes: https://ui.shadcn.com/docs/forms/react-hook-form e https://ui.shadcn.com/docs/forms/tanstack-form .
- Charts: shadcn Charts/Recharts, um motor; confirmar versão compatível antes de copiar componentes. Séries vêm de dados persistidos de projects/members, nunca arrays inventados. Se tabela de projects não existir na fase 2, usar somente memberships/organizações reais disponíveis; não inventar domínio nem atribuir entrega de CRUD da fase 4 à fase 3.
- i18n local em `apps/app/src/lib/i18n/`: `pt-BR` padrão e `en`, mesmas chaves tipadas, `Intl` nativo. Locale não decide moeda nem timezone: estes são opções explícitas de domínio; timezone de referência UTC. Preferência de locale via cookie validado, sem prefixo de locale nesta entrega.

## Roteamento mínimo seguro

- Uma entrada App Router `apps/app/src/app/(panels)/[[...segments]]/page.tsx` despacha somente páginas concretas registradas. `(panels)` não aparece na URL. Não criar `/global`, `/personal` ou outras rotas internas públicas. Não usar rewrite/proxy para implementar prefixos; Next 16 usa `proxy.ts` quando necessário, mas nenhum proxy é necessário para este contrato.
- Registry local único em `apps/app/src/lib/panels/registry.ts`. Defaults: global `/admin`, pessoal `/app`, organizacional `/org/{tenant}`. Prefixo configurável por painel, com um ou mais segmentos literais. Alteração de config não renomeia arquivos.
- Validar registry na inicialização: prefixos não vazios, segmentos normalizados e sem `..`, barras codificadas ou colisões/overlap entre painéis; rejeitar conflito com rotas concretas/reservadas (`api`, `_next`, login/auth e arquivos públicos). Atualizar lista central quando nova rota concreta surgir. App Router continua dono de rotas concretas; catchall só recebe caminhos restantes.
- `buildPanelPath` e `resolvePanelPath` consomem MESMO registry e catálogo explícito de páginas/subpaths. Não aceitar subpath arbitrário nem dynamic import vindo da URL. Caminho não registrado retorna 404; sem aliases legados implícitos.
- Painel organizacional declara `tenantMode: 'slug' | 'uuid'`; parser/resolvedor único reaproveita contrato fase 2. Validar slug reservado/colisão e UUID conforme decisão canônica fase 2, sem regex espalhada. Links usam identificador canônico escolhido; variante aceita não canônica redireciona somente depois da autorização, sem divulgar existência de tenant a estranho.
- Resolver de URL não autoriza. Servidor exige sessão e política explícita de acesso ao painel; pessoal usa userId, org exige membership/permissão, global exige privilégio global explícito. Admin de org não acessa global; superadmin não ganha bypass implícito para dados de org. Revalidar em loaders e operações, inclusive chamada direta. Navegação filtrada é apenas UX.

## Contratos tipados mínimos locais

`apps/app/src/lib/panels/contracts.ts`, sem pacote core nem engine:

- `PanelConfig`: `id`, `labelKey`, `prefix`, `context` (`global | personal | org`), `tenantMode` apenas em org, `accessPolicy` referenciando política de servidor fase 2, `navigation`, `theme` opcional. União discriminada impede tenant em painel pessoal/global.
- `ResolvedPanelContext`: união discriminada com `panelId`, `userId` e, somente em org, `tenantId` já autorizado; privilégio global explícito no ramo global. Não aceitar objeto enviado pelo cliente como contexto confiável.
- `ResourceDefinition`: `id`, `panelId`, `labelKey`, `routeSegment`, `navigationGroup?`. Apenas registro de navegação fase 4. Sem inferir UI de schema, gerar forms, implementar CRUD ou conceder permissão; fase 4 acrescenta operações autorizadas quando existir caso concreto.

## Limites

Sem auth nova, migrations, CRUD persistido, geradores, editor visual, subdomínio, TanStack Router/Start, Query ou Virtual sem necessidade medida. TanStack Table com versão fixada e compatível, não prescrever v9 por manifest externo. Estado colapsado em cookie é permitido: leitura SSR torna layout dinâmico; cookie não contém autorização.
