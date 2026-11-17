# Testes e qualidade

Lint usa Oxlint para regras core/TypeScript explícitas e ESLint residual para React/Hooks/Next/a11y e regras não migradas. `pnpm test:lint` verifica negativos e configuração residual. `pnpm lint:oxlint` é gate rápido parcial, não substitui `pnpm lint`. Escopo e medições em `PERFORMANCE.md`.

## Organizações em resource: aceite de 2026-11-17

Build standalone da demo independente passou após padronização. Playwright executou listagem, criação e edição pelo resource da conta, persistência após reload, abas membros/convites, busca e mobile sem overflow da página. Screenshots desktop/mobile inspecionadas. Segunda conta criada e verificada por Mailpit não viu organização na busca e recebeu página de não encontrado no detalhe e na edição. Após convite e aceite como viewer, leitura funcionou, edição ficou indisponível e update direto Better Auth foi negado sem alterar nome do proprietário. Sem `pageerror`. Login e resource Note gerado pela CLI também passaram após mudança da engine. Dados sintéticos foram mantidos. Origem HTTPS encaminhada ao gateway local, sem sessão externa autenticada Cloudflare Access.

## Navegação e organizações: aceite de 2026-11-17

Build standalone produção no exemplo independente passou. Browser Playwright com origem HTTPS e gateway local observou mesmo documento e mesmo DOM de `SidebarProvider` após navegar entre menus com 700 ms de atraso de rede, estado recolhido preservado, breadcrumb atualizado e histórico voltar/avançar. `MutationObserver` observou Skeleton real durante streaming. Menu mobile fechou após navegar, sem overflow da página em 390 px, sem `pageerror`; screenshots desktop e mobile escuro inspecionadas. Tabelas largas mantêm scroll interno. Não foi sessão externa autenticada do Cloudflare Access, cuja proteção permaneceu ativa.

Fluxo real criou organização pelo Better Auth, abriu painel do proprietário, buscou no admin e editou nome por formulário padrão do resource. Nome persistiu após reload, slug permaneceu desabilitado. Organizações sintéticas do teste foram mantidas, sem apagar dados do usuário. Check de negativos sem banco: `node apps/app/src/lib/resources/definitions/admin-organizations.check.mjs`. Regressão permanente de navegação: `e2e/panel-navigation.spec.ts`, opt-in `E2E_ADMIN=1` com sessão admin isolada.

| Comando | O que roda | Requisitos |
| --- | --- | --- |
| `pnpm lint` | ESLint (`eslint-config-next` core-web-vitals + TypeScript no app; TypeScript + React Hooks nos pacotes), cache por conteúdo | nenhum |
| `pnpm check-types` | `tsc --noEmit` em todos os workspaces | nenhum |
| `pnpm test` | Unitários e checks puros (identidade, rotas de painel, rate limit, estado de lista, e-mail, CLI, push) | nenhum |
| `pnpm test:integration` | Auth, organizações, TOTP e RLS contra banco descartável | `IDENTITY_TEST_DATABASE=1`, PostgreSQL e Mailpit |
| `pnpm test:e2e` | Playwright `e2e/smoke.spec.ts`: cadastro → verificação → login em `/account`; atualização de perfil (toast); anônimo em `/account` vai a `/login`; `/admin` negado a não-admin; sidebar mobile. `e2e/generated-resource.spec.ts` (só com `E2E_GENERATED_RESOURCE=1`): CRUD do resource gerado `/app/note` | app compilado, PostgreSQL migrado, Mailpit |

## E2E local

```sh
pnpm --filter app build
pnpm exec playwright install chromium   # uma vez
EMAIL_ALLOW_INSECURE_LOOPBACK=true E2E_PORT=3010 BETTER_AUTH_URL=http://127.0.0.1:3010 \
  E2E_MAILPIT_URL=http://127.0.0.1:18025 pnpm test:e2e
```

Sem `E2E_BASE_URL`, o Playwright copia `static` e `public` para o build standalone e sobe `server.js` na porta `E2E_PORT` (padrão 3000) com o ambiente do shell; `BETTER_AUTH_URL` deve apontar para a mesma origem. Com `E2E_BASE_URL=http://127.0.0.1:3001`, ele reutiliza um servidor já rodando. Cada teste cria um usuário único `e2e-*@example.test`; use banco descartável. Falhas guardam trace e relatório em `e2e/playwright-report`.

No CI (`.github/workflows/ci.yml`), o job `e2e` roda depois de `checks`, com PostgreSQL 17 e Mailpit como serviços, e publica o relatório quando falha. Antes de migrar, ele exercita a CLI no checkout: `panel app --context personal --prefix /app` e `resource Note --model note --panel app --with-model --migration` (spec pessoal: `title` string obrigatório, `body` text opcional); depois `db:migrate`, build e `test:e2e` com `E2E_GENERATED_RESOURCE=1`. Com painel pessoal registrado, o login cai em `/app` em vez de `/account`.

Para repetir localmente, rode os mesmos comandos de geração numa cópia descartável (nunca no checkout que você vai commitar), aplique migrations e exporte `E2E_GENERATED_RESOURCE=1`.

`E2E_ORGANIZATIONS=1` habilita `e2e/organizations-resource.spec.ts` em ambiente híbrido/multi descartável. Cobre tabela, criação, detalhe, edição persistente, busca, mobile e segunda conta sem membership, incluindo negação de detalhe e edição. O check `account-organizations.check.mjs` complementa com sessão, perfil personal, modo single, roles, scope forjado, validação estrita e fronteira slug/UUID. Ele usa stubs de autenticação, não substitui o fluxo real com Better Auth e banco.

`EMAIL_ALLOW_INSECURE_LOOPBACK=true` permite links `http://` de loopback em e-mails de build de produção. Use só em E2E local ou CI. Nunca use em ambiente publicado.

## Convenções

CLI de superadmin (2026-11-17): `pnpm test:admin` cobre validação, recusa sem escrita de email existente, rejeição de senha em argumentos, stdin e encaminhamento de status sem shell. Aceite real em projeto híbrido independente com banco/roles exclusivos: `make:admin` criou conta; repetição com email em maiúsculas foi recusada, nome e papel preservados. Login dessa conta passou no browser contra standalone de produção via gateway local usando origem HTTPS pública; dashboard admin, usuários, organizações, criação/leitura de Note gerado e dashboard mobile sem overflow passaram. Cloudflare Access externo continua ativo (302 para autenticação), sem alegar sessão externa autenticada. Preview usa systemd e loopback; nenhum dado ou credencial demo entra no template.

Revalidação final de 2026-11-17: novo projeto híbrido criado diretamente pelo checkout final, sem sincronização manual de fontes. Instalação offline `--frozen-lockfile`, lint, tipos dos workspaces, `pnpm test`, check público de formulário e check de hashes/MCP/política passaram no destino. Matriz standalone ampliada passou **7 testes comuns**, com admin opt-in skipped; rodada admin separada passou anteriormente. Novo caso cria registro com usuário A, cadastra/verifica/autentica B por HTTP/SMTP/browser, comprova 404 nas rotas de detalhe/edição de A, busca sem registro para B e registro intacto para A antes da exclusão autorizada. Não é prova de todas as mutações cross-tenant nem de todos os perfis.

Repetições revelaram dois problemas nos testes, não vazamento de dados: 404 não possui `h1`, então assert passou a exigir mensagem explícita de página não encontrada; perfil com nome já salvo não disparava alteração, então teste passou a usar nome único. Matriz inteira foi repetida após correções, não apenas caso antes falho.

Checks adicionais de UI e ferramentas:

```sh
node packages/ui/src/components/resource/resource-form.check.mjs
node apps/app/src/lib/resources/definitions/account-organizations.check.mjs
node .agents/skills/shadcn/scripts/local-tooling.check.mjs
```

Primeiro usa Chromium e componente público real com adaptador de navegação Next, sem alegar banco ou integração completa. Cobre validação nativa, obrigatório, erro de servidor, foco após falha, bloqueio durante envio, ARIA do Switch, serialização e slots de ações. Segundo valida política e configuração local, não autentica MCP remoto.

E2E de resource gerado cobre criar, visualizar, editar com persistência, cancelar exclusão, buscar e excluir em massa. Cenário mobile verifica formulário, erro obrigatório, cancelamento e ausência de overflow. Prefira nomes acessíveis dos campos, pois identificadores internos não são contrato público.

`e2e/admin.spec.ts` é opt-in via `E2E_ADMIN=1`: exige sessão de superadmin sintético previamente provisionada no banco **descartável** e executa `--project=desktop --no-deps` para não substituir essa sessão pelo cadastro comum do setup. Cobre descoberta do admin na conta, dashboard, lista de usuários, edição de nome persistida e organizações. Nunca promova conta de produção para executar teste. Testes normais continuam exigindo negação do admin para usuário comum.

Validação integrada em 2026-11-17: projeto híbrido criado pela CLI fora do checkout, instalação offline frozen-lockfile, resource Note com migration e banco exclusivo com roles owner/runtime separadas. Preview Next em loopback, SMTP Mailpit local. Browser passou CRUD, perfil, negação de admin/anônimo e mobile, seguido de rodada admin separada. Build Next de produção passou (compilação 14,6 s, TypeScript 17,3 s nessa rodada). A matriz normal foi repetida no artefato standalone: 6 testes passaram e teste admin opt-in ficou skipped, como esperado. Rodada separada de admin no mesmo standalone também passou (1 teste). Nenhum provedor externo pago foi chamado. Isso não substitui deploy real, CI remoto nem smoke dos provedores externos.

- Teste permanente só para comportamento observável pelo usuário ou invariante de segurança. Detalhes de implementação ficam em scripts descartáveis.
- Seletores E2E: ids de campo (`#auth-*`, `#field-*`), `role` e `data-slot` dos primitivos shadcn. Evite classes CSS.
- Lint é obrigatório no CI. Desative regra só com comentário explicando o motivo.
