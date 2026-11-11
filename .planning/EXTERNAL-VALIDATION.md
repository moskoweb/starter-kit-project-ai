# Validação externa final

Implementações reais presentes; nenhuma credencial externa incorporada ao kit. `.env.example` documenta configuração. Provas locais usam PostgreSQL/Mailpit e dados sintéticos, não substituem os gates abaixo.

| Integração | Informação necessária para prova real | Cenário |
|---|---|---|
| IA | Endpoint OpenAI-compatible, modelo, chave de teste, limite de gasto autorizado | stream, cancelamento, tool scoped, quota/erro |
| Resend | Chave de teste, remetente verificado, destinatário autorizado | email transacional e falha visível |
| S3 compatível | Endpoint, região, bucket privado descartável, credenciais limitadas, CORS origem de teste | POST policy tamanho/MIME, HEAD complete, download autorizado |
| Analytics | Projeto PostHog de teste e host | zero envio sem consentimento, evento após consentir, revogação |
| Observabilidade | Endpoint OTLP de teste | evento sanitizado recebido, sem segredo/prompt |
| Webhook saída | HTTPS receptor controlado allowlisted | assinatura, ID estável, retries/timeout e estado final |

Fornecer por arquivo protegido fora do repositório, nunca colar segredos na conversa. Não executar chamadas pagas ou envios reais sem limite/destinatário autorizados. Sem esses acessos, registrar pendente; não substituir por mock nem declarar integração externa verificada.
