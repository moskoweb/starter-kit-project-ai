"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PanelError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Panel route failed", error); }, [error]);
  const forbidden = error.message === "FORBIDDEN";
  return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">{forbidden ? "Acesso negado" : "Não foi possível carregar o painel"}</h1><p>{forbidden ? "Sua conta não tem permissão para acessar este conteúdo." : "Ocorreu um erro ao carregar esta página."}</p><Link className="underline" href="/login">Ir para entrada</Link></main>;
}
