"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Fixed corner toggle, present on every route (rendered from layout.tsx) —
// the "global parameter" for light/dark. Cycles light -> dark -> system.
const ORDER = ["light", "dark", "system"] as const;
const ICON: Record<(typeof ORDER)[number], string> = { light: "☀", dark: "☾", system: "◐" };
const LABEL: Record<(typeof ORDER)[number], string> = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // next-themes reads localStorage/matchMedia only on mount; rendering the
  // real icon before that would mismatch server vs client and cause a flash
  // of the wrong glyph, so render nothing until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="fixed top-4 right-4 z-40 w-8 h-8" />;

  const current = (theme as (typeof ORDER)[number] | undefined) ?? "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Theme: ${LABEL[current]} — click for ${LABEL[next]}`}
      aria-label={`Switch theme, currently ${LABEL[current]}`}
      className="fixed top-4 right-4 z-40 w-8 h-8 rounded-full glass-subtle flex items-center justify-center text-sm text-gold-400/70 hover:text-gold-400 hover:bg-gold-400/8 transition-colors"
    >
      {ICON[current]}
    </button>
  );
}
