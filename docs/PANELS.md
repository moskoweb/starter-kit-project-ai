# Painéis

Modelo inspirado no Filament: cada painel é uma área com shell próprio, navegação e resources.

| Painel | Prefixo | Público | Escopo de dados |
| --- | --- | --- | --- |
| `admin` | `/admin` | Superadmin (`user.role = "admin"`) | Sistema: usuários, organizações, métricas globais. Nunca lê projetos/tarefas de tenants. |
| `personal` | `/app` | Usuário logado | Dados pessoais (`organizationId` nulo), RLS por dono. |
| `organization` | `/org/<slug>` | Membros da organização | Dados do tenant, RLS + papel do membro. |

Páginas de conta (`/account`, `/security`, `/organizations`, `/invitations/:id`, `/onboarding`) usam o mesmo shell pelo route group `app/(account)`.

Raiz `/`: visitante vê página pública de status; usuário logado vai para `/app` quando o perfil permite painel pessoal, senão para o primeiro `/org/<slug>`, senão `/onboarding` (perfil `organizations`, modo `multi`, sem organização: card para criar a primeira e abrir `/org/<slug>`). Em modo `single` sem associação, vai para `/organizations`.

`/organizations/<slug>` é a página de configurações da organização, em abas: **Geral** (nome e slug via `organization.update`; mesmas regras de slug do hook em `packages/auth/src/auth.ts`), **Membros** (função via Select, remoção, transferência de propriedade: promove o membro a `owner` e rebaixa o proprietário atual a `admin`), **Convites** e **Zona de perigo** (sair via `organization.leave`, bloqueado para o único proprietário; excluir via `organization.delete`, só proprietário, confirmando ao digitar o slug). Controles aparecem conforme papel (owner/admin); Better Auth reverifica todas as mutações no servidor.

## Registro e rotas

- `apps/app/src/lib/panels/registry.ts` declara painéis. IDs e prefixos são únicos, sem sobreposição nem conflito com `reservedPanelRoutes`. Painéis de organização definem `tenantIdentifier` (`slug` ou `uuid`).
- `routing.ts`: `resolvePanelPath(pathname)` e `buildPanelPath(panelId, { tenant, segments })`. Elas rejeitam traversal e barras codificadas, e não autorizam nada.
- `apps/app/src/app/[...segments]/page.tsx` resolve o painel, exige sessão, exige `role = admin` no global, resolve tenant/membership no organizacional e despacha para dashboard ou resource.
- `chrome.ts` monta props do shell: grupos de navegação, seletor de workspace e usuário.

## Resources

`apps/app/src/lib/panels/resources.ts` registra resources por painel (`panelIds`). Prefira `kind: "resource"` com `defineResource` (ver `docs/UI.md`). `kind: "custom"` existe para páginas próprias com `render(ResourceContext)`.

Autorização: `resource-actions.ts` é a única porta de Server Actions. Antes de chamar a definição, re-resolve sessão, painel, tenant, papel e `can()`. Loaders e mutações da definição também rodam sob RLS (`withAuthorizedProjects` / `withTenantTransaction`). Esconder botões na UI não substitui essas checagens.

## Novo painel

`vibe panel <id> --context global|personal|organization --prefix /caminho` gera config e registra. Depois associe resources por `panelIds`.
