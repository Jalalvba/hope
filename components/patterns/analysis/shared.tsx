"use client";

/**
 * Small pieces shared by the analysis views: the colour maps that keep a given
 * schema or mode looking the same everywhere, and two formatting helpers.
 */

/** Text colour per schema name, so the same schema always looks the same. */
export const SCHEMA_TEXT_COLOR: Record<string, string> = {
  Failure: "text-gold-400",
  "Unrelenting Standards": "text-mist-400",
  Subjugation: "text-gold-400",
};
export const RESPONSE_MODE_TEXT_COLOR: Record<string, string> = {
  Surrender: "text-sage-400",
  Escape: "text-mist-400",
  Counterattack: "text-rust-400",
  Regulation: "text-sage-400",
};
export const SYSTEM_CHIP_COLOR: Record<string, string> = {
  threat: "bg-rust-400/10 text-rust-400",
  drive: "bg-gold-400/10 text-gold-400",
  soothing: "bg-sage-400/10 text-sage-400",
};

/** Formats a date the way it is displayed throughout the app. */
export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Works out the heading for the analysis panel.
 *
 * The live path always stamps the exact model id server-side. Older analyses
 * saved before `generatedBy` existed have no provenance, so they get a neutral
 * label rather than a guessed one.
 *
 * @param generatedBy - The model id that produced the analysis, if known.
 * @returns A heading such as "Gemini Analysis", or plain "Analysis".
 */
export function sourceLabel(generatedBy?: string): string {
  if (!generatedBy) return "Analysis";
  const modelId = generatedBy.toLowerCase();
  if (modelId.includes("gemini")) return "Gemini Analysis";
  if (modelId.includes("claude")) return "Claude Analysis";
  return "Analysis";
}

/** A small uppercase caption above a block of analysis text. */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-1.5">
      {children}
    </p>
  );
}
