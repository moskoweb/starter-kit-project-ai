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

Composição em Base UI usa a prop `render`, não `asChild`: `<DropdownMenuTrigger render={<Button variant="ghost" />}>`. Para links estilizados como botão use `buttonVariants()` em `<Link className={...}>`. Quando um gatilho de diálogo renderiza algo que não é `<button>` (ex.: item de menu), passe `nativeButton={false}`.

Adicionar item oficial: `cd apps/app && pnpm dlx shadcn@4.23.0 add <item>`. Registries extras declarados em `components.json`: `@cult-ui`.

### Tema e providers

`apps/app/src/components/providers.tsx` monta `ThemeProvider` (`next-themes`, classe `.dark`, padrão `system`), `TooltipProvider` e `Toaster` (Sonner). Feedback de ações usa `toast.success/error`, não mensagens inline. `theme.css` traz tokens oficiais neutral e importa nada; `globals.css` importa `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css` e o tema.

### Componentes de painel (inspirados no Filament)

Em `packages/ui/src/components/resource/` e `widgets/`. Schemas serializáveis ficam em `@vibe/ui/lib/schema` (`TableColumn`, `TableFilter`, `FormSection`, `InfolistSection`, `ListState`, `ActionResult`).

- `ResourceTable`: tabela dirigida pela URL (`page`, `perPage`, `search`, `sort`, `direction`, filtros). Tem busca com debounce, filtros em popover, colunas ocultáveis (salvas em `localStorage`), seleção com ação em massa, menu de ações por linha, paginação e estado vazio. O servidor pagina; a tabela nunca ordena só a página atual.
- `ResourceForm`: formulário por seções (`text`, `email`, `url`, `textarea`, `number`, `boolean` em Switch, `select`, `date`). Valida campos obrigatórios no cliente e mapeia `fieldErrors` do servidor por campo. `disabledOnEdit` deixa o campo só leitura e o omite no update.
- `ResourceInfolist`: visualização somente leitura em seções e colunas.
- `PageHeader`: breadcrumbs, título, descrição e ações de cabeçalho.
- `ConfirmAction`: AlertDialog para ações destrutivas; se `onConfirm` rejeita, o diálogo fica aberto.
- `StatsOverview` e `ChartWidget`: cards de métricas e gráfico de barras (shadcn Chart) com tabela alternativa acessível.

### Resources declarativos

`apps/app/src/lib/resources/define.ts` define `ResourceDefinition`, equivalente ao Resource do Filament: rótulos localizados, ícone, grupo de navegação, colunas, filtros, formulário, infolist, `can(role, operation)` e operações `list/get/create/update/delete`. `render.tsx` gera as quatro páginas (lista, criar, visualizar, editar) com breadcrumbs. `resource-actions.ts` é a única porta de Server Actions: re-resolve sessão, tenant e papel antes de chamar a definição. Exemplos: `definitions/projects.ts` e `definitions/tasks.ts`. A CLI `vibe resource` gera um arquivo em `definitions/` e registra em `lib/panels/resources.ts`.

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
