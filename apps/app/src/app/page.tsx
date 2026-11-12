import { getDb, appSettings } from "@vibe/db";
import { eq } from "drizzle-orm";
import { Badge, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@vibe/auth";
import { landingPath } from "@/components/organization/landing";

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
/** Signed-in users go to their landing panel; visitors keep the public status page. */
async function signedInLanding() {
  try {
    const currentHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: currentHeaders });
    return session?.user.emailVerified ? await landingPath(currentHeaders) : null;
  } catch {
    return null; // DB/auth unavailable: fall back to status page diagnostics.
  }
}

export default async function HomePage() {
  const target = await signedInLanding();
  if (target) redirect(target);
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

  const title = dbStatus === "unreachable" ? "Banco de dados inacessível" : appName ?? "Configuração ausente";
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      {website && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: website }} />}
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>
            {dbStatus === "unreachable" && "Não foi possível conectar ao PostgreSQL. Verifique se o banco de dados está ativo em 127.0.0.1:5432 e se a variável DATABASE_URL está configurada corretamente com a role vibe_starter_app."}
            {dbStatus === "connected" && !appName && "Conexão com PostgreSQL estabelecida, mas a chave de configuração 'app_name' não foi encontrada na tabela app_settings. Execute o comando de semente para inicializar:"}
            {dbStatus === "connected" && appName && "Monorepo Turborepo + Next.js 16 + Drizzle ORM + PostgreSQL 17."}
          </CardDescription>
          <CardAction><Badge variant={dbStatus === "connected" ? "secondary" : "destructive"}>DB: {dbStatus}</Badge></CardAction>
        </CardHeader>
        <CardContent>
          {dbStatus === "connected" && !appName && <pre className="rounded-md bg-muted p-2 font-mono text-sm">pnpm --filter @vibe/db db:seed</pre>}
          {dbStatus === "connected" && appName && <p className="text-sm text-muted-foreground">Dado persistido carregado da tabela app_settings via Server Component (role vibe_starter_app).</p>}
        </CardContent>
        {lastUpdated && <CardFooter className="font-mono text-xs text-muted-foreground">Atualizado: {lastUpdated}</CardFooter>}
      </Card>
    </main>
  );
}
