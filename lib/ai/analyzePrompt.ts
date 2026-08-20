/**
 * Builds the two prompts this app sends to Gemini.
 *
 * Both follow the same three steps:
 *   1. Work out keywords describing the situation being analyzed.
 *   2. Use those keywords to pull the most relevant reference records out of
 *      MongoDB (this is the RAG step — see `gatherRagContext`).
 *   3. Combine the case data and those records into a user prompt, sent
 *      alongside the fixed clinical system instruction.
 *
 * That system instruction is not in this file — it lives on its own in
 * lib/ai/prompts/clinicalSystemInstruction.ts. It contains the user's real
 * identity, history, and schema architecture; do not templatize it.
 */

import type { Db } from "mongodb";
import { mongoClientPromise, dbName } from "@/lib/db/mongo";
import { findPattern } from "@/lib/db/patterns";
import { CLINICAL_CONTEXT_DETAILED } from "@/lib/ai/prompts/clinicalSystemInstruction";
import type { Pattern } from "@/types";

// ─── Reference record scoring (the "retrieval" half of RAG) ───────────────────

/**
 * Flattens any value out of a MongoDB record into plain searchable text.
 *
 * Reference records are hand-authored and inconsistent: one record's `tags`
 * may be a string, another's an array, another's a nested object. This walks
 * whatever shape it's given and returns the words inside.
 *
 * @param value - Any field value from a reference record.
 * @returns The text content, space-separated. Empty string for null/undefined.
 */
function flattenToText(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(flattenToText).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(flattenToText).join(" ");
  }
  return String(value);
}

/**
 * Scores how well one reference record matches a situation.
 *
 * The score is simply how many of the keywords appear anywhere in the record's
 * searchable fields — a deliberately simple keyword count, not a semantic
 * embedding search.
 *
 * @param record - One document from the `ryl` or `hp` collection.
 * @param keywords - Words describing the situation being analyzed.
 * @returns The number of keywords found in the record.
 */
function scoreRecord(record: Record<string, unknown>, keywords: string[]): number {
  const searchableText = [
    flattenToText(record.name), flattenToText(record.description), flattenToText(record.mechanism),
    flattenToText(record.behavioral_signature), flattenToText(record.tags), flattenToText(record.concept_type),
    flattenToText(record.what_activates_it), flattenToText(record.intervention),
    flattenToText(record.schemaRelevance), flattenToText(record.framework), flattenToText(record.sourceShort),
    flattenToText((record.practice as Record<string, unknown>)?.what),
  ].join(" ").toLowerCase();

  return keywords.reduce(
    (matches, keyword) => matches + (searchableText.includes(keyword.toLowerCase()) ? 1 : 0),
    0
  );
}

/** Concept types in the `ryl` collection that are most often useful. */
const RYL_PRIORITY_TYPES = new Set([
  "response_mode", "emotional_pattern", "cognitive_pattern",
  "behavioral_pattern", "lifetrap_definition", "theoretical_model",
  "schema_definition", "mode_description",
]);

/** Concept types in the `hp` collection that are most often useful. */
const HP_PRIORITY_TYPES = new Set([
  "imagery_rescripting", "chair_work", "schema_mode_identification",
  "mode_cycle_interruption", "behavioral_pattern_breaking",
  "empathic_confrontation", "schema_flashcard", "cognitive_strategy",
  "core_emotional_needs", "emotional_schema", "deliberate_practice",
  "integrated_protocol", "mindfulness_schema", "experiential_technique",
  "therapeutic_stance", "limited_reparenting",
]);

/** How much a priority concept type adds to a record's keyword score. */
const PRIORITY_TYPE_BONUS = 2;

/** How many records from each collection are attached to a prompt. */
const RECORDS_PER_COLLECTION = 8;

/**
 * Picks the best-matching records for a situation.
 *
 * Records of a priority concept type get a small score bonus so that, all else
 * being equal, a directly usable exercise outranks background theory. Records
 * matching no keyword at all are dropped rather than padded in.
 *
 * @param records - Every document from one reference collection.
 * @param keywords - Words describing the situation being analyzed.
 * @param limit - Maximum number of records to return.
 * @param priorityTypes - Concept types to favour.
 * @returns The highest-scoring records, best first.
 */
function pickTopRecords(
  records: Record<string, unknown>[],
  keywords: string[],
  limit: number,
  priorityTypes: Set<string>
): Record<string, unknown>[] {
  return records
    .map((record) => ({
      record,
      score:
        scoreRecord(record, keywords) +
        (priorityTypes.has(String(record.concept_type)) ? PRIORITY_TYPE_BONUS : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record }) => record);
}

// ─── Reference record formatting (turning records into prompt text) ───────────
//
// Long fields are truncated at the character limits below. That is a token
// budget: eight records per collection, sent on every call, add up fast.

const SCHEMA_RECORD_LIMITS = { description: 350, mechanism: 250, intervention: 250 };
const PRACTICE_RECORD_LIMITS = { description: 350, mechanism: 300, how: 400 };

/**
 * Renders one schema-therapy record (`ryl` collection) as prompt text.
 *
 * @param record - A document from the `ryl` collection.
 * @returns A readable block of lines for the prompt.
 */
function formatSchemaRecord(record: Record<string, unknown>): string {
  const lines = [`[${record.concept_type}] ${record.name}`];

  if (record.description) {
    lines.push(`Description: ${String(record.description).slice(0, SCHEMA_RECORD_LIMITS.description)}`);
  }
  if (record.mechanism) {
    lines.push(`Mechanism: ${String(record.mechanism).slice(0, SCHEMA_RECORD_LIMITS.mechanism)}`);
  }
  if (record.intervention) {
    // `intervention` is sometimes a plain string and sometimes an object with a
    // `primary` field, so both shapes are handled here.
    const intervention = typeof record.intervention === "object"
      ? flattenToText((record.intervention as Record<string, unknown>).primary ?? record.intervention)
      : String(record.intervention);
    lines.push(`Intervention: ${intervention.slice(0, SCHEMA_RECORD_LIMITS.intervention)}`);
  }
  if (record.book) lines.push(`Source: ${record.book}`);

  return lines.join("\n");
}

/**
 * Renders one Healing Path exercise (`hp` collection) as prompt text.
 *
 * These carry a `practice` sub-object the model copies verbatim into the
 * analysis's `healingPath`, so every practice field is included.
 *
 * @param record - A document from the `hp` collection.
 * @returns A readable block of lines for the prompt.
 */
function formatPracticeRecord(record: Record<string, unknown>): string {
  const lines = [`[${record.concept_type}] ${record.name} (${record.sourceShort} — ${record.framework})`];

  if (record.description) {
    lines.push(`Description: ${String(record.description).slice(0, PRACTICE_RECORD_LIMITS.description)}`);
  }
  if (record.mechanism) {
    lines.push(`Mechanism: ${String(record.mechanism).slice(0, PRACTICE_RECORD_LIMITS.mechanism)}`);
  }

  const practice = record.practice as Record<string, string> | undefined;
  if (practice) {
    lines.push(`Practice — What: ${practice.what}`);
    lines.push(`Practice — How: ${String(practice.how).slice(0, PRACTICE_RECORD_LIMITS.how)}`);
    lines.push(`Practice — When: ${practice.when}`);
    lines.push(`Practice — Duration: ${practice.duration}`);
    lines.push(`Practice — Frequency: ${practice.frequency}`);
    lines.push(`Practice — Success marker: ${practice.successMarker}`);
  }
  if (record.schemaRelevance) lines.push(`Schema relevance: ${flattenToText(record.schemaRelevance)}`);

  return lines.join("\n");
}

// ─── Keyword extraction ───────────────────────────────────────────────────────

/**
 * Clinical vocabulary always included in the keyword list, so a prompt still
 * retrieves architecture-relevant records even when the user's own wording
 * shares no words with the reference material.
 */
const PROFILE_KEYWORDS = [
  "unrelenting standards", "subjugation", "failure", "defectiveness",
  "rumination", "hypervigilant", "anticipation", "overcompensation",
  "angry child", "demanding parent", "demanding critic", "healthy adult",
  "vulnerable child", "rebel", "detached protector",
  "authority", "boss", "hierarchy", "competence", "incompetence",
  "imagery rescripting", "chairwork", "flashcard", "mode work",
  "behavioral experiment", "limited reparenting",
  "threat system", "soothing", "dual focus", "attractor",
];

/** Words this short are too common to retrieve anything useful. */
const MIN_KEYWORD_LENGTH = 4;

/**
 * Builds the keyword list used to retrieve reference records.
 *
 * @param text - Free text describing the situation.
 * @returns The standing clinical vocabulary plus every distinct longer word
 * from the text, with duplicates removed.
 */
function extractKeywordsFromText(text: string): string[] {
  const wordsFromText = text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > MIN_KEYWORD_LENGTH);

  return [...new Set([...PROFILE_KEYWORDS, ...wordsFromText])];
}

/**
 * Builds the keyword list for an existing pattern by pooling everything
 * written about it.
 *
 * @param pattern - The pattern being analyzed.
 * @returns Keywords for retrieving its reference records.
 */
function extractKeywordsFromPattern(pattern: Pattern): string[] {
  // situationDescription and triggerContext are older fields present on some
  // documents but absent from the Pattern type, hence the widened cast.
  const extraFields = pattern as Pattern & Record<string, unknown>;

  const text = [
    ...(pattern.symptoms ?? []),
    ...(pattern.cognitiveLabels ?? []),
    pattern.coreBelief ?? "",
    pattern.label ?? "",
    (extraFields.note as string) ?? "",
    (extraFields.situationDescription as string) ?? "",
  ].join(" ");

  return extractKeywordsFromText(text);
}

// ─── RAG retrieval ────────────────────────────────────────────────────────────

const SECTION_RULE = "══════════════════════════════════════════════════════";

/**
 * The retrieval step: loads both reference collections, keeps only the records
 * that best match the situation, and formats them as prompt text.
 *
 * Both collections are small enough to read whole and score in memory, which
 * is why there is no text index on them.
 *
 * @param db - The connected database.
 * @param keywords - Words describing the situation being analyzed.
 * @returns Two ready-to-append prompt sections, each empty if nothing matched.
 */
async function gatherRagContext(db: Db, keywords: string[]) {
  const [schemaRecords, practiceRecords] = await Promise.all([
    db.collection("ryl").find({}).toArray(),
    db.collection("hp").find({}).toArray(),
  ]);

  const topSchemaRecords = pickTopRecords(
    schemaRecords as Record<string, unknown>[],
    keywords,
    RECORDS_PER_COLLECTION,
    RYL_PRIORITY_TYPES
  );
  const topPracticeRecords = pickTopRecords(
    practiceRecords as Record<string, unknown>[],
    keywords,
    RECORDS_PER_COLLECTION,
    HP_PRIORITY_TYPES
  );

  const rylContext = topSchemaRecords.length > 0
    ? `\n\n${SECTION_RULE}\nRAG — SCHEMA THERAPY REFERENCE RECORDS\n${SECTION_RULE}\n` +
      topSchemaRecords.map(formatSchemaRecord).join("\n\n")
    : "";

  const hpContext = topPracticeRecords.length > 0
    ? `\n\n${SECTION_RULE}\nHEALING PATH — PRACTICE RECORDS (18-book library)\n${SECTION_RULE}\n` +
      topPracticeRecords.map(formatPracticeRecord).join("\n\n")
    : "";

  return { rylContext, hpContext };
}


// ─── System instruction ────────────────────────────────────────────────────────
// The text itself lives in lib/ai/prompts/clinicalSystemInstruction.ts, kept on its
// own so it can be read straight through as prose. Both entry points below send it.


// ─── User prompt builders ─────────────────────────────────────────────────────
// These carry ONLY the case data plus its RAG context. The output contract —
// field list, per-field instructions, ordering rules — lives entirely in the
// Gemini responseSchema (lib/ai/patternAnalysisSchema.ts), which enforces the
// shape natively. Restating it here as a prose JSON example would duplicate
// several thousand input tokens on every call and could drift from the schema.

/**
 * Describes an existing pattern to the model, followed by its reference records.
 *
 * @param pattern - The pattern being analyzed.
 * @param rylContext - Formatted schema therapy records, or "" if none matched.
 * @param hpContext - Formatted Healing Path records, or "" if none matched.
 * @returns The user prompt text.
 */
function buildAnalysisUserPrompt(pattern: Pattern, rylContext: string, hpContext: string): string {
  // situationDescription and triggerContext exist only on some older documents.
  const extraFields = pattern as Pattern & Record<string, unknown>;

  const lines = [
    `PATTERN TO ANALYZE:`,
    `ID: ${pattern.id}`,
    `Label: ${pattern.label}`,
    `Short: ${pattern.short}`,
    `Core belief: ${pattern.coreBelief}`,
    `Symptoms: ${(pattern.symptoms ?? []).join("; ")}`,
    `Cognitive labels: ${(pattern.cognitiveLabels ?? []).join(", ")}`,
  ];
  if (pattern.note) lines.push(`Note: ${pattern.note}`);
  if (extraFields.situationDescription) lines.push(`Situation: ${extraFields.situationDescription}`);
  if (extraFields.triggerContext) lines.push(`Trigger context: ${extraFields.triggerContext}`);

  return lines.join("\n") + rylContext + hpContext;
}

/**
 * Hands the model a raw narrative and asks it to both extract a pattern from
 * it and analyze that pattern, in one call.
 *
 * @param description - What the user typed about the situation.
 * @param rylContext - Formatted schema therapy records, or "" if none matched.
 * @param hpContext - Formatted Healing Path records, or "" if none matched.
 * @returns The user prompt text.
 */
function buildCreateFromDescriptionUserPrompt(
  description: string,
  rylContext: string,
  hpContext: string
): string {
  return `The user describes this situation:\n\n"${description}"\n\n` +
    `Extract a new pattern from it AND analyze that pattern, in one response.` +
    rylContext + hpContext;
}

// ─── Prompt assembly (what the route handlers call) ───────────────────────────
// Both entry points share the same clinical system instruction
// (CLINICAL_CONTEXT_DETAILED) and the same RAG pipeline (gatherRagContext).
// The only difference is where the case data comes from: a pattern already in
// the database, or a fresh description with no pattern extracted yet.

/** A prompt ready to send, or the reason one couldn't be built. */
export type AssembledPrompt =
  | { ok: true; systemInstruction: string; prompt: string }
  | { ok: false; error: string; status: number };

/** Opens the database the reference collections live in. */
async function referenceDb(): Promise<Db> {
  const client = await mongoClientPromise;
  return client.db(dbName);
}

/**
 * Builds the prompt for re-analyzing a pattern that already exists.
 *
 * Used by POST /api/patterns/analyze/generate.
 *
 * @param patternId - A MongoDB `_id` string or a "P"-prefixed pattern id.
 * @returns The assembled prompt, or `ok: false` with a 404 if no such pattern.
 */
export async function assembleAnalysisPrompt(patternId: string): Promise<AssembledPrompt> {
  const pattern = await findPattern(patternId);
  if (!pattern) return { ok: false, error: "Not found", status: 404 };

  const keywords = extractKeywordsFromPattern(pattern);
  const { rylContext, hpContext } = await gatherRagContext(await referenceDb(), keywords);

  return {
    ok: true,
    systemInstruction: CLINICAL_CONTEXT_DETAILED,
    prompt: buildAnalysisUserPrompt(pattern, rylContext, hpContext),
  };
}

/**
 * Builds the prompt for creating a brand-new pattern from a narrative, which
 * extracts the pattern's fields AND analyzes it in a single call.
 *
 * Used by POST /api/patterns/create-from-description/generate. Note it runs
 * the same full clinical architecture and RAG pipeline as
 * `assembleAnalysisPrompt` — there is no shallower prompt for new patterns.
 *
 * @param description - What the user typed about the situation.
 * @returns The assembled prompt. This one cannot fail: there is no pattern to
 * look up, so there is nothing to be missing.
 */
export async function assembleCreateFromDescriptionPrompt(
  description: string
): Promise<{ ok: true; systemInstruction: string; prompt: string }> {
  const keywords = extractKeywordsFromText(description);
  const { rylContext, hpContext } = await gatherRagContext(await referenceDb(), keywords);

  return {
    ok: true,
    systemInstruction: CLINICAL_CONTEXT_DETAILED,
    prompt: buildCreateFromDescriptionUserPrompt(description, rylContext, hpContext),
  };
}
