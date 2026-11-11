# Painéis e roteamento

`apps/app/src/lib/panels/registry.ts` declara configuração de painéis (`admin` em `/admin`, `personal` em `/app`, `organization` em `/org`). Prefixos e IDs precisam ser únicos; prefixos não podem se sobrepor nem conflitar com rotas reservadas (`api`, `_next`, `login`, `signup`, `auth`, `reset-password`, `verify-email`, `security`, `invitations`). Painéis de organização declaram `tenantIdentifier` como `slug` ou `uuid`.

`resolvePanelPath(pathname)` identifica painel, tenantParam de organização e segmentos restantes; caminhos inválidos ou sem painel retornam `undefined`. `buildPanelPath(panelId, { tenant, segments })` constrói caminhos, codificando cada segmento separadamente e rejeitando traversal, barras codificadas/literais e tenant em painel não organizacional.

O caller seleciona explicitamente `tenant` (slug ou ID) e, no servidor, verifica sessão e membership antes de permitir acesso. Estas funções não fazem autenticação nem autorização. Não instalam rewrites, APIs Next nem catchall; nenhum painel está declarado como já executando.
