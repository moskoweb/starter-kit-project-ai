---
phase: 02-identity
status: gaps_found
---
# Verificação de identidade

Provas executadas com PostgreSQL real do projeto, role runtime não-owner, Mailpit local e HTTP Next em127.0.0.1:3001:
- Configuração/permissões incluindo single/multi e UUID obrigatório:3 testes passaram; RLS real passou separadamente.
- RLS tenant/pessoal, relações, revogação e contexto concorrente do pool: passou após corrigir teste select sem FROM para SQL executável.
- Organizações, convites, separação de papéis, ações cross-tenant e revogação: passou.
- TOTP timestep único em enrollment/challenges independentes/concorrência: passou.
- Signup, email verification, reset, expiração sessão, TOTP, emailOTP e backup reuse: passou após corrigir shadowing local verification que confundia texto email com schema no teste.
- Migrations0001 identidade e0002 replay aplicadas por owner; runtime usa role DML.

Correções integradas: rotas duplicadas removidas, imports TS e tipos corrigidos. Auth/organizations/TOTP replay rerodados após hooks finais:3 fluxos passaram. Login/signup no browser, criação de organização e projeto/tarefa organizacional comprovados. Locale inglês renderizado na autenticação. Perfil pessoal do derivado não consulta organizações.

Boundary single-tenant real exercitado via API BetterAuth com sessão sintética: listagem retornou somente organização configurada; criação e acesso a organização estrangeira foram rejeitados. Pendência externa: envio Resend real, adiado ao fechamento por decisão do usuário. Nenhum mock contabilizado como prova; não declarar integração externa verificada antes desse gate.
