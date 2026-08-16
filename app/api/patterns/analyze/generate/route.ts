import { NextRequest, NextResponse } from "next/server";
import { assembleAnalysisPrompt } from "@/lib/analyzePrompt";
import { callGeminiWithTracking } from "@/lib/gemini-cost-tracker";
import { patternAnalysisSchema } from "@/lib/patternAnalysisSchema";
import { validatePatternAnalysis } from "@/lib/validatePatternAnalysis";

// ─── Route handler ────────────────────────────────────────────────────────────
// Sole analysis path: assembles the clinical prompt, sends it to Gemini in
// JSON mode, validates the result against the PatternAnalysis shape, and
// returns it. `model` lets the client re-run against a more capable tier
// (see lib/geminiModels.ts) when a cheaper model's output isn't good enough —
// that's the escalation path now, replacing the old manual copy/paste flow.
//
// Deliberately does NOT persist. The client renders the returned analysis for
// review and saves it via PUT /api/patterns/[id]/analysis.

// The analysis prompt is ~30KB and asks for 18 fields including a healingPath
// that copies record text verbatim, so allow generous headroom.
const MAX_OUTPUT_TOKENS = 8192;

export async function POST(req: NextRequest) {
  try {
    const { patternId, model } = await req.json();
    if (!patternId) {
      return NextResponse.json({ error: "patternId required" }, { status: 400 });
    }

    const assembled = await assembleAnalysisPrompt(patternId);
    if (!assembled.ok) {
      return NextResponse.json({ error: assembled.error }, { status: assembled.status });
    }

    const result = await callGeminiWithTracking("analyze", {
      prompt: assembled.prompt,
      systemInstruction: assembled.systemInstruction,
      responseSchema: patternAnalysisSchema,
      model: typeof model === "string" && model ? model : undefined,
      // Low temperature: this is structured clinical extraction, not creative
      // writing, and healingPath fields must be copied from the RAG records.
      temperature: 0.2,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // The model routinely invents analyzedAt rather than reporting the real
    // time, so stamp it server-side from the actual generation — along with
    // which model produced it, so the UI can attribute it honestly.
    if (result.result && typeof result.result === "object") {
      const d = result.result as Record<string, unknown>;
      d.analyzedAt = new Date().toISOString();
      // The concrete model the tracker resolved, not the rolling alias.
      d.generatedBy = result.costInfo.model;
    }

    const validated = validatePatternAnalysis(result.result);
    if (!validated.valid) {
      console.error("[analyze/generate] schema mismatch:", validated.error);
      // The call still consumed quota / credit even though the output was
      // unusable, so report its cost rather than hiding it behind the error.
      return NextResponse.json(
        {
          error: `AI returned an analysis that didn't match the expected shape: ${validated.error}`,
          costInfo: result.costInfo,
        },
        { status: 502 }
      );
    }

    // costInfo rides along with the result in the same response, so the UI can
    // show what this action cost without a second request.
    return NextResponse.json({
      data: { analysis: validated.data, costInfo: result.costInfo },
    });

  } catch (err) {
    console.error("[analyze/generate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
