# Validação local — 2026-11-11

## Passou

- Tipos dos14 workspaces; app revalidado após ajustes finais de locale e autorização UUID.
- Testes padrão dos6 pacotes com scripts; teste de eventos DB opt-in fica skipped por padrão e passou separadamente com PostgreSQL real.
- Auth HTTP real, Mailpit, organizações, replay TOTP, OTP/backups, reset e RLS concorrente.
- CRUD pessoal por browser e CRUD gerado Note em clone independente com database/roles próprios.
- Resource relacionado WorkItem sobre tasks gerou e passou typecheck no derivado.
- Migrations offline sem credenciais; aplicação explícita owner e seed runtime.
- Worker/relay processos reais: evento done e uma notificação; duplicatas concorrentes idempotentes.
- Webhook inbound assinatura válida repetida: um recibo e um projeto.
- Docker app build e health conectado em runtime nonroot.
- Docker worker build e startup worker_ready nonroot após corrigir permissões COPY --chown; shutdown via SIGTERM.
- Fronteira server-only rejeitou Client Component temporário; fixture removida.
- CodeGraph index/consulta; Tier02/Tier03 nine-router.

## Não confundir com concluído

- Imagem app aprovada antecede últimos ajustes de labels; build final deve acompanhar release.
- Nenhum smoke externo de IA, S3, Resend, PostHog ou OTLP foi executado. Usuário determinou fazê-los após implementação, com credenciais só no projeto de teste.
- CI escrito mas não executado no GitHub.
- Cobertura de UI/i18n e paridade dos templates gerados ainda tem itens de fechamento; não marcar todos51 requisitos como completos.
- Não houve push, publicação ou exposição pública. Preview loopback3001 preservado.
