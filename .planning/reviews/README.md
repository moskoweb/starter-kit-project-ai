# Review/fix completo — três ciclos

Escopo: todo código implementado em apps/packages, testes, geração, configuração, deploy e documentação. Usuário autorizou correções, commits e push para origin/main sem force-push.

1. Revisão por fronteiras e correções com ownership separado; validação consolidada após edições.
2. Revisão independente das mudanças, regressões e contratos entre módulos; corrigir e validar caminhos afetados.
3. Revisão final e gates executáveis: tipos, testes, build e smoke pertinentes. Provedores externos permanecem adiados por decisão anterior, sem alegação de validação real.

Execução usa ferramentas disponíveis e agentes nine-router; não representa comando agendado `/loop` nem execução nativa de todos hooks GSD. Três ciclos serão registrados explicitamente. Nenhum ciclo concluído somente por retorno de agente.

Pré-publicação: árvore inicialmente limpa, sem remoto; URL solicitada acessível e sem refs retornados. Origin configurado e branch renomeada main. Push somente após fechamento dos ciclos. Arquivos .env reais não estão versionados.
