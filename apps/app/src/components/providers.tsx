"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@vibe/ui/components/sonner";
import { TooltipProvider } from "@vibe/ui/components/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>{children}</TooltipProvider>
    <Toaster position="top-right" richColors closeButton />
  </ThemeProvider>;
}
