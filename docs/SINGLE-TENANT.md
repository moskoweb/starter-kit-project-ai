# Organização única

`ORGANIZATION_MODE` define a topologia das organizações do aplicativo:

- `multi` (padrão): usuários verificados podem criar organizações, conforme `IDENTITY_PROFILE`, e participar de várias.
- `single`: existe uma única organização autorizada para o aplicativo, identificada por `SINGLE_ORGANIZATION_ID`. Não é um limite de uma organização por usuário.

```dotenv
IDENTITY_PROFILE=organizations
ORGANIZATION_MODE=single
SINGLE_ORGANIZATION_ID=c944e9af-0796-4a40-9598-66f8bb723033
```

O UUID acima é apenas exemplo. Use o ID real de uma organização já provisionada. Em `single`, ID ausente, vazio ou inválido impede a inicialização da configuração de identidade. Nenhuma organização, associação ou usuário é criado no startup.

## Provisionamento e acesso

O operador deve provisionar explicitamente a organização e seu primeiro proprietário antes de habilitar `single`, usando os fluxos existentes de organização do Better Auth em uma etapa controlada de provisionamento. Uma instalação em `multi` pode criar a organização pela interface `/organizations`; depois, configure seu UUID e reinicie com `single`. Não deixe a etapa de provisionamento aberta a usuários não autorizados.

O proprietário convida participantes pelos fluxos existentes de membros e convites. Os participantes precisam de conta verificada, convite aceito e associação real à organização configurada. Não há associação automática no cadastro nem organização pessoal fictícia. Usuários sem associação recebem orientação para aceitar convite ou solicitar acesso ao operador.

Em `single`, Better Auth desabilita a criação de organizações para todos os usuários, inclusive administradores. A página `/organizations` e os seletores mostram somente a organização configurada à qual o usuário pertence; o formulário de criação não aparece. `resolveTenant` exige simultaneamente o ID configurado e associação do usuário, tanto em URLs por slug quanto por UUID. Outras organizações eventualmente existentes no banco não são resolvidas como tenant do aplicativo.

## Fronteira da API de autenticação

O plugin `singleTenantBoundary` usa middleware nativo do Better Auth instalado (1.7.20), não apenas o filtro de `resolveTenant`. Mesmo quem ainda possui memberships em outras organizações não pode acessá-las pelos endpoints diretos `/organization/*`:

- IDs explícitos e slugs em body/query precisam identificar `SINGLE_ORGANIZATION_ID`. Sem identificador, o contexto `activeOrganizationId` da sessão autoritativa precisa corresponder; uma sessão antiga com outra organização ativa não concede acesso. É possível selecionar a organização configurada explicitamente ou limpar o contexto com `set-active` e `organizationId: null`.
- `get-invitation` resolve `query.id`; aceitar, rejeitar e cancelar resolvem `body.invitationId` no adapter nativo antes de conferir a organização. IDs inexistentes ou de outra organização recebem a mesma recusa. As verificações nativas de destinatário, validade e email continuam obrigatórias.
- Atualizar papel e remover membro resolvem IDs de membership no adapter. Remoção por email mantém o lookup nativo limitado à organização já conferida. Informar o ID da organização permitida junto de um ID de membro estrangeiro não libera a operação.
- As listas nativas de organizações e convites do usuário são filtradas depois da autorização nativa. Somente registros da organização configurada são retornados; erros nativos não viram listas vazias de sucesso.
- Hooks nativos também recusam criação server-side e inclusão de membros fora da organização configurada, inclusive na API server-only `addMember`, que não possui rota HTTP.

A abordagem deliberadamente menor é uma lista fechada dos endpoints organizacionais atualmente usados. `create`, `check-slug` e endpoints desconhecidos são recusados em `single`; teams e papéis dinâmicos, atualmente desabilitados, exigem revisão explícita antes de habilitar. Assim, atualizar Better Auth não libera automaticamente uma nova rota sem isolamento. Login, cadastro, recuperação, 2FA e APIs pessoais não passam por esta restrição. O perfil `personal` continua recusando todas as rotas organizacionais.

O middleware não concede associação, não replica permissões e não troca automaticamente a organização ativa. Better Auth continua responsável por sessão, membership, papéis e autorização de cada operação. Na validação, usar conta com memberships nas organizações permitida e estrangeira; cobrir IDs/slugs explícitos, sessão ativa estrangeira, convites/membros estrangeiros, listas filtradas, seleção/limpeza do contexto e login/pessoal. Nenhum teste/build é executado por esta alteração.

## Perfil de identidade

`IDENTITY_PROFILE` continua independente da topologia:

- `organizations`: exige contexto organizacional para projetos; escolha este perfil quando todo trabalho deve pertencer à organização única.
- `hybrid`: mantém contexto pessoal real e a organização configurada, sem criar uma organização para representar o contexto pessoal.
- `personal`: mantém organizações desabilitadas, mesmo com `ORGANIZATION_MODE=single`; nesse modo o UUID continua obrigatório pela validação de configuração.

A mudança não altera schema de autenticação, RLS ou migrations. Backups e migração de dados entre organizações permanecem operações explícitas do operador; mudar o UUID não transfere dados nem associações.
