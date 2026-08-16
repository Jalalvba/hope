"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Makes the light/dark theme available to the whole app.
 *
 * A thin client wrapper so app/layout.tsx can stay a Server Component (it
 * exports `metadata`, which Client Components may not) while next-themes'
 * provider — which needs browser APIs like localStorage and matchMedia — does
 * the actual work. The theme is applied as a `data-theme` attribute, which
 * app/globals.css keys its colour tokens off.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
