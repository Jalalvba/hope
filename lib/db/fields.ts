/**
 * Queries against the `fields` collection — the predefined dropdown options
 * that `PatternActions` offers as autocomplete while editing a pattern.
 *
 * The whole collection is a single document, so there is only one query here.
 */

import { mongoClientPromise, dbName } from "@/lib/db/mongo";

/** The `_id` of the one document holding every option list. */
const FIELD_OPTIONS_DOC_ID = "clinical_fields_v1";

/** Autocomplete suggestions for the editable fields of a pattern. */
export interface FieldOptions {
  coreBeliefs: string[];
  symptoms: string[];
  cognitiveLabels: string[];
}

/**
 * Loads the autocomplete option lists.
 *
 * Note there is no `notes` list in this collection — any UI expecting note
 * suggestions will always get nothing.
 *
 * @returns The three option lists; each is empty if the document is missing.
 */
export async function findFieldOptions(): Promise<FieldOptions> {
  const client = await mongoClientPromise;
  // The `_id` here is a plain string rather than an ObjectId, which is why the
  // driver's default `_id` typing has to be widened for this one lookup.
  const document = await client
    .db(dbName)
    .collection("fields")
    .findOne({ _id: FIELD_OPTIONS_DOC_ID as unknown as import("mongodb").ObjectId });

  return {
    coreBeliefs: document?.coreBeliefs ?? [],
    symptoms: document?.symptoms ?? [],
    cognitiveLabels: document?.cognitiveLabels ?? [],
  };
}
