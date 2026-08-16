import { NextRequest, NextResponse } from "next/server";
import { assembleCreateFromDescriptionPrompt } from "@/lib/ai/analyzePrompt";
import { callGeminiWithTracking } from "@/lib/ai/geminiCostTracker";
import { createPatternWithAnalysisSchema } from "@/lib/ai/patternAnalysisSchema";
import { validateNewPatternFields, validatePatternAnalysis } from "@/lib/utils/validatePatternAnalysis";

/**
 * Turns a narrative description into a brand-new pattern AND its analysis, in
 * a single Gemini call.
 *
 * Uses the same clinical architecture and RAG pipeline as
 * POST /api/patterns/analyze/generate — there is only one analysis depth in
 * this app, not a shallower one for new patterns.
 *
 * Like that route, this saves nothing: the client shows the draft for review
 * and saves it via POST /api/patterns/create-from-paste.
 */

// Same headroom as analyze/generate: this now asks for the full 18-field
// detailed analysis, not just a handful of summary fields.
const MAX_OUTPUT_TOKENS = 8192;

/**
 * POST — generates one `{ pattern, analysis }` draft.
 *
 * @param req - Body shaped `{ description, model? }`.
 * @returns `{ data: { pattern, analysis, costInfo } }`. Errors still carry
 * `costInfo` when the call was billed before the failure.
 */
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

    // As in analyze/generate: the timestamp is stamped server-side, because
    // models invent them rather than reporting the real moment.
    if (raw?.analysis && typeof raw.analysis === "object") {
      (raw.analysis as Record<string, unknown>).analyzedAt = new Date().toISOString();
    }

    // Both halves are validated separately so a failure says which one was
    // malformed, rather than rejecting the whole draft anonymously.
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
