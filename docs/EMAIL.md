# Email

`@vibe/email` exports server-only `sendEmail({ to, subject, html, text? }): Promise<void>` and `escapeHtml(value)`. `to` accepts one plain email address only. Dynamic values inserted into HTML templates MUST pass through `escapeHtml`; build templates for each use case rather than treating escaping as a universal template. The sender rejects empty or newline-containing address/subject headers. Import `@vibe/email/src/transport.ts` only from server scripts that cannot load the `server-only` marker; public application imports use `@vibe/email`.

Set `EMAIL_PROVIDER` to `smtp` or `resend` and set `EMAIL_FROM`. Provider configuration is read at send time, not module import. SMTP requires `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE` (`true` or `false`); `SMTP_USER` and `SMTP_PASSWORD` are optional but MUST be set together. Resend requires `RESEND_API_KEY` and uses its official `POST https://api.resend.com/emails` endpoint. No provider fallback. Delivery requests time out after 10 seconds; errors do not include provider response bodies or credentials. Message content and secrets are not logged.

For local development, run an external Mailpit instance and configure SMTP, for example:

```sh
EMAIL_PROVIDER=smtp
EMAIL_FROM='Vibe <no-reply@example.test>'
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
```

Example uses unauthenticated local SMTP; no real credentials or default secret values required.

Mailpit is an optional external development tool, not a package dependency or required default.
