# Ambiente local deste checkout

Infraestrutura de preparação; não copiar valores privados para projetos derivados.

## Banco

- PostgreSQL compartilhado existente `dev-postgres`, versão 17.10, porta loopback 5432.
- Database exclusivo `vibe_starter`.
- Role runtime `vibe_starter_app`: sem superuser/createdb/createrole, DML em tabelas do projeto.
- Role migration `vibe_starter_owner`: proprietária apenas do banco do projeto, sem superuser/createdb/createrole.
- Credenciais próprias em `/root/.local/share/vibe-stater-kit/development.env`, permissão 0600, fora do repo. Injetar no processo sem imprimir valores. Nunca passar credencial owner ao cliente ou requerê-la no runtime web.
- Migrations0000–0005 e seed aplicados; DB runtime e worker têm roles separadas. Worker `vibe_starter_worker` não é owner/admin e usa grants/policies de provisionamento explícito.

## Email de desenvolvimento

Mailpit captura SMTP local sem enviar email à internet.

- Container: `vibe-starter-mailpit`.
- Imagem: `axllent/mailpit:v1.27.4`.
- Digest observado: `sha256:df6c2541907e1be6fac21f509927cf6ed771617a1f4b361ef66d97bd05593d2d`.
- SMTP: `127.0.0.1:11025`.
- Interface/API: `http://127.0.0.1:18025`.
- Limites: 128 MiB, 0.5 CPU; sem exposição externa.
- Uso: verificação de email, recuperação e convites com dados sintéticos. Captura local não comprova entrega Resend/SMTP externo.

## Operação

Preview atual Next dev em `127.0.0.1:3001`, com hot reload. Worker e relay locais rodaram com ambiente externo restrito e entregaram notificação real. Nenhuma rota Caddy/Cloudflare criada. Preservar outros containers e dados; builds pesados usam `flock /tmp/dev-heavy-validation.lock` após verificar memória. Banco temporário `vibe_starter_replica` foi usado para validar projeto derivado, separado do banco do kit.
