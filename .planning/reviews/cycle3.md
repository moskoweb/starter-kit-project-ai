# Ciclo 3 — parecer final e correções

Revisor independente encontrou dois bugs na implementação completa, embora ausentes do diff inicial:

- Campos UUID/integer opcionais vazios no CRUD gerado: UUID vazio rejeitado e integer apagado mantinha valor antigo. Template agora converte vazio para null somente quando anulável sem default; preserva defaults e campos obrigatórios.
- Docker standalone usava HOSTNAME injetado pelo container, incompatível com healthcheck loopback. Estágio app define HOSTNAME=0.0.0.0.

Correções tardias do agente de serviços cancelado foram identificadas por diff e incorporadas conscientemente: abortar readiness se shutdown durante registro, fechar pools em finally mesmo se boss.stop falhar e rejeitar redirects no Resend/OTLP. Tipos dos seis pacotes afetados passaram; generation.check passou. Sem alteração de schema aplicada adicional.

Build consolidado app/web/worker/CLI passou antes dessas correções; imagem app corrigida em validação específica. Sem force-push; publication após gates. Validação externa continua adiada.
