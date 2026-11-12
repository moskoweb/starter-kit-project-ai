import Link from "next/link";
import { Button } from "@vibe/ui/components/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@vibe/ui/components/card";

export default function Forbidden() {
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
    <Card>
      <CardHeader>
        <CardTitle><h1>Acesso não permitido</h1></CardTitle>
        <CardDescription>Sua conta não possui permissão para esta operação.</CardDescription>
      </CardHeader>
      <CardFooter><Button asChild variant="outline"><Link href="/account">Voltar à conta</Link></Button></CardFooter>
    </Card>
  </main>;
}
