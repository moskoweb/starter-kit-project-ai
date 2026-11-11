# Rotas de identidade

Autenticação usa somente `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/two-factor`, `/security` e `/invitations/[id]`, mantidas nas páginas canônicas de `apps/app/src/app` com `components/auth`.

Removidas páginas duplicadas de `(auth)` e `/account/security`, junto de `components/identity/auth-form.tsx` e `components/identity/two-factor.tsx`, sem aliases nem redirecionamentos de compatibilidade. Links antigos para `/sign-in`, `/sign-up` e `/account/security` devem usar `/login`, `/signup` e `/security`.

Preservados `/account` (perfil, navegação por contexto e logout), `/organizations` e `/organizations/[identifier]` (organizações, membros e convites). `components/identity/sign-out.tsx` e `organization-form.tsx` continuam atendendo esses fluxos; o segundo também atende convites canônicos. Sessão ausente e logout levam a `/login`.

`account`, `organizations`, `forgot-password` e `two-factor` são reservados no registry de painéis para impedir colisões de prefixo.
