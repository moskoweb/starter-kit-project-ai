import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";
import { buttonVariants } from "@vibe/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@vibe/ui/components/empty";
import { currentLocale } from "../../lib/panels/chrome";

const text = {
  "pt-BR": { title: "Conta suspensa", description: "Sua conta foi suspensa por um administrador. Se acredita que isso é um engano, entre em contato com o suporte.", back: "Voltar ao login" },
  en: { title: "Account suspended", description: "Your account was suspended by an administrator. If you believe this is a mistake, contact support.", back: "Back to sign in" },
};

export async function generateMetadata(): Promise<Metadata> { return { title: text[await currentLocale()].title }; }

export default async function BannedPage() {
  const copy = text[await currentLocale()];
  return <main className="flex min-h-svh items-center justify-center p-6">
    <Empty>
      <EmptyHeader><EmptyMedia variant="icon"><Ban /></EmptyMedia><EmptyTitle>{copy.title}</EmptyTitle><EmptyDescription>{copy.description}</EmptyDescription></EmptyHeader>
      <EmptyContent><Link href="/login" className={buttonVariants({ variant: "outline" })}>{copy.back}</Link></EmptyContent>
    </Empty>
  </main>;
}
