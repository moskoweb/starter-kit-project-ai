# Painel de administração do sistema

`/admin` é o painel global (`context: "global"`). Só entra quem tem `user.role === "admin"` (Better Auth admin plugin). Organizações e roles de organização não dão acesso a ele.

## Criar o primeiro admin

Senha só por stdin, nunca em argumentos ou histórico do shell:

```bash
read -rs -p 'Senha do admin (12 a 128 caracteres): ' ADMIN_PASSWORD
printf '\n'
printf '%s\n' "$ADMIN_PASSWORD" | pnpm vibe make:admin --email admin@example.test --name 'Admin'
unset ADMIN_PASSWORD
```

Execute na raiz com ambiente runtime injetado e migrations/grants aplicados ([primeira execução](GETTING-STARTED.md)). Comando cria usuário novo já verificado com `role = "admin"` e credencial na mesma transação. Email existente é recusado sem alterar senha, papel, verificação ou sessões. Depois disso, outros admins podem ser promovidos por administrador autenticado no próprio painel. Não há conta padrão nem bypass dos dados dos tenants.

## O que o admin pode fazer

Resources em `apps/app/src/lib/resources/definitions/admin-users.ts` e `admin-organizations.ts`, registrados só no painel `admin`.

- **Dashboard**: total de usuários e organizações, cadastros nos últimos 30 dias, usuários banidos.
- **Usuários**: listar, buscar (nome/e-mail), filtrar por papel e banimento, ver perfil, segurança (2FA, e-mail verificado), status de banimento e número de organizações; editar nome pela página `/admin/users/<id>/edit`. Ações:
  - `Tornar admin` / `Remover admin` (`setRole`);
  - `Encerrar sessões` (`revokeUserSessions`);
  - `Banir` / `Desbanir` (`banUser` / `unbanUser`; banir encerra as sessões);
  - `Atuar como` (`impersonateUser`), só para usuários não-admin e não banidos.
- **Organizações**: listar, buscar (nome/slug), ver detalhes e membros; editar nome pela página `/admin/organizations/<id>/edit`, usando formulário e operação `update` padrão de `defineResource`.

Formulário administrativo de usuário aceita somente `name` (1–255 caracteres); e-mail é somente leitura. Senha, papel, banimento e flags de verificação nunca são aceitos por essa operação. Mudanças de e-mail e senha pertencem aos fluxos verificados do titular.

### Organizações

Resource administrativo oferece leitura e edição de `name` (1–100 caracteres, espaços externos removidos). `slug` é somente leitura para preservar URLs. Campos extras, IDs inválidos e contexto de tenant são recusados no servidor. Alteração exige sessão atual de superadmin, não apenas permissão enviada no `scope`, e modifica somente metadados globais de identidade. Não concede membership nem acesso aos dados do tenant.

Criação continua em `/organizations`, pelo Better Auth: respeita perfil, modo single/multi, verificação de e-mail e atribuição de proprietário. Não há criação administrativa direta nem exclusão individual/em lote no resource. A antiga ação de exclusão por cascata foi removida: não é seguro presumir organização vazia a partir de consultas limitadas por RLS. Reativar exclusão exige política explícita de retenção, autorização e proteção dos dados dependentes, inclusive tabelas adicionadas pelo projeto.

Check sem banco: `node apps/app/src/lib/resources/definitions/admin-organizations.check.mjs`. Cobre contrato do resource e casos negativos com dependências simuladas, não substitui aceite com sessão/DB/UI reais.

Sessão de superadmin recebe atalho **Admin** na navegação da conta e dos painéis de trabalho. Usuário comum não recebe atalho e continua bloqueado por páginas, loaders e ações no servidor. CRUD de domínio completo é gerado por `pnpm vibe resource`, com componentes e organização em [UI.md](UI.md) e [CLI-RESOURCES.md](CLI-RESOURCES.md).

## Regras de segurança

- Todo loader e ação revalida a sessão no servidor e exige `role === "admin"`; `can()` do resource também exige `scope.isAdmin`.
- Ações de usuário usam a API server-side do Better Auth (`getAuth().api.*`) com os headers da requisição, então as permissões do plugin também são aplicadas.
- Admin nunca age sobre si mesmo (banir, mudar papel, encerrar sessões, personificar): o servidor recusa com `CANNOT_ACT_ON_SELF`.
- Admins não podem personificar outros admins (`allowImpersonatingAdmins: false`).
- Edição de organização altera somente `organization.name` com predicado pelo ID validado; sem bypass de RLS, alteração de slug ou exclusão em cascata.

## Personificação (impersonation)

- A sessão personificada dura no máximo 1 hora (`impersonationSessionDuration`).
- Enquanto ativa, todo painel mostra um aviso no topo com o botão **Encerrar**, que chama `authClient.admin.stopImpersonating()` e volta para `/admin`.
- Auditoria: o Better Auth grava o id do admin em `session.impersonated_by`. Essa coluna identifica as sessões personificadas; sessões removidas/expiradas somem da tabela, então guarde logs se precisar de trilha permanente. Use personificação só para suporte e com consentimento do usuário quando a política exigir.

## Usuário banido

Login de usuário banido falha com o código `BANNED_USER`; o formulário de login redireciona para `/banned`, uma página com explicação e link de volta ao login.
