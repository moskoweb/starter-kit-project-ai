# Storage S3 compatível

`@vibe/storage` é exclusivo de servidor (`server-only`), opcional e sem tabelas/rotas próprias. Não realiza autenticação nem inventa autorização. Importar pacote não lê ambiente nem conecta ao provedor. Operações desabilitadas falham explicitamente, sem exigir credenciais.

## Configuração

```dotenv
STORAGE_ENABLED=false
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

Somente quando uma operação é chamada com `STORAGE_ENABLED=true`, todos os campos S3 são exigidos. Endpoint exige HTTPS; HTTP somente em loopback para desenvolvimento. Não colocar credenciais no endpoint, cliente ou logs. Cliente usa path-style, uma tentativa, conexão de 3 segundos e requisição de 10 segundos; HEAD/DELETE também recebem abort de 10 segundos. Chaves estáticas evitam discovery automático de credenciais ou metadata de infraestrutura. Provedor precisa suportar SigV4, POST policy e `content-length-range`; compatibilidade S3 nominal não basta.

Não há ACL pública nem parâmetro ACL. Configure bucket privado, bloqueio de acesso público, IAM mínimo para bucket de aplicação e CORS restrito à origem do app, POST/GET e headers necessários. Endpoints e credenciais são configuração de operador confiável, nunca parâmetros de requisição.

## Contrato do servidor

```ts
import { createUploadUrl, createDownloadUrl, headObject, deleteObject } from "@vibe/storage";

// Após sessão e policy da operação no servidor:
const context = { namespace: "org", id: authorizedOrganization.id } as const;
const upload = await createUploadUrl(context, { contentType: "image/png", size: 2048 });
// Persistir upload.object em registro pending com proprietário, escopo e identidade do solicitante.
// Retornar ao cliente somente campos necessários ao upload.
```

`AuthorizedStorageContext = { namespace: "org" | "user"; id: string }`. Nome de tipo explicita obrigação do caller, não representa prova criptográfica de autorização. IDs admitem somente letras ASCII, números, `_` e `-`, até 128 caracteres. Nunca construir contexto copiando organização/usuário enviado pelo cliente. Resolver sessão, organização e membership, propriedade e policy de operação no servidor. Superadmin não possui bypass implícito.

- `createUploadUrl(context, { contentType, size })` gera key no servidor: `org/<id>/<uuid-v4>` ou `user/<id>/<uuid-v4>`. Cliente não escolhe key, prefixo, bucket, ACL ou expiração. Retorna `{ url, fields, method: "POST", expiresAt, object }`. `object` contém `key`, `bucket`, `namespace`, `namespaceId`, `contentType`, `size`: metadados declarados para persistência futura, não arquivo validado. Criação não confirma upload.
- Cliente envia `FormData`: todos os pares de `fields` sem modificações e arquivo no campo `file`, por último. Não usar PUT nem definir manualmente Content-Type do request multipart. Policy fixa key, MIME declarado e tamanho exato solicitado via `content-length-range`, sempre entre 1 byte e 10 MiB. URLs e formulários expiram em 60 segundos.
- `headObject(context, { key })` retorna `{ key, size, contentType, etag }`. Caller deve carregar registro pending pelo ID público com consulta escopada, verificar ownership e policy de conclusão, consultar HEAD, comparar tamanho/tipo com metadados persistidos e somente então marcar complete. Divergência deve impedir conclusão e disparar limpeza controlada.
- `createDownloadUrl(context, { key })` retorna `{ url, expiresAt }`, GET assinado de 60 segundos com `attachment` e `private, no-store`. **Antes da chamada, caller deve buscar registro complete no banco dentro do escopo autorizado e aplicar policy específica de leitura.** Não aceitar key enviada pelo cliente como substituto do lookup. Prefixo correto não prova autorização de arquivo dentro da mesma organização.
- `deleteObject(context, { key })` exige mesmo lookup escopado e policy específica de exclusão. Exclusão S3 e atualização DB não são transação atômica; caller trata estado e reconciliação sem apagar metadados antes de confirmar operação.

Download, HEAD e DELETE aceitam somente formato exato de key gerado dentro do contexto recebido. Rejeitam traversal, escapes percentuais, barras extras, outros usuários e outras organizações. Bucket sempre vem da configuração atual, não de dados enviados pelo cliente. Registro deve guardar bucket para auditoria; mudança de bucket exige migração explícita.

## Limites e operação

Allowlist: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `text/plain`. MIME é declaração, não inspeção dos bytes. HEAD também não detecta arquivo malicioso. Projeto deve decidir scanner/quarentena, validação de conteúdo, cotas, rate limiting e política de retenção antes de expor arquivos não confiáveis. Não servir conteúdo ativo no domínio autenticado.

URLs são bearer tokens: não registrar, armazenar em analytics ou compartilhar; cache de autorização não deve prolongar validade. Formulário pode ser reutilizado durante TTL e sobrescrever mesma key: estado complete sozinho não torna bytes imutáveis. Para requisitos de imutabilidade, usar versionamento e fixar versão validada ou promover objeto de área temporária com política própria; este pacote não promete essa garantia. Limpar objetos pending abandonados via lifecycle/rotina autorizada.

## Evidência e verificação pendente

Dependências AWS fixadas em `3.1166.0`, consultadas no registro npm, sem instalação nesta alteração. Fontes: [presigner GET](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-request-presigner), [POST assinado](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-presigned-post), [POST policy S3](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html).

Teste puro disponível: `pnpm --filter @vibe/storage test` (validação de tamanho, MIME, contexto, traversal e configuração condicional; sem mock SDK). Não executado nesta alteração. Tipos, integração real com provedor, aplicação de policy POST, CORS, upload/download/exclusão e isolamento via rotas/DB permanecem para validação final. Não há alegação de integração real verificada.
