"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@vibe/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Panel route failed", error); }, [error]);
  const forbidden = error.message === "FORBIDDEN";
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <Card>
      <CardHeader>
        <CardTitle><h1>{forbidden ? "Acesso negado" : "Não foi possível carregar o painel"}</h1></CardTitle>
      </CardHeader>
      <CardContent><p role="alert" className="text-sm text-destructive">{forbidden ? "Sua conta não tem permissão para acessar este conteúdo." : "Ocorreu um erro ao carregar esta página."}</p></CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {!forbidden && <Button type="button" onClick={reset}>Tentar novamente</Button>}
        <Button asChild variant="outline"><Link href="/login">Ir para entrada</Link></Button>
      </CardFooter>
    </Card>
  </main>;
}
