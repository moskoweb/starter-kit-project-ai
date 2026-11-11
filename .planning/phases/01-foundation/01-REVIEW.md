---
phase: 01-foundation
status: plan-reviewed
---
# Revisão pré-execução

Tier-01 revisou plano; revisor independente Tier-02 confirmou riscos. Isso é revisão de plano, não aprovação de código ainda inexistente.

Correções exigidas e transmitidas ao executor:
- Sem db:create privilegiado no template; banco provisionado fora do app.
- Owner migrations e runtime DML separados; sem fallback de credencial migration.
- server-only no entry Next, CLI separada; exports não são barreira por si só.
- app_settings funcional no lugar de tabela artificial.
- Health com limite de conexão, query e espera, erro 503 sanitizado; connect_timeout sozinho insuficiente.
- TypeScript5.9.3 e transpilePackages; confirmar compatibilidade por instalação/build.
- Verificação consolidada pelo owner, sem checks midflight e sem assert(true) como prova.

MCP handshake e descoberta de 8 fases comprovados; 51 requisitos preservados. Código da fase ainda aguarda revisão e execução dos cenários finais.
