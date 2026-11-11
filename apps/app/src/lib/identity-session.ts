import "server-only";
import { requireSession } from "@vibe/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export async function pageSession() {
  const currentHeaders = await headers();
  const session = await requireSession(currentHeaders).catch((error: unknown) => {
    if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/login");
    throw error;
  });
  return { session, headers: currentHeaders };
}
