// Fact shared between the two Gemini call sites that reference the user's
// real clinical profile — lib/analyzePrompt.ts's CLINICAL_CONTEXT_DETAILED
// (used by both POST /api/patterns/analyze/generate and
// POST /api/patterns/create-from-description/generate). Kept here so it can't
// silently drift if quoted in more than one place. Do not templatize or
// genericize this file.

export const ROOT_BELIEF =
  "I am fundamentally at risk of being seen as incompetent by someone with power over me.";
