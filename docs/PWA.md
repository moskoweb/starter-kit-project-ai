# PWA opcional

`PWA_ENABLED=false` por padrão. Ative no projeto derivado para adicionar manifest, ícones e controles de instalação/atualização. `PWA_NAME` e `PWA_SHORT_NAME` customizam identidade; substitua PNG192/512 em apps/app/public/icons.

Service worker `/sw.js` é compartilhado com Web Push. Manifest retorna404 desabilitado. Worker desabilitado continua disponível como script de desativação para instalações antigas; unregister ocorre somente para nosso `/sw.js`, sem remover outros workers/caches.

Política offline: nenhuma resposta da aplicação é armazenada em CacheStorage. Navegação tenta rede e, sem conexão, mostra HTML público genérico sem dados pessoais. Nenhum HTML autenticado/API/IA/tenant é cacheado. Não há edição offline ou sincronização. Ícones e assets seguem cache HTTP normal; não cache privado pelo worker.

Instalação depende do navegador. O aviso flutuante só aparece quando há ação: `beforeinstallprompt` disponível (Chrome/Edge/Android) ou nova versão do worker esperando. Ele pode ser dispensado e a escolha fica salva em `localStorage` (`pwa-install-dismissed`). No iOS, use "Adicionar à Tela de Início"; Web Push exige app instalado em versões compatíveis. HTTPS é obrigatório fora de localhost. A atualização não recarrega a página: o usuário ativa o worker e recarrega quando for seguro.

PUSH_ENABLED pode registrar worker sem habilitar instalação PWA; suporte real depende navegador. Testar em produção HTTPS com navegador alvo, sem prometer suporte universal. Desligar feature não apaga dados de outros apps no mesmo origin.
