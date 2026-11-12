import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@vibe/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";

export default function NotFound() {
  return <main className="flex min-h-svh items-center justify-center p-6">
    <Empty>
      <EmptyHeader><EmptyMedia variant="icon"><FileQuestion /></EmptyMedia><EmptyTitle>Página não encontrada</EmptyTitle><EmptyDescription>O endereço não existe ou você não tem acesso a ele.</EmptyDescription></EmptyHeader>
      <EmptyContent><Link href="/" className={buttonVariants({ variant: "outline" })}>Ir para o início</Link></EmptyContent>
    </Empty>
  </main>;
}
