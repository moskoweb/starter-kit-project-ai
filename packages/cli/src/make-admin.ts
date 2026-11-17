import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

export async function runMakeAdmin(args: string[]) {
  // Do not echo parseArgs errors: an unsupported flag may contain a password.
  let values;
  try {
    ({ values } = parseArgs({ args, options: { email: { type: "string" }, name: { type: "string" } } }));
  } catch {
    throw new Error("Use make:admin --email <email> --name <nome>; senha somente por stdin.");
  }
  if (!values.email?.trim() || !values.name?.trim()) throw new Error("--email e --name obrigatórios; senha somente por stdin.");
  if (process.stdin.isTTY) throw new Error("Envie senha por stdin usando read -rs; nunca por argumentos.");
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn("pnpm", ["--filter", "@vibe/auth", "seed:admin"], {
      shell: false,
      stdio: "inherit",
      env: { ...process.env, ADMIN_EMAIL: values.email, ADMIN_NAME: values.name },
    });
    child.once("error", () => reject(new Error("Não foi possível executar pnpm seed:admin.")));
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`seed:admin encerrado por ${signal}.`));
      else resolve(code ?? 1);
    });
  });
  process.exitCode = code;
}
