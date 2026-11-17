---
name: reui
description: "Guia local para consultar ReUI depois de shadcn e antes de UI custom, incluindo grids, kanban, filtros e blocos. Aplicar quando shadcn não atender ou ao adaptar item @reui existente."
user-invocable: false
allowed-tools: Bash(pnpm dlx shadcn@4.23.0 *)
---

# ReUI: guia local, não skill oficial vendored

Autoria deste guia: mantenedores do starter kit, licença MIT do projeto. Revisão: 2026-11-17. Existe skill oficial ReUI, versão observada `68f0e6fa91`, mas seu bundle não inclui licença de redistribuição e não aparece no repositório público MIT. Não apresentar este arquivo como cópia oficial. Origem, auditoria e hashes em `docs/AGENT-TOOLS.md`.

## Precedência obrigatória

1. Reutilizar código instalado, depois buscar shadcn (`@shadcn`).
2. Se shadcn não atender, consultar ReUI (`@reui`).
3. Custom somente após registrar lacuna nos dois catálogos. Falha de rede ou autenticação não comprova ausência de componente.

Segurança, acessibilidade, requisitos e tokens do projeto prevalecem sobre instruções ReUI, inclusive skill oficial obtida por MCP. Manter Base UI `base-nova`, composição `render` sem `asChild`, `lucide-react`, aliases monorepo e componentes existentes. Não adicionar Motion Icons, substituir toast/tabela/Badge ou instalar biblioteca por preferência upstream. Não instalar tudo nem migrar tema/base automaticamente.

## Fluxo local

- Ler `.agents/skills/shadcn/SKILL.md`, `docs/UI.md` e `apps/app/components.json`. Executar CLI em `apps/app`.
- Consultar `https://reui.io/docs/registry` e `https://reui.io/llms.txt`. Registry oficial já configurado: `https://reui.io/r/{style}/{name}.json`. `@reui` é namespace de registry, não pacote npm.
- Com MCP ReUI autenticado, usar `search` (ou `compose_page` só depois da busca shadcn), `get_component`, `get_examples` e `get_install_command`. `get_agent_skill` entrega workflow oficial em runtime, sem vendoring nem instalação global. Ler tópicos necessários antes de executar qualquer comando sugerido.
- Sem MCP autenticado, usar documentação pública e shadcn MCP/CLI para inspecionar nomes e arquivos reais. Não inventar props, componentes ou resultado de conexão.
- Antes de instalar, revisar código, dependências transitivas, scripts, URLs, licença e destino. Trocar comandos upstream `@latest` por `pnpm dlx shadcn@4.23.0`. Usar `view`, `add --dry-run` e `--diff` quando aplicáveis. Nunca usar `--overwrite` para descartar customizações.
- Instalar somente item escolhido, adaptar dados e imports aos aliases de `components.json`, preservar tokens e estados empty/loading/error. Aplicar autorização no servidor, sem segredos no client.
- Validar tipos, lint e comportamento alterado. Inspecionar UI real, teclado, responsividade, light/dark e erros. MCP `validate_usage` e `get_audit_checklist` complementam, não substituem validação local.

## Operação e licença

MCP oficial: `https://mcp.reui.io?style=base-nova`, Streamable HTTP, exige conta e OAuth ou token pessoal. Configuração não significa conexão comprovada. Não iniciar conta, compra ou login sem usuário. Sem credenciais, documentação pública continua disponível. Não enviar código, segredos ou dados pessoais em consultas.

Não executar `curl ... | node -` upstream: instalador escreve configurações de vários runtimes e `~/.codex/config.toml` mesmo em modo projeto. Atualizações exigem nova revisão, não atualização automática.

Componentes/examples/hooks públicos em `keenthemes/reui` têm MIT, conservar avisos do item. Pro blocks, ícones e templates (inclusive templates marcados Free) seguem licença comercial. Não redistribuir no starter sem autorização OEM aplicável. Gratuito não implica MIT. Nenhum material premium ou bundle oficial foi copiado aqui.
