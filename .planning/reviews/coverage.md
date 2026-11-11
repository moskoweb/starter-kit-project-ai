# Cobertura e limites

Revisão solicitada cobre código fonte próprio, testes, configurações, scripts, templates e docs. Dependências de terceiros são avaliadas nos contratos usados; não é auditoria integral de todo node_modules.

Ciclo1 ownership: auth/db/config; app/UI; serviços/worker; CLI/web/deploy/docs. Ciclos2 e3 revisam mudanças e contratos novamente com contextos independentes. Gates executáveis consolidam tipos/testes/build; integração DB/Mailpit real usa fixtures próprias.

Publicação: nenhuma variável secreta real .env versionada; scan de padrões de tokens/private keys não encontrou ocorrências nos arquivos rastreados (não garantia de inexistência de qualquer segredo). URL remota autorizada e inicialmente sem refs. Sem force-push.

Provedores externos permanecem adiados por decisão do usuário, sem chamadas pagas nem falsificação de evidência. Relatório final deve separar review estático, testes locais e validação externa não executada.
