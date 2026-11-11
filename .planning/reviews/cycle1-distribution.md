# Ciclo 1 — distribuição

## Escopo

Revisão estática de packages/cli, apps/web, Dockerfile, compose.example.yml, .github, scripts/config raiz e documentação. AGENTS lido, não alterado. Nenhum teste, build, install, lint ou serviço executado nesta fatia. Nenhum commit/push.

## Achados corrigidos

- **P1 — segredos DDL no runtime:** Compose carregava `.env` administrativo inteiro em app/worker/relay. Agora usa `.env.app.runtime` e `.env.worker.runtime`; docs proíbem credenciais DDL/provisionamento nesses arquivos. `.env` permanece somente entrada de interpolação. Operador deve criar arquivos runtime com mínimo necessário.
- **P2 — configuração compilada ausente:** imagem app não recebia flags públicas de analytics nem origem pública S3 usada pela CSP. Docker ARG e Compose build args encaminham somente esses valores não secretos; documentação exige rebuild quando mudarem.
- **P2 — cache CSP obsoleto:** Turbo passava `S3_PUBLIC_UPLOAD_ORIGIN` sem incluí-la no hash. Build agora inclui variável em `env`.
- **P2 — jobs opcional exigia credencial antes de perfil:** interpolação obrigatória de worker ocorria mesmo sem perfil jobs. Agora valor ausente fica vazio e validação real de startup rejeita jobs sem configuração. Arquivo runtime worker opcional para não exigir presença no perfil default.
- **P2 — links home fora da validação:** duas homes Astro mantinham fallback localhost:3001, divergindo do módulo validado usado no guia. Ambas importam `appUrl` comum.
- **P2 — símbolo de painel inválido:** ID permitido como `ops-2` produzia identificador TypeScript com hífen. Símbolos recebem prefixo `panel_`, substituindo hífen por `$` sem colidir com underscore permitido.
- **P2 — staging não exclusivo:** nome timestamp/PID podia colidir; catch removia diretório que não havia criado. `mkdtemp` cria staging exclusivo antes do bloco de limpeza.
- **P2 — testes canônicos incompletos:** `pnpm test` não alcançava checks existentes de identidade/config, routing, limiter, resource validation, render email e geração. `test:unit` inclui esses checks, exclui suite DB events; integrações identidade e eventos têm scripts opt-in separados com guard que falha quando não habilitados. CI mantém RLS explícito e recebe novos unit checks pelo script raiz.
- **P3 — artefatos locais no derivado/contexto:** cópia agora exclui `.astro`, lock CLI e `.mcp.json` local. `.astro` ignorado no Git; Docker ignora metadados locais/planejamento.
- **P3 — filtro sitemap incorreto:** regex não excluía `/404`; filtro cobre root e localização.
- **P3 — política scripts nativos implícita:** `onlyBuiltDependencies` autoriza somente esbuild e sharp, necessários a Vite/Astro e otimização Next. Sem aprovação global nem instalação.
- **P3 — documentação histórica:** README e docs CLI/WEB/DEPLOYMENT atualizados com contratos; UI aponta evidências posteriores de LOCAL-VALIDATION sem alegar cobertura visual completa. Avisos de licença raiz e atribuições de terceiros preservados.

## Checks deixados

`packages/cli/src/generation.check.ts` ganhou cenários assert-based para cópia independente sem metadata/MCP/symlink, perfil, rejeição de ancestral symlink, falha de staging e painel com hífen antes de dígito. Não executado aqui.

Owner: executar `pnpm test`, tipos/build, opt-ins reais separados; validar Compose default sem credencial worker e jobs com credencial restrita; validar containers e origens públicas compiladas. Política pnpm alterada sem mudar dependências; lock não editado.

## Limites

Leitura estática não prova CI remoto, containers novos, integrações externas nem cobertura visual. Runtime files são fronteira operacional: não colocar DDL nesses arquivos. Integrações não habilitadas não contam como passadas. Sem mudanças de licença.
