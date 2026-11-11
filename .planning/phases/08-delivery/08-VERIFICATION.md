---
phase: 08-delivery
status: gaps_found
---
# Entrega — evidências

- Projeto derivado criado fora repo com perfil personal e env.example completo, sem creds/planning.
- Instalação offline passou, schema/migrations/seed em database e roles próprios passaram.
- Resource Note criado CLI, typecheck passou, CRUD browser autenticado completo passou.
- Resource WorkItem sobre model tasks com relação projects gerou sem duplicar model; typecheck app derivado passou.
- Docker app build passou; container nonroot com role runtime respondeu /api/health conectado. Smoke container removido.
- Worker TypeScript build passou; processo real e relay iniciaram e entregaram evento persistido com efeito único.
- Docker worker corrigido com COPY --chown: build passou, container nonroot anunciou worker_ready e encerrou via SIGTERM; container de smoke removido.
- CI definido, não executado em GitHub; comandos equivalentes locais parcialmente comprovados.

Pendências: build sobre últimos ajustes visuais, smoke worker container corrigido, validação externa autorizada e cobertura UI/templates restante. Sem release/publicação/push. Não confundir artefato criado com requisito completo.
