import type { ObjectId } from "mongodb";

/**
 * One logged psychological pattern — the core entity of this app, stored as a
 * document in the `psy` collection.
 *
 * `id` is the human-facing identifier ("P1", "P14"), NOT MongoDB's `_id`.
 * Both can be used to look a pattern up; see `findPattern()` in lib/db/patterns.ts.
 */
export interface Pattern {
  _id?: ObjectId | string;
  id: string;
  type: "pattern";
  label: string;
  short: string;
  coreBelief: string;
  symptoms: string[];
  cognitiveLabels: string[];
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
  analysis?: PatternAnalysis;
}

/**
 * One concrete exercise recommended by an analysis, copied verbatim out of a
 * Healing Path reference record (the `hp` collection) except for
 * `whyThisPattern`, which the model writes for this specific activation.
 */
export interface HealingStep {
  id: string;
  source: string;
  framework: string;
  name: string;
  what: string;
  how: string;
  when: string;
  duration: string;
  frequency: string;
  successMarker: string;
  whyThisPattern: string;
}

/**
 * The structured clinical analysis of a pattern, produced by Gemini and shown
 * in `AnalysisSection`.
 *
 * The Gemini output contract that produces this lives in
 * lib/ai/patternAnalysisSchema.ts, and every object is checked by
 * `validatePatternAnalysis()` before it is ever written to MongoDB.
 */
export interface PatternAnalysis {
  analyzedAt: Date;
  summary: string;
  woundActivation?: string;
  schemaActivated: string[];
  responseMode: "Surrender" | "Escape" | "Counterattack" | "Regulation";
  operationalFact?: string;
  schemaNarrative?: string;
  systemsInvolved: ("threat" | "drive" | "soothing")[];
  modesActive?: string[];
  schemaMaintenanceBelief?: string;
  whatTheSchemaIsConstructing?: string;
  whatTheSituationActuallyNeeds?: string;
  emotionalSchemaRunning?: string;           // NEW — Leahy layer
  relatedPatterns: string[];
  bookMappings: { concept: string; source: string; relevance: string }[];
  regulationEvidence?: string | null;
  practiceRecommendation: string;
  /**
   * Which model produced this analysis, e.g. "gemini-flash-lite-latest".
   * Stamped server-side by the live path. Absent on analyses saved through
   * the manual copy/paste flow and on anything analyzed before this existed.
   */
  generatedBy?: string;
  layerStatus?: {
    behavioral: string;
    cognitive: string;
    schema: string;
  };
  healingPath?: HealingStep[];
}

