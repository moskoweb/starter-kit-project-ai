---
phase: "08"
plan: "01"
type: execute
wave: 1
depends_on: ["01", "02", "03", "04", "05", "06", "07"]
requirements: [SHIP-01, SHIP-02, SHIP-03, SHIP-04]
autonomous: false
---

# Fase 08 — Replicação, operação e gates de entrega

## Contrato de execução

Ler `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `08-CONTEXT.md`, AGENTS e handoffs das fases anteriores. Plano de execução futuro: comandos e paths são alvos a confirmar contra implementação; não executar checks nesta etapa. Adaptar ao contrato real, sem criar scripts de conveniência fictícios, novas convenções ou alegar comando já disponível. Não publicar, commitar, pushar ou fazer deploy externo. Não deixar `.planning` histórico, credenciais, caches ou dependências instaladas no derivado.

## 1. Derivado independente — SHIP-01

**Fronteiras:** CLI e manifest/template de inclusão já existentes, documentação de CLI/produto, AGENTS e skills selecionadas.

1. Criar projeto em diretório temporário fora do checkout, usando invocação real da CLI/template. Inspecionar arquivos copiados e exclusões. Preservar AGENTS, skills aprovadas com metadados legais e docs necessárias; excluir `.planning`, `.env` local, histórico, `node_modules`, caches, builds e caminhos absolutos. `.env.example` sem valores secretos pode permanecer.
2. Confirmar que instalação frozen, geração e execução usam somente arquivos do derivado; remover dependência acidental do monorepo fonte. Usar caminhos relativos e lockfile do projeto.
3. Provisionar PostgreSQL isolado e efêmero para a prova, nunca URL de produção/compartilhada. Aplicar migrations por comando explícito real; validar repetição segundo contrato sem migrar no boot.
4. Executar fluxo documentado de cadastro/autenticação e CRUD persistido em perfil pessoal, perfil organização e híbrido. Verificar sem organização fictícia em perfil pessoal, isolamento de tenant e coexistência de escopo pessoal/organizacional no híbrido. Registrar comandos realmente usados, versões, resultados e limitações; limpar somente recursos efêmeros criados pela prova.

**Gate:** projeto gerado inicia e conclui fluxo em cada perfil sem consultar checkout original; DB dedicado confirmado; nenhuma credencial/histórico/cache indevido no manifest. Falha de isolamento bloqueia fase.

## 2. Execução e containers — SHIP-02

**Fronteiras:** Dockerfiles/compose existentes ou novos nos locais canônicos, scripts/targets reais de app/worker, docs deploy e configuração de health.

1. Implementar/documentar Node deploy com dependências externas explícitas (PostgreSQL e integrações selecionadas). Cobrir app único sem jobs e app+worker separados; não exigir worker para projeto sem jobs habilitados.
2. Construir imagens com dependências/builds corretos do monorepo, usuário não-root quando suportado e sem secrets embutidos. Compose de desenvolvimento liga portas a `127.0.0.1` por padrão. Expor acesso remoto apenas por override documentado e explícito.
3. Criar serviço/etapa única de migrations usando role de DDL; ordenar deploy para concluir migration antes de app/worker. Réplicas runtime não têm privilégio nem caminho de DDL automático. Rollback de código não desfaz migration destrutiva automaticamente.
4. Health/readiness barato reporta estado sem configuração sensível; verificar dependências necessárias sem transformar health endpoint em diagnóstico público detalhado. Docker healthcheck usa endpoint/command realmente implementado.
5. App e worker tratam SIGTERM: param worker, encerram requests/trabalho em voo dentro de timeout e fecham DB/conexões; job interrompido permanece recuperável conforme semântica da fila. Documentar timeout de orquestrador compatível.
6. Verificar localmente configurações app-only e app+worker, ports loopback, readiness após DB e shutdown graceful; não subir serviço externo real sem autorização/credencial.

**Gate:** duas topologias documentadas e executáveis; migrations não repetidas por réplica; probes coerentes e shutdown sem perda silenciosa.

## 3. CI e prova integrada — SHIP-04

**Fronteiras:** workflow CI existente, scripts root/targets Turbo reais, suíte crítica e fixture PostgreSQL de CI; docs de contribuição.

1. Workflow instala Node/pnpm pelas versões canônicas, ativa cache somente de pacote seguro e executa `pnpm install --frozen-lockfile`. Não usar `npm install`, atualizar lockfile implicitamente ou gravar segredos.
2. Rodar verificação TypeScript/tipos, testes críticos de autorização, persistência/migrations e worker, e build de produção pelos comandos já definidos nos manifests. Se gate necessário não possui script/teste real, implementar no escopo das fases responsáveis antes de referenciá-lo; não escrever workflow com comando imaginário.
3. Serviços PostgreSQL de CI usam DB descartável e migration explícita; nenhuma credencial externa requerida para gates padrão. Testes não acessam DB compartilhado ou contas reais.
4. Rodada final ordenada após integrações: gates CI, build de produção canônico, prova de projeto derivado e fumaça das duas topologias Docker. Registrar commit de referência apenas como metadado, sem criar commit nesta tarefa; capturar logs/evidência sem segredos.
5. Smoke externo de AI, Resend/email, storage e analytics só depois dos gates e implementação completa, com contas/credenciais de teste fornecidas pelo usuário. Se ausentes, registrar cada integração como bloqueada por ausência de credencial de teste, sem mock e sem marcar validada; não pedir/ler credenciais neste plano.

**Gate:** comandos executados são reais e resultados registrados; tipos, testes críticos, build e derivado passam. Bloqueio externo fica explícito e não contamina os gates locais. Nenhuma publicação/deploy externo.

## 4. Documentação de produto e manutenção — SHIP-03

Atualizar docs existentes conforme arquitetura entregue, sem duplicar guias divergentes: instalação/setup; perfis pessoal/organização/híbrido; roles e isolamento; painéis e temas; CLI e geração; variáveis e integrações opcionais; jobs e worker; migrations; Docker/Node, health/shutdown; CI, testes e troubleshooting; atualização manual de projetos derivados. Exemplos usam comandos verificados, paths portáveis e `.env.example` sem valores reais. Explicar compatibilidade/mudanças de schema, backup e revisão de customizações antes da atualização manual; nenhuma sincronização automática prometida.

**Gate:** docs conduzem clone limpo ao fluxo funcional e deploy sem checkout ou caminho desta máquina; opções desligadas não demandam credenciais; comandos e comportamento correspondem ao produto implementado.

## Evidências e bloqueios finais

Manter tabela de requisito → evidência → resultado → bloqueio para SHIP-01..04. Diferenciar execução local, CI e integração externa; não inferir sucesso de workflow definido ou container construído. Guardar saída sanitizada; nunca anexar tokens, URLs com segredos, envs ou payload sensível. Registrar ausência de credenciais como pendência externa explícita, sem mock. Nenhum commit, push, release, publicação ou deploy externo.