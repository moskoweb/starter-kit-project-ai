# PWA e Web Push opcionais

Aprovado pelo usuário: módulos desabilitados por padrão, sem credenciais obrigatórias no starter.

PWA: manifest/ícones configuráveis, instalação conforme navegador, atualização controlada, offline público. Cache somente recursos estáticos públicos explicitamente permitidos; não cachear HTML autenticado, APIs, dados tenant ou IA. Não inclui edição offline/sincronização.

Web Push: VAPID padrão, permissão após ação explícita, inscrição por usuário/dispositivo/contexto, preferências/unsubscribe, envio worker durável, remoção410/404, payload mínimo e URL relativa segura. Clique exige autorização normal do app; endpoint não é credencial de sessão. Entrega at-least-once, não prometer exactly-once. iOS/suporte navegador documentados.

Ferramentas: README recomenda skills/ferramentas, AGENTS define precedência. Não instalar packs globais automaticamente; GSD/CodeGraph/RTK são distintos de dependências do produto. Referências e comandos em docs/AGENT-TOOLS.md.

Aceite: desabilitado não registra worker nem pede notificações; manifest/cache offline sem dados privados; subscriptions isoladas e entrega real somente com ambiente autorizado; browser e testes negativos locais. Implementação em andamento, nenhuma aprovação de smoke externo implícita.
