import type { PatternAnalysis, HealingStep } from "@/types";

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

const RESPONSE_MODES = ["Surrender", "Escape", "Counterattack", "Regulation"];
const SYSTEMS = ["threat", "drive", "soothing"];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

// ─── PatternAnalysis (pasted back from the analyze prompt) ──────────────────

export function validatePatternAnalysis(input: unknown): ValidationResult<PatternAnalysis> {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { valid: false, error: "Pasted content must be a single JSON object." };
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    errors.push('"summary" must be a non-empty string');
  }
  if (!isStringArray(obj.schemaActivated) || obj.schemaActivated.length === 0) {
    errors.push('"schemaActivated" must be a non-empty array of strings');
  }
  if (typeof obj.responseMode !== "string" || !RESPONSE_MODES.includes(obj.responseMode)) {
    errors.push(`"responseMode" must be one of ${RESPONSE_MODES.join(", ")}`);
  }
  if (!isStringArray(obj.systemsInvolved) || obj.systemsInvolved.some((s) => !SYSTEMS.includes(s))) {
    errors.push(`"systemsInvolved" must be an array containing only ${SYSTEMS.join(", ")}`);
  }
  if (!isStringArray(obj.relatedPatterns)) {
    errors.push('"relatedPatterns" must be an array of strings');
  }
  if (!Array.isArray(obj.bookMappings)) {
    errors.push('"bookMappings" must be an array');
  } else {
    obj.bookMappings.forEach((m, i) => {
      if (
        typeof m !== "object" || m === null ||
        typeof (m as Record<string, unknown>).concept !== "string" ||
        typeof (m as Record<string, unknown>).source !== "string" ||
        typeof (m as Record<string, unknown>).relevance !== "string"
      ) {
        errors.push(`"bookMappings[${i}]" must have string fields concept, source, relevance`);
      }
    });
  }
  if (typeof obj.practiceRecommendation !== "string" || !obj.practiceRecommendation.trim()) {
    errors.push('"practiceRecommendation" must be a non-empty string');
  }

  if (obj.layerStatus !== undefined) {
    const ls = obj.layerStatus as Record<string, unknown>;
    if (
      typeof ls !== "object" || ls === null ||
      typeof ls.behavioral !== "string" ||
      typeof ls.cognitive !== "string" ||
      typeof ls.schema !== "string"
    ) {
      errors.push('"layerStatus", if present, must have string fields behavioral, cognitive, schema');
    }
  }

  if (obj.healingPath !== undefined) {
    if (!Array.isArray(obj.healingPath)) {
      errors.push('"healingPath", if present, must be an array');
    } else {
      obj.healingPath.forEach((step, i) => {
        const s = step as Record<string, unknown>;
        if (
          typeof s !== "object" || s === null ||
          typeof s.id !== "string" ||
          typeof s.name !== "string" ||
          typeof s.what !== "string" ||
          typeof s.how !== "string"
        ) {
          errors.push(`"healingPath[${i}]" must at minimum have string fields id, name, what, how`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  const analyzedAt = new Date((obj.analyzedAt as string) ?? Date.now());

  const data: PatternAnalysis = {
    ...(obj as unknown as PatternAnalysis),
    analyzedAt: isNaN(analyzedAt.getTime()) ? new Date() : analyzedAt,
    healingPath: (obj.healingPath as HealingStep[] | undefined) ?? [],
  };

  return { valid: true, data };
}

// ─── New pattern fields (pasted back from the describe/extract prompt) ──────

export interface NewPatternFields {
  label: string;
  short: string;
  coreBelief: string;
  symptoms: string[];
  cognitiveLabels: string[];
  note?: string;
}

export function validateNewPatternFields(input: unknown): ValidationResult<NewPatternFields> {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { valid: false, error: '"pattern" must be a JSON object.' };
  }
  const obj = input as Record<string, unknown>;

  if (typeof obj.label !== "string" || !obj.label.trim()) errors.push('"pattern.label" must be a non-empty string');
  if (typeof obj.coreBelief !== "string" || !obj.coreBelief.trim()) errors.push('"pattern.coreBelief" must be a non-empty string');
  if (obj.short !== undefined && typeof obj.short !== "string") errors.push('"pattern.short" must be a string');
  if (obj.symptoms !== undefined && !isStringArray(obj.symptoms)) errors.push('"pattern.symptoms" must be an array of strings');
  if (obj.cognitiveLabels !== undefined && !isStringArray(obj.cognitiveLabels)) errors.push('"pattern.cognitiveLabels" must be an array of strings');
  if (obj.note !== undefined && typeof obj.note !== "string") errors.push('"pattern.note" must be a string');

  if (errors.length > 0) {
    return { valid: false, error: errors.join("; ") };
  }

  return {
    valid: true,
    data: {
      label: (obj.label as string).trim(),
      short: (obj.short as string)?.trim() || (obj.label as string).trim(),
      coreBelief: (obj.coreBelief as string).trim(),
      symptoms: (obj.symptoms as string[] | undefined) ?? [],
      cognitiveLabels: (obj.cognitiveLabels as string[] | undefined) ?? [],
      note: (obj.note as string | undefined)?.trim() ?? "",
    },
  };
}
