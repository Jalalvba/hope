// ─── Gemini model registry ─────────────────────────────────────────────────────
// Client-safe (no server-only imports). The live source of truth is the
// discovery utility in lib/ai/geminiModelDiscovery.ts (server-only, calls Google's
// /v1beta/models with GEMINI_API_KEY) via GET /api/gemini-models. Everything
// in this file is either (a) pure logic that has to be shared between server
// and client code, or (b) a tiny static fallback list used only for the
// first paint before the live list loads, or if discovery itself fails
// (network down, key misconfigured). Never treat GEMINI_MODELS as the
// authoritative list of what's callable — see lib/ai/geminiModelDiscovery.ts's
// header comment for why the discovery endpoint isn't fully authoritative
// either.

export type ModelTier = "flash-lite" | "flash" | "pro";

export interface GeminiModelOption {
  id: string;
  label: string;
  tier: ModelTier;
  description: string;
  isDefault?: boolean;
}

/**
 * Classifies a Gemini model id into a tier from its name alone (no network).
 * Order matters: "flash-lite" contains "flash", so it must be checked first,
 * or every flash-lite model would be misclassified as "flash".
 */
export function guessTier(id: string): ModelTier {
  const lower = id.toLowerCase();
  if (lower.includes("flash-lite") || lower.includes("flash_lite")) return "flash-lite";
  if (lower.includes("pro")) return "pro";
  return "flash";
}

// Static fallback only — see file header. Verified callable against this
// app's API key as of 2026-08-16; not refreshed automatically, so it will
// drift. That's fine for a fallback; it must never be the primary source.
export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    label: "3.5 Flash-Lite",
    tier: "flash-lite",
    description: "Fastest & cheapest for routine tasks (default)",
    isDefault: true,
  },
  {
    id: "gemini-3.5-flash",
    label: "3.5 Flash",
    tier: "flash",
    description: "Balanced speed and general task capabilities",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "3.1 Pro Preview",
    tier: "pro",
    description: "SOTA reasoning, complex math, and deep logic — escalate here when a Flash model's output isn't good enough",
  },
];

// Rolling aliases — Google resolves these server-side to whatever concrete
// snapshot is currently live for that tier, so they never 404 from a
// retirement. Used as (a) the app's zero-config default and (b) the
// automatic retry target in lib/ai/gemini.ts when a concrete model id 404s.
export const FALLBACK_MODEL_ID = "gemini-flash-lite-latest";

export function rollingAliasFor(tier: ModelTier): string {
  return `gemini-${tier}-latest`;
}

export const DEFAULT_MODEL_ID: string =
  GEMINI_MODELS.find((m) => m.isDefault)?.id ?? "gemini-3.5-flash-lite";

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"] | typeof FALLBACK_MODEL_ID;

/**
 * The next more-capable model after `currentId` within `models` (defaults to
 * the static fallback list — pass the live discovered list when you have
 * one). Models are assumed ordered cheapest/fastest to most capable, so this
 * is just the next entry. Returns null if `currentId` is already the most
 * capable, or unrecognized. Used to auto-suggest an escalation after a call
 * fails or produces an unusable result, without the caller having to know
 * the tier ordering.
 */
export function nextCapableModel(
  currentId: string,
  models: GeminiModelOption[] = GEMINI_MODELS
): GeminiModelOption | null {
  const i = models.findIndex((m) => m.id === currentId);
  if (i === -1) return null;
  return models[i + 1] ?? null;
}
