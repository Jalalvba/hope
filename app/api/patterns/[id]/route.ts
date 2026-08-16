/**
 * Read, edit, and delete a single pattern.
 *
 * The `[id]` segment accepts either a MongoDB `_id` or a "P"-prefixed pattern
 * id — `lib/db/patterns.ts` works out which was given. All three handlers are
 * thin: they parse the request, call one database helper, and shape the
 * response. No queries are written inline here.
 */

import { NextRequest, NextResponse } from "next/server";
import { deletePattern, findPattern, updatePattern, type PatternEditableFields } from "@/lib/db/patterns";

/** Route params arrive as a promise in the Next.js App Router. */
type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET — fetches one pattern.
 *
 * @returns `{ data: Pattern }`, or 404 if no pattern has that id.
 */
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const pattern = await findPattern(id);
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: pattern });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/**
 * PATCH — edits a pattern.
 *
 * Only the fields present in the request body are changed, so the edit form
 * can send just what the user touched.
 *
 * @returns `{ data: Pattern }` — the pattern after the edit.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Copy across only the fields a user is allowed to edit, and only those
    // actually included in the request — anything else in the body is ignored.
    const changes: PatternEditableFields = {};
    if (body.label !== undefined) changes.label = body.label;
    if (body.short !== undefined) changes.short = body.short;
    if (body.coreBelief !== undefined) changes.coreBelief = body.coreBelief;
    if (body.symptoms !== undefined) changes.symptoms = body.symptoms;
    if (body.cognitiveLabels !== undefined) changes.cognitiveLabels = body.cognitiveLabels;
    if (body.note !== undefined) changes.note = body.note;

    const updated = await updatePattern(id, changes);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/**
 * DELETE — permanently removes a pattern.
 *
 * @returns `{ ok: true }`.
 */
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deletePattern(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
