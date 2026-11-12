"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@vibe/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Panel route failed", error); }, [error]);
  const forbidden = error.message === "FORBIDDEN";
  return <main className="flex min-h-svh items-center justify-center p-6">
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><TriangleAlert /></EmptyMedia>
        <EmptyTitle>{forbidden ? "Acesso negado" : "Não foi possível carregar o painel"}</EmptyTitle>
        <EmptyDescription role="alert">{forbidden ? "Sua conta não tem permissão para acessar este conteúdo." : "Ocorreu um erro ao carregar esta página."}{error.digest && <span className="mt-2 block font-mono text-xs">ID: {error.digest}</span>}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent><div className="flex gap-2">{!forbidden && <Button onClick={reset}>Tentar novamente</Button>}<Link href="/account" className={buttonVariants({ variant: "outline" })}>Minha conta</Link></div></EmptyContent>
    </Empty>
  </main>;
}
