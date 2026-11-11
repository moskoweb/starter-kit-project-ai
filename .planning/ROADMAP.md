# Roadmap: Starter kit com IA

Data: 2026-11-11. Status: proposta estruturada para execução; fase 1 pronta para planejamento.
Contrato: [PROJECT.md](PROJECT.md). Requisitos: [REQUIREMENTS.md](REQUIREMENTS.md).

## Overview

Template independente para projetos desenvolvidos com IA e com integrações opcionais de IA. Stack alvo: Next.js 16, TypeScript, Turborepo, PostgreSQL, Drizzle, Better Auth, Tailwind v4 e shadcn/ui. Node/Docker como deploy de referência. Oito fases de entrega incremental preservando 51 requisitos e isolamento rigoroso.

## Phases

- [ ] **Phase 1: Fundação e contexto para agentes** - Ambiente reproduzível e convenções que agentes consigam seguir sem esta conversa.
- [ ] **Phase 2: Identidade, email e isolamento** - Contas, organizações e permissões seguras antes da expansão de UI.
- [ ] **Phase 3: Painéis, componentes, themes e i18n** - Painéis com tenancy independente e componentes reutilizáveis.
- [ ] **Phase 4: Resource completo de referência** - Provar padrão de resource antes de gerar código.
- [ ] **Phase 5: CLIs e geração** - Reproduzir padrão validado via comandos usáveis por agentes.
- [ ] **Phase 6: Storage, notificações, jobs e webhooks** - Capacidades opcionais reais, sem mock mascarado de integração.
- [ ] **Phase 7: IA, observabilidade, analytics, segurança e SEO** - IA no produto com autorização, limites e diagnóstico; completar integrações operacionais.
- [ ] **Phase 8: Replicação e entrega operacional** - Provar starter fora do próprio repositório.

## Phase Details

### Phase 1: Fundação e contexto para agentes
**Goal**: Ambiente reproduzível e convenções que agentes consigam seguir sem esta conversa.
**Depends on**: Pesquisa
**Requirements**: BASE-01, BASE-02, BASE-03, BASE-04, DEV-01, DEV-02, DEV-03, DEV-04
**Success Criteria** (what must be TRUE):
  1. Clone limpo inicia app conectado ao banco pelo procedimento documentado.
  2. Migration e seed são controlados e reproduzíveis.
  3. Credenciais não entram no cliente.
  4. Agente encontra comandos e limites em AGENTS.md.
  5. Nenhuma dependência SaaS não utilizada bloqueia startup.
**Plans**: TBD

**Antes de implementar**: fechar origem dos trechos, licenças, versões, pnpm e limites server/client; produzir plano detalhado com comandos reais. Não instalar conjunto de skills por volume.

**Entrega**: Next16/Turborepo/TypeScript, PostgreSQL/Drizzle, migrations e seed, pacotes necessários, configuração opcional de integrações, instruções e documentação canônicas.

**Aceite**: clone limpo inicia app conectado ao banco pelo procedimento documentado; migration e seed são controlados; credenciais não entram no cliente; agente encontra comandos e limites em AGENTS.md. Nenhuma dependência SaaS não utilizada bloqueia startup.

### Phase 2: Identidade, email e isolamento
**Goal**: Contas, organizações e permissões seguras antes da expansão de UI.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, TEN-01, TEN-02, TEN-03, TEN-04, TEN-05, TEN-06, MAIL-01
**Success Criteria** (what must be TRUE):
  1. Duas organizações e dois usuários demonstram permissões distintas.
  2. Chamadas diretas não burlam isolamento.
  3. Usuário pessoal não precisa de organização.
  4. Troca concorrente de contexto não vaza dados.
  5. Recuperação e OTP inválido/expirado/reutilizado falham corretamente.
**Plans**: TBD

**Antes de implementar**: matriz de papéis, cadastro, OTP/2FA, UUID e decisão RLS/pooling. Transporte SMTP/Resend deve ser demonstrável; credenciais externas serão solicitadas somente se não houver ambiente de teste autorizado disponível.

**Entrega**: Better Auth, sessão, verificação/recuperação, convites, memberships, roles personalizados, superadmin e contextos pessoal/global/tenant. Receitas single-tenant e multi-tenant.

**Aceite**: duas organizações e dois usuários demonstram permissões distintas; chamadas diretas não burlam isolamento; usuário pessoal não precisa de organização; troca concorrente de contexto não vaza dados; recuperação e OTP inválido/expirado/reutilizado falham corretamente.

### Phase 3: Painéis, componentes, themes e i18n
**Goal**: Painéis com tenancy independente e componentes reutilizáveis.
**Depends on**: Phase 2
**Requirements**: PANEL-01, PANEL-02, UI-01, UI-02, UI-03, UI-04, I18N-01
**Success Criteria** (what must be TRUE):
  1. Painéis coexistem sem permissões implícitas.
  2. Tema muda sem cópia de componentes.
  3. Navegação e forms funcionam por teclado e em viewport mobile.
  4. Links respeitam configuração.
**Plans**: TBD

**Antes de implementar**: escolher forms/i18n e contrato de tokens. Adotar componentes locais/shadcn antes de criar novos.

**Entrega**: painel global, pessoal e tenant-aware no exemplo híbrido; configuração de prefixo/slug/UUID; layouts, componentes funcionais, charts, temas e dois locales de referência.

**Aceite**: painéis coexistem sem permissões implícitas; tema muda sem cópia de componentes; navegação e forms funcionam por teclado e em viewport mobile; links respeitam configuração.

### Phase 4: Resource completo de referência
**Goal**: Provar padrão de resource antes de gerar código.
**Depends on**: Phase 3
**Requirements**: RES-01, RES-02, RES-03, RES-04
**Success Criteria** (what must be TRUE):
  1. CRUD persiste dados e protege campos.
  2. Relação não cruza tenants.
  3. Paginação, filtros e ordenação retornam resultados corretos.
  4. Actions em lote verificam cada escopo.
  5. Composição legível, sem engine genérica ou ORM próprio.
**Plans**: TBD

**Entrega**: domínio pequeno de exemplo sem virar requisito de produto (proposta: projetos e tarefas), com relação, tabela, filtros, paginação, form, detalhes, actions, permissões e escopo.

**Aceite**: CRUD persiste dados e protege campos; relação não cruza tenants; paginação/filtros/ordenação retornam resultados corretos; actions em lote verificam cada escopo. Composição legível, sem engine genérica ou ORM próprio.

### Phase 5: CLIs e geração
**Goal**: Reproduzir padrão validado via comandos usáveis por agentes.
**Depends on**: Phase 4
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06
**Success Criteria** (what must be TRUE):
  1. Projeto temporário gerado executa resource.
  2. Model não exige UI.
  3. Resource não duplica tabela existente.
  4. Geração de migration não altera banco.
  5. Conflito e entrada inválida preservam arquivos.
  6. Modo não interativo retorna saída acionável.
**Plans**: TBD

**Entrega**: criação de projeto/perfil, model isolado, resource sobre model existente, combinação model/resource/migration, criação de painel, prévia e diagnóstico. Names/flags finais pertencem ao plano desta fase.

**Aceite**: projeto temporário gerado executa resource; model não exige UI; resource não duplica tabela existente; geração de migration não altera banco; conflito e entrada inválida preservam arquivos; modo não interativo retorna saída acionável.

### Phase 6: Storage, notificações, jobs e webhooks
**Goal**: Capacidades opcionais reais, sem mock mascarado de integração.
**Depends on**: Phase 5
**Requirements**: STORE-01, NOTIF-01, JOB-01, HOOK-01, HOOK-02
**Success Criteria** (what must be TRUE):
  1. Upload e download autorizados funcionam.
  2. Notificação persiste e marca leitura.
  3. Reinício de worker não perde job.
  4. Repetição de webhook não duplica efeito.
  5. Falha de entrega aparece e destino interno indevido é rejeitado.
**Plans**: TBD

**Antes de implementar**: selecionar fila/runtime e contratos de storage/notificações/webhooks. Avaliar menor infraestrutura que entregue durabilidade.

**Aceite**: upload/download autorizado; notificação persiste e marca leitura; reinício de worker não perde job; repetição de webhook não duplica efeito; falha de entrega aparece e destino interno indevido é rejeitado. Atualizar geradores/documentação quando integração alterar contrato gerado.

### Phase 7: IA, observabilidade, analytics, segurança e SEO
**Goal**: IA no produto com autorização, limites e diagnóstico; completar integrações operacionais.
**Depends on**: Phase 6
**Requirements**: AI-01, AI-02, AI-03, OBS-01, ANALYTICS-01, SEC-01, SEO-01
**Success Criteria** (what must be TRUE):
  1. Streaming real e tool autorizada funcionam.
  2. Usuário não amplia privilégios por prompt.
  3. Cancelamento e erro são tratados adequadamente.
  4. Logs correlacionam eventos sem vazar segredos.
  5. Analytics desativado não envia dados.
  6. Rate limiting e headers de segurança são exercitados.
  7. SEO não publica dados privados.
**Plans**: TBD

**Antes de implementar**: provedor e credenciais de teste autorizadas, política de dados/custo, analytics/observabilidade e decisão Arcjet. Não prometer avaliação com modelo real sem acesso ao provedor.

**Aceite**: streaming real e tool autorizada funcionam; usuário não amplia privilégios por prompt; cancelamento/erro são tratados; logs correlacionam sem segredos; analytics desativado não envia dados; rate limiting e headers são exercitados; SEO não publica dados privados.

### Phase 8: Replicação e entrega operacional
**Goal**: Provar starter fora do próprio repositório.
**Depends on**: Phase 7
**Requirements**: SHIP-01, SHIP-02, SHIP-03, SHIP-04
**Success Criteria** (what must be TRUE):
  1. Instalação, migrations, autenticação e CRUD funcionam em diretório externo.
  2. Sem segredos, caminhos ou histórico do kit herdados.
  3. Artefato de produção e smoke de deploy aprovados.
  4. Atualização manual documentada.
**Plans**: TBD

**Entrega**: projeto derivado, docs completas, release/template independente, CI e receitas Node/Docker com app único e worker separado.

**Aceite**: instalação, migrations, autenticação e CRUD funcionam em diretório externo; sem segredos/caminhos/histórico do kit herdados; artefato de produção e smoke de deploy aprovados; atualização manual documentada. Não publicar, fazer push ou alterar exposição sem autorização correspondente.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundação e contexto para agentes | 1/1 | Complete | 2026-11-11 |
| 2. Identidade, email e isolamento | 0/1 | Local integration verified; external email pending | - |
| 3. Painéis, componentes, themes e i18n | 0/1 | Implemented; UI coverage verification | - |
| 4. Resource completo de referência | 0/1 | Personal CRUD verified; remaining matrix pending | - |
| 5. CLIs e geração | 0/1 | Generated CRUD verified; remaining generator cases pending | - |
| 6. Storage, notificações, jobs e webhooks | 0/1 | Worker/inbound verified; external delivery/storage pending | - |
| 7. IA, observabilidade, analytics, segurança e SEO | 0/1 | Implemented; external smoke pending | - |
| 8. Replicação e entrega operacional | 0/1 | Clone and Docker app smoke passed; closure pending | - |

## Gates comuns

- Requisitos só concluídos após prova de comportamento; consultar VERIFICATION.md de cada fase para distinguir implementado de validado.
- Cada fase detalhada deve mapear requisitos para tarefas e provas, atualizando docs no mesmo ciclo.
- Builds pesados no servidor usam lock cooperativo e verificação de memória; preservar serviços existentes.
- Nenhuma redução de escopo sem aprovação. Dependência externa indisponível é bloqueio explícito, não motivo para entregar mock como recurso completo.
- Implementação autônoma autorizada pelo usuário. Parar somente para decisão material ou bloqueio real; smoke externo somente no fechamento conforme decisão posterior.
