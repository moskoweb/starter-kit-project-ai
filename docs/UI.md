# UI compartilhada

`@vibe/ui` contém apresentação, sem fetch, banco, autenticação, traduções ou engine de resources. Textos e dados chegam por props. App mantém autorização, loaders, locale e estado de navegação.

## CSS e temas

No CSS global Tailwind v4 do app:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@vibe/ui/theme.css";
@source "../../../../packages/ui/src";
```

Ajustar caminho `@source` à localização real do CSS consumidor. `@vibe/ui/theme.css` é único entrypoint CSS; `tokens.css` e aliases legados foram removidos no cutover coordenado com app. Não importar Tailwind uma segunda vez no pacote. App instala `tailwindcss`, `tw-animate-css` (animações dos primitivos shadcn), `@tailwindcss/postcss` e `postcss`, configurando plugin PostCSS. `theme.css` aplica `bg-background text-foreground font-sans` no `body`. `.dark` ou `data-theme="dark"` troca tokens; ausência usa luz. Sem persistência ou detecção de tema no pacote. `data-density="compact"` reduz espaçamento, `data-radius="square" | "round"` muda raio. Sobrescrever `--ui-font-sans`, `--ui-font-mono`, `--radius` e `--spacing` por CSS. Fontes não são baixadas pelo pacote. Cores destrutivas foram ajustadas em relação ao vermelho claro da especificação; contraste ainda requer inspeção de integração.

### PostCSS no desenvolvimento

Manter `apps/app/postcss.config.mjs` com `export default { plugins: { "@tailwindcss/postcss": {} } };`, formato [oficial do Next](https://nextjs.org/docs/app/getting-started/css#tailwind-css). Não usar `require.resolve()` como chave: Turbopack transforma a resolução estática em ID virtual `[project]/… [postcss]`, mas o carregador PostCSS passa a chave a `require()` nativo; Node não reconhece esse ID. Importar o plugin diretamente também coloca dependências nativas (Lightning CSS/Oxide) no bundle de configuração.

Se `Cannot find module '@tailwindcss/postcss'` persistir após instalar dependências de desenvolvimento, verificar a resolução Node a partir de `apps/app` e `apps/app/.next/dev/build`. Com ambas resolvendo o pacote real, não trocar para webpack nem alterar `turbopack.root` sem evidência: o carregador gerado usa `require()` nativo e os links pnpm estão dentro da raiz do workspace. Next 16 habilita cache persistente do Turbopack no dev por padrão; reiniciar o processo sozinho não invalida esse cache. Para diagnosticar output obsoleto, parar somente o preview afetado, remover somente `apps/app/.next/dev` (output gerado), reiniciar e validar novamente; não apagar dados do app nem parar outros previews. Este procedimento não substitui evidência da falha específica nem os gates de release.

## API

Primitivos são componentes oficiais shadcn/ui (style `new-york`, base Radix, ícones `lucide-react`, tokens `neutral`) instalados pela CLI em `packages/ui/src/components/`. Importar por arquivo, `@vibe/ui/components/<nome>`, ou pelo entrypoint `@vibe/ui`. API e exemplos: [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components). Utilitário de classes: pacote [`cn`](https://github.com/shadcn-ui/cn).

Instalados: avatar, badge, breadcrumb, button, card, collapsible, dialog, dropdown-menu, field, input, label, native-select, select (Radix), separator, sheet, sidebar, skeleton, table, tooltip. Adicionar outro: `cd apps/app && pnpm dlx shadcn@4.23.0 add <item>`; exportar no `src/index.tsx` se usado pelo entrypoint. `NativeSelect` substitui o antigo `Select` nativo (mobile/teclado nativos); `Select` agora é o Radix.

Blocos: painel adapta [sidebar-07](https://ui.shadcn.com/blocks#sidebar-07) (`apps/app/src/components/panels/`: `shell`, `nav-main`, `nav-user`, `team-switcher`); auth adapta [login-03](https://ui.shadcn.com/blocks#login-03) (`components/auth/auth-layout.tsx`). Estado da sidebar persiste no cookie `sidebar_state` do componente shadcn.

Composições locais:

- `DataTable<T>`: `data`, `columns: ColumnDef<T, unknown>[]`, `getRowId`, `rowCount`, `pagination`, `sorting`, `onPaginationChange`, `onSortingChange`. Paginação/ordenação exclusivamente manuais: app consulta servidor ao mudar estado. Nunca ordena só página atual. `getRowId` deve usar ID estável de domínio, não índice. Não mantém seleção interna entre páginas/tenants; bulk selection pertence ao caller e deve ser limpa em mudança de escopo. Labels obrigatórios: `caption`, `emptyMessage`, `previousLabel`, `nextLabel`, `pageLabel(page, count)`. App trata filtros, loading e falhas do loader.
- `Form`, `FormField`, `FormInput`, `useForm`, `zodResolver`: padrão React Hook Form + Zod. `Form` é FormProvider; envolver `<form onSubmit={methods.handleSubmit(save)}>` e usar `FormInput<T> name label description`. Mensagens de schema aparecem com `role="alert"` e referência no input. Para controls não textuais, `FormField` é Controller tipado.
- `Infolist`, `InfolistEntry label`: `<dl>` com `<dt>/<dd>`, children aceitam conteúdo de apresentação.
- `StatWidget`: `label`, `value`, `description?`. `EmptyState`: `title`, `description?`, `action?`. Nenhuma métrica inventada.
- `ChartContainer`: container responsivo Recharts. `ChartWidget`: `title`, `description`, `data: { label: string; value: number }[]`, `seriesLabel`, `emptyMessage`. Barras usam `--chart-1`; dados somente por props. Sem animação; tabela expansível fornece alternativa textual completa. App formata valores/labels conforme locale antes de renderizar.
- `ConfirmDialog`: `trigger` (elemento que aceita props/ref Radix), `title`, `description`, `confirmLabel`, `cancelLabel`, `errorMessage`, `onConfirm`, `destructive?`. Callback pode retornar Promise; sucesso fecha, rejeição exibe erro, pending bloqueia fechamento e duplicação. Callback deve rejeitar em falha real e validar autorização no servidor. Cancelar recebe foco inicial.

### Formulário

```tsx
const schema = z.object({ email: z.email("Informe email válido") });
const methods = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema), defaultValues: { email: "" },
});
return <Form {...methods}>
  <form onSubmit={methods.handleSubmit(save)}>
    <FormInput<z.infer<typeof schema>> name="email" label="Email" type="email" autoComplete="email" />
    <Button type="submit" disabled={methods.formState.isSubmitting}>Salvar</Button>
  </form>
</Form>;
```

Exemplo exige imports de `z` de `zod` e exports citados de `@vibe/ui`. App fornece `save`; nenhum transporte está embutido.

## Origem por arquivo

| Arquivo | Origem |
| --- | --- |
| `packages/ui/src/components/*.tsx`, `src/hooks/use-mobile.ts` | Gerados por `shadcn@4.23.0 add` (registry `new-york-v4`), MIT, sem edição. |
| `styles/theme.css` | Tokens do tema `neutral` new-york-v4, MIT; aliases locais `data-density`/`data-radius`. |
| `apps/app/src/components/panels/*`, `components/auth/auth-layout.tsx` | Blocos sidebar-07/login-03, MIT, adaptados a dados reais, i18n e Next `Link`. |
| `components/data-table`, `form`, `infolist`, `actions`, `widgets` | Composições locais sobre primitivos acima. `ChartContainer` adaptado de shadcn chart.tsx. |

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
