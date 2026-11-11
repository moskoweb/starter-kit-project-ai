import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@vibe/db/client";
import { account, user } from "@vibe/db/schema";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

async function main() {
  if (process.argv.length > 2) throw new Error("Use ADMIN_EMAIL e ADMIN_NAME; senha somente por stdin, nunca por argumentos.");
  const email = process.env.ADMIN_EMAIL?.trim();
  const name = process.env.ADMIN_NAME?.trim();
  if (!email || !name) throw new Error("ADMIN_EMAIL e ADMIN_NAME obrigatórios.");
  const [existing] = await getDb().select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase()));
  let id = existing?.id;
  if (!id) {
    if (stdin.isTTY) throw new Error("Envie senha por stdin usando read -rs; não use senha em argv ou histórico shell.");
    const lines = createInterface({ input: stdin, crlfDelay: Infinity });
    let password = "";
    for await (const line of lines) { password = line; break; }
    lines.close();
    if (password.length < 12) throw new Error("Senha deve ter pelo menos 12 caracteres.");
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    await getDb().transaction(async (tx) => {
      await tx.insert(user).values({ id: userId, email: email.toLowerCase(), name, emailVerified: true, role: "admin" });
      await tx.insert(account).values({ id: randomUUID(), userId, accountId: userId, providerId: "credential", password: passwordHash, updatedAt: new Date() });
    });
    id = userId;
  }
  await getDb().update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, id));
  stdout.write("Superadmin provisionado explicitamente.\n");
}
try { await main(); }
catch { process.stderr.write("Provisionamento falhou. Confira configuração, email/nome e senha stdin (mínimo 12 caracteres).\n"); process.exitCode = 1; }
finally { await closeDb(); }
