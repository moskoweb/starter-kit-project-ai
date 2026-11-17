# UI compartilhada

## Navegação e carregamento dos painéis

Route group `(panels)` mantém `SidebarProvider` no layout compartilhado, fora do segmento catch-all. Documento e provider permanecem montados entre recursos, preservando estado recolhido. Shell visual é refeito com props autorizadas do painel atual, sem reter navegação ou dados de outro tenant. URLs públicas permanecem iguais. Resources gerados invalidam `/(panels)/[...segments]`, caminho interno do Next que inclui route group.

App usa Next.js App Router, não uma SPA exclusivamente client-side. Links internos usam `next/link`: navegação e prefetch são do Next, com autorização e consultas no servidor. React sozinho não define estratégia de roteamento. Não adicionar `window.location` ou links HTML para menus internos.

Shell adapta o bloco MIT shadcn/ui **sidebar-07**, Base UI `base-nova`: sidebar recolhível em ícones, workspace switcher, grupos de navegação, menu de usuário, rail e header com breadcrumb contextual. Mantém dados reais e busca global, sem menus fictícios do exemplo upstream.

Na rota dinâmica de painéis, `PanelShell` envolve `Suspense` do conteúdo. Removido `loading.tsx` que substituía shell inteiro por “Carregando painel…”. Sessão, painel e tenant continuam validados antes de mostrar navegação. Enquanto essa validação acontece, navegação client mantém tela anterior. Depois, conteúdo lento recebe `PanelSkeleton`, sem trocar menu por tela vazia. Mudanças de recurso, query e tenant reiniciam boundary de conteúdo. Não compartilhar cache de dados autenticados para esconder latência.

`PanelSkeleton` compõe primitivo `Skeleton` já instalado em `@vibe/ui`, com `role="status"`, texto localizado, formas ocultas de leitores de tela e respeito a reduced motion. Páginas de conta também usam fallback de conteúdo no layout compartilhado. Para seção lenta específica, colocar `Suspense` próximo do loader e compor `Skeleton` com forma correspondente. Skeleton indica espera, não acelera consulta nem substitui estados de erro/vazio.

Regressão: `E2E_ADMIN=1 pnpm exec playwright test --config e2e/playwright.config.ts panel-navigation.spec.ts --project=desktop --no-deps`, com sessão admin descartável previamente provisionada. Confere identidade do documento e sidebar entre menus, estado recolhido, breadcrumb, histórico e overflow mobile. Não promover conta existente para executar teste.

`@vibe/ui` contém apresentação, sem fetch, banco, autenticação, traduções ou engine de resources. Textos e dados chegam por props. App mantém autorização, loaders, locale e estado de navegação.

## CSS e temas

No CSS global Tailwind v4 do app:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@vibe/ui/theme.css";
@source "../../../../packages/ui/src";
```

Ajustar caminho `@source` à localização real do CSS consumidor. `@vibe/ui/theme.css` é único entrypoint CSS; `tokens.css` e aliases legados foram removidos no cutover coordenado com app. Não importar Tailwind uma segunda vez no pacote. App instala `tailwindcss`, `tw-animate-css` (animações dos primitivos shadcn), `@tailwindcss/postcss` e `postcss`, configurando plugin PostCSS. `theme.css` aplica `bg-background text-foreground font-sans` no `body`. `.dark` ou `data-theme="dark"` troca tokens; ausência usa luz. Sem persistência ou detecção de tema no pacote. `data-density="compact"` reduz espaçamento, `data-radius="square" | "round"` muda raio. Sobrescrever `--ui-font-sans`, `--ui-font-mono`, `--radius` e `--spacing` por CSS. Fontes não são baixadas pelo pacote. Cores destrutivas foram ajustadas em relação ao vermelho claro da especificação; contraste ainda requer inspeção de integração.

### PostCSS no desenvolvimento

Manter `apps/app/postcss.config.mjs` com `export default { plugins: { "@tailwindcss/postcss": {} } };`, formato [oficial do Next](https://nextjs.org/docs/app/getting-started/css#tailwind-css). Não usar `require.resolve()` como chave: Turbopack transforma a resolução estática em ID virtual `[project]/… [postcss]`, mas o carregador PostCSS passa a chave a `require()` nativo; Node não reconhece esse ID. Importar o plugin diretamente também coloca dependências nativas (Lightning CSS/Oxide) no bundle de configuração.

Se `Cannot find module '@tailwindcss/postcss'` persistir após instalar dependências de desenvolvimento, verificar a resolução Node a partir de `apps/app` e `apps/app/.next/dev/build`. Com ambas resolvendo o pacote real, não trocar para webpack nem alterar `turbopack.root` sem evidência: o carregador gerado usa `require()` nativo e os links pnpm estão dentro da raiz do workspace. Next 16 habilita cache persistente do Turbopack no dev por padrão; reiniciar o processo sozinho não invalida esse cache. Para diagnosticar output obsoleto, parar somente o preview afetado, remover somente `apps/app/.next/dev` (output gerado), reiniciar e validar novamente; não apagar dados do app nem parar outros previews. Este procedimento não substitui evidência da falha específica nem os gates de release.

## API

### Mapa de montagem rápida

| Necessidade | Reutilizar primeiro | Organização |
| --- | --- | --- |
| Painel autenticado | `PanelShell` + navegação/workspace/menu existentes | `apps/app/src/components/panels/` |
| Lista CRUD | `ResourceTable` e `defineResource.table` | UI em `packages/ui`, consulta/permissão na definição server-side |
| Criar/editar | `ResourceForm`, `Field`, `FieldGroup`, `Card` | `defineResource.form`; servidor valida novamente |
| Cabeçalho e ações | `PageHeader`, `ResourceActionHeader` | Título, breadcrumbs e ações de contexto |
| Rodapé de formulário | `ResourceActionFooter`, `Button`, `Spinner` | Integrado no `ResourceForm`; salvar/cancelar respeitam pending |
| Detalhe | `ResourceInfolist` e ações de registro | `defineResource.infolist/actions` |
| Exclusão/ação crítica | `ConfirmAction` e `AlertDialog` | Confirmação explícita, erro mantém controle disponível |
| Filtros/seleção | `Select`, `Combobox`, `Popover`, `Checkbox` | Estado de lista na URL, opções autorizadas no servidor |
| Feedback/estados | `Empty`, `Skeleton`, `Spinner`, `Alert`, Sonner | Sem dados de demonstração fingindo integração |
| Métricas/gráfico | `StatsOverview`, `ChartWidget`, shadcn Chart | Dados reais por props, sem fetch no pacote UI |
| Modal/painel lateral | `Dialog`, `Sheet`, `AlertDialog` | Usar foco e teclado dos primitivos Base UI |

Não instalar catálogo inteiro para antecipar recursos hipotéticos. Se item acima não atender, pesquisar componentes/blocos shadcn, depois ReUI. Instalar apenas dependências da necessidade real, preservando licença e tokens. Uma composição local pequena não deve substituir primitivo já disponível.

Primitivos são componentes oficiais shadcn/ui, estilo `base-nova` sobre [Base UI](https://base-ui.com) (`@base-ui/react`), ícones `lucide-react`, tokens `neutral`. A CLI instala tudo em `packages/ui/src/components/`. Importe por arquivo (`@vibe/ui/components/<nome>`) ou pelo entrypoint `@vibe/ui`. Docs: [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components) (aba Base UI).

Ícones: somente [`lucide-react`](https://lucide.dev/icons) (`iconLibrary: lucide` nos `components.json`). Em botões use `data-icon="inline-start|inline-end"`. Ícones de navegação vêm por chave de `apps/app/src/components/panels/nav-icons.ts`. SVG inline só para logos de marca ausentes no Lucide (ex.: Google).

Composição em Base UI usa a prop `render`, não `asChild`: `<DropdownMenuTrigger render={<Button variant="ghost" />}>`. Para links estilizados como botão use `buttonVariants()` em `<Link className={...}>`. Quando um gatilho de diálogo renderiza algo que não é `<button>` (ex.: item de menu), passe `nativeButton={false}`.

Seleção: sempre `Select` shadcn (`@vibe/ui/components/select`, Base UI); nunca `NativeSelect` nem `<select>` nativo. Em formulários use a prop `name` do `Select` (renderiza input oculto) ou valor controlado; passe `items` (`{ value, label }[]`) para o `SelectValue` mostrar o rótulo. Busca em muitas opções: `Combobox`.

Adicionar item oficial: `cd apps/app && env DO_NOT_TRACK=1 pnpm dlx shadcn@4.23.0 add <item> --yes` (sem `--overwrite`). Registries extras declarados em ambos `components.json`: `@cult-ui` e `@reui` (`https://reui.io/r/{style}/{name}.json`). Ordem: shadcn oficial primeiro; ReUI só como fallback para o que shadcn não tem (ex.: `@reui/data-grid`, `@reui/filters`, `@reui/file-upload`, `@reui/stepper`, `@reui/timeline`), instalado sob demanda com `pnpm dlx shadcn@4.23.0 add @reui/<nome>`. Nunca escrever à mão o que shadcn/ReUI já entrega.

### Tema e providers

`apps/app/src/components/providers.tsx` monta `ThemeProvider` (`next-themes`, classe `.dark`, padrão `system`), `TooltipProvider` e `Toaster` (Sonner). Feedback de ações usa `toast.success/error`, não mensagens inline. `theme.css` traz tokens oficiais neutral e importa nada; `globals.css` importa `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css` e o tema.

### Componentes de painel (inspirados no Filament)

Em `packages/ui/src/components/resource/` e `widgets/`. Schemas serializáveis ficam em `@vibe/ui/lib/schema` (`TableColumn`, `TableFilter`, `FormSection`, `InfolistSection`, `ListState`, `ActionResult`).

- `ResourceTable`: tabela dirigida pela URL (`page`, `perPage`, `search`, `sort`, `direction`, filtros). Tem busca com debounce, filtros em popover (Select), colunas ocultáveis (salvas em `localStorage`), seleção com ação em massa, menu de ações por linha, ações de registro (`recordActions` + `availableActions` por id + `onRecordAction`; `bulk` também na barra de seleção), paginação e estado vazio. O servidor pagina; a tabela nunca ordena só a página atual.
- `RecordActions` / `useRecordAction` (`resource/record-actions.tsx`): executa `RecordActionDef` com `ConfirmAction` quando `destructive` ou `confirm`, `toast` do resultado e `router.refresh()`; `ActionResult.redirectTo` faz navegação completa (`window.location.assign`, ex.: troca de sessão).
- `ResourceForm`: formulário por seções (`text`, `email`, `url`, `textarea`, `number`, `boolean` em Switch, `select` em Select, `combobox` em Combobox com busca, `date` em Popover + Calendar com valor ISO `yyyy-MM-dd`). Valida campos obrigatórios no cliente e mapeia `fieldErrors` do servidor por campo. `disabledOnEdit` deixa o campo só leitura e o omite no update.
- `ResourceInfolist`: visualização somente leitura em seções e colunas.
- `PageHeader`: breadcrumbs, título, descrição e ações de cabeçalho.
- `ResourceActionHeader` / `ResourceActionFooter` (`resource/resource-actions.tsx`): slots de composição, sem autorização nem comportamento próprio. `PageHeader.actions` usa o primeiro; `ResourceForm` usa o segundo para salvar/cancelar, em coluna no mobile e linha a partir de `sm`. Footer usa `Separator` oficial. Importáveis por arquivo ou `@vibe/ui`.
- `ConfirmAction`: AlertDialog para ações destrutivas; se `onConfirm` rejeita, o diálogo fica aberto.
- `StatsOverview` e `ChartWidget`: cards de métricas e gráfico de barras (shadcn Chart) com tabela alternativa acessível.

### Resources declarativos

Organização do CRUD: definição e acesso a dados em `apps/app/src/lib/resources/`; `render.tsx` compõe páginas; `components/resources/resource-views.tsx` adapta textos serializáveis e navegação cliente; `packages/ui/src/components/resource/` concentra apresentação reutilizável. Não gerar páginas manuais para criar/editar. `ResourceForm` mantém valores após falha, bloqueia controles, salvar e cancelar durante envio, anuncia `aria-busy` e foca primeiro erro após validação local ou `fieldErrors` do servidor. Campos HTML usam `validity`/`validationMessage` do navegador (email, URL, limites numéricos e comprimento), além de obrigatoriedade; servidor continua autoridade. Boolean `required` não significa exigir valor `true`. Descrições e erros do Switch têm IDs reais e `aria-invalid`.

Origem das barras: busca `shadcn search @shadcn -q action` não encontrou action header/footer específico. Busca ReUI retornou exemplos de formulários completos, não slot reutilizável; `shadcn view @reui/form-5` recusou acesso por licença. Nenhum código ReUI copiado. Barras são composição local mínima de layout e `Separator` já instalado, não substitutos de primitivos existentes.

Check de comportamento sem banco: `node packages/ui/src/components/resource/resource-form.check.mjs` na raiz, após instalar Chromium do Playwright. Exercita API pública real com Chromium, incluindo required, email inválido, limite numérico, pending, erro servidor em boolean, foco, serialização e slots. Navegação Next é adapter de teste, sem alegação de integração DB ou inspeção visual de CSS. CRUD completo com sessão/DB continua em `e2e/generated-resource.spec.ts`.

`apps/app/src/lib/resources/define.ts` define `ResourceDefinition`, equivalente ao Resource do Filament: rótulos localizados, ícone, grupo de navegação, colunas, filtros, formulário, infolist, `can(role, operation, scope)`, operações `list/get` e opcionais `create/update/delete` (ausentes = páginas e botões somem) e `actions`. `ResourceScope = { identifier, role, userId, isAdmin }`: `role` é papel no tenant (null fora de organização), `isAdmin` = superadmin global (`user.role === "admin"`). Painel `context: "global"` aceita só superadmin (identifier/role null); resources globais usam `can: (_role, _op, scope) => scope.isAdmin`. `render.tsx` gera as quatro páginas (lista, criar, visualizar, editar) com breadcrumbs. `resource-actions.ts` é a única porta de Server Actions: re-resolve sessão, tenant, papel e superadmin antes de chamar a definição. Exemplos no template: `definitions/admin-users.ts` e `definitions/admin-organizations.ts` (painel admin). A CLI `vibe resource` gera um arquivo em `definitions/` e registra em `lib/panels/resources.ts`.

Ações de registro (Filament Actions): `actions: [{ name, label, icon?, destructive?, confirm?, bulk?, visible?(record, scope), run(scope, ids) }]`. `icon` é chave de `components/panels/nav-icons.ts`. O servidor calcula `visible` por registro para a tabela e o cabeçalho da página de visualização. `runRecordAction` exige `can(read)`, rejeita várias ids sem `bulk` (`INVALID_INPUT`), recarrega cada registro via `get` (null = `NOT_FOUND`) e re-checa `visible` (`FORBIDDEN`) antes de `run`. `run` ainda deve validar regras de negócio próprias.

O shell do painel (`components/panels/`) monta sidebar recolhível com seletor de workspace, grupos de navegação e menu do usuário (conta, aparência, idioma, sair). A topbar tem busca global `⌘K` e o sino de notificações (Sheet). Páginas de conta e organizações usam o mesmo shell pelo route group `app/(account)`.

## Origem por arquivo

| Arquivo | Origem |
| --- | --- |
| `packages/ui/src/components/*.tsx`, `src/hooks/use-mobile.ts` | Gerados por `shadcn@4.23.0 add` (registry `base-nova`), MIT, sem edição. |
| `styles/theme.css` | Tokens do tema `neutral`, MIT; aliases locais `data-density`/`data-radius`. |
| `apps/app/src/components/panels/*`, `components/auth/auth-layout.tsx` | Blocos sidebar-07/login-03, MIT, adaptados a dados reais, i18n e Next `Link`. |
| `components/resource/*`, `components/widgets/*` | Composições locais sobre os primitivos acima, com padrões inspirados no Filament (MIT). |

### Licença das adaptações shadcn/ui

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Verificação de integração

A validação local do kit (registro interno, fora do repositório) documentou tipos dos 14 workspaces, CRUD pessoal por browser e builds/startup Docker app/worker exercitados naquele estado. Esses resultados posteriores substituem a ausência de checks registrada na fatia inicial de UI; não provam cobertura visual completa. Inspeção luz/escuro/compacto, foco/escape/retorno no modal, erro assíncrono da ação, formulário inválido e paginação/ordenação com loader real continuam gates específicos quando não houver evidência própria.
