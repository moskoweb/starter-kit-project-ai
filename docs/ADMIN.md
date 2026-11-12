# Painel de administração do sistema

`/admin` é o painel global (`context: "global"`). Só entra quem tem `user.role === "admin"` (Better Auth admin plugin). Organizações e roles de organização não dão acesso a ele.

## Criar o primeiro admin

Senha só por stdin, nunca em argumentos ou histórico do shell:

```bash
read -rs ADMIN_PASSWORD && printf '%s\n' "$ADMIN_PASSWORD" | \
  ADMIN_EMAIL=admin@example.com ADMIN_NAME="Admin" pnpm --filter @vibe/auth seed:admin
unset ADMIN_PASSWORD
```

O script cria o usuário já verificado com `role = "admin"` (ou promove um e-mail existente). Depois disso, outros admins são promovidos pelo próprio painel.

## O que o admin pode fazer

Resources em `apps/app/src/lib/resources/definitions/admin-users.ts` e `admin-organizations.ts`, registrados só no painel `admin`.

- **Dashboard**: total de usuários e organizações, cadastros nos últimos 30 dias, usuários banidos.
- **Usuários**: listar, buscar (nome/e-mail), filtrar por papel e banimento, ver perfil, segurança (2FA, e-mail verificado), status de banimento e número de organizações. Ações:
  - `Tornar admin` / `Remover admin` (`setRole`);
  - `Encerrar sessões` (`revokeUserSessions`);
  - `Banir` / `Desbanir` (`banUser` / `unbanUser`; banir encerra as sessões);
  - `Atuar como` (`impersonateUser`), só para usuários não-admin e não banidos.
- **Organizações**: listar, buscar (nome/slug), ver membros, excluir (remove membros, convites e dados da organização por cascata).

Não há criação/edição genérica por formulário: mudanças de conta passam pelas ações acima.

## Regras de segurança

- Todo loader e ação revalida a sessão no servidor e exige `role === "admin"`; `can()` do resource também exige `scope.isAdmin`.
- Ações de usuário usam a API server-side do Better Auth (`getAuth().api.*`) com os headers da requisição, então as permissões do plugin também são aplicadas.
- Admin nunca age sobre si mesmo (banir, mudar papel, encerrar sessões, personificar): o servidor recusa com `CANNOT_ACT_ON_SELF`.
- Admins não podem personificar outros admins (`allowImpersonatingAdmins: false`).
- Exclusão de organização é feita direto no banco porque `organization.delete` do Better Auth exige ser owner; a checagem de superadmin acontece antes.

## Personificação (impersonation)

- A sessão personificada dura no máximo 1 hora (`impersonationSessionDuration`).
- Enquanto ativa, todo painel mostra um aviso no topo com o botão **Encerrar**, que chama `authClient.admin.stopImpersonating()` e volta para `/admin`.
- Auditoria: o Better Auth grava o id do admin em `session.impersonated_by`. Essa coluna identifica as sessões personificadas; sessões removidas/expiradas somem da tabela, então guarde logs se precisar de trilha permanente. Use personificação só para suporte e com consentimento do usuário quando a política exigir.

## Usuário banido

Login de usuário banido falha com o código `BANNED_USER`; o formulário de login redireciona para `/banned`, uma página com explicação e link de volta ao login.
