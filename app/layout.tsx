import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Psyche Log",
  description: "Personal psychological pattern journal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="relative z-10">
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
