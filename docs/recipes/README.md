# Receitas de extensão

Guias de implementação para capacidades que o kit **não entrega como código**, porque nem todo projeto precisa delas. Cada receita descreve o desenho, o modelo de dados, as regras de segurança e as armadilhas já encontradas em produtos reais, para que o projeto derivado não comece do zero.

Receitas são **recomendação e orientação**, não contrato nem código pronto. Nada aqui está implementado, testado ou instalado no kit. Os esboços de código e de tabelas são ilustrativos: adapte à stack do kit (Drizzle, Better Auth, RLS, `withTenantScope`, pg-boss, `defineResource`) e valide no seu ambiente.

As receitas nasceram da experiência com um produto multi-tenant mais antigo e consolidado (painel de atendimento com agentes de IA). Elas registram o que funcionou, o que gerou retrabalho e o que o kit deve evitar repetir.

## Quando usar

1. Confirme que o produto precisa da capacidade. Se não precisa, não adicione. Integração desabilitada nunca pode exigir credenciais nem bloquear o startup.
2. Leia a receita inteira e a seção de armadilhas antes de escrever código.
3. Planeje em `.planning/` do projeto derivado. Cada receita vira uma fase ou um conjunto de tarefas com o checklist de aceite da própria receita.
4. Prefira o gerador da CLI (`pnpm vibe model` e `resource`, ver `docs/CLI.md`) para o CRUD de tabelas de tenant. O `model` aceita string, text, integer, boolean, timestamp e uuid e exige `ownerUserId` e `organizationId`. O `resource` não aceita timestamp. Para arrays, enums, JSON, vetores e tabelas de plataforma, escreva o schema Drizzle e as políticas RLS à mão, seguindo `packages/db/src/ai-schema.ts`.

## Índice

| Receita | Resolve | Depende de |
| --- | --- | --- |
| [AI-PROVIDERS](AI-PROVIDERS.md) | Conector de provedores de IA com chave por tenant, pool da plataforma, fallback e capacidades (texto, visão, embeddings, transcrição) | [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md), `@vibe/ai` |
| [AI-CONVERSATIONS-AND-QUOTA](AI-CONVERSATIONS-AND-QUOTA.md) | Conversas e mensagens persistidas, runs, conciliação durável de quota | `@vibe/ai`, `@vibe/jobs` |
| [AI-TOOLS-AND-AGENTS](AI-TOOLS-AND-AGENTS.md) | Registry de tools, aprovação humana, agentes configuráveis, memória, kill switch | AI-CONVERSATIONS-AND-QUOTA |
| [KNOWLEDGE-BASE-RAG](KNOWLEDGE-BASE-RAG.md) | CRUD de base de conhecimento com versões, indexação, busca híbrida (pgvector + FTS) | AI-PROVIDERS, `@vibe/jobs` |
| [MCP](MCP.md) | Servidor MCP do produto e cliente MCP para agentes, com CRUD de servidores | PUBLIC-API-KEYS, SECRETS-AND-OUTBOUND |
| [PUBLIC-API-KEYS](PUBLIC-API-KEYS.md) | API pública `/api/v1`, chaves com escopos, idempotência, OpenAPI | `@vibe/webhooks` (opcional) |
| [REALTIME-SSE](REALTIME-SSE.md) | Eventos em tempo real no navegador sem Redis (LISTEN/NOTIFY + SSE) | `@vibe/events` |
| [AUDIT-LOG](AUDIT-LOG.md) | Trilha de auditoria append-only, por tenant e da plataforma | RLS do kit |
| [SECRETS-AND-OUTBOUND](SECRETS-AND-OUTBOUND.md) | Cifra de segredos por tenant, guarda de URL de saída (SSRF), scrub de PII, hook anti-segredo | nenhuma |
| [LESSONS-LEARNED](LESSONS-LEARNED.md) | Aprendizados de processo e engenharia para agentes e equipe | nenhuma |

Ordem sugerida quando o produto usa IA a fundo: SECRETS-AND-OUTBOUND, AUDIT-LOG, AI-PROVIDERS, AI-CONVERSATIONS-AND-QUOTA, AI-TOOLS-AND-AGENTS, KNOWLEDGE-BASE-RAG, PUBLIC-API-KEYS, MCP, REALTIME-SSE.

## Regras comuns a todas as receitas

- Autorização no servidor em cada operação. Entrada do cliente, IDs gerados por modelo e argumentos de tool são não confiáveis. UUID não é autorização.
- Todo dado de tenant tem RLS. Superadmin global não implica acesso aos dados dos tenants. Dados da plataforma ficam em tabelas próprias, com grants próprios.
- Funcionalidade nova entra desligada por flag, com variáveis em `.env.example` e leitura validada em `@vibe/config`. Habilitada e inválida falha de forma clara.
- Preferir pg-boss e Postgres a novas infraestruturas (Redis, brokers). Só adicione infraestrutura com requisito que o Postgres não atende.
- Texto de modelo, conteúdo de KB, mensagens de usuário e respostas de tools são não confiáveis. Nunca concedem privilégio.
- Logs com IDs e metadados, nunca com prompts, mensagens, argumentos de tools ou segredos.
- Cada receita termina com checklist de aceite. Feature externa exige teste com integração real. Mock não vale como prova.
- Atualize `docs/`, `.env.example`, `AGENTS.md` do projeto e geradores da CLI quando a implementação alterar um contrato.
