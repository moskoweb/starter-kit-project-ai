# Ciclo 1 — apps/app e packages/ui

## Escopo e evidência

Revisão estática de rotas, páginas, components e lib de `apps/app`, e primitivas de `packages/ui`. Lidos AGENTS e guia local Next de Server Actions. Nenhum teste, build, lint ou navegador executado; nenhuma aprovação de runtime presumida. Sem commits/push neste worker. Nenhuma API de pacote compartilhado modificada.

## Findings e fixes

| Severidade | Finding concreto | Correção |
| --- | --- | --- |
| Alta | AuthForm usa Button sem `type`; primitiva define `type="button"`, impedindo submissão por clique. | Botão explícito `type="submit"`. |
| Média | Edição de tarefa envia `{ title, projectId }`, mas `taskUpdateSchema.strict()` aceita somente título. Todo save editado falha INVALID_INPUT. | ResourceForm envia apenas `{ title }` para tarefa existente; criação preserva ambos campos. Contrato documentado. |
| Média | `/security` chama requireSession sem tratar UNAUTHORIZED. | Reutilizar pageSession, redirecionando visitante para login. |
| Média | Sucesso 2FA deixa usuário na etapa concluída; desativação preserva segredo/códigos obsoletos. | Navegação após verificação; limpar estado TOTP/backup após desativação e informar sucesso. |
| Média | Notification Route Handler exporta helper arbitrário `readBodyLimited`, além de duplicar parser com UTF-8 não estrito. | Remover export extra de route; usar readJsonLimited em ambas rotas. IA também usa parser limitado comum, com UTF-8 fatal e liberação de reader. |
| Média | Parser JSON aceita `application/jsonp` por startsWith. | Comparar media type exato antes de parâmetros; regressões para jsonp, charset e UTF-8 inválido. |
| Média | CSRF de notificações compara contra request.url, ao contrário da origem configurada usada por demais mutações. | Comparar Origin exato à origem BETTER_AUTH_URL. |
| Média | Paginação de recursos aceita inteiros sem teto, incluindo offsets imprecisos ou fora do intervalo SQL. | Mesmo teto 1.000.000 de notificações; teste estático de limites adicionado. |
| Média | Notificações expõem somente primeiros 20 registros na UI apesar de API paginada. | Controles anterior/próxima e parâmetro page, sem alterar contrato compartilhado. |
| Média | Anexos/notificações preservam dados antigos ou aceitam resposta de escopo anterior na troca de projeto/tenant. | Keys por escopo; cancelamento de consulta inicial de anexos e isolamento de estado de notificações. Não foi constatado bypass de autorização servidor. |
| Média | Shell grava sidebar em `sidebar`, página lê `sidebar:state`. | Alinhar cookie ao leitor existente. |
| Média | Diálogo mobile sem nome acessível; links não solicitam fechamento. | aria-label localizado e fechamento ao ativar link. Preservação real da instância durante navegação não exercitada. |
| Média | @source Tailwind sobe um diretório além da raiz. | Corrigir caminho relativo para packages/ui/src. Impacto em CSS final não exercitado. |
| Média | Pageview usa origem do PostHog como `$current_url`. | Usar origem real do app, mantendo somente `/`, sem query/hash potencialmente sensíveis. |
| Média | Idioma inglês misturado com português em anexos, segurança, 2FA, conta e contador acessível. | Propagar locale e traduzir textos locais nesses fluxos. |
| Baixa | InvitationForm sem consumidores e metadados builtin list/get não usados pelo dispatcher. | Remover componente morto e referências redundantes do catálogo. CLI custom/render permanece intacto. |

## Controles preservados

- Auth e autorização server-side continuam em withAuthorizedProjects/resolveTenant; scopes de arquivos verificam projeto e tenant, e conclusão verifica dono e estado pending.
- Origem configurada e leitura limitada de corpo mantidas em uploads e IA. Quota de IA reserva até dois passos antes do stream; lock e quota de uploads pendentes preservados.
- Não identificada vulnerabilidade concreta adicional nas primitivas packages/ui; padrão seguro Button type=button preservado.
- Nenhuma mudança em schema, RLS, auth shared, jobs, storage provider, secrets ou serviços.

## Verificação sugerida ao owner

1. Executar `pnpm --filter app check-types` e `pnpm exec tsx --conditions=react-server --test apps/app/src/lib/security/rate-limit.test.ts apps/app/src/lib/resources/validation.test.ts`. O `test:unit` atual também inclui esses arquivos.
2. Browser: clique em submit dos cinco modos auth; concluir TOTP, desativar durante setup e após confirmação; anônimo em /security deve ir a /login.
3. CRUD: criar e editar tarefa, confirmar request edit sem projectId e rejeição server de projectId forjado; páginas acima de 1.000.000 rejeitadas.
4. Requisições negativas: Origin ausente/externo em notificações; jsonp, JSON inválido, UTF-8 inválido e corpo acima do limite (inclusive chunked) em parsers alterados; 401/403 de tenant cruzado em arquivos/IA.
5. Browser pt-BR/en e mobile: navegar links do modal, nome acessível, sidebar após reload; trocar projeto/tenant com rede lenta e erro; paginar mais de 20 notificações. Confirmar CSS de componentes UI no bundle.
6. Analytics habilitado com consentimento: inspecionar payload, `$current_url` deve usar domínio do app sem query/hash. Nenhum evento antes de consentimento.

Testes novos adicionados, não executados. Validação consolidada pertence ao owner.
