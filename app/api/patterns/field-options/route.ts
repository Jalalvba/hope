/**
 * Autocomplete options for the pattern edit form.
 */

import { NextResponse } from "next/server";
import { findFieldOptions } from "@/lib/db/fields";

/**
 * GET — returns the predefined dropdown suggestions.
 *
 * @returns `{ data: { coreBeliefs, symptoms, cognitiveLabels } }`. Each list
 * is empty rather than missing when the options document isn't there, so the
 * form never has to guard against undefined.
 */
export async function GET() {
  try {
    return NextResponse.json({ data: await findFieldOptions() });
  } catch {
    return NextResponse.json({ error: "Failed to load field options" }, { status: 500 });
  }
}
