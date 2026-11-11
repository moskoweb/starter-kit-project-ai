import Link from "next/link";

export default function Forbidden() {
  return <main className="mx-auto max-w-lg space-y-4 p-8"><h1 className="text-2xl font-semibold">Acesso não permitido</h1><p>Sua conta não possui permissão para esta operação.</p><Link href="/account" className="underline">Voltar à conta</Link></main>;
}
