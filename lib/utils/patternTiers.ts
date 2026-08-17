/**
 * Patterns come in two kinds, and several places need to tell them apart.
 *
 * P1–P11 were seeded by hand as the reference architecture and are read-only
 * in the UI. Anything from P12 up was created through the app and can be
 * edited, re-analyzed, or deleted.
 */

import { patternNumber } from "@/lib/db/patterns";

/** The highest pattern number that is seeded, read-only reference material. */
const LAST_REFERENCE_PATTERN_NUMBER = 11;

/**
 * Whether a pattern was created through the app (and is therefore editable).
 *
 * @param id - A "P"-prefixed pattern id, e.g. "P14".
 * @returns true for P12 and above, false for the seeded P1–P11.
 */
export function isEditablePattern(id: string): boolean {
  return patternNumber(id) > LAST_REFERENCE_PATTERN_NUMBER;
}
