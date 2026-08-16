// Shared building block for Gemini structured-output (responseSchema) objects.
// lib/patternAnalysisSchema.ts builds its schemas out of plain STRING
// properties — defined once here so they can't drift.

export const STRING = { type: "STRING" } as const;
