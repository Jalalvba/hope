/**
 * Runtime checks for objects that came from a language model.
 *
 * Gemini's responseSchema (lib/ai/patternAnalysisSchema.ts) constrains what the
 * model returns, but a schema is a request, not a guarantee — and analyses can
 * also arrive from a hand-pasted draft. These functions are the last gate
 * before anything is written to MongoDB: if the shape is wrong, the save is
 * refused and the caller is told exactly which field was at fault.
 */

import type { PatternAnalysis, HealingStep } from "@/types";

/** Either the checked value, or a human-readable explanation of what's wrong. */
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

const RESPONSE_MODES = ["Surrender", "Escape", "Counterattack", "Regulation"];
const SYSTEMS = ["threat", "drive", "soothing"];

/** True when the value is an array containing only strings. */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Checks that an object is a usable `PatternAnalysis`.
 *
 * Every problem found is collected rather than thrown on the first one, so the
 * caller gets one message listing everything wrong instead of discovering the
 * faults one save at a time.
 *
 * @param input - The parsed JSON object, from a model or a paste.
 * @returns The analysis with `analyzedAt` as a real Date and `healingPath`
 * guaranteed to be an array, or the list of problems found.
 */
export function validatePatternAnalysis(input: unknown): ValidationResult<PatternAnalysis> {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { valid: false, error: "Pasted content must be a single JSON object." };
  }
  const analysis = input as Record<string, unknown>;

  if (typeof analysis.summary !== "string" || !analysis.summary.trim()) {
    errors.push('"summary" must be a non-empty string');
  }
  if (!isStringArray(analysis.schemaActivated) || analysis.schemaActivated.length === 0) {
    errors.push('"schemaActivated" must be a non-empty array of strings');
  }
  if (typeof analysis.responseMode !== "string" || !RESPONSE_MODES.includes(analysis.responseMode)) {
    errors.push(`"responseMode" must be one of ${RESPONSE_MODES.join(", ")}`);
  }
  if (!isStringArray(analysis.systemsInvolved) || analysis.systemsInvolved.some((s) => !SYSTEMS.includes(s))) {
    errors.push(`"systemsInvolved" must be an array containing only ${SYSTEMS.join(", ")}`);
  }
  if (!isStringArray(analysis.relatedPatterns)) {
    errors.push('"relatedPatterns" must be an array of strings');
  }
  if (!Array.isArray(analysis.bookMappings)) {
    errors.push('"bookMappings" must be an array');
  } else {
    analysis.bookMappings.forEach((mapping, index) => {
      const fields = mapping as Record<string, unknown>;
      if (
        typeof mapping !== "object" || mapping === null ||
        typeof fields.concept !== "string" ||
        typeof fields.source !== "string" ||
        typeof fields.relevance !== "string"
      ) {
        errors.push(`"bookMappings[${index}]" must have string fields concept, source, relevance`);
      }
    });
  }
  if (typeof analysis.practiceRecommendation !== "string" || !analysis.practiceRecommendation.trim()) {
    errors.push('"practiceRecommendation" must be a non-empty string');
  }

  if (analysis.layerStatus !== undefined) {
    const layerStatus = analysis.layerStatus as Record<string, unknown>;
    if (
      typeof layerStatus !== "object" || layerStatus === null ||
      typeof layerStatus.behavioral !== "string" ||
      typeof layerStatus.cognitive !== "string" ||
      typeof layerStatus.schema !== "string"
    ) {
      errors.push('"layerStatus", if present, must have string fields behavioral, cognitive, schema');
    }
  }

  if (analysis.healingPath !== undefined) {
    if (!Array.isArray(analysis.healingPath)) {
      errors.push('"healingPath", if present, must be an array');
    } else {
      analysis.healingPath.forEach((step, index) => {
        const fields = step as Record<string, unknown>;
        if (
          typeof step !== "object" || step === null ||
          typeof fields.id !== "string" ||
          typeof fields.name !== "string" ||
          typeof fields.what !== "string" ||
          typeof fields.how !== "string"
        ) {
          errors.push(`"healingPath[${index}]" must at minimum have string fields id, name, what, how`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  // analyzedAt arrives as an ISO string (stamped server-side after the Gemini
  // call) and is stored as a Date. An unparseable value falls back to now
  // rather than failing the save — a bad timestamp isn't worth losing an
  // analysis over.
  const analyzedAt = new Date((analysis.analyzedAt as string) ?? Date.now());

  const data: PatternAnalysis = {
    ...(analysis as unknown as PatternAnalysis),
    analyzedAt: isNaN(analyzedAt.getTime()) ? new Date() : analyzedAt,
    healingPath: (analysis.healingPath as HealingStep[] | undefined) ?? [],
  };

  return { valid: true, data };
}

// ─── New pattern fields ───────────────────────────────────────────────────────

/** The fields the model must supply when extracting a brand-new pattern. */
export interface NewPatternFields {
  label: string;
  short: string;
  coreBelief: string;
  symptoms: string[];
  cognitiveLabels: string[];
  note?: string;
}

/**
 * Checks the `pattern` half of a create-from-description draft.
 *
 * Only `label` and `coreBelief` are genuinely required; the list fields
 * default to empty and `short` falls back to the label, so a slightly thin
 * response is still usable rather than being rejected outright.
 *
 * @param input - The parsed `pattern` object from the model.
 * @returns The trimmed, complete fields, or the list of problems found.
 */
export function validateNewPatternFields(input: unknown): ValidationResult<NewPatternFields> {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { valid: false, error: '"pattern" must be a JSON object.' };
  }
  const fields = input as Record<string, unknown>;

  if (typeof fields.label !== "string" || !fields.label.trim()) errors.push('"pattern.label" must be a non-empty string');
  if (typeof fields.coreBelief !== "string" || !fields.coreBelief.trim()) errors.push('"pattern.coreBelief" must be a non-empty string');
  if (fields.short !== undefined && typeof fields.short !== "string") errors.push('"pattern.short" must be a string');
  if (fields.symptoms !== undefined && !isStringArray(fields.symptoms)) errors.push('"pattern.symptoms" must be an array of strings');
  if (fields.cognitiveLabels !== undefined && !isStringArray(fields.cognitiveLabels)) errors.push('"pattern.cognitiveLabels" must be an array of strings');
  if (fields.note !== undefined && typeof fields.note !== "string") errors.push('"pattern.note" must be a string');

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  return {
    valid: true,
    data: {
      label: (fields.label as string).trim(),
      short: (fields.short as string)?.trim() || (fields.label as string).trim(),
      coreBelief: (fields.coreBelief as string).trim(),
      symptoms: (fields.symptoms as string[] | undefined) ?? [],
      cognitiveLabels: (fields.cognitiveLabels as string[] | undefined) ?? [],
      note: (fields.note as string | undefined)?.trim() ?? "",
    },
  };
}
