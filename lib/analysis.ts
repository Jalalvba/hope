import Anthropic from "@anthropic-ai/sdk";
import type { Observation, ObservationAnalysis, BookPattern, PatternId } from "@/types";
import { PATTERN_META } from "@/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a clinical psychologist specialized in schema therapy (Jeffrey Young),
compassion-focused therapy (Paul Gilbert), and CBT for anxiety.

You are analyzing psychological observations logged by a specific individual. Here is their full clinical profile:

CORE WOUND: Shame located in competence. Root belief: "The boss sees me as incompetent."
Schema architecture: Defectiveness (root) → Failure (achievement domain) → Unrelenting Standards (compensatory)

GILBERT THREE SYSTEMS:
- Threat system: chronically dominant, default state
- Drive system: high but threat-contaminated (fearful striving — performing to keep threat quiet, not for satisfaction)
- Soothing system: severely underdeveloped in professional contexts — safety was always conditional on next performance

THE 9 PERSONAL PATTERNS:
P1 — Interview/Career Uncertainty: LinkedIn scanning, impostor dynamic, success processed as reprieve not evidence
P2 — Coworker Motive Surveillance: reassurance polling, surrender response, accepts schema's premise that surveillance is required
P3 — Boss Criticism/Defense Rehearsal: counterattack, constructing defenses before attack arrives
P4 — Waiting Pain: every open loop = pending verdict, intolerance of uncertainty, longer loop = longer under judgment
P5 — Social Validation Not Accumulating: schema filters out confirmations, they never land as safety
P6 — Perfectionism/Unrelenting Standards: conditional belonging, performance = existence, time-boxing needed
P7 — Hostile Attribution: rapid assignment of aggressive intent to ambiguous signals, certainty preferred over open verdict
P8 — Automatic Social Simulation: continuous background scenario construction, childhood-origin, ego-syntonic
P9 — Third-Person Evaluation Simulation: pre-emptive verdict machine, watches others discuss him while absent, schema fills gaps with worst answer

5-STEP PROTOCOL (what he should do when threat fires):
1. Feel it in the body first
2. Name the trigger precisely
3. Check for actual evidence
4. Do nothing for 60 seconds
5. Ask what the situation actually needs

ORIGIN CONTEXT: 7 years and 10 months at DEKRA Automotive Maroc (2015–2022). Overqualified, threat-competence-safety equation formed there. After exit became possible: conflict with hierarchy = automatic escape pattern. Now 3 months into active self-analysis, staying instead of running.

Respond ONLY with valid JSON. No preamble. No markdown. No fences.`;

export async function analyzeObservation(
  observation: Pick<Observation, "patterns" | "trigger" | "bodySensation" | "responseTaken" | "reflection">,
  bookPatterns: BookPattern[]
): Promise<ObservationAnalysis> {
  const patternLabels = observation.patterns.map(
    (p) => `${p}: ${PATTERN_META[p as PatternId].label}`
  );

  // Only send book patterns relevant to the triggered patterns
  const relevant = bookPatterns
    .filter((bp) =>
      bp.relatedPatterns.some((p) => observation.patterns.includes(p as PatternId))
    )
    .slice(0, 6);

  const userMessage = `
OBSERVATION:
- Patterns triggered: ${patternLabels.join("; ")}
- Trigger (what happened): ${observation.trigger}
- Body sensation: ${observation.bodySensation || "not recorded"}
- Response taken: ${observation.responseTaken || "not recorded"}
- Reflection: ${observation.reflection || "not recorded"}

RELEVANT BOOK PATTERNS:
${JSON.stringify(relevant, null, 2)}

Return a JSON object with EXACTLY this shape:
{
  "analyzedAt": "<ISO date string>",
  "summary": "<2-3 sentence clinical narrative — precise, not reassuring, maps to the specific schema dynamics at play>",
  "schemaActivated": ["Defectiveness" | "Failure" | "Unrelenting Standards"],
  "responseMode": "Surrender" | "Escape" | "Counterattack",
  "systemsInvolved": ["threat" | "drive" | "soothing"],
  "bookMappings": [
    {
      "source": "<exact BookSource string>",
      "concept": "<concept name>",
      "relevance": "<one sentence — why this concept applies to THIS specific observation, not generic>"
    }
  ],
  "protocolStep": <1|2|3|4|5 or null>,
  "practiceRecommendation": "<one specific, concrete practice drawn from the book frameworks — not generic advice, grounded in this specific observation>"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = JSON.parse(text) as ObservationAnalysis;
  parsed.analyzedAt = new Date(parsed.analyzedAt);
  return parsed;
}
