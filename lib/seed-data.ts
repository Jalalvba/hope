import type { BookPattern } from "@/types";

export const SEED_BOOK_PATTERNS: Omit<BookPattern, "_id">[] = [
  {
    source: "Young & Klosko — Reinventing Your Life",
    concept: "Defectiveness Schema",
    description:
      "Core belief of being fundamentally flawed or shameful. The flaw feels hidden but exposure is the persistent terror. Shame — not guilt — is the affect. Located in the competence domain.",
    relatedSchemas: ["Defectiveness"],
    relatedPatterns: ["P3", "P7", "P9"],
    examples: [
      "Any critical email feels like evidence of the hidden flaw being discovered.",
      "Hierarchy activates shame anticipation regardless of actual performance.",
    ],
    practices: [
      "Imagery rescripting: connect the present fear to the original childhood scene and reparent.",
      "Track the gap between objective performance and subjective experience.",
    ],
  },
  {
    source: "Young & Klosko — Reinventing Your Life",
    concept: "Failure Schema",
    description:
      "Achievement-domain lifetrap. Genuine high performance processed as 'got away with it again' rather than as evidence. Brian-type impostor dynamic.",
    relatedSchemas: ["Failure"],
    relatedPatterns: ["P1", "P5", "P6"],
    examples: [
      "Promotion interpreted as 'they don't know yet' rather than earned recognition.",
      "Each accomplishment resets anxiety instead of building confidence.",
    ],
    practices: [
      "Log evidence of real competence — force the schema's filter into the open.",
      "Distinguish between the feeling of fraudulence and the fact of performance.",
    ],
  },
  {
    source: "Young & Klosko — Reinventing Your Life",
    concept: "Surrender Response",
    description:
      "Accepting the schema's premise and behaving in ways that confirm it. Reassurance-seeking is a classic surrender — it accepts that surveillance of the environment is required for safety.",
    relatedSchemas: ["Defectiveness", "Failure"],
    relatedPatterns: ["P2", "P4", "P5"],
    examples: [
      "Polling coworkers to check if the boss is angry.",
      "Compulsive inbox checking to close open loops.",
    ],
    practices: [
      "Identify the surrender behavior and the schema need it's trying to meet.",
      "Delay the surrender behavior by 10 minutes — the anxiety will peak and pass.",
    ],
  },
  {
    source: "Young & Klosko — Reinventing Your Life",
    concept: "Counterattack Response",
    description:
      "Fighting back against the schema through perfectionism, hostility, or pre-emptive defense construction. Feels like strength — is actually schema-driven.",
    relatedSchemas: ["Defectiveness", "Unrelenting Standards"],
    relatedPatterns: ["P3", "P6", "P7"],
    examples: [
      "Rehearsing arguments against criticism before any criticism arrives.",
      "Rapid hostile attribution to ambiguous signals.",
    ],
    practices: [
      "Notice the counterattack impulse as information — it signals schema activation, not real threat.",
      "Use the 60-second pause before any defense-building response.",
    ],
  },
  {
    source: "Gilbert & Choden — Mindful Compassion",
    concept: "Threat System Dominance",
    description:
      "The threat/protection system is chronically over-activated. When dominant, it suppresses soothing system activity and distorts all incoming information toward danger.",
    relatedSchemas: ["Defectiveness"],
    relatedPatterns: ["P3", "P4", "P7"],
    examples: [
      "Email arrives → immediate threat scan before any content is read.",
      "Meeting announced → body goes into fight/flight within seconds.",
    ],
    practices: [
      "Soothing rhythm breathing: slow the exhale — 5 counts in, 7 counts out.",
      "Name the system: 'This is my threat system firing, not evidence of actual danger.'",
    ],
  },
  {
    source: "Gilbert & Choden — Mindful Compassion",
    concept: "Fearful Striving",
    description:
      "Drive system contaminated by threat. Performance motivation is fear-driven, not satisfaction-driven. Accomplishments quiet the threat system briefly but never activate soothing — so they don't accumulate as felt confidence.",
    relatedSchemas: ["Failure", "Unrelenting Standards"],
    relatedPatterns: ["P1", "P5", "P6"],
    examples: [
      "Working late not because the task is engaging but to pre-empt the imagined verdict.",
      "Completing a project and feeling temporary relief rather than satisfaction.",
    ],
    practices: [
      "After completing a task, pause and deliberately notice what was accomplished before moving to the next.",
      "Ask: am I doing this because I want to, or because I'm afraid not to?",
    ],
  },
  {
    source: "Gilbert & Choden — Mindful Compassion",
    concept: "Soothing System Deficit",
    description:
      "The affiliative/soothing system was never trained to activate as a baseline. Safety was always conditional on the next performance. The circuit must be built deliberately through practice.",
    relatedSchemas: ["Defectiveness"],
    relatedPatterns: ["P2", "P4", "P5"],
    examples: [
      "50 confirmations of competence don't land because they arrive in threat context.",
      "Difficulty receiving warmth without immediately scanning it for conditional strings.",
    ],
    practices: [
      "Compassionate image practice: generate a sense of warmth directed inward for 5 minutes daily.",
      "Notice moments when the soothing system activates and linger there intentionally.",
    ],
  },
  {
    source: "Robichaud & Dugas — GAD Workbook",
    concept: "Intolerance of Uncertainty",
    description:
      "The primary driver behind patterns 1–7. Uncertainty is experienced as unbearable — the nervous system treats 'I don't know' as equivalent to 'I know and it is bad.'",
    relatedSchemas: ["Defectiveness", "Failure"],
    relatedPatterns: ["P1", "P2", "P3", "P4", "P7"],
    examples: [
      "An unread email creates the same anxiety as a confirmed negative one.",
      "Waiting for a boss's response triggers escalating scenarios with no evidence.",
    ],
    practices: [
      "Uncertainty exposure: deliberately leave small loops open and sit with the discomfort.",
      "Track how often the feared outcome actually materializes — the ratio is the data.",
    ],
  },
  {
    source: "Robichaud & Dugas — GAD Workbook",
    concept: "Positive Beliefs About Worry",
    description:
      "Implicit beliefs that worrying is useful — it prepares, prevents, motivates. These beliefs maintain worry behavior even when it causes suffering.",
    relatedSchemas: ["Unrelenting Standards"],
    relatedPatterns: ["P3", "P6", "P8"],
    examples: [
      "'If I rehearse the worst case, I'll be ready for it.'",
      "'Worrying means I take things seriously — stopping means I don't care.'",
    ],
    practices: [
      "Write down the positive belief about worry and test it empirically over two weeks.",
      "Ask: has worry actually prevented bad outcomes, or has it just accompanied them?",
    ],
  },
  {
    source: "Freeman & Garety — Paranoid Thoughts",
    concept: "Safety Behaviors in Social Context",
    description:
      "Behaviors performed to prevent the feared social outcome. They feel protective but maintain the belief that danger is real and that without them, harm would occur.",
    relatedSchemas: ["Defectiveness"],
    relatedPatterns: ["P2", "P3", "P8"],
    examples: [
      "Over-preparing for a meeting to prevent any gap in competence display.",
      "Monitoring colleagues' facial expressions for signs of contempt.",
    ],
    practices: [
      "Drop one safety behavior deliberately and observe whether the feared outcome occurs.",
      "Identify which safety behaviors are used most frequently — they reveal the feared outcome most precisely.",
    ],
  },
];
