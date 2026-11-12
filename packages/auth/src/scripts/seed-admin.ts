import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { and, eq } from "drizzle-orm";
import { getDb, closeDb } from "@vibe/db/client";
import { account, session, user } from "@vibe/db/schema";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

async function readPassword() {
  if (stdin.isTTY) throw new Error("Envie senha por stdin usando read -rs; não use senha em argv ou histórico shell.");
  const lines = createInterface({ input: stdin, crlfDelay: Infinity });
  let password = "";
  for await (const line of lines) { password = line; break; }
  lines.close();
  if (password.length < 12) throw new Error("Senha deve ter pelo menos 12 caracteres.");
  return password;
}

async function main() {
  if (process.argv.length > 2) throw new Error("Use ADMIN_EMAIL e ADMIN_NAME; senha somente por stdin, nunca por argumentos.");
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  if (!email || !name) throw new Error("ADMIN_EMAIL e ADMIN_NAME obrigatórios.");
  // Always take the operator's password: an existing row may be an unverified signup by someone else.
  const passwordHash = await hashPassword(await readPassword());
  await getDb().transaction(async (tx) => {
    const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
    const userId = existing?.id ?? randomUUID();
    if (!existing) await tx.insert(user).values({ id: userId, email, name, emailVerified: true, role: "admin" });
    else {
      await tx.update(user).set({ role: "admin", emailVerified: true, banned: false }).where(eq(user.id, userId));
      // Drop every prior credential and session so only the operator can sign in.
      await tx.delete(session).where(eq(session.userId, userId));
      await tx.delete(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
    }
    await tx.insert(account).values({ id: randomUUID(), userId, accountId: userId, providerId: "credential", password: passwordHash, updatedAt: new Date() });
  });
  stdout.write("Superadmin provisionado explicitamente.\n");
}
try { await main(); }
catch { process.stderr.write("Provisionamento falhou. Confira configuração, email/nome e senha stdin (mínimo 12 caracteres).\n"); process.exitCode = 1; }
finally { await closeDb(); }
