# Painéis

Modelo inspirado no Filament: cada painel é uma área com shell próprio, navegação e resources. O kit entrega ferramentas, não domínio: o template registra **somente** o painel `admin`. Painéis de trabalho (pessoal e organização) são gerados pela CLI conforme o perfil de tenancy.

| Painel | Origem | Prefixo | Público | Escopo de dados |
| --- | --- | --- | --- | --- |
| `admin` (`context: "global"`) | Template | `/admin` | Superadmin (`user.role = "admin"`) | Sistema: usuários, organizações, métricas globais. Nunca lê dados de tenants. |
| `app` (`context: "personal"`) | `vibe create --profile personal\|hybrid` | `/app` | Usuário logado | Dados pessoais (`organizationId` nulo), RLS por dono. |
| `org` (`context: "organization"`, `tenantIdentifier: "slug"`) | `vibe create --profile organizations\|hybrid` | `/org/<slug>` | Membros da organização | Dados do tenant, RLS + papel do membro. |

`vibe create` gera esses painéis exatamente como `vibe panel` (arquivo `apps/app/src/lib/panels/<id>.config.ts` + import em `registry.ts`). Painéis pessoal/organização recém-criados mostram dashboard com boas-vindas, cartão da conta (avatar, nome, email, sair) e estado vazio até receberem resources; em desenvolvimento o estado vazio sugere `vibe resource`.

Código da aplicação **nunca** assume id de painel: localiza por contexto (`registry.find(panel => panel.context === "personal")`) e trata ausência. Helpers: `personalPanel()`/`organizationPanel()` em `chrome.ts` e `organizationPanelPath(org)` em `routing.ts` (retorna `undefined` sem painel de organização).

Páginas de conta (`/account`, `/security`, `/organizations`, `/invitations/:id`, `/onboarding`) usam o mesmo shell pelo route group `app/(account)`. Sem painel pessoal/organização registrado, o shell de conta mostra só o grupo Configurações e oculta o seletor de workspace; botões "Abrir painel" de organização só aparecem com painel de organização registrado (sem ele, criar organização abre `/organizations/<slug>`).

Raiz `/` (`components/organization/landing.ts`): visitante vê página pública de status; usuário logado vai ao painel pessoal quando registrado e o perfil não é `organizations`; senão, com painel de organização, à primeira organização (`/onboarding` em modo `multi` sem organização, `/organizations` em modo `single` sem associação); senão `/account`. Impersonação de admin redireciona para `/`, que aplica essa regra ao usuário alvo.

`/organizations/<slug>` é a página de configurações da organização, em abas: **Geral** (nome e slug via `organization.update`; mesmas regras de slug do hook em `packages/auth/src/auth.ts`), **Membros** (função via Select, remoção, transferência de propriedade: promove o membro a `owner` e rebaixa o proprietário atual a `admin`), **Convites** e **Zona de perigo** (sair via `organization.leave`, bloqueado para o único proprietário; excluir via `organization.delete`, só proprietário, confirmando ao digitar o slug). Controles aparecem conforme papel (owner/admin); Better Auth reverifica todas as mutações no servidor.

## Registro e rotas

- `apps/app/src/lib/panels/registry.ts` declara painéis (`admin` inline; gerados via import de `<id>.config.ts`). IDs e prefixos são únicos, sem sobreposição nem conflito com `reservedPanelRoutes`. Painéis de organização definem `tenantIdentifier` (`slug` ou `uuid`).
- `routing.ts`: `resolvePanelPath(pathname)` e `buildPanelPath(panelId, { tenant, segments })`. Elas rejeitam traversal e barras codificadas, e não autorizam nada. Prefixo de painel não registrado resolve para 404.
- `apps/app/src/app/[...segments]/page.tsx` resolve o painel, exige sessão, exige `role = admin` no global, resolve tenant/membership no organizacional e despacha para dashboard ou resource.
- `chrome.ts` monta props do shell: grupos de navegação, seletor de workspace (oculto sem painéis de trabalho) e usuário.

## Resources

`apps/app/src/lib/panels/resources.ts` registra resources por painel (`panelIds`). Gere com `vibe resource` ([CLI-RESOURCES.md](CLI-RESOURCES.md)); prefira `kind: "resource"` com `defineResource` (ver `docs/UI.md`). `kind: "custom"` existe para páginas próprias com `render(ResourceContext)`.

Autorização: `resource-actions.ts` é a única porta de Server Actions. Antes de chamar a definição, re-resolve sessão, painel, tenant, papel e `can()`. Loaders e mutações da definição também rodam sob RLS (`withTenantTransaction` nos resources gerados, ou `withTenantScope` de `@vibe/auth`). Esconder botões na UI não substitui essas checagens.

## Adicionar painel

```bash
pnpm exec tsx packages/cli/src/index.ts panel app --context personal --prefix /app --label Personal
pnpm exec tsx packages/cli/src/index.ts panel org --context organization --prefix /org --label Organization --identifier slug
pnpm exec tsx packages/cli/src/index.ts panel sales --context organization --prefix /sales --preview --json
```

Gera `<id>.config.ts` e registra em `registry.ts`; recusa id/prefixo duplicado, sobreposto ou reservado. Depois associe resources por `panelIds` (`vibe resource ... --panel <id>`). Perfil de identidade (`IDENTITY_PROFILE`) continua valendo em runtime: painel de organização retorna 404 no perfil `personal`, e o perfil `organizations` não usa painel pessoal como landing.
