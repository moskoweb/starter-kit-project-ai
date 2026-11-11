---
phase: 03-panels
plan: 01
type: execute
wave: 1
depends_on: [02-identity]
autonomous: true
status: planned-awaiting-identity
requirements: [PANEL-01, PANEL-02, UI-01, UI-02, UI-03, UI-04, I18N-01]
---

# Phase 3 — Plano

## Gate obrigatório

Planejamento apenas nesta entrega. Não executar antes de fase 2 integrar e verificar sessão, privilégio global, contexto pessoal, membership/permissões de org e isolamento de dados. Sem mock de auth, autorização por pathname ou auth nova. Planos/contexto fase 2 ainda em pesquisa não comprovam existência dos contratos. Documentar APIs reais da fase 2 na integração, sem criar implementação paralela.

Ler `03-CONTEXT.md` e `03-UI-SPEC.md` como contratos. Mudanças limitadas a app/UI e documentação de uso; sem editar roadmap/state nesta fatia. Não publicar, expor serviço nem instalar ferramenta externa por este plano.

## 1. Registry e resolução seguros

Arquivos previstos: `apps/app/src/lib/panels/{contracts,registry,routing}.ts`, `apps/app/src/app/(panels)/[[...segments]]/page.tsx`; componentes concretos em `apps/app/src/components/panels/`, fora de `app/`.

- Um catchall opcional real do App Router recebe caminhos restantes. Não criar rotas internas global/personal, rewrite, middleware ou proxy. Route group não altera URL. Reconciliar página raiz existente com catchall: preservar página concreta `/`; prefixos de painel não podem ser raiz.
- Registry discrimina global/personal/org, prefixo, política de acesso, navegação e tema; org declara modo slug/UUID. Defaults `/admin`, `/app`, `/org/{tenant}`.
- Validar prefixos por segmentos normalizados, bloquear dot segments/barras codificadas, colisões e overlap de prefixos, rotas concretas/reservadas e arquivos públicos. Lista central contempla api, _next, auth/login e demais rotas existentes do app. Erro de configuração acionável na inicialização, nunca fallback ambíguo.
- Resolver e link builder usam MESMO registry e catálogo explícito de páginas. Path não registrado retorna 404; URL nunca escolhe módulo/import arbitrário. Configurar outro prefixo precisa funcionar sem renomear diretórios; prefixo antigo deixa de resolver.
- Resolver tenant reutiliza contrato fase 2: valida identificador e busca tenant, autoriza antes de redirecionar para identificador canônico configurado. Sem parsing duplicado. Não expor existência de tenant não autorizado.
- Dispatcher chama componentes concretos somente depois de sessão/política de painel e contexto autorizados. Loader e futura operação revalidam escopo. Admin org não ganha global; superadmin não bypassa isolamento org implicitamente. Sem confiar em panelId/tenantId enviados pelo cliente.
- `ResourceDefinition` local mínimo: id, panelId, labelKey, routeSegment, navigationGroup opcional. Sem engine, schemas de form ou CRUD antecipado; fase 4 adiciona operações mediante caso concreto. Não criar @vibe/core.

Aceite: prefixo alternativo, colisão reservada, slug/UUID e caminhos desconhecidos têm resultado definido; menu e chamada direta aplicam mesma autorização. Casos pessoal sem org, org A/B e admin global explicitamente separados.

## 2. Tokens, primitivas e forms

Arquivos previstos: `packages/ui/src/styles/theme.css`, componentes usados em `packages/ui/src/components/{ui,data-table,form,infolist,widgets,actions}`, exports/package manifests e integração CSS no app.

- Inventariar componentes locais antes de copiar. Kiranism apenas referência visual; fixar origem/commit/licença de trechos realmente aproveitados, preservar avisos. Não trazer Clerk/billing/manifest upstream.
- Implementar tokens UI-SPEC para light/dark, fontes, raios, densidade, gráficos e override por painel. Usar primitives shadcn compatíveis com stack instalada, sem misturar variantes inadvertidamente.
- RHF + Zod como única biblioteca de forms; comparação mínima documental com TanStack Form registrada no contexto. Confirmar peers e demonstrar input, campo condicional e erro de servidor com labels/erros acessíveis. Não instalar ambos nem afirmar que todo shadcn depende de RHF.
- Charts shadcn/Recharts, uma engine, versões fixadas após confirmar compatibilidade. Table TanStack com API da versão realmente escolhida, não versão inferida de starter remoto.

Aceite: alterar tokens modifica UI sem copiar componentes; light/dark e overrides não vazam entre painéis. Form associa erro, preserva valores e permite navegação por teclado.

## 3. Shell e locales locais

Arquivos previstos: `apps/app/src/components/panels/` para shell/header/sidebar/páginas concretas; `apps/app/src/lib/i18n/{index,locales/pt-br,locales/en}.ts`.

- Sidebar responsiva, breadcrumbs, contexto explícito, theme toggle e troca de painel/organização somente para destinos autorizados. Nenhum link morto.
- Cookie sidebar:state opcional, documentar dinamismo SSR; nunca armazenar privilégios. Drawer com foco/Escape/retorno ao gatilho e collapsed sidebar com labels.
- Locale pt-BR/en tipado, preferência validada em cookie e document lang. Intl com timezone de referência UTC e moeda de domínio explícitos, não por idioma. Sem @vibe/i18n nem prefixo de locale.
- Loading/empty/error/denied conforme UI-SPEC e sem dados privados no erro.

Aceite: 375/768/1440px, ambos temas/locales, sem overflow de página. Área pessoal não exige organização; troca de contexto não mantém cache/estado de outro usuário/tenant.

## 4. Dados reais de dashboard e documentação

Arquivos previstos: `apps/app/src/lib/panels/metrics.server.ts`, páginas concretas em `components/panels/`, componentes chart/table/widgets usados; atualizar documentação existente de painéis/temas/i18n ou criar documentação estável na execução quando autorizada.

- Loaders server-only usam sessão e contexto autorizados fase 2, consultas escopadas e DTOs serializáveis mínimos. Preferir projects/members persistidos que existam; se não houver projects, demonstrar memberships/organizações reais sem inventar domínio ou migração. Histórico somente se dados tiverem timestamps adequados. Sem números de receita/conversão, arrays fake ou zero fictício para fonte ausente.
- Global agrega somente dados permitidos explicitamente; pessoal não mostra membros globais; org só membership/dados de tenant autorizado. Cache deve preservar contexto ou ficar desabilitado até contrato seguro; UI não importa DB/segredos.
- Charts com dimensão mínima, legenda/unidades/tooltip e resumo tabular acessível; estado vazio real sem fingir séries. Tabela mínima para mesmo conjunto, sem prometer CRUD fase 4.
- Documentar config de prefixos, reservas, autorização e canonicalização, tokens/override, adicionar mensagem em ambos locales, decisão de forms, fontes e limites. Código gerado/CLI fica fora.

## Verificação futura pelo integrador

Não executada nesta fatia. Após integração completa, executar uma vez checks canônicos existentes de tipos/build e testes focados, sem inventar scripts. Deixar casos automatizados focados de registry/link roundtrip, prefixo alternativo, reservas/colisões, canonicalização e chamadas diretas não autorizadas; testar usuário pessoal, org A/B e global. Comprovar dados persistidos com variação real no escopo permitido e isolamento ao trocar tenant.

Revisão visual: screenshots dos seis cruzamentos largura/tema relevantes em ambos locales, teclado/foco/Sheet/form, contraste AA, zoom 200%, reduced-motion e alternativa tabular do chart. Aceite final exige todos requisitos PANEL/UI/I18N acima com evidência; artefatos de planejamento ou build isolado não encerram fase.
