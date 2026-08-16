import { NextRequest, NextResponse } from "next/server";
import { assembleAnalysisPrompt } from "@/lib/ai/analyzePrompt";
import { callGeminiWithTracking } from "@/lib/ai/geminiCostTracker";
import { patternAnalysisSchema } from "@/lib/ai/patternAnalysisSchema";
import { validatePatternAnalysis } from "@/lib/utils/validatePatternAnalysis";

/**
 * Generates an analysis for a pattern that already exists.
 *
 * This route deliberately does NOT save anything. It costs money to call, so
 * the user sees the result and decides — saving happens separately, via
 * PUT /api/patterns/[id]/analysis.
 */

// The analysis prompt is ~30KB and asks for 18 fields including a healingPath
// that copies record text verbatim, so allow generous headroom.
const MAX_OUTPUT_TOKENS = 8192;

/**
 * POST — runs one analysis.
 *
 * @param req - Body shaped `{ patternId, model? }`. `model` lets the client
 * re-run against a more capable tier when a cheaper model's output wasn't good
 * enough; omitted, the server's default model is used.
 * @returns `{ data: { analysis, costInfo } }`. On a model failure the error
 * response still carries `costInfo`, because the call was billed either way.
 */
export async function POST(req: NextRequest) {
  try {
    const { patternId, model } = await req.json();
    if (!patternId) {
      return NextResponse.json({ error: "patternId required" }, { status: 400 });
    }

    // Step 1 — build the prompt: loads the pattern, retrieves matching
    // reference records from MongoDB (the RAG step), and pairs them with the
    // fixed clinical system instruction.
    const assembled = await assembleAnalysisPrompt(patternId);
    if (!assembled.ok) {
      return NextResponse.json({ error: assembled.error }, { status: assembled.status });
    }

    // Step 2 — call Gemini. Every call goes through the tracker, which records
    // the tokens and cost to MongoDB and hands back `costInfo`.
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

    // Step 3 — stamp the provenance server-side. Models invent timestamps
    // rather than reporting the real one, so `analyzedAt` is set here from the
    // actual moment of generation, along with the concrete model that served
    // the call, so the UI can attribute the analysis honestly.
    if (result.result && typeof result.result === "object") {
      const d = result.result as Record<string, unknown>;
      d.analyzedAt = new Date().toISOString();
      // The concrete model the tracker resolved, not the rolling alias.
      d.generatedBy = result.costInfo.model;
    }

    // Step 4 — check the shape before it goes anywhere near the database.
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
