import type { ReactNode } from "react";
import { GalleryVerticalEnd } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibe/ui/components/card";

/** Adapted from shadcn/ui block login-03 (MIT). */
export function AuthLayout({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
    <div className="flex w-full max-w-sm flex-col gap-6">
      <a href="/" className="flex items-center gap-2 self-center font-medium">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><GalleryVerticalEnd className="size-4" /></div>
        {process.env.NEXT_PUBLIC_APP_NAME ?? "Vibe Starter Kit"}
      </a>
      <Card>
        <CardHeader className="text-center"><CardTitle className="text-xl">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer}
    </div>
  </main>;
}
