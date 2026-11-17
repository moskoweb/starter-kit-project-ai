# Performance e revisão de pacotes

Consulta e medições: 2026-11-17. Escopo: tooling local, sem troca de framework, deploy, compartilhamento remoto de código ou atualização indiscriminada de dependências.

## Decisão aplicada

`pnpm lint` mantém ESLint e configuração completa Next/Core Web Vitals, React Hooks, acessibilidade e TypeScript. Acrescenta `--cache --cache-strategy content --cache-location node_modules/.cache/eslint/`. Cache fica ignorado por `node_modules/`, não acompanha projeto criado nem exige mudança de lockfile. Conteúdo, não mtime, determina reaproveitamento. ESLint invalida entradas quando sua configuração muda. Após atualizar plugins/dependências, remova esse diretório de cache ou use `pnpm exec eslint . --max-warnings=0 --no-cache` para validação integral.

Sem regra desligada, sem pacote novo, sem mudança em runtime ou tsconfig. CI continua chamando `pnpm lint`. Como CI não restaura esse cache, primeira execução continua integral. Não habilitado cache compartilhado entre branches nem reaproveitamento remoto.

## Medições locais

Linux x86_64, Xeon E5-2699 v4, RAM total 15,6 GiB, aproximadamente 3,9 GiB disponível no início, swap já usada por serviços existentes. Node 22.23.2, pnpm 10.32.1. Medição única por cenário com GNU `/usr/bin/time`, não mediana de benchmark isolado. Serviços e outros trabalhos mantidos ativos. RSS é máximo informado pelo comando/processos filhos, não soma da memória simultânea de toda árvore.

| Comando/cenário | Tempo real | Máximo RSS (KiB) | Resultado |
| --- | ---: | ---: | --- |
| `pnpm lint`, antes, sem cache ESLint | 17,26 s | 584940 | passou |
| `pnpm lint`, depois, primeiro cache | 16,03 s | 650236 | passou |
| `pnpm lint`, depois, cache aquecido | 2,90 s | 241880 | passou |
| `pnpm exec turbo run check-types --concurrency=1`, baseline | 13,86 s | 567080 | 16/16, 14 hits |
| Mesmo comando após edição e outros trabalhos | 26,40 s | 723972 | 16/16, 13 hits |
| TS 5.9.3, somente app, sem incremental | 16,08 s | 844556 | passou |
| TS 7.0.2 isolado, somente app, sem incremental | 3,83 s | 1002424 | passou |

Lint aquecido teve redução observada de 83% no tempo e 59% no RSS versus baseline sem cache. Primeiro cache não demonstra ganho confiável, consumiu mais RSS. Tipos do monorepo **não** representam compilação fria: Turbo reaproveitou logs/resultados, e app já tinha `.tsbuildinfo`. Segunda rodada não é regressão atribuível ao cache ESLint: conjunto de misses/código em trabalho concorrente mudou. Concorrência 1 foi usada explicitamente para limitar pressão de memória, não alterou script padrão. TS7 e TS5 do app ignoraram incremental, mas continuaram sujeitos a page cache do sistema e diferenças de processo/concorrência. Ganho TS7 não comprova compatibilidade global.

Reprodução, sem apagar caches/artefatos de serviços existentes:

```sh
/usr/bin/time -f 'elapsed=%e maxrss_kib=%M exit=%x' pnpm exec eslint . --max-warnings=0 --no-cache
/usr/bin/time -f 'elapsed=%e maxrss_kib=%M exit=%x' pnpm lint
/usr/bin/time -f 'elapsed=%e maxrss_kib=%M exit=%x' pnpm lint
/usr/bin/time -f 'elapsed=%e maxrss_kib=%M exit=%x' pnpm exec turbo run check-types --concurrency=1
/usr/bin/time -f 'elapsed=%e maxrss_kib=%M exit=%x' pnpm --filter app exec tsc --noEmit --incremental false
```

Primeiro `pnpm lint` acima só é frio se diretório de cache não existir. Para benchmark novo sem interferir no cache corrente, use `pnpm exec eslint . --max-warnings=0 --cache --cache-strategy content --cache-location "$JCODE_SCRATCH_DIR/eslint-benchmark/"`, duas vezes, com diretório ainda inexistente. `--force` no Turbo ignora seu cache, mas não desliga incremental do TypeScript. Não confundir os dois.

## Registry real e compatibilidade

Fonte: metadados públicos `https://registry.npmjs.org/<package>` e `/<package>/<version>`, via HTTPS. Tabela usa versões instaladas conferidas por `pnpm list -r --depth 0 --json`, não apenas ranges de manifest. `latest` é fotografia da consulta, não recomendação automática. Todos pacotes externos diretos foram consultados. Grupos abaixo condensam pacotes com mesma decisão.

| Pacote | Instalado | `latest` consultado |
| --- | --- | --- |
| typescript | 5.9.3 | 7.0.2 |
| eslint | 9.39.5 | 10.15.0 |
| eslint-config-next / next | 16.4.6 | 16.4.6 |
| react / react-dom | 19.3.1 | 19.3.1 |
| turbo | 2.11.10 | 2.11.11 |
| tsx | 4.23.15 | 4.23.15 |
| @playwright/test | 1.65.0 | 1.65.1 |
| astro | 6.4.8 | 7.4.12 |
| @astrojs/check | 0.9.12 | 0.9.12 |
| @astrojs/sitemap | 3.7.4 | 3.7.5 |
| better-auth / @better-auth/drizzle-adapter | 1.7.20 | 1.7.25 |
| @better-auth/utils | 0.5.1 | 0.5.1 |
| drizzle-orm / drizzle-kit / postgres | 0.45.4 / 0.31.11 / 4.1.1 | iguais |
| ai / @ai-sdk/openai-compatible | 7.0.169 / 3.0.90 | 7.0.173 / 3.0.92 |
| @aws-sdk/client-s3 / s3-request-presigner / s3-presigned-post | 3.1166.0 | 3.1170.0 |
| nodemailer / @types/nodemailer | 10.5.0 / 7.0.12 | 10.6.0 / 8.0.2 |
| react-email / @react-email/ui | 6.11.11 | 6.11.14 |
| pg-boss / web-push / @types/web-push | 12.38.2 / 4.0.0 / 3.6.4 | iguais |
| ipaddr.js | 2.2.0 | 2.5.0 |
| lucide-react / recharts | 1.72.0 / 3.8.0 | 1.74.0 / 3.10.1 |
| postcss | 8.5.23 | 8.5.33 |
| @types/node | 22.20.5 | 26.6.6 |
| @types/react / @types/react-dom | 19.3.0 | 19.3.0 |
| tailwindcss / @tailwindcss/postcss / @tailwindcss/vite | 4.3.5 | 4.3.5 |
| shadcn / @base-ui/react | 4.23.0 / 1.9.0 | iguais |
| zod / server-only | 4.6.7 / 0.0.1 | iguais |
| next-themes / react-qr-code / sonner | 0.4.6 / 2.2.0 / 2.0.8 | iguais |
| class-variance-authority / cmdk / cn | 0.7.1 / 1.1.1 / 0.5.2 | iguais |
| date-fns / react-day-picker / tw-animate-css | 4.4.0 / 10.0.2 / 1.4.0 | iguais |

Atualizações menores/patch são candidatas a lote separado com changelog e integração, não ganho de performance presumido. Better Auth/adaptador, React/DOM, email/UI e trio AWS devem continuar alinhados. `@types/node` deve representar runtime Node 22, não seguir major 26 automaticamente. Tipos Nodemailer já têm major diferente de runtime: verificar contrato antes de qualquer atualização, não corrigir apenas por número.

### TypeScript 7: estável, mas ainda não seguro como substituto global

Registry confirma `typescript@7.0.2` em `latest`, não preview. `next` aponta 7.1.0-dev.20261117.1 e `beta` 7.1.0-beta. Pacote estável inclui binário nativo por plataforma. `@typescript/native-preview` ainda aponta 7.0.0-dev.20260707.2, anterior ao estável, portanto não foi adicionado.

Teste local instalou **somente tooling público** em diretório scratch, fora do workspace, com `npm install --prefix "$JCODE_SCRATCH_DIR/perf/ts7" --ignore-scripts --no-audit --no-fund typescript@7.0.2`. Depois executou seu `node_modules/.bin/tsc --noEmit --incremental false -p apps/app/tsconfig.json`. Passou, com medidas acima. Nenhum código foi enviado para compilação remota.

Bloqueios concretos de adoção global:

- `@astrojs/check@0.9.12` declara peer `typescript: ^5.0.0 || ^6.0.0` e depende do language server. Não aceita TS7 como contrato publicado.
- `@typescript-eslint/parser@8.73.0` declara `typescript: >=4.8.4 <6.1.0`. Peer permissivo do `eslint-config-next` não elimina limite transitivo do parser.
- Compilação isolada do app não valida API de compiler usada por Astro, plugins de linguagem Next, build Next, editor, emissão CLI/worker nem todos 16 workspaces.

Manter TS5.9.3 canônico. Reavaliar TS7 quando peers publicarem suporte e matriz app/Astro/lint/CLI/worker/build passar. Não expor comando alternativo permanente para um caminho ainda parcial.

### Oxlint versus ESLint

Oxlint `latest` real: 1.94.0, Node `^20.19.0 || >=22.12.0`, compatível com Node local. `pnpm dlx oxlint@1.94.0 --rules` confirmou regras Next.js, JSX a11y e React, inclusive `rules-of-hooks`, `exhaustive-deps`, `purity`, `static-components` e `preserve-manual-memoization`. Não afirmar que Oxlint não tem essas regras. Presença pelo nome não prova semântica equivalente, opções, resoluções Next, suppressions ou presets idênticos.

Não adotado nesta rodada. Rodar Oxlint seguido de ESLint completo duplica análise e adiciona dependência sem ganho demonstrado. Desligar duplicadas no ESLint exige inventário regra por regra e fixtures negativos para overrides shadcn, bindings `_`, CommonJS e scoping Next. Cache nativo do ESLint já resolve caso repetido com menor diff e preserva cobertura integral. Reavaliar híbrido apenas se lint frio virar gargalo medido, mantendo regras não equivalentes em ESLint. Nenhum benchmark de Oxlint com defaults é apresentado como comparação equivalente.

## React/Next versus alternativas

| Stack, versão `latest` consultada | Ganho possível | Custo ou limite neste kit |
| --- | --- | --- |
| React 19.3.1 + Next 16.4.6 | SSR, Server Components, rotas e handlers já integrados. Reuso Base UI/shadcn React, charts, React Email e resources locais | Dependência do runtime/contratos Next e custo de build. Otimizar com medidas reais antes de migrar |
| Svelte 5.57.3 + SvelteKit 3.2.0 | Modelo compilado e SSR integrado, candidato para projeto novo com preferência Svelte | Componentes React/Base UI, geradores TSX, layouts, rotas, server actions e testes precisariam adaptação. Menor bundle não foi medido neste produto |
| Vue 3.5.45 + Nuxt 4.6.4 | SSR e ecossistema Vue, candidato para equipe Vue | Mesmo custo de portar UI/geradores/contratos Next. shadcn-vue não torna componentes React locais reutilizáveis |
| Vite 8.3.8 + React/Vue/Svelte | Tooling dev/build, útil para SPA que não precisa infraestrutura Next | Vite não é framework de aplicação equivalente. SPA exigiria decidir API, SSR se necessário, roteamento e limites de servidor. Já existe Vite transitivo no Astro, não precisa outra dependência direta |
| Astro 6.4.8 existente, latest 7.4.12 | Site público estático separado já evita runtime/hidratação de painel no marketing | Astro 7 é major e exige Node >=22.23.4, acima do 22.23.2 local/CI. Não atualizar nesta rodada |

Auth não é argumento de exclusividade: metadados Better Auth 1.7.25 incluem peers para Next, React, Vue, Svelte e SvelteKit. A razão de manter stack é integração existente, não impossibilidade nas alternativas. SvelteKit exige Node >=22.17, Nuxt `^22.22.3 || ^24.15.0 || >=26.0.0` e Vite `^20.19.0 || >=22.12.0`, compatíveis com runtime local. Não houve implementação equivalente nem benchmark de navegação, bundle, SSR ou build entre frameworks. Nenhuma evidência material justifica migração.

## Verificação e limites

Lint sem cache, primeiro cache e cache aquecido passaram. Tipos passaram em 16 workspaces com concorrência limitada e cache parcial, não prova de clone frio. Foram exercitados fixtures negativos via `ESLint.lintText` para Hooks condicionais, dependência ausente em effect, imagem Next e imagem sem `alt`, todos diagnosticados pela regra esperada. Reprodução mínima da política:

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
const lint = new ESLint();
for (const [rule, source] of [
  ['react-hooks/rules-of-hooks', 'import { useState } from "react"; export default function C({ ok }) { if(ok) useState(0); return null; }'],
  ['react-hooks/exhaustive-deps', 'import { useEffect } from "react"; export default function C({ value }) { useEffect(() => console.log(value), []); return null; }'],
  ['@next/next/no-img-element', 'export default function C() { return <img src="/logo.png" alt="Logo" />; }'],
  ['jsx-a11y/alt-text', 'export default function C() { return <img src="/logo.png" />; }'],
]) {
  const [result] = await lint.lintText(source, { filePath: 'apps/app/src/app/lint-policy-check.tsx' });
  assert(result.messages.some(message => message.ruleId === rule), rule);
  console.log('PASS', rule);
}
JS
```

`pnpm test` passou, incluindo testes unitários existentes e checks de render de email, geração/upgrade CLI e validação push. Tarefas Turbo podem reaproveitar cache, portanto esse resultado também não equivale a rodada inteiramente fria.

Sem build pesado, E2E ou banco nesta rodada: mudança não altera runtime, serviços já consomem memória e reescrever `.next` poderia afetar servidor existente. CI remoto não executado. Não há alegação de auditoria de vulnerabilidades ou aprovação de atualização de runtime.
