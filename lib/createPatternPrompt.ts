// ─── Create-from-description prompt + schema ─────────────────────────────────
// Shared by POST /api/patterns/create-from-description/generate: given a
// narrative description, extracts a new pattern's fields AND analyzes it in
// one Gemini call. Contains the user's real clinical profile — do not
// templatize or genericize this file.

// System instruction sent via Gemini's native `systemInstruction` field rather
// than concatenated into the user prompt — keeps the persona/profile out of
// the per-call token count reported as "prompt" and out of the conversational
// turn itself. Contains the user's real clinical profile — do not templatize
// or genericize this file.
export const CLINICAL_CONTEXT = `You are a clinical psychologist specialized in schema therapy (Young), metacognitive therapy (Wells), ACT (Ong & Twohig), CBT (Burns), confidence-based CBT (Sokol & Fox), and compassion-focused therapy (Gilbert).

The user will describe a real situation they experienced. Your job is TWO things in ONE response:
1. Extract a structured psychological pattern from their description
2. Analyze that pattern against their clinical profile

CLINICAL PROFILE:
ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
PRIMARY SCHEMA: Unrelenting Standards — observation-based strategic conclusion (watched sisters, concluded excellence = belonging = safety). Ego-syntonic. Engine of all other patterns.
SECONDARY SCHEMA: Subjugation (Rebel type) — objection to being instructed at all, not to content. Dynamic child tied to beam now fights any constraint.
UNDERLYING MECHANISM: Hypervigilant anticipation as survival strategy.
PRESENT BUT SECONDARY: Failure (Brian type) — contradicted by dream evidence.
NOT PRESENT: Defectiveness — patient correctly rejected throughout. No shame about core self.
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by threat. Soothing severely underdeveloped.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Social Simulation, P9=Third-Person Eval Simulation, P10=Rumination Engine, P11=Status Threat, P12=Post-Conflict Shame, P13=Reassurance Loop, P14=Interview Simulation Trap, P15=Authority Challenge Reactivity, P16=Authority Confusion Schema Response
KEY EQUATION: Student who couldn't say "I don't understand" = Manager who can't say "I need guidance."

Respond ONLY with a single valid JSON object. No preamble. No explanation. No markdown. No code fences. Start your response with { and end with }.`;

export function buildCreateFromDescriptionPrompt(description: string): string {
  return `The user describes this situation:\n\n"${description}"\n\nExtract the pattern and clinical analysis. Limit bookMappings to a maximum of 2 highly relevant entries.`;
}

const STRING = { type: "STRING" } as const;

export const createFromDescriptionSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    pattern: {
      type: "OBJECT",
      properties: {
        label: STRING,
        short: STRING,
        coreBelief: STRING,
        symptoms: { type: "ARRAY", items: STRING },
        cognitiveLabels: { type: "ARRAY", items: STRING },
        note: STRING,
      },
      required: ["label", "short", "coreBelief", "symptoms", "cognitiveLabels", "note"],
    },
    analysis: {
      type: "OBJECT",
      properties: {
        summary: STRING,
        schemaActivated: { type: "ARRAY", items: STRING },
        responseMode: { type: "STRING", enum: ["Surrender", "Escape", "Counterattack"] },
        systemsInvolved: { type: "ARRAY", items: { type: "STRING", enum: ["threat", "drive", "soothing"] } },
        relatedPatterns: { type: "ARRAY", items: STRING },
        bookMappings: {
          type: "ARRAY",
          description: "Max 2 entries",
          maxItems: 2,
          items: {
            type: "OBJECT",
            properties: { concept: STRING, source: STRING, relevance: STRING },
            required: ["concept", "source", "relevance"],
          },
        },
        practiceRecommendation: STRING,
      },
      required: [
        "summary", "schemaActivated", "responseMode",
        "systemsInvolved", "relatedPatterns", "bookMappings", "practiceRecommendation",
      ],
    },
  },
  required: ["pattern", "analysis"],
};
