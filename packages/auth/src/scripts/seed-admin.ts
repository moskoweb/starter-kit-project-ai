import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { getDb, closeDb, type Database } from "@vibe/db/client";
import { account, user } from "@vibe/db/schema";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

export function validateAdminInput(emailInput: string | undefined, nameInput: string | undefined, password: string) {
  const email = emailInput?.trim().toLowerCase();
  const name = nameInput?.trim();
  if (!email || email.length > 254 || /\p{Cc}/u.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido.");
  if (!name || name.length > 200 || /\p{Cc}/u.test(name)) throw new Error("Nome inválido (1 a 200 caracteres, sem controles).");
  if (password.length < 12 || password.length > 128 || /\p{Cc}/u.test(password) || !password.trim()) throw new Error("Senha inválida (12 a 128 caracteres, sem controles).");
  return { email, name, password };
}

async function readPassword() {
  if (stdin.isTTY) throw new Error("Envie senha por stdin usando read -rs; não use senha em argv ou histórico shell.");
  const lines = createInterface({ input: stdin, crlfDelay: Infinity });
  let password = "";
  for await (const line of lines) { password = line; break; }
  lines.close();
  return password;
}

export async function provisionAdmin(input: ReturnType<typeof validateAdminInput>, db: Database) {
  const { email, name, password } = validateAdminInput(input.email, input.name, input.password);
  await db.transaction(async (tx) => {
    // Case-insensitive refusal also covers pre-existing mixed-case identities.
    const [existing] = await tx.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${email}`);
    if (existing) throw new Error("Email já existe. Nenhuma conta foi alterada ou promovida.");
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    await tx.insert(user).values({ id: userId, email, name, emailVerified: true, role: "admin" });
    await tx.insert(account).values({ id: randomUUID(), userId, accountId: userId, providerId: "credential", password: passwordHash, updatedAt: new Date() });
  });
}

async function main() {
  if (process.argv.length > 2) throw new Error("Use ADMIN_EMAIL e ADMIN_NAME; senha somente por stdin, nunca por argumentos.");
  const input = validateAdminInput(process.env.ADMIN_EMAIL, process.env.ADMIN_NAME, await readPassword());
  await provisionAdmin(input, getDb());
  stdout.write("Superadmin provisionado explicitamente.\n");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    const message = error instanceof Error && /^(Email |Nome |Senha |Use ADMIN_|Envie senha )/.test(error.message) ? error.message : "Confira configuração e permissões do banco.";
    process.stderr.write(`Provisionamento falhou. ${message}\n`);
    process.exitCode = 1;
  }
  finally { await closeDb(); }
}
