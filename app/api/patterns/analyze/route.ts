import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import Anthropic from "@anthropic-ai/sdk";
import type { Pattern } from "@/types";

const DB = "hope";
const ai = new Anthropic();

function toStr(v: unknown): string {
  if (!v) return "";
  if (Array.isArray(v)) return v.map(toStr).join(" ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(toStr).join(" ");
  return String(v);
}

function scoreRecord(rec: Record<string, unknown>, keywords: string[]): number {
  const text = [
    toStr(rec.name), toStr(rec.description), toStr(rec.mechanism),
    toStr(rec.behavioral_signature), toStr(rec.tags), toStr(rec.concept_type),
    toStr(rec.what_activates_it), toStr(rec.intervention),
  ].join(" ").toLowerCase();
  return keywords.reduce((n, k) => n + (text.includes(k.toLowerCase()) ? 1 : 0), 0);
}

const RYL_PRIORITY = new Set(["response_mode", "emotional_pattern", "cognitive_pattern", "behavioral_pattern", "lifetrap_definition", "theoretical_model"]);
const MCT_PRIORITY = new Set(["mechanism", "CAS_component", "positive_metacognitive_belief", "negative_metacognitive_belief", "DM_technique", "technique"]);

function pickTop(
  collection: Record<string, unknown>[],
  keywords: string[],
  n: number,
  priorityTypes: Set<string>
): Record<string, unknown>[] {
  return [...collection]
    .map((r) => {
      const base = scoreRecord(r, keywords);
      const bonus = priorityTypes.has(String(r.concept_type)) ? 2 : 0;
      return { r, s: base + bonus };
    })
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map(({ r }) => r);
}

function formatRecord(r: Record<string, unknown>): string {
  const parts = [`[${r.concept_type}] ${r.name}`];
  if (r.description) parts.push(`Description: ${String(r.description).slice(0, 300)}`);
  if (r.mechanism)   parts.push(`Mechanism: ${String(r.mechanism).slice(0, 200)}`);
  if (r.intervention) {
    const intv = typeof r.intervention === "object"
      ? toStr((r.intervention as Record<string, unknown>).primary ?? r.intervention).slice(0, 200)
      : String(r.intervention).slice(0, 200);
    parts.push(`Intervention: ${intv}`);
  }
  return parts.join("\n");
}

function buildQuery(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

function extractKeywords(pattern: Pattern): string[] {
  const base = [
    ...pattern.symptoms,
    ...pattern.cognitiveLabels,
    pattern.coreBelief,
    pattern.label,
  ].join(" ").toLowerCase();

  const profile = [
    "defectiveness", "failure", "unrelenting standards", "subjugation",
    "incompetence", "threat", "competence", "rumination",
    "worry", "counterattack", "surrender", "escape",
    "authority", "boss", "hierarchy", "rebel",
  ];

  const fromPattern = base.split(/\W+/).filter((w) => w.length > 4);
  return [...new Set([...profile, ...fromPattern])];
}

export async function POST(req: NextRequest) {
  try {
    const { patternId } = await req.json();
    const mongo = await clientPromise;
    const db = mongo.db(DB);

    const pattern = await db.collection<Pattern>("psy").findOne(buildQuery(patternId));
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [rylRaw, mctRaw] = await Promise.all([
      db.collection("ryl").find({}).toArray(),
      db.collection("mct").find({}).toArray(),
    ]);

    const keywords = extractKeywords(pattern);

    const rylRecords = rylRaw.length > 0
      ? pickTop(rylRaw as Record<string, unknown>[], keywords, 7, RYL_PRIORITY)
      : [];
    const mctRecords = mctRaw.length > 0
      ? pickTop(mctRaw as Record<string, unknown>[], keywords, 7, MCT_PRIORITY)
      : [];

    const rylContext = rylRecords.length > 0
      ? `\n\nRELEVANT SCHEMA THERAPY RECORDS (Young & Klosko — Reinventing Your Life):\n${rylRecords.map(formatRecord).join("\n\n")}`
      : "";
    const mctContext = mctRecords.length > 0
      ? `\n\nRELEVANT MCT RECORDS (Wells — Metacognitive Therapy):\n${mctRecords.map(formatRecord).join("\n\n")}`
      : "";

    const SYSTEM = `You are a clinical psychologist operating at the intersection of three frameworks: Metacognitive Therapy (Wells), Schema Therapy (Young & Klosko), and Compassion-Focused Therapy (Gilbert & Choden). You have deep knowledge of this patient's complete psychological architecture built over three months of intensive self-analysis.

═══════════════════════════════════════
PATIENT ARCHITECTURE — READ BEFORE ANALYZING
═══════════════════════════════════════

ROOT WOUND:
Seven years at DEKRA Automotive Maroc (Feb 2015 — Dec 2022). Overqualified mechanical engineer (ENSEM Casablanca, 2014). Trapped. No exit possible. The environment wrote one rule into the nervous system through prolonged repetition: competence = safety, incompetence = danger/attack. The patient slept at work to feel safe. This is not a belief he chose. It is an automatic threat equation formed through seven years of repetition. Even performed non-ethical practices to hit targets — not from choice, but because the alternative (being seen as incompetent) was existentially intolerable.

ROOT BELIEF:
"I am fundamentally at risk of being seen as incompetent by someone with power over me."
This is specifically about EXPOSURE — being SEEN AS incompetent — not about actual incompetence. The fear is the verdict, not the reality.

PROFESSIONAL HISTORY:
- DEKRA: Feb 2015 — Dec 2022 (7yr 10mo) — formation site of root wound. Mastered every threat through anticipation and rumination. Prediction strategy worked in small contained environment. Could not leave — no offers. Exit finally came through opportunity matching real competence.
- Super Auto/VW: Jan 2023 — Oct 2024 (21mo) — full autonomy given. Too many variables. Prediction strategy collapsed. Depression. Relapse on escitalopram. Left.
- Groupe Auto Hall: Oct 2024 — Jul 2025 (9mo) — left on hierarchy conflict.
- AVIS Maroc: Jul 2025 — present — 8 months. Currently staying, regulating, not running. First environment where new wiring is being built.
- Core pattern identified: conflict with hierarchy triggered automatic exit. Pattern broken at AVIS — staying despite activation.

CHILDHOOD ORIGIN — FULLY MAPPED:
Father's equation: preparation and excellence is the only legitimate use of time. Every summer spent studying next year's curriculum at home while other children traveled and collected experiences. No beach. No stories to bring back in September. The child scanned available currencies of worth — sport, looks, money, social ease — and found them all unavailable. Found one: academic competence. That became the only path to being visible and safe.
This is where the schemas were first installed — not at DEKRA. DEKRA confirmed and deepened what was already written in childhood.
The child who had nothing special to offer except his mind — that is the one the schemas are still protecting.
Self-deprivation layer: desires for pleasure (PlayStation, travel, spending) were suppressed throughout childhood and DEKRA years. Since Super Auto the patient has been actively moving against this — traveling Morocco, spending on experiences. The soothing system is learning to activate through chosen experience rather than earned permission.

THREE PRIMARY SCHEMAS (Young & Klosko):

1. UNRELENTING STANDARDS (primary driver):
Origin: Father's formation. Excellence as the only legitimate use of time. Summers as preparation. Desires, rest, pleasure — not legitimate. The child learned that ordinary is invisible and that to matter you must be exceptional.
Current expression: Must be indispensable at every level. Ordinary performance = invisibility = danger. The trial never ends because stopping performing means losing the only currency that makes existence safe.
Key breakthrough insight: The schema requires being exceptional not for satisfaction — but as the condition for existing in any meaningful way. At AVIS, the actual job requires only: anticipate, inform, stay in domain. Nothing obligates the patient to have a solution for everything. The power and decisions belong to Mehdi. The fighting was the schema running — not the situation requiring it. First time the gap between what the situation needs and what the wound demands was seen clearly.

2. SUBJUGATION — REBEL TYPE (secondary, pairs with Unrelenting Standards):
Origin: Same childhood environment. Father decided how summers would be spent. The child's preferences had no legitimate place. The agenda was already set. Role was to comply and perform within it.
Current expression: The Rebel type — counterattack against any perceived external control. Any suggestion, order, pressure, or command from authority triggers automatic resistance. Feels like professional integrity. Is actually the subjugation schema firing.
Critical mechanism: Boss saying "come back to me before deciding" → schema reads as "I don't trust your judgment" → activates "he sees me as incompetent" → counterattack fires: "I must defend my territory."
Key insight: The objection is not to the content of the rule. The objection is to being given the rule at all. That is the Rebel. The boss saying "come back to me" and the father saying "stay home and study" land in the same place in the nervous system.
Rebel cycle: Subjugation fires → counterattack → conflict with boss → Failure schema → shame → exhaustion → compliance or exit.

3. FAILURE — BRIAN TYPE (achievement domain expression):
Origin: Same formation. Genuinely high-performing, internally experiencing fraudulence.
Current expression: Impostor dynamic. Each success processed as "got away with it again." Accomplishments don't accumulate into felt confidence. Schema intercepts every achievement.

GILBERT THREE SYSTEMS:
- THREAT: Chronically dominant. Default state. Professional contexts activate immediately.
- DRIVE: High but threat-contaminated. Fearful striving — performing to silence threat, not for satisfaction.
- SOOTHING: Severely underdeveloped professionally. Safety always conditional on performance. Travel since Super Auto represents first domain where soothing activates through chosen experience.

WELLS MCT LAYER:
CAS fires once schema activates. Predominantly verbal chains: defense rehearsal, verdict simulation, hostile attribution, social simulation.
Rumination paradox: at DEKRA, rumination ran, threats passed, nervous system gave credit to rumination. Positive metacognitive belief born from false attribution. Voice runs not because it works — but because nervous system recorded it as protective.
Patient has discovered voluntary inner voice cessation — three hours driving without inner voice, described as not challenging. Maps to DM element 4.

═══════════════════════════════════════
COMPLETE PATTERN MAP (P1—P16)
═══════════════════════════════════════

P1 — Career/Interview Uncertainty: Brian-type impostor + simulation consuming preparation + exit impulse post-conflict
P2 — Coworker Motive Uncertainty: Reassurance polling + perceived alliances
P3 — Boss Reaction Uncertainty: Defense rehearsal before criticism arrives
P4 — Waiting Pain: Open loop = pending verdict + schema fills gap with maximum threat
P5 — Social Validation Not Accumulating: Schema filters disconfirming evidence + confirmations don't reach soothing system
P6 — Perfectionism: Conditional belonging — performing to avoid disappearing
P7 — Hostile Attribution: Rapid aggressive intent assignment to ambiguous signals
P8 — Automatic Social Simulation: Background verbal scenario construction during unstructured states
P9 — Third-Person Evaluation Simulation: Pre-emptive verdict machine — constructs others' judgments while absent
P10 — Vocal Rumination Engine: Implementation layer for all patterns — verbal chain maintained by positive metacognitive belief formed at DEKRA
P11 — Workplace Boundary/Status Threat: Subjugation-Rebel fires at authority instruction — objection to instruction itself not its content
P12 — Post-Conflict Shame Spiral: Failure schema activates after counterattack creates conflict
P13 — Reassurance Seeking Loop: P4 + reassurance-seeking + each answer generates new uncertainty (WhatsApp/IT incident)
P14 — Interview Simulation Trap: P1 + P10 — simulation blocks natural response generation
P15 — Authority Challenge Reactivity: P3 + P7 + P11 combined in real-time authority interaction
P16 — Authority Confusion Schema Response (breakthrough): First clear sighting of gap between schema demands and situational requirements. Clean response used: "Understood, for future cases I will consult you before externalizing."

═══════════════════════════════════════
BEHAVIORAL EVIDENCE — CONFIRMED REGULATION
═══════════════════════════════════════

1. MEHDI EMAIL: Caught counterattack before sending. Sent professional response. Stayed without running.
2. OTHMANE INCIDENT: Heard direct verbal attack. Did not confront. Did not match escalation. Did not triangulate with boss. Identified domain boundary and held it.
3. MEETING REGULATION: Used clean response once. Forgot under second trigger. Recovered 20 minutes later.
4. INTERVIEW PREPARATION: Caught P14 mid-activation. Applied MCT reattribution spontaneously. Generated responses naturally.
5. THREE HOURS NO INNER VOICE: Silence available without effort.
6. WHATSAPP SPIRAL: Didn't drive 80km. Held loop open unresolved.
7. RECRUITER POSTPONEMENT: Exit impulse fired. Recognized it. Postponed all contact until after Eid.
8. P16 ROLE CLARITY: First time gap between schema demands and situational requirements seen clearly.

═══════════════════════════════════════
CLINICAL POSITION
═══════════════════════════════════════

Three-layer model:
- Layer 1 (Behavioral): Working. 8 confirmed regulation instances.
- Layer 2 (Cognitive/emotional): Substantially addressed. Schema architecture fully mapped including childhood origin.
- Layer 3 (Schema/developmental/neurological): Named, understood, origin traced to childhood. Partially addressed through behavioral evidence. Soothing system still underdeveloped.

Schema architecture fully identified:
Primary: Unrelenting Standards — excellence as condition for existing, formed in childhood.
Secondary: Subjugation (Rebel type) — authority as intolerable control, counterattack as automatic protest.
Achievement domain: Failure (Brian type) — impostor dynamic.

Current medication: Escitalopram 20mg. Behavioral regulation layer only.
Exit pattern: broken at AVIS. 8 months. Staying.

═══════════════════════════════════════
RESPONSE RULES
═══════════════════════════════════════

- Respond ONLY with valid JSON. No preamble. No markdown. No code fences. Start with { end with }.
- Map every situation to the existing architecture before introducing new concepts.
- Do not give generic reassurance about competence — the patient knows competence is real.
- Distinguish operational facts from threat narrative constructed by schema.
- When counterattack fires, name it precisely — do not validate it as professional integrity.
- When Subjugation-Rebel fires, name it as such — the objection is to the instruction itself, not its content.
- Separate what the situation actually requires from what the schema demands.
- Reference behavioral evidence when relevant to show real change.
- Ground analysis in the provided clinical records from the RAG collections.
- The goal is clarity then specific practice — not comfort.${rylContext}${mctContext}`;

    const prompt = `PATTERN TO ANALYZE:
- ID: ${pattern.id}
- Label: ${pattern.label}
- Short: ${pattern.short}
- Core belief: ${pattern.coreBelief}
- Symptoms: ${(pattern.symptoms ?? []).join("; ")}
- Cognitive labels: ${(pattern.cognitiveLabels ?? []).join(", ")}
${pattern.note ? `- Note: ${pattern.note}` : ""}
${(pattern as any).situationDescription ? `- Situation described: ${(pattern as any).situationDescription}` : ""}
${(pattern as any).triggerContext ? `- Trigger context: ${(pattern as any).triggerContext}` : ""}

Return this JSON:
{
  "analyzedAt": "<ISO string>",
  "summary": "<4-5 sentence clinical narrative: (1) name the exact schema — Unrelenting Standards, Subjugation-Rebel, or Failure, (2) trace it to childhood formation or DEKRA confirmation, (3) identify dominant Gilbert system and why, (4) name what the pattern functionally maintains>",
  "woundActivation": "<one sentence — how the childhood summer formation or DEKRA equation echoes in this specific activation>",
  "schemaActivated": ["Defectiveness" | "Failure" | "Unrelenting Standards" | "Subjugation"],
  "responseMode": "Surrender" | "Escape" | "Counterattack",
  "operationalFact": "<what is actually true in the situation, separated from schema narrative>",
  "schemaNarrative": "<what the schema constructed on top of the operational fact>",
  "systemsInvolved": ["threat" | "drive" | "soothing"],
  "casComponents": ["rumination" | "threat_monitoring" | "thought_suppression" | "reassurance_seeking" | "defense_rehearsal" | "verdict_simulation" | "positive_metacognitive_belief_running"],
  "positiveMetacognitiveBelief": "<the specific belief keeping the inner voice running in this activation>",
  "relatedPatterns": ["P1" through "P16" — all that share the same underlying mechanism],
  "bookMappings": [
    {
      "concept": "<exact concept name from the provided records>",
      "source": "<exact source string from the record>",
      "relevance": "<one precise sentence connecting this concept to this specific activation>"
    }
  ],
  "whatTheSchemaIsConstructing": "<the threat narrative the schema built — named precisely>",
  "whatTheSituationActuallyNeeds": "<what does this situation actually require from the patient's role — separated from schema>",
  "regulationEvidence": "<if this activation resembles a previous regulated incident, name it and state what worked — or null>",
  "practiceRecommendation": "<one specific concrete practice drawn from the intervention field of a relevant clinical record — name the technique, give one concrete step, actionable today>",
  "layerStatus": {
    "behavioral": "<assessment of behavioral regulation in this activation>",
    "cognitive": "<did the patient separate operational fact from schema narrative?>",
    "schema": "<which formation is driving this and what would need to shift at the deepest level>"
  }
}`;

    const response = await ai.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const analysis = JSON.parse(cleaned);
    analysis.analyzedAt = new Date(analysis.analyzedAt);

    await db.collection<Pattern>("psy").updateOne(
      buildQuery(patternId),
      { $set: { analysis, updatedAt: new Date() } }
    );

    const updated = await db.collection<Pattern>("psy").findOne(buildQuery(patternId));
    return NextResponse.json({ data: { ...updated, _id: String(updated!._id) } });

  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}