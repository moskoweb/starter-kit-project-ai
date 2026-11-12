# Testes e qualidade

| Comando | O que roda | Requisitos |
| --- | --- | --- |
| `pnpm lint` | ESLint (`eslint-config-next` core-web-vitals + TypeScript no app; TypeScript + React Hooks nos pacotes) | nenhum |
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

`EMAIL_ALLOW_INSECURE_LOOPBACK=true` permite links `http://` de loopback em e-mails de build de produção. Use só em E2E local ou CI. Nunca use em ambiente publicado.

## Convenções

- Teste permanente só para comportamento observável pelo usuário ou invariante de segurança. Detalhes de implementação ficam em scripts descartáveis.
- Seletores E2E: ids de campo (`#auth-*`, `#field-*`), `role` e `data-slot` dos primitivos shadcn. Evite classes CSS.
- Lint é obrigatório no CI. Desative regra só com comentário explicando o motivo.
