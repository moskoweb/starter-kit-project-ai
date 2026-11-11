---
phase: "03"
created: 2026-11-11
status: design-contract
---

# Phase 3 — UI-SPEC

## Direção

Operadores de aplicações pessoais, organizações e plataforma global. Trabalho principal: identificar contexto atual e ler dados autorizados sem confundir áreas. Referência Kiranism de dashboard sóbrio, sem copiar autenticação ou dependências. Assinatura funcional: nome do painel e contexto sempre visíveis no cabeçalho; organização nunca inferida de cor. Sem números promocionais, receita/conversão inventada, gradientes decorativos ou menus mortos.

## Tokens

| Papel | Light | Dark |
|---|---|---|
| background | `#FFFFFF` | `#090D16` |
| card/sidebar | `#F8FAFC` | `#0F172A` |
| foreground/primary | `#0F172A` | `#F8FAFC` |
| muted foreground | `#475569` | `#94A3B8` |
| border/accent | `#E2E8F0` | `#334155` |
| focus/chart-1 | `#2563EB` | `#60A5FA` |

Tokens semânticos adicionais: primary-foreground, destructive/destructive-foreground, ring, chart-2..5, radius, font-sans, font-mono, density. Usar paleta shadcn compatível para estados, aferindo contraste na implementação; valores não equivalem a contraste já verificado. Override por `data-panel` substitui tokens, não CSS de componente. Modo `.dark`, `color-scheme` coerente; escolha sistema/light/dark sem flash de tema.

Tipografia única definida: Geist Sans para títulos/corpo; Geist Mono para IDs e valores tabulares, sem baixar família extra. Título 24/32 semibold; seção 18/28; corpo/menu 14/20; label 12/16; métrica 24/32 com tabular-nums. Raio base 8px, espaçamento 4/8/12/16/24/32px, densidade padrão linhas 44px e compacta 36px sem reduzir alvo interativo abaixo do mínimo acessível.

## Composição

```text
Sidebar 256px | Contexto atual / Breadcrumb       Tema Locale Usuário
             | Título + descrição de escopo
Dashboard    | [Projects reais, se disponíveis] [Membros reais, no escopo]
Navegação    | Série temporal de dados persistidos + período explícito
permitida    | Resumo tabular dos mesmos dados
```

Wireframe é composição, não conjunto obrigatório de métricas. Contagem e histórico precisam de fontes reais com timestamps e escopo. Sem projects persistidos, usar membros/organizações disponíveis e omitir indicador indisponível; não preencher com zero fictício. Painel pessoal não apresenta total global de membros. Global não agrega dados privados de tenant sem política explícita. Somente links para páginas concretas existentes; busca, exportação e criação não aparecem até possuírem ação real.

Sidebar colapsável 64px em desktop >=1024px, tooltip e accessible name nos ícones. Cookie `sidebar:state` lido no SSR evita salto, custa renderização dinâmica. Mobile: Sheet acionável por botão rotulado, Escape fecha, foco retorna ao gatilho, navegação fecha drawer. Cabeçalho 56px; conteúdo 24px desktop/16px mobile; cards 1 coluna mobile, 2 em tablet, até 3 no desktop. Tabela pode rolar horizontalmente dentro do contêiner, nunca página inteira.

## Rotas e contexto

Somente `app/(panels)/[[...segments]]/page.tsx` despacha componentes concretos de painel após resolver registry e autorizar no servidor. Prefixos configuráveis defaults `/admin`, `/app`, `/org/{tenant}`; sem rotas internas `/global` ou `/personal`, rewrites ou middleware. Contrato de reserva/canonicalização em `03-CONTEXT.md`. Acesso negado não inclui dados, nomes de org não autorizada nem métricas; link de retorno seguro para área permitida.

Troca de painel/organização usa links gerados centralmente. Estado de tabela/cache não atravessa contexto. Painel pessoal funciona sem organização; trocar para org exige membership real; switcher não cria privilégios.

## Componentes, estados e acessibilidade

Local → shadcn → criação; subpastas `ui/data-table/form/infolist/widgets/actions`, sem filament. Forms RHF/Zod com label, descrição, erro associado por aria-describedby, aria-invalid e foco no primeiro erro. Não gerar abstração de campo para um único input. Tabela TanStack mínima e versão confirmada; filtros/paginação persistem parâmetros validados pelo servidor, sem implementar CRUD fase 4.

Charts shadcn/Recharts recebem DTO serializável de loader autorizado, altura mínima explícita, séries com labels, legenda e alternativa tabular. Cor nunca é único diferenciador; datas e unidade no eixo/tooltip. Sem animação quando reduced-motion ativo.

- Loading: skeleton da geometria real e anúncio de carregamento; não mostrar números fictícios.
- Empty: “Ainda não há dados neste período.” / “No data for this period yet.”; CTA somente se ação real autorizada.
- Error: “Não foi possível carregar os dados.” / “Could not load data.”; tentar novamente com ação real e sem erro interno exposto.
- Denied: “Você não tem acesso a este painel.” / “You do not have access to this panel.”; retorno seguro.

## i18n e critérios visuais de aceite futuro

Dicionários locais `apps/app/src/lib/i18n/`, `pt-BR` e `en` com mesmas chaves. Sem pacote extra ou prefixo de locale. Preferência validada em cookie; `Intl` com locale, moeda e timezone explícitos, sem converter BRL para USD por idioma. Labels, erros, navegação, charts e datas traduzidos; `lang` do documento atualizado.

Verificação futura, não executada: screenshots 375/768/1440px em light/dark e ambos locales; sem overflow de página, truncamento de ações ou perda do contexto. Teclado percorre navegação, Sheet, seletor e form; foco visível; contraste WCAG AA (texto normal 4.5:1, controles 3:1); zoom 200%; reduced-motion; leitor de tela identifica estado ativo e erros. Alterar tokens de raio/densidade/cores e override de um painel não duplica componentes nem altera outro painel.
