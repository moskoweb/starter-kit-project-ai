# Teste conjunto do starter

## Preparação

Criar projeto derivado pela CLI, instalar com pnpm frozen-lockfile e configurar ambiente somente no derivado. Usar PostgreSQL isolado e roles runtime/migration distintas. Aplicar migrations e seed explicitamente. Não colocar credenciais no template.

## Fluxos

1. Cadastro, email de verificação, login/logout e recuperação de senha.
2. Ativar TOTP, guardar códigos de recuperação, testar desafio por TOTP/email e recuperação. Código usado não deve conceder novo acesso.
3. Perfil pessoal sem organização obrigatória; criar/editar/listar/excluir projetos e tarefas.
4. Criar organização, convidar membro e atribuir viewer/member/admin; verificar permissões por ação e acesso direto negado a outro tenant.
5. Modo single com organização explicitamente provisionada; criação adicional bloqueada, membership real obrigatória.
6. Painéis global/pessoal/organização, prefixos configuráveis e identificador slug/UUID. Superadmin não recebe bypass implícito dos dados de tenants.
7. Tema light/dark, locale pt-BR/en, navegação mobile/teclado e estados vazio/erro/pending.
8. CLI create/model/resource/panel; preview sem writes, conflito sem sobrescrita, migration gerada sem aplicação automática.
9. Jobs opcionais: provisionar fila, iniciar worker e relay, criar projeto e verificar notificação persistida. Reprocessamento não duplica efeito.
10. Integrações externas somente quando habilitadas e autorizadas: S3, IA, Resend, PostHog/OTLP e webhooks. Sem configuração, módulos desabilitados não fazem chamadas externas.

## Evidência já obtida

Ver `.planning/LOCAL-VALIDATION.md` no checkout de desenvolvimento do kit. Projetos derivados não carregam esse histórico. Testes com provedores externos foram adiados pelo usuário e não são substituídos por mocks.

## Gates de release

`pnpm check-types`, `pnpm test`, `pnpm build`; smoke app/worker e projeto derivado. Executar testes de integração opt-in somente contra banco de teste, conforme docs dos módulos. CI remoto só pode ser declarado aprovado após execução real no runner.
