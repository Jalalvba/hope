import type { ObjectId } from "mongodb";

// ─── Pattern (hope.psy collection) ───────────────────────────────────────────

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
  analysis?: PatternAnalysis;
}

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
  relatedPatterns: string[];
  bookMappings: { concept: string; source: string; relevance: string }[];
  whatTheSchemaIsConstructing?: string;
  whatTheSituationActuallyNeeds?: string;
  regulationEvidence?: string | null;
  practiceRecommendation: string;
  layerStatus?: {
    behavioral: string;
    cognitive: string;
    schema: string;
  };
  healingPath?: HealingStep[];
}

// ─── Color helper ─────────────────────────────────────────────────────────────

const COLOR_CYCLE = ["amber", "blue", "red", "green"];
export function getPatternColor(id: string): string {
  const num = parseInt(id.replace("P", "")) || 0;
  return COLOR_CYCLE[(num - 1) % COLOR_CYCLE.length];
}
