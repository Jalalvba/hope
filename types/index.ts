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
  updatedAt?: Date;
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

// ─── Gemini cost reporting ───────────────────────────────────────────────────
// Returned inline by every Gemini-backed action alongside its result, so the UI
// can show what the action cost in the same round trip. Lives here rather than
// in lib/gemini-cost-tracker.ts so client components can import the type
// without pulling the server-only tracker (and MongoDB) into the bundle.

export interface CostInfo {
  /** The concrete model that served the call, resolved from any rolling alias. */
  model: string;
  /** ESTIMATED from our own daily call count — see lib/gemini-cost-tracker.ts. */
  tier: "free" | "paid";
  inputTokens: number;
  /** Visible output plus reasoning tokens; both bill at the output rate. */
  outputTokens: number;
  /** 0 on the free tier. */
  costUsd: number;
  costMad: number;
  /** Prepaid balance remaining after this call. */
  remainingCreditUsd: number;
}

// ─── Color helper ─────────────────────────────────────────────────────────────

const COLOR_CYCLE = ["amber", "blue", "red", "green"];
export function getPatternColor(id: string): string {
  const num = parseInt(id.replace("P", "")) || 0;
  return COLOR_CYCLE[(num - 1) % COLOR_CYCLE.length];
}
