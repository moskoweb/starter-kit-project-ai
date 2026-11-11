# UI compartilhada

`@vibe/ui` contém apresentação, sem fetch, banco, autenticação, traduções ou engine de resources. Textos e dados chegam por props. App mantém autorização, loaders, locale e estado de navegação.

## CSS e temas

No CSS global Tailwind v4 do app:

```css
@import "tailwindcss";
@import "@vibe/ui/theme.css";
@source "../../../../packages/ui/src";
```

Ajustar caminho `@source` à localização real do CSS consumidor. `@vibe/ui/theme.css` é único entrypoint CSS; `tokens.css` e aliases legados foram removidos no cutover coordenado com app. Não importar Tailwind uma segunda vez no pacote. App instala `tailwindcss`, `@tailwindcss/postcss` e `postcss`, configurando plugin PostCSS. Aplicar `bg-background text-foreground font-sans` ao shell. `.dark` ou `data-theme="dark"` troca tokens; ausência usa luz. Sem persistência ou detecção de tema no pacote. `data-density="compact"` reduz espaçamento, `data-radius="square" | "round"` muda raio. Sobrescrever `--ui-font-sans`, `--ui-font-mono`, `--radius` e `--spacing` por CSS. Fontes não são baixadas pelo pacote. Cores destrutivas foram ajustadas em relação ao vermelho claro da especificação; contraste ainda requer inspeção de integração.

### PostCSS no desenvolvimento

Manter `apps/app/postcss.config.mjs` com `export default { plugins: { "@tailwindcss/postcss": {} } };`, formato [oficial do Next](https://nextjs.org/docs/app/getting-started/css#tailwind-css). Não usar `require.resolve()` como chave: Turbopack transforma a resolução estática em ID virtual `[project]/… [postcss]`, mas o carregador PostCSS passa a chave a `require()` nativo; Node não reconhece esse ID. Importar o plugin diretamente também coloca dependências nativas (Lightning CSS/Oxide) no bundle de configuração.

Se `Cannot find module '@tailwindcss/postcss'` persistir após instalar dependências de desenvolvimento, verificar a resolução Node a partir de `apps/app` e `apps/app/.next/dev/build`. Com ambas resolvendo o pacote real, não trocar para webpack nem alterar `turbopack.root` sem evidência: o carregador gerado usa `require()` nativo e os links pnpm estão dentro da raiz do workspace. Next 16 habilita cache persistente do Turbopack no dev por padrão; reiniciar o processo sozinho não invalida esse cache. Para diagnosticar output obsoleto, parar somente o preview afetado, remover somente `apps/app/.next/dev` (output gerado), reiniciar e validar novamente; não apagar dados do app nem parar outros previews. Este procedimento não substitui evidência da falha específica nem os gates de release.

## API

Todos exports pelo entrypoint `@vibe/ui`.

- `Card`, `Badge`, `Heading`, `Text`: contratos antigos preservados, agora sobre tokens semânticos únicos. `Card` também aceita atributos de div. `Badge` mantém variantes `success | danger | neutral`. Nenhum alias legado necessário.
- `Button`: atributos nativos, `variant="default | outline | ghost | destructive"`, `size="default | sm | icon"`; type padrão `button`. Botões só com ícone precisam de `aria-label`. Não suporta `asChild`.
- `Input`, `Label`, `Select`: atributos HTML nativos. `Select` usa `<option>` filhos, não componentes Radix; comportamento de teclado e mobile nativo. Sempre fornecer label associado.
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`: tabela semântica com overflow horizontal; fornecer caption.
- `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogTitle`, `DialogDescription`: Radix Dialog, foco modal e retorno ao trigger. Fornecer título, descrição e controle explícito de fechar. Trigger/Close suportam `asChild` Radix.
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

Fontes upstream consultadas em 2026-11-11, branch `main`, diretório [new-york-v4/ui](https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui). São adaptações locais, não registry gerado nem sync automático.

| Arquivo em packages/ui/src | Origem e mudanças |
| --- | --- |
| `components/ui/button.tsx` | [shadcn button.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/button.tsx), MIT. Reduzido a variantes usadas, HTML nativo, sem Slot/CVA. |
| `components/ui/input.tsx` | [shadcn input.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/input.tsx), MIT. Classes reduzidas, atributos nativos. |
| `components/ui/dialog.tsx` | [shadcn dialog.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/dialog.tsx), MIT. Radix direto, sem ícone/close com tradução fixa, sem animações. |
| `components/widgets/chart-widget.tsx` | `ChartContainer` adaptado de [shadcn chart.tsx](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/chart.tsx), MIT. Sem contexto/config/style injection; token CSS direto. Widget de barras local. |
| `components/ui/card.tsx`, `components/ui/badge.tsx` | Código local anterior movido de `src/index.tsx`; Card recebe classes/tokens novos preservando props. |
| `components/ui/label.tsx`, `components/ui/select.tsx`, `components/ui/table.tsx` | Código local sobre HTML nativo; sem cópia upstream. |
| `components/data-table/data-table.tsx` | Composição local usando API TanStack Table v8. |
| `components/form/form.tsx` | Composição local usando RHF/Controller e resolver Zod; não cópia de shadcn form. |
| `components/infolist/infolist.tsx`, `components/actions/confirm-dialog.tsx`, `components/widgets/stat-widget.tsx`, `styles/theme.css` | Código local, baseado nos contratos da fase. |

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
