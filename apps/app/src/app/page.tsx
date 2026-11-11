import { getDb, appSettings } from "@vibe/db";
import { eq } from "drizzle-orm";
import { Card, Badge, Heading, Text } from "@vibe/ui";

export const dynamic = "force-dynamic";

function publicWebsite() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    return JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", url: url.origin }).replace(/</g, "\\u003c");
  } catch {
    return null;
  }
}
export default async function HomePage() {
  let dbStatus: "connected" | "unreachable" = "unreachable";
  let appName: string | null = null;
  let lastUpdated: string | null = null;
  const website = publicWebsite();

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "app_name"))
      .limit(1);

    dbStatus = "connected";

    if (rows.length > 0 && rows[0]) {
      appName = rows[0].value;
      lastUpdated = rows[0].updatedAt.toISOString();
    }
  } catch {
    dbStatus = "unreachable";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      {website && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: website }} />}
      <div style={{ width: "100%", maxWidth: "640px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <Badge variant={dbStatus === "connected" ? "success" : "danger"}>
              DB: {dbStatus}
            </Badge>
            {lastUpdated && (
              <Text muted mono style={{ fontSize: "0.75rem", margin: 0 }}>
                Atualizado: {lastUpdated}
              </Text>
            )}
          </div>

          {dbStatus === "unreachable" && (
            <>
              <Heading level={1}>Banco de dados inacessível</Heading>
              <Text muted>
                Não foi possível conectar ao PostgreSQL. Verifique se o banco de dados está ativo em 127.0.0.1:5432 e se a variável DATABASE_URL está configurada corretamente com a role vibe_starter_app.
              </Text>
            </>
          )}

          {dbStatus === "connected" && !appName && (
            <>
              <Heading level={1}>Configuração ausente</Heading>
              <Text muted>
                Conexão com PostgreSQL estabelecida, mas a chave de configuração &apos;app_name&apos; não foi encontrada na tabela app_settings. Execute o comando de semente para inicializar:
              </Text>
              <Text mono style={{ fontSize: "0.875rem", padding: "0.5rem", backgroundColor: "var(--color-bg)", borderRadius: "var(--radius-sm)" }}>
                pnpm --filter @vibe/db db:seed
              </Text>
            </>
          )}

          {dbStatus === "connected" && appName && (
            <>
              <Heading level={1}>{appName}</Heading>
              <Text muted>
                Monorepo Turborepo + Next.js 16 + Drizzle ORM + PostgreSQL 17.
              </Text>
              <div
                style={{
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <Text muted style={{ fontSize: "0.875rem", margin: 0 }}>
                  Dado persistido carregado da tabela app_settings via Server Component (role vibe_starter_app).
                </Text>
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
