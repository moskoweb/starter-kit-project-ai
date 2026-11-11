import { headers } from "next/headers";
import { requireSession } from "@vibe/auth";
import { SecurityForm } from "../../components/auth/security-form";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await requireSession(await headers());
  return <main><h1>Segurança</h1><SecurityForm /></main>;
}
