# Starter kit — visão e plano de construção

Status: implementação autônoma autorizada, fechamento do produto e validação local em andamento; provedores externos adiados pelo usuário.
Atualizado em: 2026-11-11.

## 1. Objetivo

Criar starter kit próprio para SaaS, aplicações e microaplicações em Next.js, desenvolvidas com agentes de IA e preparadas para incorporar IA no produto. Centralizar e replicar ambiente, padrões, componentes, ferramentas e documentação hoje usados pelo responsável, reduzindo setup repetitivo.

Filament é referência de experiência e capacidades, não dependência, nome interno ou modelo a copiar literalmente. Reaproveitar bibliotecas e projetos existentes antes de construir alternativas próprias. Suportar projetos pequenos sem exigir infraestrutura de projetos grandes.

Ampliação aprovada: aplicação pública independente em `apps/web`, com Astro estático como escolha técnica para marketing/páginas públicas; painel continua Next.js. Não exige CMS/blog. `packages/email` deve incluir templates React Email para verificação, recuperação, convites e OTP, mantendo transporte SMTP/Resend separado. README e guia inicial devem explicar todos workspaces e fluxo completo de criação/execução/deploy.

## 2. Decisões confirmadas

- Next.js 16 e TypeScript.
- PostgreSQL e Drizzle; compatibilidade e versões específicas serão verificadas antes da instalação.
- Better Auth como direção para autenticação.
- Tailwind CSS v4 e shadcn/ui.
- Turborepo em um monorepo: aplicações executáveis separadas de pacotes compartilhados.
- Theme configurável para customizar componentes padrão.
- Preservar subpastas funcionais de componentes; remover somente a pasta intermediária `filament/`.
- Ordem para componentes: procurar localmente; depois no shadcn; somente então criar, reaproveitando primitivas existentes.
- Charts: shadcn Charts, Recharts e Evil Charts como fontes de componentes e referências, sem duplicar bibliotecas sem necessidade.
- Multi-panel e acesso com ou sem tenant, conforme projeto.
- Tenant inicialmente por path, com prefixo configurável e identificação por slug ou UUID.
- UUID como padrão de identificadores; uso como PK e versão ainda são recomendações, não decisões fechadas.
- CLIs para criar projeto, model e/ou resource, migrations base, painéis e estrutura relacionada, documentadas para pessoas e agentes.
- CMS removido como conceito e módulo do kit. Gestão de conteúdo, quando necessária em um projeto derivado, é implementada como recursos comuns.
- Fork, download e adaptação de referências são permitidos, respeitando licenças e atribuições. Não há obrigação de manter arquitetura ou compatibilidade com upstream.
- Avaliar conflitos entre ferramentas e skills; escolher solução canônica em vez de instalar alternativas sobrepostas.

## 3. Arquitetura proposta

```text
apps/
  app/                    # Next.js: páginas, painéis e endpoints
  worker/                 # Processo separado, quando houver jobs duráveis
packages/
  ui/
    components/
      ui/                 # Primitivas locais/shadcn
      data-table/
      form/
      infolist/
      widgets/
      actions/
    themes/
  db/                     # Schemas Drizzle e migrations
  auth/                   # Better Auth e configuração compartilhada
  core/                   # Regras usadas por mais de um executável, se necessário
  cli/                    # Geradores e criação de projetos
  config/                 # Configuração compartilhada de tooling
.agents/
  skills/
.planning/
docs/
AGENTS.md
```

Estrutura é proposta, não scaffold já criado. Pacotes e diretórios surgem quando possuírem responsabilidade concreta. Domínios exclusivos da aplicação permanecem nela; não criar um pacote por helper.

Recomendação: pnpm workspaces, versão fixada e um lockfile canônico.

### Deploy

Monorepo não exige microserviços. Pacotes compartilhados entram no build dos executáveis e não precisam de deploy próprio.

- Projeto simples: um deploy Next.js para páginas, painéis e endpoints.
- Projeto com jobs: Next.js e worker como serviços separados, compartilhando código e contratos.
- Site ou documentação independentes: separar em outro app somente quando necessário.
- Banco e provedores continuam dependências externas, mesmo com um único deploy de aplicação.

Turborepo coordena tarefas e dependências; não hospeda processos nem transforma qualquer pasta em serviço independente. Separação exige entrypoints, builds e configuração de deploy próprios. Painéis podem continuar juntos no mesmo Next.js.

## 4. Identidade, autorização e tenants

Não assumir que todo usuário pertence a uma organização. Suportar composição de três contextos:

1. Usuário autenticado acessando aplicação pessoal ou global, sem tenant.
2. Usuário membro de uma ou mais organizações, com papéis e permissões específicos por organização.
3. Acesso administrativo global, explicitamente autorizado e separado dos papéis de organização.

Painel representa contexto de interface e acesso, não um papel. Acesso a painel, identidade de usuário, membership de organização e autorização de operação são conceitos separados.

Disponibilizar perfis pessoal, organizações e híbrido, com híbrido como aplicação de referência. Documentar receitas para projetos sem tenants, single-tenant e multi-tenant.

Tenancy é configuração por painel, não obrigação global da aplicação. Painéis sem tenant e painéis tenant-aware podem coexistir; estes últimos podem operar com uma ou várias organizações conforme projeto. Cada painel define prefixo, layout, navegação, recursos, tema e requisito de contexto pessoal/global/tenant. Route Groups do Next.js não criam prefixos de URL nem barreiras de autorização por si só. Compartilhar um model entre painéis não concede permissões nem permite reutilizar consultas sem aplicar o escopo correto.

### Isolamento

Toda operação tenant-scoped deve resolver tenant, verificar membership e permissão e aplicar escopo em leitura e escrita. Impedir referências cruzadas entre tenants. Cache, storage, notificações, ferramentas de IA e jobs devem preservar o contexto apropriado. Operações pessoais devem verificar propriedade do usuário.

Plugin de organizações não substitui isolamento de dados. Esconder botão, alterar rota ou usar UUID não substitui autorização. Estratégia de PostgreSQL RLS será decidida antes da implementação do acesso a dados, considerando pooling, transações, workers e administração global.

### Rotas e identificadores

Configuração por projeto: prefixo e resolução por slug ou UUID. Centralizar geração de links e resolução para evitar parsing espalhado. Validar colisões e slugs reservados.

UUID como PK é recomendação: evita dois identificadores sem necessidade. `slug` permanece campo legível opcional. Se requisito for ocultar a própria PK, decidir por identificador público separado. UUIDv4 versus UUIDv7 será decidido com documentação dos efeitos de ordenação e exposição temporal.

Subdomínios e domínios próprios não estão aprovados como entrega inicial; exigem contrato adicional de DNS, cookies, origem e deploy.

## 5. UI, temas e recursos

Capacidades: layout responsivo, navegação, dashboards, CRUD, tabelas, filtros, ordenação, paginação, seleção, forms, detalhes/infolists, widgets, actions, confirmação, feedback e estados de loading/empty/error/acesso negado.

Temas com tokens semânticos e CSS variables: cores, light/dark, tipografia, raios, densidade e cores de gráficos. Customização por projeto e overrides controlados por painel. Editor visual e branding persistido por tenant não estão aprovados automaticamente.

Componentes visuais não acessam banco nem carregam segredos. Acessibilidade e comportamento responsivo são requisitos, não extras.

TanStack Table é direção para tabelas. TanStack Virtual somente quando volume justificar. Query somente para necessidades client-side não atendidas adequadamente pelo fluxo nativo. Comparar TanStack Form e React Hook Form antes de fechar forms. Não adotar TanStack Router/Start como segunda arquitetura ao lado do Next.js.

## 6. CLI e código gerado

Capacidades planejadas: criar projeto; gerar model isolado; gerar resource para model existente; gerar model e resource juntos; gerar migrations base e estrutura relacionada; gerar painel; diagnosticar setup. Outros geradores entram quando houver padrão repetitivo concreto. Nomes finais dos comandos ainda não definidos.

No contexto Drizzle, model significa definição de tabela/schema e tipos inferidos, com relações quando declaradas; não criar camada Active Record para imitar Eloquent. Resource representa interface e operações de um domínio em um painel, sem exigir model novo para cada painel.

Gerador deve criar pastas e arquivos conforme convenções, aceitar seleção explícita de painel e escopo de dados e produzir migrations pelo fluxo canônico do Drizzle, sem um segundo mecanismo de diff de schema. Gerar migration não significa aplicá-la: execução contra banco é operação separada e explícita. Não modificar migrations já aplicadas. Campos de negócio e relações exigem entrada definida; não inventar estrutura de domínio.

Referência consultada: https://filamentphp.com/docs/5.x/resources/overview — separação de pages, schemas e tables; geração de resource combinável com model e migration. Adaptar experiência ao Next.js/Drizzle, sem copiar arquitetura PHP nem incluir automaticamente todos os recursos opcionais do Filament.

Gerador de recurso combina modelo de dados com configuração tipada de campos expostos, labels, filtros, actions e permissões. Schema do banco não é definição completa de UI e não autoriza exposição de todos os campos.

Entregar listagem, criação, edição, detalhes, validação, operações de servidor, integração com painel e escopo de autorização. Recursos tenant-scoped devem manter isolamento desde o código gerado.

Código gerado pertence ao projeto e pode ser modificado. Detectar conflitos e oferecer prévia; não sobrescrever customizações silenciosamente. Construir primeiro um CRUD completo validado e extrair gerador desse padrão.

Documentar comandos, entradas, saídas, limites e exemplos para agentes e pessoas. Não depender de prompts privados para operar o kit.

## 7. Integrações e capacidades complementares

| Área | Escopo |
|---|---|
| Email | SMTP ou Resend; templates compartilhados; sem fallback automático que duplique envio |
| Analytics | PostHog ou alternativa; eventos e identificação com privacidade |
| Observabilidade | Logs estruturados, erros e contexto de execução; provedor a escolher |
| Segurança | Validação, autorização, headers e rate limiting; avaliar Arcjet sem substituir controles internos |
| SEO | Metadata, sitemap, robots e JSON-LD nas superfícies públicas pertinentes |
| IA | Vercel AI SDK, streaming e tools; permissões, limites e proteção de dados |
| Webhooks | Entrada e saída, assinaturas, idempotência e entrega durável |
| Storage | S3 compatível, upload controlado e acesso autorizado |
| Internacionalização | Mensagens, formatos e política de locale |
| Notificações | Persistidas in-app com estado lido/não lido; distintas de toast |
| OTP / 2FA | Métodos, recuperação e política de obrigatoriedade a definir |
| Jobs | Execução assíncrona durável e worker quando necessário; fila a escolher |

Integrações devem ser opcionais por projeto, sem exigir contas e segredos de todos os provedores para iniciar a aplicação. Não adicionar cobrança, marketplace, editor visual de páginas ou RAG como requisitos implícitos.

Esclarecimento do usuário: entregar `.env.example` completo, sem `.env` real ou credenciais de provedores no starter. Implementar integrações antes de solicitar acesso; smoke com provedores reais somente na validação final, após implementação completa. Infraestrutura local sintética de desenvolvimento permanece separada do template. Registrar smoke externo pendente sem substituir por mock nem alegar integração verificada.

## 8. Desenvolvimento com agentes

`AGENTS.md` será entrada principal: arquitetura, comandos, limites e mapa de documentação. Instruções locais quando necessário, evitando cópias divergentes. GSD mantém planejamento e continuidade em `.planning/`. Documentação estável em `docs/`.

Skills selecionadas por tarefa. Ferramentas de contexto, otimização de saída e estilos de comunicação não podem remover mensagens de erro relevantes, enfraquecer verificações ou esconder informação de segurança. Avaliar envio de código/dados, permissões, telemetria, custo e dependências antes da adoção.

### Referências para avaliação, não dependências aprovadas

- https://github.com/vudovn/ag-kit
- https://opengsd.net
- https://github.com/colbymchenry/codegraph
- https://github.com/JuliusBrussee/caveman
- https://github.com/DietrichGebert/ponytail
- https://github.com/manikandan-22/ux-guidelines
- https://github.com/Leonxlnx/taste-skill
- https://interfaces.dev/
- https://github.com/theclaymethod/unslop
- https://supercode.sh/en
- https://github.com/headroomlabs-ai/headroom
- https://github.com/rtk-ai/rtk
- https://www.skills.sh/vercel-labs/skills/find-skills
- https://www.skills.sh/mattpocock

Referências avaliadas documentalmente em [AGENT-TOOLING.md](research/AGENT-TOOLING.md); não foram instaladas nem auditadas em runtime. Catálogo de autor não equivale a uma única skill aprovada. Selecionar skills concretas, versões e origem antes de instalar.

## 9. Referências de implementação

- https://filamentphp.com — capacidades e experiência de desenvolvimento.
- https://github.com/Kiranism/next-shadcn-dashboard-starter — candidato a base visual.
- https://github.com/kriasoft/react-starter-kit — avaliar backend, dados e tooling.
- https://github.com/vercel/next-forge — avaliar fronteiras e organização de monorepo.
- https://github.com/Blazity/next-enterprise — avaliar convenções e operação.
- https://tanstack.com — bibliotecas especializadas conforme necessidade.
- https://ui.shadcn.com/charts/area — referência explícita de charts.
- https://www.cult-ui.com — referência complementar de componentes.
- Evil Charts e Recharts — referências indicadas pelo usuário.

Comparar código atual, licenças, manutenção e custo de adaptação. Escolher uma base principal ou extrair partes; não mesclar starters completos com convenções conflitantes. Preservar avisos legais exigidos. Fork não implica obrigação de sincronizar continuamente com upstream.

## 10. Sequência de execução proposta

1. Pesquisa de referências/licenças e contratos de arquitetura.
2. Fundação: monorepo, Next.js, banco, migrations, ambiente, instruções e documentação.
3. Identidade: auth, contextos pessoais/globais/tenant, memberships, roles e isolamento.
4. Interface: temas, painéis, componentes, tabelas, forms, widgets e gráficos.
5. CRUD completo de referência; depois geração via CLI.
6. Integrações opcionais, IA, webhooks e jobs.
7. Replicação, operação e estratégia de atualizações dos projetos derivados.

Critérios de aceite: novo projeto reproduzível; CRUD gerado funcional; isolamento entre tenants e usuários verificado; roles aplicadas no servidor; tema modificável sem duplicação; painel sem tenant possível; deploy simples e worker separado demonstrados quando implementados; documentação e comandos suficientes para agente operar sem contexto desta conversa.

## 11. Decisões de distribuição, deploy e perfis

### D1 — Distribuição e atualização de projetos derivados

Aprovado: A, template copiado e projetos autônomos, para acelerar entrega do starter. Não distribuir núcleo próprio como dependência publicada nesta etapa.

Direção recomendada: começar com template e pacotes locais ao monorepo. Quando houver componentes estáveis reutilizados em projetos reais, avaliar publicação seletiva de pacotes versionados. Aplicação, schemas de negócio e recursos gerados permanecem no projeto. Pacotes locais copiados não recebem atualizações centrais automaticamente.

Publicar um núcleo desde o início exige contratos, releases, compatibilidade e gestão de breaking changes. Extrair depois também tem custo: migração de imports e separação de customizações. Não prometer migração automática ou sem alterações. Até nova decisão, não criar registry, sincronizador ou obrigação de consumir pacotes próprios publicados.

Referência verificada: Filament distribui painel e componentes como pacotes Composer (`filament/filament`, `filament/tables`, `filament/forms` etc.). Fonte: https://filamentphp.com/docs/5.x/introduction/installation . Atualizar pacote não significa reescrever recursos personalizados da aplicação.

### D2 — Destino de deploy prioritário

Aprovado: A, Node/Docker como contrato inicial de referência para app e worker, com serviços separados quando necessário. Usuário já opera projetos em containers e Cloudflare Workers.

Cloudflare Workers permanece destino adicional possível, não suporte verificado nesta etapa. Seu runtime não equivale a um worker Node persistente: bibliotecas, bindings, acesso a dados e limites de execução precisam de validação própria. Evitar dependências de plataforma nas regras de domínio quando desnecessárias, sem criar abstrações especulativas ou prometer portabilidade universal.

### D3 — Perfil padrão de criação

Aprovado: perfis pessoal, organizações e híbrido. Usar híbrido como aplicação de referência para provar coexistência; projetos pessoais não devem exigir organização. Gerador deve respeitar perfil escolhido, inclusive rotas, onboarding e autorização, não apenas ocultar menus.

Confirmado no escopo: projetos sem organizações, single-tenant (uma organização) e multi-tenant (várias organizações), além de áreas pessoais e organizacionais coexistentes. Single-tenant não é sinônimo de aplicação pessoal: pode conter vários usuários e roles na mesma organização.

Autorização deve suportar superadmin global, administradores no escopo apropriado e papéis personalizados por projeto/organização. Usuário pode ter papéis diferentes em organizações distintas. Administrador de organização não recebe acesso global; superadmin é atribuído explicitamente, nunca pelo cadastro público. Acesso a dados de tenants pelo superadmin exige política explícita, não bypass implícito. Editor visual de roles não está automaticamente incluído: mecanismo de definição e administração será fechado na fase de identidade.

## 12. Decisões técnicas posteriores

Resolver com pesquisa e propostas antes da fase correspondente, sem exigir decisão imediata sobre cada biblioteca:

- Base/fork e licença do próprio kit; antes de copiar/publicar código.
- pnpm, versões de Node e bibliotecas; antes do scaffold.
- PK UUID e versão; estratégia de isolamento/RLS; antes do schema e acesso a dados.
- Matriz de permissões e métodos iniciais de autenticação; antes da fase de identidade.
- Forms e i18n; antes da interface dependente dessas escolhas.
- Jobs/fila; antes de webhooks e processamento durável.
- Provedores de analytics, observabilidade, storage e IA; antes de suas integrações.
- Políticas de locale, tema por tenant e notificações em tempo real; conforme requisitos de cada capacidade.

## 13. Limites desta etapa

Usuário autorizou avançar autonomamente: concluir fundação de agentes e executar roadmap, parando somente para decisões materiais ou bloqueios reais. Tier-02 e Tier-03 via nine-router comprovados com leitura de arquivo; Tier-01 integra e revisa. Pesquisa não equivale a compatibilidade comprovada em runtime. Sem autorização implícita para publicação, push, exposição pública, custos externos não aprovados ou operações destrutivas.

Artefatos: [requisitos](REQUIREMENTS.md), [roadmap](ROADMAP.md), [estado](STATE.md), [pesquisa de starters](research/STARTERS.md), [ferramentas para agentes](research/AGENT-TOOLING.md) e [contratos de arquitetura](research/ARCHITECTURE.md). Decisões aprovadas neste documento prevalecem sobre recomendações ainda não aprovadas da pesquisa.
