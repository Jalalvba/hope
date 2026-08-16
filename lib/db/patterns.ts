/**
 * Every MongoDB query that touches the `psy` collection (the patterns) lives
 * here.
 *
 * Route handlers and pages call these helpers instead of writing queries
 * inline. That keeps two tricky details in exactly one place: how a pattern is
 * looked up by either kind of id, and how the next pattern id is assigned.
 */

import { ObjectId, type Filter } from "mongodb";
import { mongoClientPromise, dbName } from "@/lib/db/mongo";
import type { Pattern, PatternAnalysis } from "@/types";

const COLLECTION = "psy";

/** The first id handed out when the collection is empty (P1–P11 are seeded). */
const FIRST_GENERATED_PATTERN_NUMBER = 12;

/** Opens the `psy` collection, typed as `Pattern` documents. */
async function patternsCollection() {
  const client = await mongoClientPromise;
  return client.db(dbName).collection<Pattern>(COLLECTION);
}

/**
 * Builds the lookup filter for a pattern id.
 *
 * A pattern can be addressed two ways and the UI uses both: by its MongoDB
 * `_id` (a 24-character hex string) or by its human-facing `id` ("P14"). This
 * picks whichever the caller passed.
 *
 * @param id - Either a MongoDB ObjectId string or a "P"-prefixed pattern id.
 * @returns A MongoDB filter matching that single pattern.
 */
function buildIdFilter(id: string): Filter<Pattern> {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

/**
 * Converts a raw MongoDB document into a plain object safe to hand to a React
 * client component, by turning the ObjectId `_id` into a string.
 *
 * Server Components may not pass class instances like ObjectId across the
 * server/client boundary, so this is required, not cosmetic.
 */
function serializePattern(doc: Pattern): Pattern {
  return { ...doc, _id: String(doc._id) };
}

/**
 * Reads the numeric part out of a pattern id — "P14" becomes 14.
 *
 * @returns The number, or 0 if the id isn't in the expected shape.
 */
export function patternNumber(id: string): number {
  return parseInt(String(id).replace("P", ""), 10) || 0;
}

/**
 * Fetches every pattern, newest (highest number) first.
 *
 * @returns All patterns, ready to render.
 */
export async function findAllPatterns(): Promise<Pattern[]> {
  const collection = await patternsCollection();
  const documents = await collection.find({ type: "pattern" }).toArray();
  return documents
    .map(serializePattern)
    .sort((a, b) => patternNumber(b.id) - patternNumber(a.id));
}

/**
 * Fetches a single pattern.
 *
 * @param id - A MongoDB `_id` string or a "P"-prefixed pattern id.
 * @returns The pattern, or null if nothing matches.
 */
export async function findPattern(id: string): Promise<Pattern | null> {
  const collection = await patternsCollection();
  const document = await collection.findOne(buildIdFilter(id));
  return document ? serializePattern(document) : null;
}

/** The fields a user is allowed to edit on an existing pattern. */
export type PatternEditableFields = Partial<
  Pick<Pattern, "label" | "short" | "coreBelief" | "symptoms" | "cognitiveLabels" | "note">
>;

/**
 * Applies a partial edit to a pattern. Keys left out of `changes` are not
 * touched, so the caller can send only what the user actually edited.
 *
 * @param id - A MongoDB `_id` string or a "P"-prefixed pattern id.
 * @param changes - Only the fields to overwrite.
 * @returns The pattern as it looks after the update, or null if it's gone.
 */
export async function updatePattern(
  id: string,
  changes: PatternEditableFields
): Promise<Pattern | null> {
  const collection = await patternsCollection();
  await collection.updateOne(buildIdFilter(id), {
    $set: { ...changes, updatedAt: new Date() },
  });
  return findPattern(id);
}

/**
 * Saves a reviewed analysis onto an existing pattern.
 *
 * @returns The updated pattern, or null if no pattern has that id.
 */
export async function savePatternAnalysis(
  id: string,
  analysis: PatternAnalysis
): Promise<Pattern | null> {
  const collection = await patternsCollection();
  const existing = await collection.findOne(buildIdFilter(id));
  if (!existing) return null;

  await collection.updateOne(buildIdFilter(id), {
    $set: { analysis, updatedAt: new Date() },
  });
  return findPattern(id);
}

/** Permanently removes a pattern. */
export async function deletePattern(id: string): Promise<void> {
  const collection = await patternsCollection();
  await collection.deleteOne(buildIdFilter(id));
}

/**
 * Works out the next free pattern id by scanning the numeric suffix of every
 * existing one and adding 1 to the highest.
 *
 * Ids are assigned here on the server rather than by the client so two people
 * (or two tabs) can't invent the same id.
 *
 * @returns The next id, e.g. "P18".
 */
export async function nextPatternId(): Promise<string> {
  const collection = await patternsCollection();
  const existing = await collection
    .find({ type: "pattern" })
    .project<{ id: string }>({ id: 1 })
    .toArray();

  const numbers = existing.map((doc) => patternNumber(doc.id)).filter((n) => n > 0);
  const next = numbers.length > 0
    ? Math.max(...numbers) + 1
    : FIRST_GENERATED_PATTERN_NUMBER;

  return `P${next}`;
}

/**
 * Inserts a brand-new pattern together with its analysis, assigning the next
 * available id.
 *
 * @param fields - The pattern's own fields (no id — this function assigns it).
 * @param analysis - The analysis the user just reviewed and approved.
 * @returns The complete inserted document, including its new id and `_id`.
 */
export async function insertPatternWithAnalysis(
  fields: Omit<Pattern, "_id" | "id" | "type" | "analysis">,
  analysis: PatternAnalysis
): Promise<Pattern> {
  const collection = await patternsCollection();
  const now = new Date();

  const document = {
    id: await nextPatternId(),
    type: "pattern" as const,
    ...fields,
    analysis,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);
  return { ...document, _id: String(result.insertedId) };
}
