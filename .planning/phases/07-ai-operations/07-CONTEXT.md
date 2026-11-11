# Fase 07 — IA, segurança e operação

## Escopo

AI-01–03, OBS-01, ANALYTICS-01, SEC-01 e SEO-01 de REQUIREMENTS.md; decisões de PROJECT.md mantidas. Somente planos. Não implementar integrações, executar testes/builds, solicitar contas nem gerar `.env` real. Integrações externas serão verificadas apenas no fechamento após implementação completa, por decisão do usuário; pendência não equivale a falha nem prova positiva.

## Decisões de implementação futura

- IA opcional com **Vercel AI SDK** e adapter oficial direto OpenAI como referência. `AI_PROVIDER=disabled|openai`, sem gateway obrigatório, fallback ou camada Provider própria. Escolher/pinar versões compatíveis do core, React e adapter no início da implementação a partir dos tipos reais; documentação atual é referência móvel, não licença para misturar majors.
- Usar `streamText`, `tool` e `inputSchema` conforme versão pinada. Endpoint autenticado Node; streaming oficial SDK, cancelamento propagado ao provider, erro seguro e limite de passos/output/tempo. Não reimplementar protocolo com strings soltas. UI não recebe chave nem importa SDK server/provider.
- Tool única read-only consulta projetos existentes pelo domínio autorizado. Capturar contexto de sessão/rota no servidor, sem argumentos tenantId/ownerId privilegiados. Modelo, prompt e tool call são entradas não confiáveis. Sem shell, SQL livre, URL fetch, escrita ou execução de código.
- Quotas PostgreSQL atômicas, compartilhadas por instâncias; limites de input/output/concorrência/requests e orçamento token por usuário/contexto. Reserva conservadora antes da chamada e reconciliação idempotente; falha/cancelamento sem usage mantém reserva conservadora até política explícita de expiração/reconciliação, nunca libera tudo por ausência de informação. Rate limit e quota são controles distintos.
- Conteúdo de prompts/respostas não persistido por padrão; UI pode manter conversa efêmera. Documentar envio de campos ao OpenAI, retenção/política do provedor e opt-in explícito do recurso. Não afirmar zero retention sem contrato real.
- Logs estruturados JSON em stdout: logger concreto existente ou Pino se necessário. Campos allowlist, correlationId gerado/validado, execução web/job, duração/status/código seguro. Sem body, headers completos, cookies, tokens, emails, prompts, URLs assinadas ou segredo em stack/provider error.
- Captura de erros opcional **Sentry**, sem replay, profiling, request bodies, PII automática ou tracing habilitados por default. Não criar serviço próprio de erros; logger local funciona sem conta. Integração desabilitada não inicializa SDK/transporte.
- Analytics opcional **PostHog**, opt-in anterior à inicialização/envio. Autocapture/pageview/replay desligados; evento demonstrável explícito allowlisted. Recusar/retirar consentimento impede envios e limpa identidade/estado aplicável. Identificação pseudônima autorizada; sem email, prompt ou payload de recurso.
- SEC: headers no Next.js/proxy canônico e rate limit PostgreSQL atômico, não Map em memória multiinstance. Avaliar Arcjet documentalmente: **não adotar como requisito** porque adiciona conta/serviço para controle que PostgreSQL já cobre; registrar custos/limites e alternativa no plano. Rate limit não substitui auth/RLS nem controle de tráfego upstream volumétrico.
- SEO só nas superfícies públicas realmente existentes (landing/login quando pertinente); metadata/robots/sitemap/JSON-LD não inventam blog/CMS. Painéis e dados privados excluídos de sitemap/JSON-LD, com noindex; robots não é autorização.
- Funções diretas, fronteiras server/client explícitas; sem classes/providers abstratos. Reusar config env, migrations e auth scope das fases 1/2 e correlação/envelopes do worker da fase 6.

## Fontes e gates

- https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling — `tool`, `inputSchema`, `execute`, `streamText`; API móvel atual exige confirmação no pin. Aprovação de tool não substitui permissão.
- https://ai-sdk.dev/docs/ai-sdk-core/generating-text — streaming e resultados.
- https://posthog.com/docs/libraries/next-js — SDK e integração Next.js; confirmar consent APIs no pin antes de escrever chamadas.
- https://docs.sentry.io/platforms/javascript/guides/nextjs/ — implementação opcional a conferir no pin.
- https://nextjs.org/docs/app/api-reference/file-conventions/metadata — metadata pública.
- https://arcjet.com/ — candidato avaliado; PostgreSQL escolhido evita dependência de conta obrigatória, sem afirmar equivalência a proteção DDoS de borda.

Context7 não exposto nesta sessão; referência oficial AI SDK lida diretamente. Demais links são fontes obrigatórias de consulta na implementação, não APIs alegadas como verificadas. Nenhuma versão de AI SDK/PostHog/Sentry foi instalada ou validada por este planejamento.

## Gate externo explícito

**PENDENTE POR DECISÃO DO USUÁRIO:** stream/chamada/tool real OpenAI, evento/consentimento PostHog e captura real Sentry quando habilitado. Só fechamento após implementação completa, com contas/ambiente autorizados e dados sintéticos seguros. Sem mocks como prova. Desativação sem contas e provas DB locais não encerram aceite de provedor real; fase 8 deve conservar pendência até evidência.
