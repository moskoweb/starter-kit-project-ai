---
phase: 04-resources
status: gaps_found
---
# Resource de referência

Browser autenticado comprovou criação, detalhes, edição e exclusão de projeto pessoal com persistência real. Listagem TanStack server-side com estado vazio e paginação; locale inglês e mobile sem overflow comprovados. Relação projects/tasks no DB testou membro criando tarefa em projeto de outro membro da mesma organização, negando cross-tenant/pessoal; imutabilidade protegida por trigger.

Prova adicional browser: criou organização, projeto organizacional e tarefa vinculada pelo seletor autorizado; detalhes retornaram dados persistidos no tenant e labels em inglês conforme cookie. Relação pai/filho funcionou sem inserir IDs arbitrários no cliente.

Actions revalidam sessão e permissões, derivam organização do contexto transacional, rejeitam registros ausentes e bulk misto. Evento project.created é inserido na mesma transação quando jobs habilitados.

Provas adicionais: bulk delete de tarefa organizacional confirmado e persistido; busca servidor com termo ausente retornou vazio e termo presente recuperou projeto. Ordenação tem allowlist e desempate UUID; matriz de paginação com múltiplas páginas ainda precisa cenário dedicado. Sem fake métricas ou mocks como aceite.
