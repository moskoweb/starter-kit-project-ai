import type { ReactNode } from "react";
import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";
import { FieldSeparator } from "@vibe/ui/components/field";
import { GoogleSignIn } from "../account/google-sign-in";

/** Adapted from shadcn/ui block login-03 (MIT). */
export function AuthLayout({ title, description, children, footer, google = false, locale = "pt-BR" }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; /** Show Google sign-in; pass only from server when GOOGLE_ENABLED=true. */ google?: boolean; locale?: "pt-BR" | "en" }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Link href="/" className="flex items-center gap-2 self-center font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><GalleryVerticalEnd className="size-4" /></div>
        {process.env.NEXT_PUBLIC_APP_NAME ?? "Vibe Starter Kit"}
      </Link>
      <Card>
        <CardHeader className="text-center"><CardTitle className="text-xl">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
        <CardContent className="flex flex-col gap-6">
          {google && <><GoogleSignIn locale={locale} /><FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">{locale === "en" ? "Or continue with" : "Ou continue com"}</FieldSeparator></>}
          {children}
        </CardContent>
      </Card>
      {footer}
    </div>
  </main>;
}
