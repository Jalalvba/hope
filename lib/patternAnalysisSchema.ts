// Gemini structured-output schema for a PatternAnalysis (see types/index.ts).
//
// Mirrors the JSON shape the manual copy/paste prompt asks for, so the live
// call and the manual workflow produce the same object. This constrains the
// model's output — it does not replace validatePatternAnalysis(), which is
// still the gate before anything is persisted.

const STRING = { type: "STRING" } as const;

export const patternAnalysisSchema: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    summary: STRING,
    woundActivation: STRING,
    schemaActivated: { type: "ARRAY", items: STRING },
    responseMode: {
      type: "STRING",
      enum: ["Surrender", "Escape", "Counterattack", "Regulation"],
    },
    operationalFact: STRING,
    schemaNarrative: STRING,
    systemsInvolved: {
      type: "ARRAY",
      items: { type: "STRING", enum: ["threat", "drive", "soothing"] },
    },
    modesActive: { type: "ARRAY", items: STRING },
    schemaMaintenanceBelief: STRING,
    whatTheSchemaIsConstructing: STRING,
    whatTheSituationActuallyNeeds: STRING,
    emotionalSchemaRunning: STRING,
    relatedPatterns: { type: "ARRAY", items: STRING },
    bookMappings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { concept: STRING, source: STRING, relevance: STRING },
        required: ["concept", "source", "relevance"],
      },
    },
    regulationEvidence: { type: "STRING", nullable: true },
    practiceRecommendation: STRING,
    layerStatus: {
      type: "OBJECT",
      properties: { behavioral: STRING, cognitive: STRING, schema: STRING },
      required: ["behavioral", "cognitive", "schema"],
    },
    healingPath: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: STRING,
          source: STRING,
          framework: STRING,
          name: STRING,
          what: STRING,
          how: STRING,
          when: STRING,
          duration: STRING,
          frequency: STRING,
          successMarker: STRING,
          whyThisPattern: STRING,
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
