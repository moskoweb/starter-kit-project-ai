# Arquitetura: evidências e gates

Data: 2026-11-11. Pesquisa documental, não prova de runtime. Contrato de produto: ../PROJECT.md.

## Fontes primárias consultadas

- [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying): Node e Docker suportam funcionalidades do framework; export estático é limitado, adapters variam. Sustenta destino Node/Docker aprovado; não comprova build do futuro kit.
- [Better Auth organization](https://www.better-auth.com/docs/plugins/organization): memberships, organizações, convites e configuração de organização. Criação de organizações é permitida por padrão; restringir conforme perfil. Não confundir sessão com organização ativa com autorização sobre recursos de negócio.
- [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate): compara schema e snapshots para gerar SQL; aplicar migration é operação separada. Gerador do kit deve delegar a esse mecanismo, não manter diff próprio.
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): default deny quando habilitado sem policy; owners normalmente ignoram RLS, superusers e BYPASSRLS ignoram; constraints referenciais não são substituídas por policies.
- [Filament resources](https://filamentphp.com/docs/5.x/resources/overview): resource para model existente, separação de páginas/forms/tables e geração combinada de model/migration. Referência de UX, não arquitetura a transplantar.

Context7 não estava exposto como ferramenta nesta sessão; consulta direta às fontes oficiais. Versões exatas serão fixadas após avaliar manifests e compatibilidade, não inferidas de documentação `latest`.

## Recomendações para contrato inicial

1. pnpm workspaces + Turborepo; um lockfile e versão de runtime fixada. Não publicar pacotes próprios nesta entrega.
2. Modelo de dados é schema Drizzle e tipos inferidos. Resource é composição de UI e operações autorizadas; não ORM próprio.
3. Painel tem contexto explícito: pessoal, global ou organização. Nada de `organizationId` opcional usado como autorização implícita. Perfil pessoal não exige organização artificial.
4. Autorização em operações servidor; seleção de tenant da URL é entrada não confiável. Verificar membership e permissão antes de consultar dados. Jobs e tools reconstituem autorização apropriada, não aceitam papel declarado pelo cliente.
5. Banco/schema compartilhado é proposta inicial. UUID como PK e UUIDv4 são recomendação conservadora até validar geração no adapter de auth; não impor campos duplicados sem requisito.
6. RLS é gate da fase de identidade: avaliar como defesa adicional com role de runtime sem ownership/BYPASSRLS e contexto transacional; não habilitar parcialmente e alegar isolamento. Resultado deve registrar decisão, limites e prova concorrente com pool. Filtros de aplicação e constraints entre tenants continuam obrigatórios.
7. Email de auth entra antes das demais integrações para provar convites/verificação/recuperação. SMTP e Resend são escolhas explícitas, sem fallback ambíguo.
8. Theme usa tokens CSS, não renderer próprio. Configuração tipada suficiente para compor recursos; não inventar DSL universal de forms.
9. CLI valida nomes e destinos, detecta conflitos, suporta execução não interativa e prévia. Migration gerada nunca é aplicada silenciosamente. Mudanças não relacionadas de schema precisam aparecer na revisão do SQL gerado.
10. Integração desabilitada não exige segredo nem conexão externa no startup. Integração habilitada com configuração inválida falha claramente, sem mock silencioso.

## Gates antes de implementar

| Gate | Evidência necessária | Fase responsável |
|---|---|---|
| Origem de código | Commit/versão, arquivo de licença e inventário de trechos importados | 1 |
| Ambiente | Matriz Node/Next16/React/Drizzle/BetterAuth e lockfile reproduzível | 1 |
| Identidade | PK/UUID, cadastro, OTP/2FA, matriz roles e política superadmin definidos | 2 |
| Isolamento | Decisão RLS/pooling e testes de acesso pessoal/cross-tenant/roles | 2 |
| UI | Escolha forms/i18n e contrato tokens; não duas libs para mesma função | 3 |
| Resource | Um CRUD real completo e autorizado antes de extrair gerador | 4 |
| Jobs | Escolha de fila baseada em garantias e infraestrutura; reinício não perde job | 6 |
| IA | Provedor real para prova, limite de custo, consentimento e tratamento de dados | 7 |
| Distribuição | Projeto criado fora do repositório inicia sem caminhos locais ou segredos herdados | 8 |

## Riscos principais

- UI starter baseada em auth de outro provedor: copiar layout sem copiar sessão/permissões.
- Biblioteca client importando módulo de banco: fronteiras server-only e dependências direcionadas.
- Tenant guard só em layout: Server Actions e endpoints continuam exigindo autorização própria.
- CLI regenerando schema ou migration aplicada: conflito explícito, revisão e histórico preservado.
- Mesmo nome de role em contexto global e tenant: evitar escalada por comparação textual solta.
- Cache global sem chave de escopo: demonstrar ausência de vazamento entre duas sessões e tenants.
- Agente comprimindo saída de teste: preservar status, stderr e acesso ao output bruto.
- Confundir documentação consultada com feature comprovada: todos requisitos de execução permanecem pendentes.
