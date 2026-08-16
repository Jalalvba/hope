// Gemini structured-output schema for a PatternAnalysis (see types/index.ts).
//
// This is the SINGLE source of truth for the analysis output contract. The
// per-field instructions live here as schema `description`s rather than as a
// prose JSON mock inside the user prompt: Gemini enforces the shape from the
// schema itself, so a hand-written example object was pure duplicated input
// tokens on every call, and it could drift from the schema silently.
//
// It constrains the model's output — it does not replace
// validatePatternAnalysis(), which is still the gate before anything persists.
//
// `analyzedAt` and `generatedBy` are deliberately NOT in this schema: the model
// invents timestamps rather than reporting real ones, so both are stamped
// server-side in the route handler after the call returns.
//
// Array bounds (maxItems) are a deliberate output-token budget: every entry in
// healingPath copies a full RAG record verbatim, so an unbounded array is the
// one field that can blow past maxOutputTokens and truncate the response.

const STRING = { type: "STRING" } as const;

/** A STRING property carrying per-field instructions for the model. */
const str = (description: string) => ({ type: "STRING", description });

export const patternAnalysisSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    summary: str(
      "4-5 sentence clinical narrative. (1) Name the exact schema(s) active and which mechanism is driving. " +
        "(2) Trace to the classroom-to-AVIS equation OR childhood origin OR DEKRA confirmation — whichever is most precise for this activation. " +
        "(3) Name the dominant Gilbert system and why. (4) State what this pattern functionally maintains — specifically whether it protects the IMAGE of competence at the cost of actual effectiveness. " +
        "(5) Name the most active mode and its specific behavioral expression here."
    ),
    woundActivation: str(
      "One precise sentence — which specific formation is echoing here: the classroom scanning system, the family observation system, or the DEKRA confirmation event. Specific to this activation."
    ),
    schemaActivated: {
      type: "ARRAY",
      description: "Schemas active here, e.g. Unrelenting Standards, Subjugation, Failure. Never Defectiveness.",
      maxItems: 3,
      items: STRING,
    },
    responseMode: {
      type: "STRING",
      enum: ["Surrender", "Escape", "Counterattack", "Regulation"],
    },
    operationalFact: str(
      "What is objectively true in this situation, cleanly separated from schema construction. One sentence — what actually happened."
    ),
    schemaNarrative: str(
      "What the Demanding Critic constructed on top of that operational fact: the exact threat narrative, what the schema said this means about him and about the danger ahead."
    ),
    systemsInvolved: {
      type: "ARRAY",
      maxItems: 3,
      items: { type: "STRING", enum: ["threat", "drive", "soothing"] },
    },
    modesActive: {
      type: "ARRAY",
      description:
        "Schema modes active here, from: Demanding_Critic, Vulnerable_Child, Angry_Rebel_Child, Detached_Protector, Compliant_Surrender, Healthy_Adult.",
      maxItems: 3,
      items: STRING,
    },
    schemaMaintenanceBelief: str(
      "The exact internalized Demanding Critic voice in this activation, quoted in first person — \"I must...\" / \"If I don't...\" / \"They will see that...\". One sentence maximum."
    ),
    whatTheSchemaIsConstructing: str(
      "The catastrophe being predicted: what identity is at stake, what happens if the standard is not met. Precise to this activation, not generic."
    ),
    whatTheSituationActuallyNeeds: str(
      "What this situation actually requires given the patient's role at AVIS, separated from schema demands. Usually much simpler."
    ),
    emotionalSchemaRunning: str(
      "Which Leahy emotional schema dimension sustains the activation here — duration, controllability, validation, or rumination. One sentence naming the dimension and how it shows up in this specific activation."
    ),
    relatedPatterns: {
      type: "ARRAY",
      description: "P1 through P17 — those sharing the same underlying mechanism as this activation.",
      maxItems: 5,
      items: STRING,
    },
    bookMappings: {
      type: "ARRAY",
      description: "Max 2 entries — the two most relevant reference concepts only.",
      maxItems: 2,
      items: {
        type: "OBJECT",
        properties: {
          concept: str("Exact concept name from the provided records."),
          source: str("Exact book title."),
          relevance: str(
            "One precise sentence connecting this concept to THIS activation — not generic schema therapy, specific to what fired here."
          ),
        },
        required: ["concept", "source", "relevance"],
      },
    },
    regulationEvidence: {
      type: "STRING",
      nullable: true,
      description:
        "If this activation resembles one of the 8 confirmed regulation instances, name which one and what worked. Otherwise null.",
    },
    practiceRecommendation: str(
      "One concrete, immediately actionable technique from the provided records. Name it precisely and give one specific step for today — an instruction, not a description."
    ),
    layerStatus: {
      type: "OBJECT",
      properties: {
        behavioral: str(
          "What happened at the behavioral level — did he act on the schema or regulate? If regulation occurred, name it."
        ),
        cognitive: str(
          "Did he separate operational fact from schema narrative? Was the mode identified in real time or only in retrospect?"
        ),
        schema: str(
          "Which formation is driving this and what would need to shift at the deepest layer — imagery work, a behavioral experiment, or continued attractor consolidation through repetition."
        ),
      },
      required: ["behavioral", "cognitive", "schema"],
    },
    healingPath: {
      type: "ARRAY",
      description:
        "3-5 exercises, ordered: (1) immediate in-the-moment technique, (2) daily practice protocol, (3) weekly deeper work, (4) schema-level work if applicable. " +
        "Copy every field verbatim from the provided Healing Path records except whyThisPattern. Return [] if no records were provided.",
      maxItems: 5,
      items: {
        type: "OBJECT",
        properties: {
          id: str("Exact id from the Healing Path record."),
          source: str("Exact sourceShort from the record."),
          framework: str("Exact framework from the record."),
          name: str("Exact exercise name from the record."),
          what: str("Exact practice.what — do not paraphrase."),
          how: str("Exact practice.how — do not truncate."),
          when: str("Exact practice.when."),
          duration: str("Exact practice.duration."),
          frequency: str("Exact practice.frequency."),
          successMarker: str("Exact practice.successMarker."),
          whyThisPattern: str(
            "1-2 sentences: why this exercise applies to THIS activation. Reference the mechanism and name what in this pattern it directly addresses."
          ),
        },
        required: [
          "id", "source", "framework", "name", "what", "how",
          "when", "duration", "frequency", "successMarker", "whyThisPattern",
        ],
      },
    },
  },
  required: [
    "summary",
    "woundActivation",
    "schemaActivated",
    "responseMode",
    "operationalFact",
    "schemaNarrative",
    "systemsInvolved",
    "modesActive",
    "schemaMaintenanceBelief",
    "whatTheSchemaIsConstructing",
    "whatTheSituationActuallyNeeds",
    "emotionalSchemaRunning",
    "relatedPatterns",
    "bookMappings",
    "practiceRecommendation",
    "layerStatus",
    "healingPath",
  ],
};

// Used by POST /api/patterns/create-from-description/generate, which extracts
// a brand-new pattern's fields AND analyzes it (against patternAnalysisSchema
// above) in a single call.
const patternExtractionSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    label: str("Short clinical name for the pattern."),
    short: str("2-3 word version of the label."),
    coreBelief: str("The specific belief driving this, one sentence."),
    symptoms: { type: "ARRAY", description: "3-4 symptoms.", maxItems: 4, items: STRING },
    cognitiveLabels: { type: "ARRAY", description: "2-3 CBT distortions.", maxItems: 3, items: STRING },
    note: str("Which known patterns (P1-P17) this relates to."),
  },
  required: ["label", "short", "coreBelief", "symptoms", "cognitiveLabels", "note"],
};

export const createPatternWithAnalysisSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    pattern: patternExtractionSchema,
    analysis: patternAnalysisSchema,
  },
  required: ["pattern", "analysis"],
};
