// Shared building block for Gemini structured-output (responseSchema) objects.
// Both lib/createPatternPrompt.ts and lib/patternAnalysisSchema.ts build their
// schemas out of plain STRING properties — defined once here so they can't drift.

export const STRING = { type: "STRING" } as const;
