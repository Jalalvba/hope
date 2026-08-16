import { NextResponse } from "next/server";
import { fetchActiveGeminiModels } from "@/lib/getDynamicModel";
import { GEMINI_MODELS } from "@/lib/geminiModels";

// GET: live, tiered list of Gemini models this key can plausibly call, for
// the model picker in AnalysisSection / NewPatternButton. Falls back to the
// small static list in lib/geminiModels.ts if discovery fails (network, key
// missing) — the picker should never render empty.
export async function GET() {
  try {
    const models = await fetchActiveGeminiModels();
    if (models.length === 0) {
      return NextResponse.json({ data: { models: GEMINI_MODELS, source: "fallback" } });
    }
    return NextResponse.json({ data: { models, source: "live" } });
  } catch (err) {
    console.warn("[gemini-models] discovery failed, serving static fallback:", err instanceof Error ? err.message : err);
    return NextResponse.json({ data: { models: GEMINI_MODELS, source: "fallback" } });
  }
}
