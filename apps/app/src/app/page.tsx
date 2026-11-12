import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@vibe/auth";
import { landingPath } from "@/components/organization/landing";

export const dynamic = "force-dynamic";

/** `/` has no content: verified users go to their landing panel, everyone else to sign-in. Health lives at `/api/health`. */
export default async function HomePage() {
  const currentHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: currentHeaders });
  redirect(session?.user.emailVerified ? await landingPath(currentHeaders, session.user.role) : "/login");
}
