import { NextRequest, NextResponse } from "next/server";
import { assembleCreateFromDescriptionPrompt } from "@/lib/analyzePrompt";
import { callGeminiWithTracking } from "@/lib/gemini-cost-tracker";
import { createPatternWithAnalysisSchema } from "@/lib/patternAnalysisSchema";
import { validateNewPatternFields, validatePatternAnalysis } from "@/lib/validatePatternAnalysis";

// ─── Route handler ────────────────────────────────────────────────────────────
// Given a narrative description, sends the extract+analyze prompt to Gemini in
// JSON mode, validates both halves of the response, and returns them. Uses the
// same detailed clinical architecture and RAG pipeline as
// POST /api/patterns/analyze/generate (lib/analyzePrompt.ts) — there is only
// one analysis depth in this app, not a separate shallow one for new patterns.
//
// Deliberately does NOT persist. The client renders the draft for review and
// saves it via POST /api/patterns/create-from-paste.

// Same headroom as analyze/generate: this now asks for the full 18-field
// detailed analysis, not just a handful of summary fields.
const MAX_OUTPUT_TOKENS = 8192;

export async function POST(req: NextRequest) {
  try {
    const { description, model } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    const assembled = await assembleCreateFromDescriptionPrompt(description.trim());

    const result = await callGeminiWithTracking("create-from-description", {
      prompt: assembled.prompt,
      systemInstruction: assembled.systemInstruction,
      responseSchema: createPatternWithAnalysisSchema,
      model: typeof model === "string" && model ? model : undefined,
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const raw = result.result as { pattern?: unknown; analysis?: unknown } | null;

    // The model routinely invents analyzedAt rather than reporting the real
    // time, so stamp it server-side from the actual generation, matching the
    // analyze/generate route's convention.
    if (raw?.analysis && typeof raw.analysis === "object") {
      (raw.analysis as Record<string, unknown>).analyzedAt = new Date().toISOString();
    }

    const patternResult = validateNewPatternFields(raw?.pattern);
    if (!patternResult.valid) {
      console.error("[create-from-description/generate] pattern mismatch:", patternResult.error);
      return NextResponse.json(
        { error: `AI returned pattern fields that didn't match the expected shape: ${patternResult.error}`, costInfo: result.costInfo },
        { status: 502 }
      );
    }

    const analysisResult = validatePatternAnalysis(raw?.analysis);
    if (!analysisResult.valid) {
      console.error("[create-from-description/generate] analysis mismatch:", analysisResult.error);
      return NextResponse.json(
        { error: `AI returned an analysis that didn't match the expected shape: ${analysisResult.error}`, costInfo: result.costInfo },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: { pattern: patternResult.data, analysis: analysisResult.data, costInfo: result.costInfo },
    });

  } catch (err) {
    console.error("[create-from-description/generate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
