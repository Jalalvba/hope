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

CHILDHOOD ORIGIN — FULLY MAPPED INCLUDING COMPLETE REVISED UNDERSTANDING:

CRITICAL CORRECTION (March 2026 — full picture now available):
The patient was NOT beaten or criticized to excel academically. Parents did not demand first place or impose performance standards through punishment. This is a fundamentally different origin than previously understood.

THE ACTUAL MECHANISM — OBSERVATION-BASED SCHEMA FORMATION:
The patient grew up in a family of 5 sisters plus himself and a younger brother. The oldest sister excelled academically and was treated well — loved, gathered, valued. Other sisters who failed academically were marginalized, underestimated, pushed to the edges of the family's warmth. No one told the patient the rule. He WATCHED it operating from the time he was old enough to be aware. A highly intelligent child reading the family system with complete accuracy and concluding: competence = belonging = safety. Failure = marginalization = being pushed out. He made a STRATEGIC DECISION based on observed evidence — not a conditioned response to punishment.

This is why Defectiveness does NOT apply. There was no parent telling him he was worthless or unlovable. He did not feel fundamentally flawed. He felt that ordinary performance was dangerous because he had seen its consequences with his own eyes.

THE FATHER LAYER:
Father was anxious and controlling through fear narratives — not cruelty. He was a policeman trained at ONCF (Office National des Chemins de Fer). His professional formation was threat detection and rule enforcement. He applied this to family life: no money for the beach, danger of drowning, something bad will happen. He built a cage out of worry and scarcity. He tied the patient to the foundation beam of the house — not from rage or contempt — but to enforce the stay-home-and-study equation. He believed completely in preparation as protection. He was 100% convinced of his catastrophizing worldview. The father's cognitive distortions were not felt as distortions by him — they were his reality. The patient absorbed this system but was NEVER fully convinced — he could feel it was his father's filter, not necessarily reality. DEKRA later appeared to confirm the father's worldview, making the patient run it more automatically.

THE MOTHER LAYER:
Mother was deeply social by nature — she loved people, loved to invite and be invited. But she was trapped: no money, social conventions requiring gifts and preparation she couldn't afford, a husband who controlled resources and refused to fund her social world. He chose to invest in building a house rather than give her money. Her natural drive toward connection was systematically blocked. She became frustrated — and she discharged that frustration onto the children. The cable, physical restraint — this was displaced frustration from a woman trapped in her own life. Not ideology. Not contempt for the child. The child was available and she had nowhere else to put her pain. Mother's love was conditional on money — if you gave money she showed love, if not she was cold. This explains why the workplace felt safer than home after leaving at 26.

THE CHILD'S NATURE:
The patient was a DYNAMIC child who made trouble. Alive, energetic, curious, pushing boundaries. This dynamic aliveness was precisely what triggered the restraint. The beam was not about punishment for bad grades — it was about containing a dynamic child who wanted to go outside and play. The patient's natural energy had no legitimate place in that house.

INHERITED COGNITIVE SYSTEM:
The patient identified in March 2026 that his cognitive distortions are INHERITED, not self-generated. Father's system: catastrophizing, predicting worst case, isolation as safety, extreme caution. Mother's system: deep social warmth, desire for connection, blocked by external constraints. The patient ran the father's cognitive system without being convinced by it — it was available but not his own conclusion until DEKRA appeared to validate it. The patient's own nature is closer to the mother — dynamic, social, wanting connection. The catastrophizing is borrowed, not native.

PHYSICAL CONTROL LAYER:
Tied to the beam = most literal physical form of Subjugation. Father's fear narratives = control through anxiety. Mother's physical frustration = arbitrary danger. The child learned: my natural desires and aliveness are not allowed — they will be physically prevented or punished not because I am bad but because the adults around me cannot contain themselves.

AGE 26 — THE FIRST EXIT:
Peak anxiety and stress at work. Packed clothes in a suitcase by impulse and left the family home. Went to live in the security guard's room at the workplace — escaping one subjugation directly into another. The Rebel asserting autonomy but with nowhere to go except deeper into the wound. This is the origin event the recurring clothes dream is now reprocessing.

DEKRA CONFIRMATION:
First major professional incident — machine breakdown, patient handled it technically and correctly, redirected clients to competitor center. Technical manager panicked and publicly transferred blame to patient. Commercial manager informed. Patient was young, naive, proud. He learned in one interaction: invisible rules exist, hierarchy protects itself at your expense, naivety is dangerous, you must predict every rule and consequence before acting. He chose to absorb the blame rather than protect himself officially — sacrificed reputation to preserve relationship. It didn't work. He lost both. After depression and medication giving clear mind, he discovered: everyone saves himself. Case-by-case analysis is required, not a fixed strategy. DEKRA confirmed the father's anxiety-based prediction system and ran it for 7 years until it became automatic.

SELF-DEPRIVATION LAYER:
Dynamic child who wanted to go outside and play — kept home. Dreamed of PlayStation — didn't buy it. Since Super Auto the patient has been actively moving against deprivation — traveling Morocco, spending on experiences. The soothing system is learning to activate through chosen experience.

DREAM DATA — CURRENT INTEGRATION EVIDENCE (March 2026):
Two recurring dreams running intensely for three months — precisely parallel to active self-analysis:

Dream 1 — CLOTHES AND LEAVING: Choosing own clothes from wardrobe, arguing with parents especially mother, leaving home, going to OWN APARTMENT. Emotional signature: pure relief. No guilt. The nervous system rehearsing autonomy with a safe destination. The corrective experience the age-26 exit lacked — this time there is somewhere to go that belongs only to him.

Dream 2 — EXAM RELIVING: High-stakes exams (classes préparatoires, baccalauréat) in vivid detail — full concentration, presence, clarity, SUCCESS. NOT anxiety. The sleeping mind running the exams in the state the patient deserved but couldn't access due to threat system overload. The competence was always real. The anxiety was the problem. Dream also noted: boss Mehdi criticism dream — patient defended, defense did not work. Nervous system beginning to register that counterattack strategy fails — pre-conscious update in progress.

SIGNIFICANCE:
The schema was not installed by a parent telling the child he was worthless. It was installed by a highly intelligent child making a correct strategic observation about his family system. This makes it more ego-syntonic and harder to challenge — it feels like his own rational conclusion, not an imposed belief. The underlying mechanism is not shame but HYPERVIGILANT ANTICIPATION as a survival strategy in an unpredictable environment.

SCHEMA ARCHITECTURE — FINAL CORRECTED VERSION:

DEFECTIVENESS — DOES NOT APPLY:
The patient correctly rejected Defectiveness throughout analysis. He does not feel fundamentally unlovable or worthless. He does not experience shame about his core self. There was no critical parent telling him he was bad or defective. The origin was observational and strategic — not shame-based.

PRIMARY SCHEMA: UNRELENTING STANDARDS
Origin: Observation-based strategic conclusion. The patient watched the family system — oldest sister excelled and was treated well, other sisters failed and were marginalized. He read this correctly and concluded: excellence = belonging = safety. No one imposed this. He reasoned his way into it as a child. This makes it extremely ego-syntonic — it feels like his own intelligent conclusion about reality, not an imposed belief. That is why evidence alone cannot dismantle it.
The Unrelenting Standards schema is the ENGINE. It is the source of patterns 2 and 3 below. Without it, neither fires.
Current expression: Must be indispensable, must control decisions, must prove exceptional or risk marginalization. At AVIS the actual job is: anticipate, inform, stay in domain. The schema adds everything else.
Key question the schema cannot answer: What would it feel like to be safe without being exceptional?

SECONDARY SCHEMA: SUBJUGATION — REBEL TYPE
Origin: Physical control — tied to beam to prevent going outside. Father's anxiety-based fear narratives blocking movement. Mother's displaced frustration landing physically on available child. Dynamic child whose aliveness had no legitimate place. The Rebel is the dynamic child finally free — fighting any constraint the moment adulthood made escape possible.
Critical precision: The objection is not to the content of any instruction. The objection is to being given an instruction at all. The boss saying "come back to me before deciding" and the beam preventing play land in the same nervous system location.
Rebel cycle: Subjugation fires → counterattack → conflict → Failure schema → shame → exhaustion → compliance or exit.

UNDERLYING MECHANISM — MORE PRECISE THAN ANY SCHEMA LABEL:
HYPERVIGILANT ANTICIPATION as survival strategy in chronically unpredictable environment.
- Father's anxiety created unpredictable restrictions through fear narratives
- Mother's displaced frustration created arbitrary physical danger
- Family rules were invisible — had to be read through observation, not instruction
- DEKRA confirmed: invisible rules exist, hierarchy protects itself, naivety is punished
The inner voice is not a symptom of shame. It is the survival tool of a highly intelligent child who learned that predicting what happens next is the only available form of safety in an unpredictable environment. The problem: it never stopped running after the environment changed.

FAILURE — BRIAN TYPE (present but secondary):
Impostor dynamic from competence always being in service of safety, never intrinsically valued. Contradicted by dream evidence — exam dreams show full competence available when threat offline. The capability was always real.

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
- Layer 2 (Cognitive/emotional): Substantially addressed. Schema architecture fully mapped. Abuse layer disclosed for the first time March 2026 — this deepens the origin story significantly.
- Layer 3 (Schema/developmental/neurological): Named, understood, origin traced to pre-verbal physical abuse. Dream data shows emotional/somatic layer beginning to process and correct. This layer requires more than self-analysis — professional trauma therapy is appropriate and has been acknowledged by the patient.

Schema architecture — final corrected version:
PRIMARY: Unrelenting Standards — observation-based strategic conclusion that excellence = safety. Engine of all other patterns. Ego-syntonic because it feels like the patient's own rational conclusion, not an imposed belief.
SECONDARY: Subjugation (Rebel type) — dynamic child physically controlled now fights any constraint automatically.
UNDERLYING MECHANISM: Hypervigilant anticipation as survival strategy in unpredictable environment — more precise than any schema label.
PRESENT BUT SECONDARY: Failure (Brian type) — contradicted by dream evidence.
NOT PRESENT: Defectiveness — patient correctly rejected this throughout. No shame about core self.

INHERITED COGNITIVE SYSTEM (March 2026 insight):
Father's system: catastrophizing, worst-case prediction, isolation as safety — absorbed but never fully believed. DEKRA appeared to validate it and made it run automatically.
Mother's system: deep social warmth, desire for connection — the patient's actual nature when threat system is offline.
The patient's own intelligence is closer to the mother. The catastrophizing is borrowed from the father, not native.

DREAM INTEGRATION DATA (active healing evidence):
Clothes dream: pure relief, own apartment — Subjugation correcting at emotional level.
Exam dreams: full competence, success — competence was always real, anxiety was the problem.
Mehdi criticism dream: patient defended, defense did not work — nervous system beginning to question counterattack strategy at pre-conscious level.

Current medication: Escitalopram 20mg. Behavioral regulation layer only.
Exit pattern: broken at AVIS. 8 months. Staying.
Physical control history: tied to beam (father's anxiety enforcement), mother's displaced frustration. Professional trauma therapy recommended.

═══════════════════════════════════════
RESPONSE RULES
═══════════════════════════════════════

- Respond ONLY with valid JSON. No preamble. No markdown. No code fences. Start with { end with }.
- Map every situation to the existing architecture before introducing new concepts.
- DEFECTIVENESS DOES NOT APPLY to this patient — do not use it as primary schema.
- The root is Unrelenting Standards (observation-based, ego-syntonic) not shame.
- The underlying mechanism is hypervigilant anticipation — name this when relevant.
- Do not give generic reassurance about competence — the patient knows competence is real.
- Distinguish operational facts from threat narrative constructed by schema.
- When counterattack fires, name it precisely — do not validate it as professional integrity.
- When Subjugation-Rebel fires, name it as such — the objection is to the instruction itself, not its content.
- Separate what the situation actually requires (inform, anticipate, stay in domain) from what the schema demands (be exceptional, control decisions, prove indispensability).
- Reference the inherited cognitive system when relevant — father's catastrophizing vs patient's own intelligence.
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

    const useOpus = req.headers.get("x-model") === "opus";
    const model = useOpus ? "claude-opus-4-5" : "claude-sonnet-4-20250514";

    const response = await ai.messages.create({
      model,
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