"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Thin wrapper so app/layout.tsx (a server component, exports metadata) can
// stay a server component while next-themes' provider — which needs client
// APIs (localStorage, matchMedia) — does the actual work.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
