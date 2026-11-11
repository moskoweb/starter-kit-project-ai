# Estado de integração

Atualizado em 2026-11-11. Implementação em andamento, não release concluída.

## Provas executadas

- Typecheck final desta rodada:14 workspaces passaram.
- Build Next produção passou antes dos últimos ajustes de single-tenant/storage/worker; precisa gate final sobre estado final.
- Auth HTTP real+Mailpit: cadastro, verificação, reset, sessão, TOTP, email OTP e backup codes; replay TOTP concorrente e organizações passaram.
- PostgreSQL RLS: isolamento pessoal/tenant, revogação, pool concorrente e tarefa colaborativa entre membros passaram.
- Browser: signup/login, criação/edição/exclusão projeto pessoal com persistência.
- Worker pg-boss e relay reais iniciaram com credencial restrita; evento persistido chegou a status done e gerou exatamente1 notificação.
- Teste concorrente de evento: oito handlers resultam um efeito.
- CLI create gerou projeto independente sem env real/planning; resource Note gerou model/handlers/views, typecheck e migration offline passaram. Derivado com banco/roles próprios executou signup/login e CRUD Note completo no browser. Repetição de geração recusada sem overwrite. Corrigido loader de organizações no perfil pessoal.
- CodeGraph indexação e consulta real; modelos nine-router02/03 comprovados.

## Pendências de fechamento

- Relações/painéis/preview e rollback de geração precisam prova final após polimento do template.
- Exercitar todos perfis/temas/mobile/locale; textos de auth/resources ainda precisam revisão de cobertura i18n.
- Webhook inbound/outbound smoke e retry/restart, TTL/SSRF; UI de status ligada ao dashboard quando módulo habilitado, ainda sem smoke final.
- Smoke storage S3/IA/Resend/analytics/observabilidade externos adiado ao fechamento por decisão usuário. Não solicitar credenciais antes implementação completa.
- Observabilidade integrada a health/IA, JSON-LD público e widget IA conectados; verificar comportamento final habilitado/desabilitado.
- Revisar Docker/CI e clone operacional completo; build final e produção smoke.
- Limpeza de fixtures temporárias próprias após provas.

Nenhuma fase marcada completa apenas por presença de arquivos. Documentos de módulos podem conter gates históricos; este arquivo e VERIFICATION por fase registram evidência real. Nenhum push/deploy público.
