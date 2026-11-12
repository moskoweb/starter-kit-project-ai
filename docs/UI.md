# UI compartilhada

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
- `ConfirmAction`: AlertDialog para ações destrutivas; se `onConfirm` rejeita, o diálogo fica aberto.
- `StatsOverview` e `ChartWidget`: cards de métricas e gráfico de barras (shadcn Chart) com tabela alternativa acessível.

### Resources declarativos

`apps/app/src/lib/resources/define.ts` define `ResourceDefinition`, equivalente ao Resource do Filament: rótulos localizados, ícone, grupo de navegação, colunas, filtros, formulário, infolist, `can(role, operation, scope)`, operações `list/get` e opcionais `create/update/delete` (ausentes = páginas e botões somem) e `actions`. `ResourceScope = { identifier, role, userId, isAdmin }`: `role` é papel no tenant (null fora de organização), `isAdmin` = superadmin global (`user.role === "admin"`). Painel `context: "global"` aceita só superadmin (identifier/role null); resources globais usam `can: (_role, _op, scope) => scope.isAdmin`. `render.tsx` gera as quatro páginas (lista, criar, visualizar, editar) com breadcrumbs. `resource-actions.ts` é a única porta de Server Actions: re-resolve sessão, tenant, papel e superadmin antes de chamar a definição. Exemplos: `definitions/projects.ts` e `definitions/tasks.ts`. A CLI `vibe resource` gera um arquivo em `definitions/` e registra em `lib/panels/resources.ts`.

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

O registro consolidado em `.planning/LOCAL-VALIDATION.md` documenta tipos dos 14 workspaces, CRUD pessoal por browser e builds/startup Docker app/worker exercitados naquele estado. Esses resultados posteriores substituem a ausência de checks registrada na fatia inicial de UI; não provam cobertura visual completa. Inspeção luz/escuro/compacto, foco/escape/retorno no modal, erro assíncrono da ação, formulário inválido e paginação/ordenação com loader real continuam gates específicos quando não houver evidência própria. O histórico `.planning` pertence ao kit e não acompanha projetos derivados.
