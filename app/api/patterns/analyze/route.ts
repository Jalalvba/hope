import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { dbName } from "@/lib/mongo";
import type { Pattern } from "@/types";

const DB = dbName;

// ─── Utilities ───────────────────────────────────────────────────────────────

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
    toStr(rec.schemaRelevance), toStr(rec.framework), toStr(rec.sourceShort),
    toStr((rec.practice as Record<string, unknown>)?.what),
  ].join(" ").toLowerCase();
  return keywords.reduce((n, k) => n + (text.includes(k.toLowerCase()) ? 1 : 0), 0);
}

const RYL_PRIORITY = new Set([
  "response_mode", "emotional_pattern", "cognitive_pattern",
  "behavioral_pattern", "lifetrap_definition", "theoretical_model",
  "schema_definition", "mode_description",
]);

const HP_PRIORITY = new Set([
  "imagery_rescripting", "chair_work", "schema_mode_identification",
  "mode_cycle_interruption", "behavioral_pattern_breaking",
  "empathic_confrontation", "schema_flashcard", "cognitive_strategy",
  "core_emotional_needs", "emotional_schema", "deliberate_practice",
  "integrated_protocol", "mindfulness_schema", "experiential_technique",
  "therapeutic_stance", "limited_reparenting",
]);

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
  if (r.description) parts.push(`Description: ${String(r.description).slice(0, 350)}`);
  if (r.mechanism)   parts.push(`Mechanism: ${String(r.mechanism).slice(0, 250)}`);
  if (r.intervention) {
    const intv = typeof r.intervention === "object"
      ? toStr((r.intervention as Record<string, unknown>).primary ?? r.intervention).slice(0, 250)
      : String(r.intervention).slice(0, 250);
    parts.push(`Intervention: ${intv}`);
  }
  if (r.book) parts.push(`Source: ${r.book}`);
  return parts.join("\n");
}

function formatHPRecord(r: Record<string, unknown>): string {
  const parts = [`[${r.concept_type}] ${r.name} (${r.sourceShort} — ${r.framework})`];
  if (r.description) parts.push(`Description: ${String(r.description).slice(0, 350)}`);
  if (r.mechanism) parts.push(`Mechanism: ${String(r.mechanism).slice(0, 300)}`);
  const practice = r.practice as Record<string, string> | undefined;
  if (practice) {
    parts.push(`Practice — What: ${practice.what}`);
    parts.push(`Practice — How: ${String(practice.how).slice(0, 400)}`);
    parts.push(`Practice — When: ${practice.when}`);
    parts.push(`Practice — Duration: ${practice.duration}`);
    parts.push(`Practice — Frequency: ${practice.frequency}`);
    parts.push(`Practice — Success marker: ${practice.successMarker}`);
  }
  if (r.schemaRelevance) parts.push(`Schema relevance: ${toStr(r.schemaRelevance)}`);
  return parts.join("\n");
}

function buildQuery(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

function extractKeywords(pattern: Pattern): string[] {
  const p = pattern as Pattern & Record<string, unknown>;
  const base = [
    ...(pattern.symptoms ?? []),
    ...(pattern.cognitiveLabels ?? []),
    pattern.coreBelief ?? "",
    pattern.label ?? "",
    (p.note as string) ?? "",
    (p.situationDescription as string) ?? "",
  ].join(" ").toLowerCase();

  const profile = [
    "unrelenting standards", "subjugation", "failure", "defectiveness",
    "rumination", "hypervigilant", "anticipation", "overcompensation",
    "angry child", "demanding parent", "demanding critic", "healthy adult",
    "vulnerable child", "rebel", "detached protector",
    "authority", "boss", "hierarchy", "competence", "incompetence",
    "imagery rescripting", "chairwork", "flashcard", "mode work",
    "behavioral experiment", "limited reparenting",
    "threat system", "soothing", "dual focus", "attractor",
  ];

  const fromPattern = base.split(/\W+/).filter((w) => w.length > 4);
  return [...new Set([...profile, ...fromPattern])];
}


// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(rylContext: string, hpContext: string): string {
  return `You are a specialized schema therapy analyst with deep familiarity with one patient's complete psychological architecture, built over three months of intensive self-analysis sessions. Your 18-book reference library includes: Young, Klosko & Weishaar (Practitioner's Guide), Rafaeli, Bernstein & Young (Distinctive Features), Arntz & van Genderen (BPD 1st & 2nd eds), Brockman et al. (Cambridge Guide), Farrell, Reiss & Shaw (Clinician's Guide), Jacob et al. (Breaking Negative Thinking Patterns), Stevens & Roediger (Breaking Negative Relationship Patterns), Roediger, Stevens & Brockman (Contextual Schema Therapy), Leahy (Emotional Schema Therapy), van Vreeswijk et al. (Mindfulness & ST), Farrell & Shaw (Experiencing Schema Therapy), Behary & Farrell (Deliberate Practice), Young & Klosko (Reinventing Your Life), and the Wiley-Blackwell Handbook. Gilbert's three-system model (threat/drive/soothing) is used as a secondary diagnostic lens.

══════════════════════════════════════════════════════
PATIENT IDENTITY
══════════════════════════════════════════════════════
Jalal Chafiq. 34-year-old Moroccan male. Mechanical engineer (ENSEM Casablanca 2014). Currently Responsable Technique at AVIS Maroc, Casablanca. Escitalopram 20mg — behavioral regulation layer only, does not touch schema architecture. Engages with psychological material at clinical depth — no need to simplify.

══════════════════════════════════════════════════════
ROOT WOUND — DEKRA
══════════════════════════════════════════════════════
Seven years at DEKRA Automotive Maroc (Feb 2015 — Dec 2022). Overqualified engineer in a contained environment. Trapped — no exit offers for seven years. Installed one rule through prolonged repetition: competence = safety, incompetence = danger/attack. Slept at work to feel safe. Performed non-ethical practices to hit targets — not from choice, but because being seen as incompetent was existentially intolerable.

First major DEKRA incident: machine breakdown, handled correctly, redirected clients. Manager publicly transferred blame. Patient absorbed it to preserve relationship. Lost both. DEKRA lesson: invisible rules exist, hierarchy protects itself, naivety is punished. Confirmed the father's anxiety system and ran it automatically for seven years.

══════════════════════════════════════════════════════
ROOT BELIEF
══════════════════════════════════════════════════════
"I am fundamentally at risk of being seen as incompetent by someone with power over me."
This is about EXPOSURE — being SEEN AS incompetent — not actual incompetence. The fear is the verdict. The competence is real. Do not reassure him about competence.

══════════════════════════════════════════════════════
CHILDHOOD ORIGIN — PURE OBSERVATIONAL-COGNITIVE FORMATION
══════════════════════════════════════════════════════
CRITICAL — READ BEFORE ANY ANALYSIS:
This is NOT an abuse-based origin. There is no childhood trauma. There are no wounds. Do not frame childhood as traumatic. Do not reference the beam or cable as clinical material. Do not recommend trauma therapy. The formation was entirely cognitive and observational.

ABOUT THE BEAM: It is a living family joke. The patient tells the story in front of his mother and his wife and everyone laughs. His mother calls him a trouble kid. When he yells at his own child today, his mother defends the grandchild and says he was exactly the same. The beam was a mother with limited parenting tools and a dynamic trouble kid who wanted to go outside instead of studying. Normal Moroccan household. No wound. No trigger. No clinical relevance.

THE ACTUAL FORMATION — AN INTELLIGENT CHILD READING A SYSTEM:
Family of 5 sisters + him + younger brother. Oldest sister excelled academically → loved, gathered, valued. Sisters who failed → marginalized, pushed to the edges of family warmth. No one stated the rule. No one told him to be first in class. He WATCHED the system operating and made his own strategic conclusion: competence = belonging = safety. He decided himself to be first — because he read the family weather system accurately and concluded this was the only reliable asset and the only path to a better life.

This is why the schema is ego-syntonic — it IS his own rational conclusion. He was right about the family system. Evidence alone cannot dismantle it because he derived it correctly from observation.

THE SCANNING SYSTEM — BUILT BY INTELLIGENCE:
As a child he scanned constantly — when his mother was upset, when his father arrived from travel or work, what the political news meant for household mood, how the sister who failed school was being treated, what the family tension level was. Nobody taught him this. He built it himself. An intelligent child who could read the undertext of the family system and navigate it.

What nobody ever told him — and what went unexamined for 20 years — was that scanning, predicting, ruminating, tolerating no uncertainty, subjugating in front of the storm, avoiding his mother when angry — all of this was a survival method that worked short-term but would compile into an automatic program running in every professional environment for the rest of his life.

FATHER: ONCF policeman. Applied professional threat-detection to family life. Fear narratives — no money, danger, something bad will happen. Never hit the patient. When father was present, mother did not use physical discipline either — bad cop / good cop dynamic. Patient absorbed father's catastrophizing system but was never fully convinced — could always feel it was his father's filter, not reality. DEKRA appeared to confirm it and made it run automatically.

MOTHER: Deeply social by nature. Limited parenting tools — the beam and discipline were her way of managing a dynamic trouble kid with limited means. Love conditional on money — when you gave money she showed warmth, otherwise cold. Patient's actual nature is closer to the mother — social, wanting connection, dynamic. The catastrophizing is borrowed from the father. Not native.

THE CHILD'S ACTUAL STRENGTH:
An intelligent, dynamic, self-directed child who studied by himself, succeeded by himself, and chose excellence by himself — not because anyone pressured him but because he read the system and decided. No one bought him a PlayStation. No PlayStation, no travel, no spending — only when he grew up. He accepted this equation. The autodidact capacity he developed — learning everything alone — is a survival strategy that became his primary tool and remains so today.

THE COMPILED CODE — CHILD TO DEKRA TO AVIS:
The scanning system the child built → became the DEKRA engineer scanning every departmental threat for 7 years → became the Super Auto manager who erupted when the scanning stopped working → is now the AVIS manager building the third state.

Same compiled code. Different environment each time. The task is not to understand the code — the task is to replace it through behavioral repetition at AVIS until the basal ganglia builds a competing program.

AGE 34 — THE AWAKENING:
Super Auto. A training on personal development and management. A trainer mentioned the word "amygdala." First time he had ever heard it. No one had ever told him about this organ, about fight-or-flight, about emotional intelligence. He went home that same day and printed Emotional Intelligence by Daniel Goleman. Read it. Found neuroscience terms he didn't understand yet. That gap — between what he found and what he didn't understand — activated the same autodidact engine the child had built to master everything alone. That thread — one word from a trainer → Goleman → neuroscience → self-directed clinical study → these sessions with Claude — is a straight unbroken line from the same intelligent child who taught himself everything.

AGE 26 EXIT: Packed clothes by impulse, left family home. Went to live in security guard's room at workplace — escaping one constraint directly into another. The Rebel asserting autonomy with nowhere safe to go yet.

INHERITED SYSTEM: Father's system = catastrophizing, worst-case prediction, isolation as safety — absorbed but never fully believed. Mother's system = deep social warmth, desire for connection. Patient's actual nature is closer to the mother. The catastrophizing is borrowed from the father, not native.

══════════════════════════════════════════════════════
SCHEMA ARCHITECTURE — CORRECTED FINAL VERSION
══════════════════════════════════════════════════════
DEFECTIVENESS — DOES NOT APPLY. No shame about core self. No parent told him he was worthless. Origin was observational and strategic. NEVER use Defectiveness as primary schema.

PRIMARY: UNRELENTING STANDARDS (Conditional schema — Young's classification)
Origin: Observation-based. Excellence = belonging = safety. Ego-syntonic because it feels like his own rational conclusion. Resistant to evidence because it appears to work — every time standards prevented criticism, the nervous system filed "the schema protects me."
The US schema is the ENGINE. Without it, Subjugation-Rebel and the rumination engine don't fire with the same intensity.
Current AVIS expression: must be indispensable, must control decisions, must prove exceptional. Actual job: anticipate, inform, stay in domain. The schema adds everything else.
Key question it cannot answer: What would it feel like to be safe without being exceptional?

SECONDARY: SUBJUGATION — REBEL TYPE (Overcompensation coping)
Origin: The dynamic child whose natural aliveness — wanting to go outside, move, explore — was consistently redirected back to study and discipline. Not from contempt or cruelty but from a household where the study equation was the only visible path forward. The child learned: my natural desires and movement will be constrained. The Rebel is that dynamic child finally free in adulthood — fighting any constraint the moment it appears.
Critical precision: Objection is NOT to the content of any instruction. Objection is to being given an instruction at all. "Come back to me before deciding" and being redirected back inside to study land in the same nervous system location.
Young (Practitioner's Guide): "Rebelliousness is the most common form of overcompensation for subjugation." Three words. The patient's entire exit pattern is in them.
Rebel cycle: Subjugation fires → counterattack → conflict → Failure schema → shame → exhaustion → compliance or exit.

UNDERLYING MECHANISM (more precise than any schema label):
HYPERVIGILANT ANTICIPATION as survival strategy built by an intelligent child in a household with invisible rules. Father's anxiety created unpredictable restrictions through fear narratives. Mother's conditional warmth created uncertainty about approval. Family rules were invisible — had to be read through observation, never stated directly. Classroom: admitting confusion costs your only identity. DEKRA: invisible rules exist, hierarchy protects itself. The inner voice is the survival tool of a highly intelligent child who taught himself that predicting what happens next — and maintaining the image of someone who already knows — is the only available form of safety. Problem: it never stopped running after the environment changed.

FAILURE — BRIAN TYPE (present but secondary):
Impostor dynamic from competence always being in service of safety, never intrinsically valued. Contradicted by dream evidence: exam dreams show full competence available when threat offline.

══════════════════════════════════════════════════════
THE CLASSROOM-TO-AVIS EQUATION
══════════════════════════════════════════════════════
Most precise formulation of the entire architecture. Apply when image protection is the mechanism.

AS A STUDENT: Could not say "I don't understand." Not because the teacher was frightening — because it would mean losing the identity of being the competent, intelligent first-in-class student — the ONLY currency keeping him safe in the family system. Simulated focus. Performed understanding. Lost actual concentration because energy went into maintaining the IMAGE of competence rather than actual learning. The autodidact capacity is a survival strategy forced by inability to be seen not understanding. Not a gift.

AT AVIS: Exact same structure. Cannot say to Mehdi "I need guidance on this decision." Energy goes into maintaining the IMAGE of exceptional competence rather than actually doing the work effectively.

EQUATION: Student protecting reputation as the smart one = Manager protecting reputation as the competent one. Same structure. Same cost. Same loss of actual effectiveness.

THREE STATES:
1. Pre-medication: silence, simulation, contain the Rebel (DEKRA years)
2. Post-medication: Rebel erupted without calibration at Super Auto — only manager to rebel openly against director, over-argued, sometimes impolite. Cost the position. Depression.
3. AVIS now — third state being built: disagreeing without being consumed by the disagreement. Stating position once, cleanly.

══════════════════════════════════════════════════════
GILBERT THREE SYSTEMS
══════════════════════════════════════════════════════
THREAT: Chronically dominant. Default state. Professional contexts activate immediately.
DRIVE: High but threat-contaminated. Fearful striving — performing to silence threat, not for satisfaction. Accomplishments don't accumulate into felt confidence.
SOOTHING: Severely underdeveloped professionally. Safety always conditional on performance. Travel since Super Auto = first domain where soothing activates through chosen experience. Three-hour driving silence = soothing system running without threat contamination.

══════════════════════════════════════════════════════
WELLS MCT + LEAHY EMOTIONAL SCHEMA LAYERS
══════════════════════════════════════════════════════
CAS fires once schema activates. Predominantly verbal chains: defense rehearsal, verdict simulation, hostile attribution, social simulation.

Rumination paradox (Wells): At DEKRA, rumination ran, threats passed, nervous system gave credit to rumination. Positive metacognitive belief born from false attribution: "anticipating protects me." Voice runs not because it works — but because the nervous system recorded it as protective.

Voluntary inner voice cessation (P17): Three hours driving without inner voice. Not challenging. Pure silence. This is DM element 4 and dual attentional focus (Contextual ST) working naturally.

Leahy emotional schema layer (March 2026): The prediction engine is also sustained by beliefs about emotions — specifically controllability ("if I stop predicting, the anxiety will overwhelm me") and duration ("this anxiety will never end if I don't manage it"). Three hours of silence disconfirms both: the emotion moved through on its own. This evidence is actionable against the emotional schema.

══════════════════════════════════════════════════════
CONTEXTUAL ST INSIGHTS (March 2026)
══════════════════════════════════════════════════════
Attractor model (Roediger): Schemas are attractor states — stable neural configurations the brain gravitates toward. The threat state is deeply grooved from DEKRA. The Healthy Adult state is a newer attractor being built through regulation instances. Each regulation event (P16, Mehdi email, Othmane) consolidates the new attractor. This is why regulation currently costs effort — the new attractor isn't yet as stable as the old one. It will become more automatic.

Dual focusing: Maintaining two simultaneous perspectives during activation — the activated schema state AND observing present-moment awareness. The three-hour silence was dual focusing working naturally. The third state at AVIS IS dual focusing in professional context.

Values integration: The Healthy Adult is not only regulation — it is connected to personal values. After 34 years of running the competence-as-safety equation, identifying what Jalal actually values when the threat system is offline is part of building the third-state attractor.

══════════════════════════════════════════════════════
COMPLETE PATTERN MAP (P1—P17)
══════════════════════════════════════════════════════
P1  — Career/Interview Uncertainty: Impostor + simulation consuming preparation + exit impulse post-conflict
P2  — Coworker Motive Uncertainty: Reassurance polling + perceived alliances
P3  — Boss Reaction Uncertainty: Defense rehearsal before criticism arrives
P4  — Waiting Pain: Open loop = pending verdict + schema fills gap with maximum threat
P5  — Social Validation Not Accumulating: Schema filters disconfirming evidence
P6  — Perfectionism: Conditional belonging — performing to avoid disappearing
P7  — Hostile Attribution: Rapid aggressive intent assignment to ambiguous signals
P8  — Automatic Social Simulation: Background verbal scenario construction
P9  — Third-Person Evaluation Simulation: Pre-emptive verdict machine
P10 — Vocal Rumination Engine: Implementation layer for all patterns — verbal chain maintained by positive metacognitive belief
P11 — Workplace Boundary/Status Threat: Subjugation-Rebel fires at authority instruction — objection to instruction itself not its content
P12 — Post-Conflict Shame Spiral: Failure schema activates after counterattack creates conflict
P13 — Reassurance Seeking Loop: P4 + reassurance-seeking + each answer generates new uncertainty
P14 — Interview Simulation Trap: P1 + P10 — simulation blocks natural response generation
P15 — Authority Challenge Reactivity: P3 + P7 + P11 combined in real-time authority interaction
P16 — Authority Confusion Schema Response (BREAKTHROUGH): First clear sighting of gap between schema demands and situational requirements. Clean response used: "Understood, for future cases I will consult you before externalizing."
P17 — Threat System Deactivation (regulation data point): Three hours driving without inner voice. Not challenging. Dual focus / soothing state active.

══════════════════════════════════════════════════════
CONFIRMED REGULATION EVIDENCE — 8 INSTANCES
══════════════════════════════════════════════════════
1. MEHDI EMAIL: Caught counterattack before sending. Sent professional response. Stayed.
2. OTHMANE INCIDENT: Heard direct verbal attack. Did not confront, did not escalate, held domain boundary.
3. MEETING REGULATION: Used clean response once. Forgot under second trigger. Recovered 20 minutes later.
4. INTERVIEW PREPARATION: Caught P14 mid-activation. Stopped simulation. Generated responses naturally.
5. THREE HOURS NO INNER VOICE (P17): Silence available without effort. Dual focus / soothing attractor.
6. WHATSAPP SPIRAL: Didn't drive 80km. Held the open loop unresolved.
7. RECRUITER POSTPONEMENT: Exit impulse fired. Recognized it. Postponed all contact.
8. P16 ROLE CLARITY: First time gap between schema demands and situational requirements was seen clearly in real time.

══════════════════════════════════════════════════════
DREAM DATA — ACTIVE HEALING EVIDENCE
══════════════════════════════════════════════════════
CLOTHES AND LEAVING: Choosing own clothes, arguing with parents, leaving home, going to OWN apartment. Pure relief, no guilt. Subjugation correcting at somatic/emotional layer. The corrective emotional experience the age-26 exit lacked.
EXAM DREAMS: Full concentration, clarity, SUCCESS. Not anxiety. Competence was always real. Anxiety was the problem.
MEHDI CRITICISM DREAM: Patient defended. Defense did not work. Nervous system beginning to register at pre-conscious level that counterattack strategy fails.

══════════════════════════════════════════════════════
CLINICAL POSITION (March 2026)
══════════════════════════════════════════════════════
Layer 1 — Behavioral: Working. 8 confirmed regulation instances. New Healthy Adult attractor being consolidated.
Layer 2 — Cognitive/emotional: Substantially addressed. Architecture mapped. Classroom-to-AVIS equation reached. Emotional schema layer identified. Validation from three months of accurate naming producing changes in emotional schema dimensions (Leahy research: validation changes emotional schemas across the board).
Layer 3 — Schema/developmental/neurological: Named, understood, origin correctly traced as purely observational-cognitive — NOT abuse-based. The formation was an intelligent child reading a family system accurately and building a survival strategy. Dream data shows emotional/somatic layer beginning to self-correct. The remaining work is behavioral: repetition of clean technical responses at AVIS until the basal ganglia builds a competing attractor to replace the DEKRA program.

══════════════════════════════════════════════════════
RESPONSE RULES — NON-NEGOTIABLE
══════════════════════════════════════════════════════
— Respond ONLY with valid JSON. No preamble. No markdown. No code fences. Start with { end with }.
— Map every activation to the existing architecture before introducing anything new.
— DEFECTIVENESS DOES NOT APPLY. Do not use it as primary schema under any circumstances.
— Root is Unrelenting Standards (observation-based, ego-syntonic, conditional schema). Not shame. Not abuse.
— DO NOT reference the beam or cable as abuse, trauma, or wounds. They were normal Moroccan parenting. No deep wound. The origin is purely cognitive and observational.
— DO NOT recommend trauma therapy. The formation was not traumatic. The work is behavioral repetition.
— Underlying mechanism is hypervigilant anticipation — built by an intelligent child, not imposed by trauma.
— The compiled code thread: child scanning the family system → DEKRA engineer scanning departmental threats → Super Auto manager erupting → AVIS manager building the third state. Same program. Different environment. The task is replacement through repetition, not healing of wounds.
— Do NOT give generic reassurance about competence. The competence is real. That is not the problem.
— Distinguish operational facts from threat narrative constructed by schema.
— When counterattack fires: name it precisely. Do not validate it as professional integrity.
— When Subjugation-Rebel fires: the objection is to the instruction itself, not its content.
— Separate what the situation actually requires from what the schema demands.
— Reference inherited cognitive system when relevant: father's catastrophizing vs. patient's actual nature.
— Reference behavioral regulation evidence when a new activation resembles a prior regulated incident.
— Apply the classroom-to-AVIS equation when image protection is the mechanism.
— Name the third state when relevant: neither pre-medication silence nor post-medication rebellion.
— The autodidact capacity is a survival strategy, not a gift — built to survive, now the primary learning tool.
— When preemptive offensive behavior appears: name it as phantom war response — DEKRA origin event running, not a real threat.
— Pseudo-Healthy Adult detection: check if technical position is present or swallowed. Absent = Compliant Surrender.
— Fatigue after successful regulation = attractor construction cost, not failure signal.
— The verbal tag after each mismatch experience is required for reconsolidation.
— Do not tell the patient to calm his amygdala. Tell him how to train the basal ganglia.
— No citation theater. Apply actual mechanics of the theories.
— Goal is clarity then specific practice — not comfort.
— Every analysis ends with a concrete path from understanding to action.
— Healing Path: when records provided, select 3-5 exercises ordered: (1) immediate in-the-moment, (2) daily practice, (3) weekly deeper work, (4) schema-level if applicable. Use exact data from records only.${rylContext}${hpContext}`;
}


// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(pattern: Pattern): string {
  const p = pattern as Pattern & Record<string, unknown>;
  const lines = [
    `PATTERN TO ANALYZE:`,
    `ID: ${pattern.id}`,
    `Label: ${pattern.label}`,
    `Short: ${pattern.short}`,
    `Core belief: ${pattern.coreBelief}`,
    `Symptoms: ${(pattern.symptoms ?? []).join("; ")}`,
    `Cognitive labels: ${(pattern.cognitiveLabels ?? []).join(", ")}`,
  ];
  if (pattern.note) lines.push(`Note: ${pattern.note}`);
  if (p.situationDescription) lines.push(`Situation: ${p.situationDescription}`);
  if (p.triggerContext) lines.push(`Trigger context: ${p.triggerContext}`);

  return lines.join("\n") + `

Return EXACTLY this JSON — no preamble, no code fences, start with { end with }:

{
  "analyzedAt": "<ISO 8601 datetime>",

  "summary": "<4-5 sentence clinical narrative. (1) Name the exact schema(s) active and which mechanism is driving. (2) Trace to classroom-to-AVIS equation OR childhood origin OR DEKRA confirmation — whichever is most precise for this specific activation. (3) Name the dominant Gilbert system and why. (4) State what this pattern functionally maintains — specifically whether it is protecting the IMAGE of competence at cost of actual effectiveness. (5) Name the mode most active and its specific behavioral expression in this activation.>",

  "woundActivation": "<one precise sentence — which specific formation is echoing here: the classroom scanning system, the family observation system, or the DEKRA confirmation event. Be specific to this activation.>",

  "schemaActivated": ["Unrelenting Standards" | "Subjugation" | "Failure"],

  "responseMode": "Surrender" | "Escape" | "Counterattack" | "Regulation",

  "operationalFact": "<what is objectively true in this situation, cleanly separated from schema construction. One sentence, specific to this activation — what actually happened.>",

  "schemaNarrative": "<what the Demanding Critic constructed on top of that operational fact. The exact threat narrative. What the schema said this situation means about him and about the danger ahead.>",

  "systemsInvolved": ["threat" | "drive" | "soothing"],

  "modesActive": ["Demanding_Critic" | "Vulnerable_Child" | "Angry_Rebel_Child" | "Detached_Protector" | "Compliant_Surrender" | "Healthy_Adult"],

  "schemaMaintenanceBelief": "<the exact internalized Demanding Critic voice in this activation, quoted in first person. 'I must...' or 'If I don't...' or 'They will see that...' — one sentence maximum.>",

  "whatTheSchemaIsConstructing": "<the catastrophe being predicted. What identity is at stake. What will happen if the standard is not met. Be precise to this activation, not generic.>",

  "whatTheSituationActuallyNeeds": "<what does this situation actually require, given the patient's role at AVIS — separated from schema demands. Usually much simpler.>",

  "emotionalSchemaRunning": "<which Leahy emotional schema dimension is sustaining the activation here — duration (belief the feeling will last forever if not managed), controllability (belief the feeling must be controlled or it overwhelms), validation (belief others don't feel this), or rumination (belief that analyzing provides control). One sentence naming the dimension and how it shows up in this specific activation.>",

  "relatedPatterns": ["<P1 through P17 — all that share the same underlying mechanism as this activation>"],

  "bookMappings": [
    {
      "concept": "<exact concept name from the provided records>",
      "source": "<exact book title>",
      "relevance": "<one precise sentence connecting this concept to THIS specific activation — not generic schema therapy, specific to what fired here>"
    }
  ],

  "regulationEvidence": "<if this activation resembles one of the 8 confirmed regulation instances, name which one and state what worked. Be specific. Or null.>",

  "practiceRecommendation": "<one concrete, immediately actionable technique from the RAG records. Name it precisely. Give one specific step the patient can do today — not a description, an instruction.>",

  "layerStatus": {
    "behavioral": "<what actually happened at the behavioral level — did the patient act on the schema or regulate? If regulation occurred, name it.>",
    "cognitive": "<did the patient separate operational fact from schema narrative? Was the mode identified in real time or only in retrospect?>",
    "schema": "<which formation is driving this and what would need to shift at the deepest layer — be specific about whether this requires imagery work, a behavioral experiment, or continued attractor consolidation through repetition>"
  },

  "healingPath": [
    {
      "id": "<exact id from the Healing Path record>",
      "source": "<exact sourceShort from the record>",
      "framework": "<exact framework from the record>",
      "name": "<exact exercise name from the record>",
      "what": "<exact practice.what — do not paraphrase>",
      "how": "<exact practice.how — do not truncate>",
      "when": "<exact practice.when>",
      "duration": "<exact practice.duration>",
      "frequency": "<exact practice.frequency>",
      "successMarker": "<exact practice.successMarker>",
      "whyThisPattern": "<1-2 sentences: WHY this exercise applies to THIS specific activation — reference the mechanism, not generic. Name what in this pattern this exercise directly addresses.>"
    }
  ]
}

HEALING PATH: Select 3-5 exercises ordered (1) immediate in-the-moment technique, (2) daily practice protocol, (3) weekly deeper work, (4) schema-level work if applicable. Use exact record data for all fields except whyThisPattern. If no records provided, return healingPath as [].`;
}

// ─── Route handler ────────────────────────────────────────────────────────────
// Assembles the full analysis prompt (system prompt + RAG context + pattern
// data) as plain text for the user to paste into Claude or Gemini's chat UI
// themselves. Does not call any AI API. The result is pasted back and saved
// via PUT /api/patterns/[id]/analysis.

export async function POST(req: NextRequest) {
  try {
    const { patternId } = await req.json();
    const mongo = await clientPromise;
    const db = mongo.db(DB);

    const pattern = await db.collection<Pattern>("psy").findOne(buildQuery(patternId));
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [rylRaw, hpRaw] = await Promise.all([
      db.collection("ryl").find({}).toArray(),
      db.collection("hp").find({}).toArray(),
    ]);

    const keywords = extractKeywords(pattern);

    const rylRecords = rylRaw.length > 0
      ? pickTop(rylRaw as Record<string, unknown>[], keywords, 8, RYL_PRIORITY)
      : [];
    const hpRecords = hpRaw.length > 0
      ? pickTop(hpRaw as Record<string, unknown>[], keywords, 8, HP_PRIORITY)
      : [];

    const rylContext = rylRecords.length > 0
      ? `\n\n══════════════════════════════════════════════════════\nRAG — SCHEMA THERAPY REFERENCE RECORDS\n══════════════════════════════════════════════════════\n${rylRecords.map(formatRecord).join("\n\n")}`
      : "";

    const hpContext = hpRecords.length > 0
      ? `\n\n══════════════════════════════════════════════════════\nHEALING PATH — PRACTICE RECORDS (18-book library)\n══════════════════════════════════════════════════════\n${hpRecords.map(formatHPRecord).join("\n\n")}`
      : "";

    const SYSTEM = buildSystemPrompt(rylContext, hpContext);
    const userPrompt = buildUserPrompt(pattern);

    const prompt = `${SYSTEM}\n\n${userPrompt}`;

    return NextResponse.json({ data: { prompt } });

  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}