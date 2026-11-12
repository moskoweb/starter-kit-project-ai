import Link from "next/link";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@vibe/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";

export default function Forbidden() {
  return <main className="flex min-h-svh items-center justify-center p-6">
    <Empty>
      <EmptyHeader><EmptyMedia variant="icon"><ShieldX /></EmptyMedia><EmptyTitle>Acesso não permitido</EmptyTitle><EmptyDescription>Sua conta não possui permissão para esta operação.</EmptyDescription></EmptyHeader>
      <EmptyContent><Link href="/account" className={buttonVariants({ variant: "outline" })}>Voltar à conta</Link></EmptyContent>
    </Empty>
  </main>;
}
