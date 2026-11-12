# Email transacional

`packages/email` separa renderização, preview e entrega. Não é serviço nem fila. Hooks existentes em `packages/auth/src/auth.ts` renderizam verificação de email, redefinição de senha, convite de organização, OTP, confirmação de troca de email e confirmação de exclusão de conta antes de chamar o mesmo `sendEmail`. Políticas de autenticação, expiração dos tokens, single-tenant e 2FA continuam responsabilidade de `@vibe/auth`/Better Auth.

## Renderizar

```ts
// Node/worker: entrypoint puro, sem marcador server-only ou transporte.
import { renderAuthEmail } from "@vibe/email/render";

const { subject, html, text } = await renderAuthEmail({
  type: "invitation",
  organizationName: "Organização de exemplo",
  url: "https://example.test/invitations/synthetic-example",
});
```

Contrato `AuthEmail`:

- `{ type: "verification", url }`
- `{ type: "reset-password", url }`
- `{ type: "invitation", url, organizationName }`
- `{ type: "otp", code }` — seis dígitos, conforme OTP padrão usado pela autenticação.
- `{ type: "change-email", url, newEmail }` — enviado ao email atual; `newEmail` validado (sem espaços/controles, até 254 caracteres).
- `{ type: "delete-account", url }` — link Better Auth `/delete-user/callback`.

`renderAuthEmail` retorna `Promise<{ subject, html, text }>`. Componentes React Email geram HTML; `toPlainText` gera alternativa textual do mesmo HTML. React escapa valores textuais; não usar interpolação HTML nem `dangerouslySetInnerHTML`. Nome de organização deve ser não vazio, até 255 caracteres, sem controles. URLs absolutas exigem HTTPS, não aceitam credenciais, controles ou espaços; HTTP é aceito apenas para `localhost`, `127.0.0.1` e `[::1]`, fora de `NODE_ENV=production`. Validação de URL não autoriza destinos: hooks devem fornecer URLs de ação criadas pela aplicação/autenticação, nunca destinos arbitrários enviados pelo usuário.

`@vibe/email` mantém marcador `server-only` para importações da aplicação Next.js e exporta `sendEmail`, `renderAuthEmail` e tipos. Workers importam `@vibe/email/render`; scripts de entrega Node fora de Next.js usam `packages/email/src/transport.ts` diretamente. Renderização não lê credenciais nem envia mensagens.

## Preview local

Após instalar dependências pelo fluxo normal do monorepo (`@react-email/ui` 6.11.11 fica fixado em `devDependencies`, na mesma versão exigida pela CLI, sem instalação interativa ao iniciar):

```sh
pnpm --filter @vibe/email preview
```

Abrir `http://127.0.0.1:3005`. Script executa CLI oficial `email dev --dir ./emails --port 3005`, não entra no `turbo dev`. `preview-loopback.cjs` força listener HTTP em IPv4 loopback porque CLI 6.11.11 não oferece `--hostname`; bloqueia requisições HTTP/fetch externas no processo de preview para impedir entrega acidental. Não configurar integração Resend na CLI. Preview não importa transporte ou autenticação, não exige banco/SMTP/Resend e usa apenas exemplos sintéticos em `packages/email/emails`. Nunca colocar tokens reais ou dados de usuários nos exemplos. Preview visual não comprova entrega SMTP nem compatibilidade com todos clientes de email.

## Entregar via SMTP ou Resend

`sendEmail({ to, subject, html, text? }): Promise<void>` permanece API de transporte. `to` aceita um único endereço simples; cabeçalhos vazios ou com quebras de linha são rejeitados. Configuração é lida ao enviar, não ao importar. Sem fallback entre provedores; falhas propagam. Timeout de 10 segundos; erros não incluem corpo do provedor ou credenciais. Conteúdo e segredos não são registrados.

Definir `EMAIL_PROVIDER=smtp` ou `EMAIL_PROVIDER=resend`, mais `EMAIL_FROM`. SMTP exige `SMTP_HOST`, `SMTP_PORT` e `SMTP_SECURE` (`true` ou `false`). `SMTP_USER` e `SMTP_PASSWORD` são opcionais e devem ser configurados juntos. Resend exige `RESEND_API_KEY` e usa `POST https://api.resend.com/emails`.

Exemplo sintético para servidor SMTP local, configurado separadamente:

```sh
export EMAIL_PROVIDER=smtp
export EMAIL_FROM='Exemplo <no-reply@example.test>'
export SMTP_HOST=127.0.0.1
export SMTP_PORT=1025
export SMTP_SECURE=false
```

Mailpit é ferramenta externa opcional; kit não inicia nem instala SMTP. Esses valores não iniciam envio por conta própria: execução de fluxo real de autenticação chama transporte. Testar entrega em caixa de captura local antes de configurar domínio/provedor real. Não usar dados de produção para preview ou captura.

Check isolado de renderização, escaping e URLs (não envia email):

```sh
pnpm exec tsx packages/email/src/render.check.ts
```

Captura SMTP real e inspeção visual são verificações separadas; este check não as substitui.

## Dependências e referências

`react-email` 6.11.11 reúne componentes, render e CLI no pacote oficial atual; fica em dependências de runtime porque render e componentes são usados na entrega. React/React DOM 19.3.1 seguem versão da aplicação. Esse agrupamento também disponibiliza CLI no ambiente runtime, mas entrega não importa entrypoint da CLI nem inicia preview. Pacote antigo `@react-email/components` consta depreciado no registry e não é adicionado. Atualizar CLI exige rever restrição loopback do preload antes de usar preview.

- [Render e plain text oficiais](https://react.email/docs/utilities/render)
- [CLI oficial e exemplos de preview](https://react.email/docs/cli)
- [Registry react-email 6.11.11](https://registry.npmjs.org/react-email/6.11.11)
- [Registry do pacote antigo depreciado](https://registry.npmjs.org/@react-email/components/1.0.12)
