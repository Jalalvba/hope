// Facts shared between the two clinical prompt builders:
//   - lib/createPatternPrompt.ts (CLINICAL_CONTEXT — compact, no RAG)
//   - lib/analyzePrompt.ts       (CLINICAL_CONTEXT_DETAILED — full architecture, RAG-grounded)
// Kept in one place so the two prompts can't silently drift apart on facts
// that must always agree (e.g. the compact pattern list previously stopped at
// P16 while the detailed one already had P17). Contains the user's real
// clinical profile — do not templatize or genericize this file.

export const ROOT_BELIEF =
  "I am fundamentally at risk of being seen as incompetent by someone with power over me.";

// Canonical id -> compact label for every known pattern. The detailed prompt
// (analyzePrompt.ts) describes each of these at length in its own pattern
// map; this is only the short form used by the compact create-from-description
// prompt, and the source of truth for which pattern IDs exist at all.
export const KNOWN_PATTERNS: { id: string; label: string }[] = [
  { id: "P1", label: "Career Uncertainty" },
  { id: "P2", label: "Coworker Motives" },
  { id: "P3", label: "Boss Reaction" },
  { id: "P4", label: "Waiting Pain" },
  { id: "P5", label: "Social Validation" },
  { id: "P6", label: "Perfectionism" },
  { id: "P7", label: "Hostile Attribution" },
  { id: "P8", label: "Auto Social Simulation" },
  { id: "P9", label: "Third-Person Eval Simulation" },
  { id: "P10", label: "Rumination Engine" },
  { id: "P11", label: "Status Threat" },
  { id: "P12", label: "Post-Conflict Shame" },
  { id: "P13", label: "Reassurance Loop" },
  { id: "P14", label: "Interview Simulation Trap" },
  { id: "P15", label: "Authority Challenge Reactivity" },
  { id: "P16", label: "Authority Confusion Schema Response" },
  { id: "P17", label: "Threat System Deactivation" },
];

export const KNOWN_PATTERNS_COMPACT = KNOWN_PATTERNS.map((p) => `${p.id}=${p.label}`).join(", ");
