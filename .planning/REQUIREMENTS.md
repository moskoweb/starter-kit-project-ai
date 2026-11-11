# Requisitos — Starter kit com IA

Data: 2026-11-11. Status: implementação e verificação em andamento. Evidências por fase em VERIFICATION.md; caixas permanecem abertas até todos critérios do requisito estarem comprovados.

Valor central: replicar desenvolvimento com agentes e infraestrutura de aplicação, sem repetir setup e sem tornar integrações opcionais obrigatórias.

## Escopo da entrega

Todos os requisitos abaixo pertencem ao roadmap desta entrega. Fases não são autorização de implementação nem redução de escopo.

### Fundação e contexto para agentes

- [ ] **BASE-01**: Desenvolvedor instala monorepo Turborepo com Next.js 16 e TypeScript usando um gerenciador e lockfile canônicos; clone limpo inicia pelo procedimento documentado.
- [ ] **BASE-02**: Pacotes ui/db/auth/config possuem fronteiras explícitas; código cliente não importa credenciais ou acesso ao banco.
- [ ] **BASE-03**: PostgreSQL e Drizzle possuem schema, migration inicial e seed de desenvolvimento; migration é aplicada por comando explícito e repetição não duplica dados.
- [ ] **BASE-04**: Integrações opcionais desabilitadas não exigem credenciais para iniciar; habilitadas com configuração inválida retornam erro acionável.
- [ ] **DEV-01**: AGENTS.md orienta agente sem histórico desta conversa: arquitetura, comandos reais, limites, mapa de docs e regra de reuso de componentes.
- [ ] **DEV-02**: Skills selecionadas têm origem/licença/versão e responsabilidade documentadas; instalação de ferramentas externas é opt-in, sem instruções conflitantes obrigatórias.
- [ ] **DEV-03**: Documentação e GSD registram decisões, fases, verificação e retomada; exemplos executáveis não dependem de caminhos desta máquina.
- [ ] **DEV-04**: Código reaproveitado tem origem e avisos legais preservados; dependências e scripts remotos são revisados antes de execução.

### Identidade e isolamento

- [ ] **AUTH-01**: Usuário pode cadastrar-se, autenticar-se, encerrar sessão, verificar email e recuperar acesso; sessão inválida não acessa operações protegidas.
- [ ] **AUTH-02**: Usuário pode usar OTP e 2FA com recuperação definida; token inválido, expirado ou reutilizado não concede acesso.
- [ ] **AUTH-03**: Superadmin global é provisionado explicitamente; cadastro público e admin de tenant não podem obter privilégio global.
- [ ] **TEN-01**: Organização pode ser criada e administrada por usuário autorizado; convites, aceitação e remoção de membros respeitam permissões.
- [ ] **TEN-02**: Usuário pode pertencer a organizações distintas com roles diferentes; papéis personalizados expressam permissões verificadas no servidor.
- [ ] **TEN-03**: Perfis pessoal, organizações e híbrido suportam sem tenant, single-tenant e multi-tenant sem organização fictícia obrigatória para uso pessoal.
- [ ] **TEN-04**: Leitura, criação, edição, exclusão e relações rejeitam acesso cruzado entre tenants e acesso a dados pessoais de outro usuário, inclusive por chamada direta.
- [ ] **TEN-05**: Identificadores usam UUID conforme contrato registrado; URLs por slug ou UUID resolvem mesmo tenant autorizado e rejeitam colisões/identificadores inválidos.
- [ ] **TEN-06**: Decisão de RLS e pooling é documentada e verificada com acessos concorrentes; contexto de tenant não vaza entre requisições.
- [ ] **MAIL-01**: Email transacional funciona por SMTP ou Resend selecionado; fluxos de autenticação usam transporte real, erros são visíveis e não ocorre fallback automático duplicador.

### Painéis, componentes e temas

- [ ] **PANEL-01**: Painéis sem tenant e tenant-aware coexistem, cada um com prefixo, navegação, recursos e política de acesso próprios.
- [ ] **PANEL-02**: Painel tenant-aware aceita prefixo configurável e resolução slug/UUID; links gerados respeitam configuração, sem parsing duplicado.
- [ ] **UI-01**: Componentes locais preservam subpastas data-table/form/infolist/widgets/actions, sem namespace filament; novos componentes seguem local → shadcn → criação.
- [ ] **UI-02**: Tema altera cores, tipografia, raios, densidade e charts via tokens; light/dark e override de painel não exigem cópia de componentes.
- [ ] **UI-03**: Layouts e navegação funcionam em desktop e mobile, teclado e foco; formulários têm labels/erros acessíveis e estados loading/empty/error definidos.
- [ ] **UI-04**: Dashboard apresenta widgets e charts com dados reais de exemplo e escopo autorizado; composição usa shadcn Charts/Recharts sem duplicação desnecessária.
- [ ] **I18N-01**: Interface demonstra dois locales de referência e formatos de data/número; novas mensagens são adicionadas pelo procedimento documentado.

### Resource de referência

- [ ] **RES-01**: Resource completo lista, cria, visualiza, edita e exclui registros persistidos, com validação de servidor e permissões por operação.
- [ ] **RES-02**: Tabela suporta filtros, ordenação, paginação e seleção com resultados corretos no servidor; ações em lote não escapam do escopo autorizado.
- [ ] **RES-03**: Forms, infolists, widgets e actions compõem recurso sem duplicar primitivas; campos sensíveis não são expostos a partir do schema automaticamente.
- [ ] **RES-04**: Resource demonstra relação entre models e autorização correspondente; mesmo model pode servir painéis distintos sem conceder acesso implícito.

### CLIs e geração

- [ ] **CLI-01**: CLI cria projeto independente com perfil pessoal, organizações ou híbrido, sem segredos, histórico de planejamento do kit ou caminhos locais herdados.
- [ ] **CLI-02**: CLI gera model isolado como schema Drizzle e tipos; pode gerar migration base pelo mecanismo canônico sem aplicá-la.
- [ ] **CLI-03**: CLI gera resource para model existente ou model+resource+migration, incluindo pastas, páginas, form, table, operações e registro no painel selecionado.
- [ ] **CLI-04**: CLI gera painel com contexto explícito e configuração de rota; resultado inicia e aplica política de acesso escolhida.
- [ ] **CLI-05**: CLI aceita entradas não interativas para agentes, documenta exemplos e retorna códigos de saída úteis; nomes/caminhos inválidos e conflitos não sobrescrevem arquivos.
- [ ] **CLI-06**: Prévia permite revisar alterações; migrations aplicadas e customizações são preservadas; diagnóstico informa configuração ausente sem revelar segredos.

### Integrações e jobs

- [ ] **STORE-01**: Upload e download S3 compatível funcionam com limites e acesso autorizado; usuário de outro tenant não acessa objeto por troca de identificador.
- [ ] **NOTIF-01**: Notificações in-app persistem e podem ser marcadas lidas por destinatário autorizado; toast não substitui persistência.
- [ ] **JOB-01**: Worker separado executa job durável, preserva contexto autorizado e trata falha/reinício sem perda silenciosa ou efeito duplicado.
- [ ] **HOOK-01**: Webhook de entrada valida assinatura e trata repetição idempotentemente; payload inválido não altera dados.
- [ ] **HOOK-02**: Webhook de saída registra entrega, tentativas e falha final; destinos são validados contra acesso indevido a rede interna.

### IA, segurança e operação observável

- [ ] **AI-01**: Integração opcional Vercel AI SDK demonstra chamada e streaming com provedor real, cancelamento e erro tratados; chave nunca chega ao cliente.
- [ ] **AI-02**: Tool de exemplo valida entradas e permissões de usuário/tenant no servidor; instrução do modelo não concede acesso adicional.
- [ ] **AI-03**: Uso de IA possui limites configurados e tratamento de dados documentado; logs não expõem prompts sensíveis ou segredos por padrão.
- [ ] **OBS-01**: Logs estruturados e captura de erros permitem correlacionar execução web/worker sem registrar tokens e credenciais; backend escolhido e configuração documentados.
- [ ] **ANALYTICS-01**: Analytics opcional registra evento demonstrável e respeita política de consentimento/privacidade definida; desativado não envia eventos.
- [ ] **SEC-01**: Headers e rate limiting protegem endpoints definidos; avaliação do Arcjet registra adoção ou alternativa equivalente sem substituir autorização.
- [ ] **SEO-01**: Superfícies públicas pertinentes demonstram metadata, sitemap e JSON-LD válidos; páginas privadas não expõem conteúdo em artefatos públicos.

### Replicação e entrega

- [ ] **SHIP-01**: Projeto derivado é criado fora do repositório e executa fluxo documentado de instalação, migrations, autenticação e CRUD sem depender do checkout original.
- [ ] **SHIP-02**: Deploy Node/Docker demonstra app único e app+worker separado, com healthcheck e migrations controladas; serviços externos são explicitados.
- [ ] **SHIP-03**: Documentação cobre setup, perfis, roles, painéis, temas, CLIs, integrações opcionais, deploy e atualização manual de projetos independentes.
- [ ] **SHIP-04**: Gates de CI verificam tipos e comportamentos críticos; build de produção canônico e smoke do projeto derivado passam antes de release.

## Fora do escopo aprovado

CMS/blog dedicado; cobrança obrigatória; RAG obrigatório; domínio próprio/subdomínio na primeira entrega; publicação de núcleo próprio; sincronização automática dos projetos; editor visual de temas/roles sem decisão específica; compatibilidade Cloudflare não verificada. Papéis personalizados continuam no escopo, mesmo sem editor visual.

## Rastreabilidade

| Requisito | Fase | Status |
|---|---|---|
| BASE-01 | 1 | Pendente |
| BASE-02 | 1 | Pendente |
| BASE-03 | 1 | Pendente |
| BASE-04 | 1 | Pendente |
| DEV-01 | 1 | Pendente |
| DEV-02 | 1 | Pendente |
| DEV-03 | 1 | Pendente |
| DEV-04 | 1 | Pendente |
| AUTH-01 | 2 | Pendente |
| AUTH-02 | 2 | Pendente |
| AUTH-03 | 2 | Pendente |
| TEN-01 | 2 | Pendente |
| TEN-02 | 2 | Pendente |
| TEN-03 | 2 | Pendente |
| TEN-04 | 2 | Pendente |
| TEN-05 | 2 | Pendente |
| TEN-06 | 2 | Pendente |
| MAIL-01 | 2 | Pendente |
| PANEL-01 | 3 | Pendente |
| PANEL-02 | 3 | Pendente |
| UI-01 | 3 | Pendente |
| UI-02 | 3 | Pendente |
| UI-03 | 3 | Pendente |
| UI-04 | 3 | Pendente |
| I18N-01 | 3 | Pendente |
| RES-01 | 4 | Pendente |
| RES-02 | 4 | Pendente |
| RES-03 | 4 | Pendente |
| RES-04 | 4 | Pendente |
| CLI-01 | 5 | Pendente |
| CLI-02 | 5 | Pendente |
| CLI-03 | 5 | Pendente |
| CLI-04 | 5 | Pendente |
| CLI-05 | 5 | Pendente |
| CLI-06 | 5 | Pendente |
| STORE-01 | 6 | Pendente |
| NOTIF-01 | 6 | Pendente |
| JOB-01 | 6 | Pendente |
| HOOK-01 | 6 | Pendente |
| HOOK-02 | 6 | Pendente |
| AI-01 | 7 | Pendente |
| AI-02 | 7 | Pendente |
| AI-03 | 7 | Pendente |
| OBS-01 | 7 | Pendente |
| ANALYTICS-01 | 7 | Pendente |
| SEC-01 | 7 | Pendente |
| SEO-01 | 7 | Pendente |
| SHIP-01 | 8 | Pendente |
| SHIP-02 | 8 | Pendente |
| SHIP-03 | 8 | Pendente |
| SHIP-04 | 8 | Pendente |

Cobertura planejada: 51 requisitos, 51 mapeados, zero sem fase. Conclusão exige comportamento verificado, não apenas arquivos gerados.
