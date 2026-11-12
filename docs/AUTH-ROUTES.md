# Rotas de identidade

Autenticação usa somente `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/two-factor`, `/security` e `/invitations/[id]`, mantidas nas páginas canônicas de `apps/app/src/app` com `components/auth`.

Removidas páginas duplicadas de `(auth)` e `/account/security`, junto de `components/identity/auth-form.tsx` e `components/identity/two-factor.tsx`, sem aliases nem redirecionamentos de compatibilidade. Links antigos para `/sign-in`, `/sign-up` e `/account/security` devem usar `/login`, `/signup` e `/security`.

Preservados `/account`, `/organizations`, `/organizations/[identifier]` (configurações da organização em abas: geral, membros, convites, zona de perigo) e `/onboarding` (criação da primeira organização no perfil `organizations`). `components/identity/sign-out.tsx`, `organization-form.tsx` e `components/organization/*` atendem esses fluxos; `organization-form.tsx` também atende convites canônicos. Sessão ausente e logout levam a `/login`. [Detalhes](PANELS.md).

`account`, `organizations`, `onboarding`, `forgot-password` e `two-factor` são reservados no registry de painéis para impedir colisões de prefixo.

## Perfil (`/account`)

Cards no shell do painel; todos os fluxos chamam endpoints Better Auth pelo `authClient` (nenhum código próprio de senha, email ou sessão). Componentes em `apps/app/src/components/account`.

- **Perfil**: `authClient.updateUser({ name })`. Avatar/upload não incluso.
- **Email**: `authClient.changeEmail({ newEmail, callbackURL: "/account" })`. Servidor habilita `user.changeEmail` com `sendChangeEmailConfirmation`: usuário verificado recebe confirmação no email atual (template `change-email`); ao confirmar, Better Auth envia verificação ao novo endereço (`sendVerificationEmail`) e só então troca o email. Usuário não verificado recebe verificação direta no novo endereço.
- **Sessão**: logout (`authClient.signOut`).
- **Zona de perigo**: `authClient.deleteUser({ callbackURL: "/login" })`. `user.deleteUser` usa `sendDeleteAccountVerification` (template `delete-account`, link `/api/auth/delete-user/callback`, validade padrão 1 dia). Exclusão é bloqueada com `APIError` 400 enquanto usuário for único `owner` de alguma organização: checado no hook `before` de `/delete-user` (antes de enviar email) e novamente em `deleteUser.beforeDelete` (ao usar link).

## Segurança (`/security`)

- **Senha**: `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })`; opção marcada por padrão.
- **Duas etapas** (`components/auth/security-form.tsx`, plugin `twoFactor`): senha + `twoFactor.enable({ method: "totp" })` gera URI; página mostra QR code (`react-qr-code`, renderizado localmente, segredo não sai do navegador) e segredo; `twoFactor.verifyTotp` confirma e exibe códigos de backup uma vez. Ativado: `twoFactor.generateBackupCodes({ password })` regenera códigos (invalida anteriores) e `twoFactor.disable({ password })` desativa, ambos com confirmação.
- **Sessões ativas**: servidor chama `auth.api.listSessions` (exige sessão recente conforme `session.freshAge`; sessão antiga vê aviso para entrar novamente). Lista navegador/SO derivados do user agent, IP, início e selo da sessão atual. `authClient.revokeSession({ token })` encerra uma; `authClient.revokeOtherSessions()` encerra as demais.

## Google (opcional)

Desligado por padrão. Ativar:

```sh
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=...       # Google Cloud Console > Credenciais > ID do cliente OAuth (Aplicativo da Web)
GOOGLE_CLIENT_SECRET=...   # nunca commitar
```

URI de redirecionamento autorizada: `${BETTER_AUTH_URL}/api/auth/callback/google`. `getGoogleEnv()` (`packages/config/src/env.ts`) exige ID e segredo somente quando `GOOGLE_ENABLED=true` e falha ao iniciar auth se faltarem. `socialProviders.google` só é configurado quando habilitado; `/login` e `/signup` (server) passam `google` ao `AuthForm`/`AuthLayout`, que só então mostram "Continuar com Google" (`authClient.signIn.social`). Vinculação de contas segue padrão Better Auth sem `trustedProviders`: login Google vincula a usuário existente de mesmo email apenas quando Google informa email verificado; caso contrário é recusado. Para impedir qualquer vinculação automática, defina `account.accountLinking.enabled: false`.
