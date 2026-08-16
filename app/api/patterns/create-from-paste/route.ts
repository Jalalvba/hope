/**
 * Creates a new pattern from a reviewed `{ pattern, analysis }` draft.
 *
 * This is the save step of the "describe a situation" flow: POST
 * /api/patterns/create-from-description/generate produces the draft, the user
 * reads it in `NewPatternButton`, and confirming posts it here. The pattern's
 * id is assigned by the server, not the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { insertPatternWithAnalysis } from "@/lib/db/patterns";
import { validateNewPatternFields, validatePatternAnalysis } from "@/lib/utils/validatePatternAnalysis";

/**
 * POST — validates both halves of the draft, then inserts it.
 *
 * @param req - Body shaped `{ pattern, analysis }`.
 * @returns `{ data: Pattern }` with status 201, including the assigned id.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Both halves are model output, so each is checked separately — this
    // reports which half was wrong instead of one vague failure.
    const patternValidation = validateNewPatternFields(body.pattern);
    if (!patternValidation.valid) {
      return NextResponse.json({ error: patternValidation.error }, { status: 400 });
    }
    const analysisValidation = validatePatternAnalysis(body.analysis);
    if (!analysisValidation.valid) {
      return NextResponse.json({ error: analysisValidation.error }, { status: 400 });
    }

    const created = await insertPatternWithAnalysis(
      patternValidation.data,
      analysisValidation.data
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
