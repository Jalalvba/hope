/**
 * Saves a reviewed analysis onto an existing pattern.
 *
 * This is the second half of the two-step analysis flow: the client first
 * calls POST /api/patterns/analyze/generate (which costs money but saves
 * nothing), shows the result, and only calls this route once the user has
 * looked at it and confirmed.
 */

import { NextRequest, NextResponse } from "next/server";
import { savePatternAnalysis } from "@/lib/db/patterns";
import { validatePatternAnalysis } from "@/lib/utils/validatePatternAnalysis";

/**
 * PUT — validates and stores `body.analysis` on the pattern.
 *
 * @param req - Body shaped `{ analysis: PatternAnalysis }`.
 * @returns `{ data: Pattern }` with the analysis attached; 400 if the analysis
 * is off-contract, 404 if the pattern doesn't exist.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Nothing reaches MongoDB unchecked: the analysis may have come from a
    // model, so its shape is verified before it is stored.
    const validation = validatePatternAnalysis(body.analysis);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updated = await savePatternAnalysis(id, validation.data);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
