// ─── Live Gemini model discovery ───────────────────────────────────────────────
// Server-only (reads GEMINI_API_KEY). Queries Google's /v1beta/models so the
// app never has to hardcode a model id that Google might retire later.
//
// ⚠️  IMPORTANT CAVEAT, discovered while building this (2026-08-16): being
// listed here does NOT guarantee a model is actually callable on this key.
// gemini-2.5-flash and gemini-2.5-flash-lite both appear in this endpoint's
// response, but both 404 upstream on generateContent with "This model ... is
// no longer available to new users." Google's model catalog and this key's
// per-model entitlements are two different things that can disagree. So:
// discovery narrows the field and keeps the list fresh, but it is NOT a
// substitute for the runtime 404 fallback in lib/gemini.ts, which is what
// actually guarantees a call never hard-fails just because a snapshot was
// retired. Treat discovery as "probably callable," not "definitely callable."

import { guessTier, rollingAliasFor, type ModelTier, type GeminiModelOption } from "@/lib/geminiModels";

const MODELS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Cache the upstream list for a day — it changes on Google's release
// schedule (weeks), not per-request, and this endpoint is hit on every page
// load of the model picker.
const REVALIDATE_SECONDS = 86400;

interface GeminiApiRawModel {
  name: string; // "models/gemini-3.5-flash-lite"
  version?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

// Substrings that mark a model as NOT a general-purpose text/chat model:
// image generation, TTS, robotics, embeddings, realtime/live, computer-use
// agents, omni (multi-modal I/O beyond text), and tool-specific variants.
// "banana"/"audio" are defensive — not currently needed (image-generation
// models already get caught by "image" in their id) but cheap to keep in
// case Google ships an id that doesn't follow that convention.
// Matched against the bare id (no "models/" prefix), case-insensitive.
const SPECIALIZED_MARKERS = [
  "image", "banana", "tts", "audio", "robotics", "embedding", "realtime",
  "live", "computer-use", "omni", "customtools", "aqa", "learnlm", "veo", "imagen",
];

function isSpecialized(id: string): boolean {
  const lower = id.toLowerCase();
  return SPECIALIZED_MARKERS.some((marker) => lower.includes(marker));
}

// Superseded major generations — excluded even though they'd otherwise pass
// every other filter, so a stale key entitlement doesn't resurrect a 1.5/2.0
// snapshot into the picker once 3.x is the active line.
const LEGACY_GENERATIONS = ["gemini-1.5", "gemini-2.0"];

function isLegacy(id: string): boolean {
  return LEGACY_GENERATIONS.some((gen) => id.startsWith(gen));
}

// Rolling aliases (gemini-flash-latest, gemini-pro-latest, ...) don't carry a
// version number in their id and aren't a concrete snapshot — they're
// excluded from the discovered list itself (they're used separately, as the
// fallback target), which is what this null return signals.
function parseVersion(id: string): [number, number] | null {
  const match = id.match(/(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0)];
}

/**
 * Orders candidates for the same tier newest-first: higher version wins;
 * within the same version, a GA snapshot beats a "-preview" one; within that,
 * the shorter id wins (fewer qualifiers usually means the primary snapshot,
 * e.g. "gemini-3.1-flash-lite" over "gemini-3.1-flash-lite-preview").
 */
function compareNewestFirst(a: GeminiModelOption, b: GeminiModelOption): number {
  const [aMaj, aMin] = parseVersion(a.id) ?? [0, 0];
  const [bMaj, bMin] = parseVersion(b.id) ?? [0, 0];
  if (aMaj !== bMaj) return bMaj - aMaj;
  if (aMin !== bMin) return bMin - aMin;
  const aPreview = a.id.includes("preview");
  const bPreview = b.id.includes("preview");
  if (aPreview !== bPreview) return aPreview ? 1 : -1;
  return a.id.length - b.id.length;
}

function toModelOption(raw: GeminiApiRawModel): GeminiModelOption | null {
  const id = raw.name.replace(/^models\//, "");
  // The endpoint also lists other model families under the same account
  // (Gemma, Lyria, deep-research/antigravity agents, ...) — this app only
  // wants the gemini-* chat/text family.
  if (!id.startsWith("gemini-")) return null;
  if (parseVersion(id) === null) return null; // rolling alias, not a concrete snapshot
  if (isSpecialized(id)) return null;
  if (isLegacy(id)) return null;

  return {
    id,
    label: (raw.displayName ?? id).replace(/^Gemini\s+/i, ""),
    tier: guessTier(id),
    description: raw.description ?? "",
  };
}

const TIER_ORDER: ModelTier[] = ["flash-lite", "flash", "pro"];

/**
 * Fetches and returns every currently-listed, general-purpose Gemini model,
 * grouped by tier (flash-lite, then flash, then pro) and newest-first within
 * each tier. Throws on network failure or a missing/invalid API key — callers
 * decide the fallback (the API route falls back to the static list in
 * lib/geminiModels.ts; server-side callers fall back to a rolling alias).
 */
export async function fetchActiveGeminiModels(): Promise<GeminiModelOption[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(MODELS_ENDPOINT, {
    headers: { "x-goog-api-key": apiKey },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    throw new Error(`Model discovery HTTP ${res.status}`);
  }

  const body = (await res.json()) as { models?: GeminiApiRawModel[] };
  const raw = body.models ?? [];

  const options = raw
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map(toModelOption)
    .filter((m): m is GeminiModelOption => m !== null);

  const byTier = new Map<ModelTier, GeminiModelOption[]>();
  for (const tier of TIER_ORDER) byTier.set(tier, []);
  for (const model of options) byTier.get(model.tier)?.push(model);

  const result: GeminiModelOption[] = [];
  for (const tier of TIER_ORDER) {
    const group = (byTier.get(tier) ?? []).sort(compareNewestFirst);
    result.push(...group);
  }

  if (result.length > 0) {
    const firstFlashLite = result.find((m) => m.tier === "flash-lite");
    if (firstFlashLite) firstFlashLite.isDefault = true;
  }

  return result;
}

/**
 * The newest discovered model for `tier`, or that tier's rolling alias if
 * discovery fails or turns up nothing for that tier. Server-side callers that
 * need a single model id (not the full list) should use this — e.g. to
 * resolve "no model specified" without hardcoding an id.
 */
export async function getActiveGeminiModel(tier: ModelTier = "flash-lite"): Promise<string> {
  try {
    const models = await fetchActiveGeminiModels();
    const match = models.find((m) => m.tier === tier);
    return match?.id ?? rollingAliasFor(tier);
  } catch (err) {
    console.warn("[getDynamicModel] discovery failed, using rolling alias:", err instanceof Error ? err.message : err);
    return rollingAliasFor(tier);
  }
}
