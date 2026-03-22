/**
 * seed-healing.ts
 *
 * Seeds the `hp` (healing path) collection in MongoDB `hope` database.
 * Each record is a validated, actionable therapeutic technique drawn from
 * five core books, tagged by schema relevance, with concrete practice steps.
 *
 * Run: npx tsx scripts/seed-healing.ts
 * Requires: MONGODB_URI in .env.local
 */

import "dotenv/config";
import { MongoClient } from "mongodb";

interface HealingRecord {
  id: string;
  source: string;
  sourceShort: string;
  framework: "schema_therapy" | "mct" | "act" | "cbt" | "cft" | "integrated";
  concept_type: string;
  name: string;
  description: string;
  mechanism: string;
  schemaRelevance: string[];
  tags: string[];
  practice: {
    what: string;
    how: string;
    when: string;
    duration: string;
    frequency: string;
    successMarker: string;
  };
  contraindication?: string;
  progressionFrom?: string;
  progressionTo?: string;
}

const records: HealingRecord[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // BOOK 1: REINVENTING YOUR LIFE (Young & Klosko) — Schema Therapy
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "RYL-01",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "schema_healing_exercise",
    name: "Schema Flashcard Technique",
    description: "Write a card that names the schema, its origin, its lie, the operational truth, and one healthy behavior. Carry it. Read it when activated.",
    mechanism: "Creates a portable cognitive anchor that interrupts the automatic schema response by forcing conscious engagement with pre-prepared counter-evidence during activation. The physical card bridges the gap between intellectual knowledge and in-the-moment application.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["schema", "flashcard", "activation", "interrupt", "portable", "daily", "concrete"],
    practice: {
      what: "Create a schema flashcard for Unrelenting Standards",
      how: "Front: 'When I feel I must be exceptional to be safe — this is the summer classroom equation running, not reality.' Back: 'Operational fact: my job requires anticipating, informing, staying in domain. Not: being indispensable, controlling all decisions, proving exceptional.' Keep in wallet or phone notes.",
      when: "Read immediately when you notice the drive to over-prepare, over-control, or prove indispensability",
      duration: "30 seconds to read. 2 minutes to sit with it.",
      frequency: "Create once. Read every activation. Update monthly.",
      successMarker: "You reach for the card before the rumination completes its first loop"
    },
    progressionTo: "RYL-03"
  },
  {
    id: "RYL-02",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "schema_healing_exercise",
    name: "Schema Dialogue — Healthy Adult vs Schema Voice",
    description: "Write out a dialogue between the schema voice ('You must be perfect or you will be marginalized') and a healthy adult voice that responds with operational facts and compassion.",
    mechanism: "Externalizes the schema as a separate voice rather than reality. Creates distance between the automatic threat narrative and the patient's actual intelligence. Strengthens the 'third state' between silence and rebellion.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation"],
    tags: ["dialogue", "externalization", "healthy_adult", "writing", "schema_mode", "third_state"],
    practice: {
      what: "Write a schema dialogue for a recent activation",
      how: "Two columns. Left: Schema Voice — 'Mehdi will think you're incompetent if you ask for guidance.' Right: Healthy Adult — 'Asking for guidance IS the job requirement. The student who couldn't say I don't understand is the one running this voice, not the actual manager.' Write at least 4 exchanges. Let the Healthy Adult have the last word.",
      when: "Within 24 hours of an activation, when calm enough to write",
      duration: "15-20 minutes",
      frequency: "Once per significant activation. Review past dialogues weekly.",
      successMarker: "The Healthy Adult voice starts appearing spontaneously during activations, not just in writing"
    },
    progressionFrom: "RYL-01",
    progressionTo: "RYL-04"
  },
  {
    id: "RYL-03",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "schema_healing_exercise",
    name: "Pattern-Breaking Behavioral Experiment",
    description: "Deliberately choose a behavior opposite to what the schema demands in a LOW-stakes situation. The goal is to collect evidence that the predicted catastrophe does not occur.",
    mechanism: "Schemas maintain themselves through avoidance — by never testing the feared outcome, the belief remains unfalsified. Behavioral experiments provide direct experiential evidence that the world does not operate according to the schema's rules.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["behavioral_experiment", "pattern_breaking", "exposure", "evidence", "action"],
    practice: {
      what: "Submit work that is 'good enough' rather than exceptional in a low-stakes context",
      how: "Pick ONE task this week where the schema would demand perfection. Deliberately submit it at 80% quality. Before submitting, write down the schema's prediction ('They will see me as incompetent'). After, write what actually happened. Compare.",
      when: "Choose the task at the start of the week. Execute when the task arises.",
      duration: "The task itself + 10 minutes for prediction/outcome journaling",
      frequency: "Once per week minimum. Increase stakes gradually over months.",
      successMarker: "You can submit 80% work without body-level anxiety, and the predicted catastrophe never materializes"
    },
    progressionFrom: "RYL-01"
  },
  {
    id: "RYL-04",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "origin_reparenting",
    name: "Letter to the Child — Limited Reparenting",
    description: "Write a letter from your current adult self to the child who watched his sisters and concluded that excellence equals belonging. Address what he saw, validate his intelligence, and tell him what he couldn't know then.",
    mechanism: "Schema therapy's limited reparenting approach meets the developmental need that was unmet. For observation-based schemas, the unmet need is not 'you are loved regardless' (the child was not told he was unlovable) — it is 'you are safe without being exceptional. Your intelligence served you then. It does not need to run this protection anymore.'",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["reparenting", "letter", "child", "origin", "emotional", "compassion", "deep_work"],
    practice: {
      what: "Write a letter to the boy who watched the family system",
      how: "Start with: 'I see what you saw. You were right — that IS how it worked in that house. The sister who excelled was gathered. The ones who didn't were pushed to the edges. You read the system perfectly because you were smart enough to see it. But here is what you couldn't know then: that house is not the world. AVIS is not the classroom. Mehdi is not the family. You do not have to earn your place by being exceptional. Your place exists because you show up and do the work that is actually required.'",
      when: "When you have 30+ minutes of undisturbed private time. Not during an activation — this is deep processing work.",
      duration: "30-45 minutes for writing. Sit with it for 10 minutes after.",
      frequency: "Write once. Re-read monthly. Rewrite if new understanding emerges.",
      successMarker: "Emotional response while writing — tears, tightness, relief. If you feel nothing, you're intellectualizing. Try again when more open."
    },
    contraindication: "Do NOT do this during active crisis or within hours of schema activation. Wait for calm.",
    progressionFrom: "RYL-02"
  },
  {
    id: "RYL-05",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "schema_healing_exercise",
    name: "Subjugation-Rebel Pattern Interrupt",
    description: "When the Rebel fires at an instruction, pause and separate: 'Is my objection to the CONTENT of this instruction, or to BEING INSTRUCTED?' If the latter, the beam is activating, not professional judgment.",
    mechanism: "The Subjugation-Rebel pattern fires at the structural fact of receiving instructions, not at their content. This distinction is the single most powerful interrupt because it separates the childhood constraint from the adult professional context. The beam and Mehdi's guidance land in the same nervous system location — naming this breaks the fusion.",
    schemaRelevance: ["Subjugation"],
    tags: ["subjugation", "rebel", "interrupt", "authority", "instruction", "beam", "pause"],
    practice: {
      what: "Apply the content-vs-structure test to every authority interaction",
      how: "When a boss or authority gives an instruction and you feel resistance: PAUSE. Ask internally: 'Would I object if I had thought of this myself?' If yes → legitimate professional disagreement. State it once, cleanly. If no → the Rebel is reacting to the FACT of being told, not the content. Acknowledge: 'This is the beam. Mehdi is not the father. Being guided is not being controlled.'",
      when: "Every time authority resistance fires. Every single time.",
      duration: "10-second internal check. That's all.",
      frequency: "Every authority interaction until it becomes automatic",
      successMarker: "You can receive an instruction from Mehdi and respond 'understood' without internal warfare — because you checked and the content was reasonable"
    }
  },
  {
    id: "RYL-06",
    source: "Reinventing Your Life — Young & Klosko",
    sourceShort: "RYL",
    framework: "schema_therapy",
    concept_type: "schema_mode_work",
    name: "Schema Mode Mapping — Real-Time",
    description: "Identify which mode you are operating from in real time: Vulnerable Child, Angry/Rebel Child, Punitive Parent, Demanding Parent, Detached Protector, or Healthy Adult.",
    mechanism: "Mode awareness prevents fusion with any single mode. When the Rebel takes over, naming it as a mode — not as 'me' — creates space. The goal is increasing time spent in Healthy Adult mode, which is the 'third state' between silence and rebellion.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["schema_mode", "awareness", "real_time", "mode_map", "healthy_adult", "third_state"],
    practice: {
      what: "Name your current mode at three fixed points daily",
      how: "Set three alarms: morning, mid-day, evening. At each: 'What mode am I in right now?' Demanding Parent = 'I should be doing more, better, faster.' Rebel Child = 'No one tells me what to do.' Vulnerable Child = 'I'm about to be exposed.' Healthy Adult = 'I see the situation clearly and respond to what it actually needs.' Log the mode in Psyche Log note field.",
      when: "Three times daily at fixed times",
      duration: "30 seconds per check-in",
      frequency: "Daily for 4 weeks minimum",
      successMarker: "You catch a mode shift as it happens rather than recognizing it hours later"
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOK 2: METACOGNITIVE THERAPY (Wells) — MCT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "MCT-01",
    source: "Metacognitive Therapy for Anxiety and Depression — Wells",
    sourceShort: "MCT",
    framework: "mct",
    concept_type: "detached_mindfulness",
    name: "Detached Mindfulness — Thought Observation Without Engagement",
    description: "Observe the inner voice (rumination, defense rehearsal, verdict simulation) without engaging with its content. Let the thought exist without responding to it, correcting it, or arguing with it.",
    mechanism: "The CAS (Cognitive Attentional Syndrome) runs because the patient believes engaging with thoughts is necessary and useful (positive metacognitive belief). Detached mindfulness directly challenges this by proving that thoughts can exist without action. The three hours of driving without inner voice is evidence that this capacity already exists.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation"],
    tags: ["detached_mindfulness", "CAS", "rumination", "observation", "non_engagement", "inner_voice"],
    practice: {
      what: "Practice detached mindfulness with a triggering thought",
      how: "When the inner voice starts: 'Mehdi will think I'm incompetent' or 'I should have handled that differently' — notice the thought. Say internally: 'There is a thought about competence.' Do NOT argue with it. Do NOT reassure yourself. Do NOT correct it. Just let it sit there. Return attention to whatever you were doing. If it returns, notice again: 'The thought came back.' Still don't engage.",
      when: "Every time the rumination engine (P10) activates",
      duration: "The non-engagement itself takes 5 seconds. Hold the posture for as long as the thought persists.",
      frequency: "Every activation. This is the primary MCT skill.",
      successMarker: "The thought arises and passes without triggering a 20-minute verbal chain. Duration of CAS episodes measurably decreases."
    },
    progressionTo: "MCT-02"
  },
  {
    id: "MCT-02",
    source: "Metacognitive Therapy for Anxiety and Depression — Wells",
    sourceShort: "MCT",
    framework: "mct",
    concept_type: "attention_training",
    name: "Attention Training Technique (ATT)",
    description: "Structured practice of shifting attention voluntarily between different auditory stimuli. Builds the attentional flexibility needed to disengage from rumination on demand.",
    mechanism: "The rumination engine (P10) runs partly because attentional control has been weakened by years of automatic engagement. ATT strengthens the 'muscle' that allows voluntary disengagement. It is not distraction — it is training the executive control system that the CAS has hijacked.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation"],
    tags: ["ATT", "attention", "training", "executive_control", "rumination", "flexibility"],
    practice: {
      what: "Perform the Wells ATT protocol",
      how: "Sit in a space with multiple sound sources (traffic, people, music, clock, appliance). Phase 1 (3 min): Focus on one sound exclusively. When mind wanders, return. Phase 2 (3 min): Rapidly switch between different sounds every 5-10 seconds. Phase 3 (3 min): Try to hold ALL sounds in awareness simultaneously. Phase 4 (3 min): Broaden to include all sensory input.",
      when: "Daily, same time, quiet environment. NOT during an activation — this is training, not intervention.",
      duration: "12 minutes",
      frequency: "Daily for 8 weeks minimum. Then 3x/week maintenance.",
      successMarker: "Ability to disengage from rumination mid-chain improves. You notice you can 'pull out' of the verbal loop by choice."
    },
    progressionFrom: "MCT-01",
    progressionTo: "MCT-03"
  },
  {
    id: "MCT-03",
    source: "Metacognitive Therapy for Anxiety and Depression — Wells",
    sourceShort: "MCT",
    framework: "mct",
    concept_type: "metacognitive_belief_challenge",
    name: "Positive Metacognitive Belief Challenge — Rumination Attribution Error",
    description: "Directly challenge the belief 'Thinking about this will protect me / help me prepare / prevent bad outcomes.' This is the DEKRA-born belief that keeps the inner voice running.",
    mechanism: "At DEKRA, threats arose, rumination ran, threats passed, and the nervous system attributed survival to the rumination (false attribution). The positive metacognitive belief was born: 'My worrying protects me.' This belief must be challenged with evidence, not with reassurance. The three hours of silent driving is the best counter-evidence available.",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["positive_metacognitive_belief", "challenge", "DEKRA", "attribution_error", "evidence", "rumination"],
    practice: {
      what: "Build an evidence log against the rumination-as-protection belief",
      how: "Create two columns. Column A: 'Times I ruminated AND the outcome was fine' (DEKRA attribution). Column B: 'Times I did NOT ruminate AND the outcome was also fine' (driving silence, weekend regulation, regulated incidents at AVIS). When Column B has more entries than Column A, the belief loses its foundation. Add to Column B every time you regulate successfully WITHOUT ruminating first.",
      when: "Start now. Add entries as they occur.",
      duration: "5 minutes per entry",
      frequency: "Update after every regulation success",
      successMarker: "Column B significantly outweighs Column A. You catch yourself about to ruminate and think 'this won't actually help' — and stop."
    },
    progressionFrom: "MCT-02"
  },
  {
    id: "MCT-04",
    source: "Metacognitive Therapy for Anxiety and Depression — Wells",
    sourceShort: "MCT",
    framework: "mct",
    concept_type: "worry_postponement",
    name: "Worry Postponement Protocol",
    description: "When rumination starts, do not engage AND do not suppress. Instead, mark it for a specific later time ('I will think about this at 7pm for 15 minutes'). Most worries feel irrelevant by the postponed time.",
    mechanism: "Breaks the automaticity of the CAS without suppression (which paradoxically strengthens thoughts). Demonstrates to the nervous system that delayed engagement produces no catastrophe — directly challenging the urgency the schema attaches to every thought.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation"],
    tags: ["worry_postponement", "CAS", "automaticity", "delay", "urgency", "non_suppression"],
    practice: {
      what: "Postpone rumination to a fixed daily 'worry window'",
      how: "Set a fixed 15-minute window (e.g., 7:00-7:15 PM). When rumination fires during the day, say: 'I notice this. I will think about it at 7 PM.' Write a one-line note of the topic. At 7 PM, open the list. Most items will feel irrelevant. For those that remain, think about them for exactly 15 minutes. Stop at 7:15.",
      when: "Every time the rumination engine activates outside the worry window",
      duration: "5 seconds to postpone. 15 minutes for the daily window.",
      frequency: "Daily for 6 weeks. Then as needed.",
      successMarker: "80%+ of postponed worries feel irrelevant by the scheduled time. Total daily rumination time decreases measurably."
    }
  },
  {
    id: "MCT-05",
    source: "Metacognitive Therapy for Anxiety and Depression — Wells",
    sourceShort: "MCT",
    framework: "mct",
    concept_type: "threat_monitoring_reduction",
    name: "Threat Monitoring Reduction — Attention Reallocation",
    description: "Identify where attention goes in professional settings (scanning for Mehdi's reaction, monitoring colleague tone, reading email subtext). Deliberately redirect to task-focused attention.",
    mechanism: "Threat monitoring is a CAS component that maintains the schema by keeping the perceptual system locked on danger signals. Redirecting attention to the actual task is not avoidance — it is correcting a hypervigilant scanning pattern that was adaptive at DEKRA but is maladaptive at AVIS.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["threat_monitoring", "attention", "scanning", "hypervigilance", "task_focus", "AVIS"],
    practice: {
      what: "Redirect from scanning to task focus",
      how: "In meetings or email exchanges: notice when your attention shifts from the content to scanning reactions ('Is Mehdi satisfied? Did that land well?'). When you catch it: 'Scanning mode active. Returning to content.' Physically write down the next action item from the meeting/email. This forces task-mode attention.",
      when: "Every meeting, every email exchange with authority",
      duration: "2-second redirect each time",
      frequency: "Continuous during professional interactions. Log catches daily.",
      successMarker: "You finish a meeting and realize you tracked the content, not the reactions. Post-meeting rumination about 'how it went' decreases."
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOK 3: THE ANXIOUS PERFECTIONIST (Ong & Twohig) — ACT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "TAP-01",
    source: "The Anxious Perfectionist — Ong & Twohig",
    sourceShort: "TAP",
    framework: "act",
    concept_type: "values_clarification",
    name: "Values vs Standards — The Critical Distinction",
    description: "Separate what you VALUE (doing meaningful work, being reliable, professional growth) from what the SCHEMA DEMANDS (being exceptional, being indispensable, never appearing to need help). Values guide action flexibly. Standards create rigid rules that punish deviation.",
    mechanism: "ACT's core insight for perfectionism: the problem is not caring about quality — it is fusing quality with survival. When 'do good work' becomes 'be perfect or be marginalized,' a value has been hijacked by a schema. Defusion from the standard restores the value.",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["values", "standards", "ACT", "defusion", "perfectionism", "flexibility", "meaning"],
    practice: {
      what: "Map your values vs your schema's standards",
      how: "Two columns. Left: 'What I actually care about at work' (examples: being competent, being trusted, growing professionally, doing quality work). Right: 'What the schema adds on top' (being the best, being seen as indispensable, never needing guidance, controlling all decisions). The left column is yours. The right column is the summer classroom talking. When you catch yourself pursuing a right-column item, ask: 'Is this my value or my schema?'",
      when: "Create the map once. Revisit before any high-stakes professional situation.",
      duration: "20 minutes to create. 2 minutes to review.",
      frequency: "Create once. Review weekly. Update as clarity increases.",
      successMarker: "You can pursue quality work WITHOUT the anxiety that accompanies schema-driven perfection. The work feels satisfying, not protective."
    },
    progressionTo: "TAP-02"
  },
  {
    id: "TAP-02",
    source: "The Anxious Perfectionist — Ong & Twohig",
    sourceShort: "TAP",
    framework: "act",
    concept_type: "cognitive_defusion",
    name: "Defusion from the Competence-Safety Equation",
    description: "Practice seeing 'I must be exceptional to be safe' as a THOUGHT produced by a schema, not as a description of reality. Defusion techniques: 'I notice I am having the thought that...' or 'The summer classroom is telling me that...'",
    mechanism: "Cognitive fusion means treating thoughts as facts. When 'I must be exceptional' feels like reality rather than a sentence the nervous system learned to generate, every professional interaction becomes a survival test. Defusion creates distance without suppression — the thought still exists, but it loses its power to dictate behavior.",
    schemaRelevance: ["Unrelenting Standards", "Failure"],
    tags: ["defusion", "ACT", "competence", "thought", "distance", "observation", "language"],
    practice: {
      what: "Apply defusion language to schema thoughts as they arise",
      how: "When the schema fires: instead of 'I need to prove myself' → 'I notice the schema is generating the thought: I need to prove myself.' Or: 'The summer classroom is saying: if you don't excel, you'll be pushed to the edges.' Or: say the thought in a silly voice. Or: prefix with 'My mind is telling me the story that...' The content doesn't change. Your relationship to it does.",
      when: "Every activation. Start with low-intensity ones.",
      duration: "5-10 seconds per defusion",
      frequency: "Every activation. This is the core ACT skill.",
      successMarker: "You can hold a schema thought in awareness and choose not to obey it. The thought fires but doesn't drive behavior."
    },
    progressionFrom: "TAP-01",
    progressionTo: "TAP-03"
  },
  {
    id: "TAP-03",
    source: "The Anxious Perfectionist — Ong & Twohig",
    sourceShort: "TAP",
    framework: "act",
    concept_type: "willingness_exercise",
    name: "Willingness to Be Seen as Ordinary",
    description: "Practice deliberately tolerating the discomfort of being 'just competent' rather than exceptional. Not because ordinary is the goal — but because the willingness to be ordinary removes the survival pressure from every interaction.",
    mechanism: "The schema says: ordinary = marginalized = unsafe. Willingness means feeling that anxiety and acting anyway. Not white-knuckling through it, but genuinely allowing the possibility that you could be seen as ordinary and survive. This directly challenges the family equation at the experiential level.",
    schemaRelevance: ["Unrelenting Standards", "Failure"],
    tags: ["willingness", "ACT", "ordinary", "discomfort", "tolerance", "experiential", "exposure"],
    practice: {
      what: "Practice willingness in a chosen professional situation",
      how: "Pick one situation this week where you would normally over-prepare, over-deliver, or over-explain. Instead: do what the situation requires. Nothing more. When anxiety rises ('They'll think I'm not good enough'), practice willingness: 'I am willing to feel this anxiety while doing only what is actually needed.' Feel the discomfort without compensating. Notice that the world continues.",
      when: "One planned situation per week",
      duration: "The duration of the situation + post-situation reflection (5 min)",
      frequency: "Weekly. Increase difficulty gradually.",
      successMarker: "You deliver adequate work and feel the anxiety but do not add more work to soothe it. Over time, the anxiety decreases."
    },
    progressionFrom: "TAP-02"
  },
  {
    id: "TAP-04",
    source: "The Anxious Perfectionist — Ong & Twohig",
    sourceShort: "TAP",
    framework: "act",
    concept_type: "present_moment_awareness",
    name: "Present-Moment Contact During Activation",
    description: "When the schema fires and pulls you into simulation (future verdict, past failure), ground into the present moment. The schema operates exclusively in past/future. The present moment is schema-free.",
    mechanism: "All schema activations operate through temporal displacement: re-running past threats or simulating future verdicts. Grounding in the present interrupts this by making the actual sensory environment more salient than the imagined scenario. This is why driving (P17) produced silence — the present-moment demands of driving crowded out the temporal displacement.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["present_moment", "grounding", "ACT", "temporal", "simulation", "driving", "P17"],
    practice: {
      what: "5-4-3-2-1 grounding during schema activation",
      how: "When activated: Name 5 things you see. 4 you hear. 3 you can touch. 2 you smell. 1 you taste. This forces the perceptual system into present-tense mode. Then ask: 'In this exact present moment — not five minutes from now, not yesterday — is there an actual threat?' The answer is almost always no.",
      when: "Immediately when you notice temporal displacement (simulating a meeting, rehearsing a defense, replaying an interaction)",
      duration: "60-90 seconds",
      frequency: "Every activation involving simulation",
      successMarker: "The grounding brings genuine relief. The simulated scenario loses its urgency when present reality becomes vivid."
    }
  },
  {
    id: "TAP-05",
    source: "The Anxious Perfectionist — Ong & Twohig",
    sourceShort: "TAP",
    framework: "act",
    concept_type: "committed_action",
    name: "Committed Action — Values-Based Response Over Schema-Based Response",
    description: "In the moment of activation, choose ONE action that serves your values (professional effectiveness, honest communication) rather than the schema's demands (prove indispensability, avoid being seen as needing help).",
    mechanism: "ACT's behavioral commitment: instead of waiting for feelings to change before acting differently, act differently and let feelings update. Each values-based action in the presence of schema anxiety builds a new experiential record that competes with the DEKRA-formed one.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation"],
    tags: ["committed_action", "ACT", "values", "behavioral", "in_the_moment", "action_plan"],
    practice: {
      what: "Replace one schema-driven behavior with a values-driven behavior per week",
      how: "Identify a recurring situation where the schema drives behavior (e.g., staying late to prove commitment, over-preparing for a routine meeting, avoiding asking Mehdi for clarification). Choose the values-based alternative (leaving on time, preparing adequately, asking directly). Commit to ONE instance this week. Before doing it, name the anxiety. After doing it, log what actually happened.",
      when: "Pre-plan at the start of the week. Execute when the situation arises.",
      duration: "The action itself. + 5 minutes before (naming) and after (logging).",
      frequency: "One per week. Build to daily.",
      successMarker: "Values-based actions become less effortful. The gap between 'what I want to do' and 'what I actually do' narrows."
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOK 4: FEELING GOOD (Burns) — CBT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "FG-01",
    source: "Feeling Good — David Burns",
    sourceShort: "FG",
    framework: "cbt",
    concept_type: "cognitive_distortion_identification",
    name: "Triple Column Technique — Distortion Identification",
    description: "For any activating thought, identify the cognitive distortion, then write a rational response. Burns' core technique — the foundation of cognitive restructuring.",
    mechanism: "The schema generates automatic thoughts that feel true because they arrive pre-packaged with emotional intensity. Writing them down, naming the specific distortion, and generating a rational alternative creates a competing cognitive pathway. Over time, the automatic thoughts weaken because they are consistently corrected.",
    schemaRelevance: ["Unrelenting Standards", "Failure", "Subjugation"],
    tags: ["triple_column", "CBT", "distortion", "rational_response", "writing", "automatic_thought"],
    practice: {
      what: "Apply the triple column to today's strongest automatic thought",
      how: "Column 1 — Automatic thought: 'If I ask Mehdi for guidance, he'll see me as weak.' Column 2 — Distortion: Mind reading (assuming you know what Mehdi will think), All-or-nothing thinking (asking for guidance = weakness), Fortune telling (predicting the worst outcome). Column 3 — Rational response: 'Asking for guidance is the defined job requirement. Managers who consult their bosses are using the system correctly, not demonstrating weakness. I have no evidence Mehdi equates questions with incompetence.'",
      when: "Within 2 hours of an activation. Best done when the thought is still fresh but intensity has decreased by 50%.",
      duration: "10-15 minutes",
      frequency: "Daily for first month. Then as needed per activation.",
      successMarker: "Column 3 responses begin appearing automatically in your mind before you write them down."
    },
    progressionTo: "FG-02"
  },
  {
    id: "FG-02",
    source: "Feeling Good — David Burns",
    sourceShort: "FG",
    framework: "cbt",
    concept_type: "cognitive_distortion_identification",
    name: "Distortion Map for Your Schema Profile",
    description: "Map which of Burns' 10 distortions your schemas preferentially use. Unrelenting Standards → Should Statements, All-or-Nothing, Magnification. Subjugation-Rebel → Mind Reading, Emotional Reasoning, Personalization.",
    mechanism: "Knowing your schema's preferred distortions creates instant recognition. Instead of analyzing each thought from scratch, you can match the pattern: 'This is the Should Statement — Unrelenting Standards is running.' Speed of recognition = speed of intervention.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["distortion_map", "CBT", "Burns", "recognition", "speed", "pattern", "profile"],
    practice: {
      what: "Create your personal distortion profile",
      how: "Review your last 10 pattern entries. For each, identify which Burns distortions were active. Map to schema: Unrelenting Standards typically uses: Should Statements ('I should have known'), All-or-Nothing ('If it's not perfect, it's failure'), Magnification ('This mistake will define how they see me'), Discounting the Positive ('The regulated response doesn't count because it took 20 minutes'). Subjugation-Rebel: Emotional Reasoning ('I feel controlled therefore I AM being controlled'), Mind Reading ('He thinks I need supervision'), Personalization ('This instruction is because he doesn't trust me'). Print this map. Carry it.",
      when: "Create once. Reference during triple-column exercises.",
      duration: "30 minutes to create from existing pattern data",
      frequency: "Create once. Update quarterly.",
      successMarker: "You name the distortion within seconds of the thought appearing, not after 20 minutes of rumination."
    },
    progressionFrom: "FG-01"
  },
  {
    id: "FG-03",
    source: "Feeling Good — David Burns",
    sourceShort: "FG",
    framework: "cbt",
    concept_type: "behavioral_activation",
    name: "Pleasure-Mastery Schedule",
    description: "Track daily activities and rate each for Pleasure (P) and Mastery (M) on 0-10 scales. Burns uses this to reveal that perfectionists schedule exclusively for Mastery and starve the Pleasure/Soothing system.",
    mechanism: "Directly maps to Gilbert's three-system model. Unrelenting Standards fills the schedule with Drive activities (mastery-only, threat-contaminated). The Soothing system never activates because there are no genuine pleasure activities. The P/M schedule makes the imbalance visible and creates concrete data for rebalancing.",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["pleasure", "mastery", "schedule", "soothing", "drive", "balance", "Gilbert", "tracking"],
    practice: {
      what: "Track P and M ratings for every activity this week",
      how: "Every evening, list that day's main activities. Rate each 0-10 for Pleasure (genuine enjoyment, soothing) and 0-10 for Mastery (sense of achievement, competence). At week's end: calculate average P and average M. If M >> P, the schema is running the schedule. Add ONE pure-pleasure activity (no mastery component) per day next week. Travel, food, conversation — things the mother's system values.",
      when: "Every evening before sleep",
      duration: "5 minutes per evening. 15 minutes for weekly review.",
      frequency: "Daily tracking for 4 weeks. Weekly review ongoing.",
      successMarker: "P and M averages approach balance. You have at least one daily activity rated P ≥ 7 and M ≤ 3."
    }
  },
  {
    id: "FG-04",
    source: "Feeling Good — David Burns",
    sourceShort: "FG",
    framework: "cbt",
    concept_type: "cost_benefit_analysis",
    name: "Cost-Benefit Analysis of the Schema",
    description: "Burns' technique applied to the Unrelenting Standards schema itself. List all costs and benefits of maintaining the schema. The schema survives because the patient unconsciously believes the benefits outweigh the costs.",
    mechanism: "The schema feels rational because it was formed through accurate observation. But maintaining it at AVIS has costs that were not present in the family system. Listing them makes the ego-syntonic schema visible as a choice rather than a necessity. This is especially important for observation-based schemas — they resist change precisely because they feel self-generated rather than imposed.",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["cost_benefit", "CBT", "Burns", "schema_maintenance", "ego_syntonic", "choice", "rational"],
    practice: {
      what: "Full cost-benefit analysis of Unrelenting Standards",
      how: "Benefits: 'I am genuinely competent. People respect my work. I catch problems others miss. I am trusted.' Costs: 'Chronic threat-system activation. Energy goes to image maintenance not actual work. Cannot ask for guidance. Every professional interaction is a survival test. Boss becomes the father. Workplace becomes the classroom. Lost position at Super Auto. Rebel erupts when silence can no longer hold. Soothing system starved.' Rate each side 0-100. Honestly.",
      when: "One dedicated session. Not during activation.",
      duration: "30-45 minutes",
      frequency: "Once. Re-do after 3 months to see if the balance has shifted.",
      successMarker: "The costs column scores higher than the benefits column. The schema no longer feels like pure intelligence — it starts feeling like a strategy with diminishing returns."
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOK 5: THINK CONFIDENT BE CONFIDENT (Sokol & Fox) — Confidence CBT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "TCBC-01",
    source: "Think Confident, Be Confident — Sokol & Fox",
    sourceShort: "TCBC",
    framework: "cbt",
    concept_type: "confidence_building",
    name: "Doubt vs Evidence Log",
    description: "The core Sokol & Fox technique: when self-doubt fires, log the doubt, then systematically list all available evidence against it. Confidence is not the absence of doubt — it is the ability to override doubt with evidence.",
    mechanism: "The schema creates doubt that feels like data. 'I might be seen as incompetent' arrives with the weight of seven years of DEKRA reinforcement. But it is not data — it is the schema's output. The evidence log forces the patient to distinguish between the schema's prediction and the actual evidence from current reality.",
    schemaRelevance: ["Unrelenting Standards", "Failure"],
    tags: ["doubt", "evidence", "confidence", "log", "data", "override", "DEKRA", "current_reality"],
    practice: {
      what: "Start a doubt-evidence log",
      how: "When doubt fires ('Am I good enough for this?'): Column 1 — The doubt, stated precisely. Column 2 — ALL evidence against it from current reality. For your case: 8 months at AVIS. 8+ confirmed regulation instances. Mehdi has not fired you. Pattern architecture fully mapped. Built two working apps. Technical background is real. The evidence is overwhelming — the doubt just shouts louder. Make the evidence louder by writing it down every single time.",
      when: "Every time impostor-type doubt fires",
      duration: "5-10 minutes",
      frequency: "Every significant doubt episode. Review log weekly.",
      successMarker: "The evidence column becomes so long that new doubts are immediately met with 'I have a log that says otherwise.'"
    },
    progressionTo: "TCBC-02"
  },
  {
    id: "TCBC-02",
    source: "Think Confident, Be Confident — Sokol & Fox",
    sourceShort: "TCBC",
    framework: "cbt",
    concept_type: "confidence_building",
    name: "Confidence Continuum — Replacing All-or-Nothing",
    description: "Replace the binary 'competent or incompetent' with a 0-100 continuum. Most performance falls between 40-80. The schema only recognizes 0 (failure) and 100 (safe).",
    mechanism: "The family observation created a binary: excelling sisters = gathered, failing sisters = marginalized. There was no middle. Sokol & Fox's continuum technique directly challenges this by making the middle visible, habitable, and safe. Most of professional life IS the middle — and the middle is where effective work happens.",
    schemaRelevance: ["Unrelenting Standards", "Failure"],
    tags: ["continuum", "binary", "all_or_nothing", "spectrum", "middle", "performance", "safe"],
    practice: {
      what: "Rate today's performance on a continuum, not a binary",
      how: "At end of workday: 'How did I perform today? Not perfect or failed — what number?' Examples: 'Handled three client cases cleanly (65), got activated by Mehdi's email but regulated within 10 minutes (75 for regulation, 45 for initial reaction), wrote a solid report (70).' Notice: every number between 30-80 is NORMAL PROFESSIONAL PERFORMANCE. The schema only accepts 90+. The continuum shows that 60-70 is where most competent people operate most of the time.",
      when: "Daily end-of-day review",
      duration: "5 minutes",
      frequency: "Daily for 4 weeks. Then weekly.",
      successMarker: "You can rate yourself at 65 without anxiety. The number '65' feels like a reasonable day, not a failure."
    },
    progressionFrom: "TCBC-01"
  },
  {
    id: "TCBC-03",
    source: "Think Confident, Be Confident — Sokol & Fox",
    sourceShort: "TCBC",
    framework: "cbt",
    concept_type: "confidence_building",
    name: "The Assertive Response Bank",
    description: "Pre-build a bank of assertive responses for recurring schema-activation situations. Not rehearsal (which feeds the rumination engine) — pre-built templates that bypass the need to simulate.",
    mechanism: "The Rebel fires partly because the patient has no intermediate responses between silence and rebellion. Building a response bank creates the third state at the verbal level: clear, assertive, one-statement responses that neither submit nor attack. Having them pre-built means the simulation engine has nothing to simulate — the response already exists.",
    schemaRelevance: ["Subjugation", "Unrelenting Standards"],
    tags: ["assertive", "response_bank", "third_state", "verbal", "template", "authority", "rebel"],
    practice: {
      what: "Build response templates for your top 5 activation scenarios",
      how: "For each recurring scenario, write ONE clean response: (1) Boss asks you to check before deciding: 'Understood, I'll consult before externalizing on this type of issue.' (2) Colleague questions your competence: 'I appreciate the input. Here's my reasoning: [state once]. Let me know if you see it differently.' (3) You're asked to do something below your level: 'I'll handle it.' (no explanation, no defense). (4) You disagree with a decision: 'I see it differently — [one sentence]. Happy to defer to your call.' (5) You don't know something: 'I'm not sure about that. Let me check and get back to you.'",
      when: "Create the bank now. Review before known high-activation situations.",
      duration: "20 minutes to create. 2 minutes to review.",
      frequency: "Create once. Practice aloud weekly. Update as new scenarios arise.",
      successMarker: "A template fires automatically in a real situation and you deliver it cleanly. No 20-minute simulation beforehand."
    }
  },
  {
    id: "TCBC-04",
    source: "Think Confident, Be Confident — Sokol & Fox",
    sourceShort: "TCBC",
    framework: "cbt",
    concept_type: "confidence_building",
    name: "Credit-Giving Practice — Countering the Discount",
    description: "Sokol & Fox emphasize that low confidence is maintained by discounting positive evidence. The schema takes successful regulation ('I stayed calm in the meeting') and strips it of credit ('It took me 20 minutes, so it doesn't count'). This practice reverses the discount.",
    mechanism: "Every time a regulation success is discounted, the schema stays intact. Every time it is credited, the experiential record updates. This is not positive thinking — it is accurate accounting. If you caught counterattack before sending the email, that is evidence of capacity. Period. The schema's addendum ('but you felt like sending it') is the schema protecting itself.",
    schemaRelevance: ["Unrelenting Standards", "Failure"],
    tags: ["credit", "discount", "evidence", "regulation", "positive", "accounting", "schema_protection"],
    practice: {
      what: "Give yourself explicit credit for three regulation successes this week",
      how: "Every evening, answer: 'Did I regulate anything today?' If yes: write it down in FULL CREDIT language: 'I caught the counterattack impulse with the email. I waited. I sent a professional response. This is regulation. Full stop.' Do NOT add: 'but I still felt angry' or 'it took too long' or 'a better person wouldn't have been activated at all.' The schema will try to add these. Don't let it.",
      when: "Every evening",
      duration: "5 minutes",
      frequency: "Daily. Non-negotiable for first 6 weeks.",
      successMarker: "You notice a regulation success in real-time and internally credit it before the schema can discount it."
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATED — CROSS-FRAMEWORK HEALING PROTOCOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "INT-01",
    source: "Integrated — Schema Therapy + MCT + ACT + CBT",
    sourceShort: "Integrated",
    framework: "integrated",
    concept_type: "daily_protocol",
    name: "Morning Recalibration Protocol (5 minutes)",
    description: "A daily morning practice combining schema awareness, metacognitive check-in, and values intention. Sets the nervous system to 'third state' before the day begins.",
    mechanism: "Combines Schema Therapy (mode check), MCT (metacognitive awareness), ACT (values intention), and CBT (distortion readiness) into a single efficient practice. The morning sets the attentional baseline for the day — starting from Healthy Adult mode rather than waiting for schema activation to trigger correction.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["morning", "protocol", "daily", "integrated", "routine", "prevention", "calibration"],
    practice: {
      what: "5-minute morning recalibration before leaving for work",
      how: "Step 1 (1 min): Mode check — 'What mode am I waking up in? Demanding Parent? Anxious Child? Healthy Adult?' Name it. Step 2 (1 min): Metacognitive intention — 'If the inner voice starts today, I will notice it without engaging.' Step 3 (1 min): Values intention — 'Today I work for professional effectiveness, not for schema safety. My job requires: anticipate, inform, stay in domain.' Step 4 (1 min): Schema readiness — 'If Mehdi gives an instruction, I will check content vs structure before reacting.' Step 5 (1 min): Self-credit — 'Yesterday I [name one regulation success]. That was real.'",
      when: "Every workday morning. Before checking email.",
      duration: "5 minutes",
      frequency: "Daily. Non-negotiable.",
      successMarker: "You arrive at AVIS already in Healthy Adult mode. The first activation of the day is caught earlier because the system was pre-calibrated."
    }
  },
  {
    id: "INT-02",
    source: "Integrated — Schema Therapy + MCT + CBT",
    sourceShort: "Integrated",
    framework: "integrated",
    concept_type: "activation_response_protocol",
    name: "ACTIVATE Response Protocol — In-the-Moment",
    description: "A step-by-step protocol for the exact moment a schema fires. Not analysis — immediate action sequence.",
    mechanism: "Integrates MCT's detached mindfulness, Schema Therapy's mode identification, CBT's distortion naming, and ACT's committed action into a single executable sequence. Designed to be fast enough to interrupt the CAS before it completes its first full loop.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["activate", "protocol", "in_the_moment", "interrupt", "sequence", "immediate", "CAS"],
    practice: {
      what: "Execute ACTIVATE when schema fires",
      how: "A — Aware: 'I am activated.' (MCT: notice) → C — Content check: 'Is this about content or about being told?' (Schema: Subjugation test) → T — Thought named: 'The thought is: [state it exactly].' (CBT: externalize) → I — Is this a distortion?: 'Mind reading? Should statement? Fortune telling?' (CBT: name it) → V — Values check: 'What does my value say to do here?' (ACT) → A — Act on value, not schema: Do the values-based action. → T — Take credit: 'I regulated.' (Sokol & Fox) → E — Evidence logged: Add to pattern log. Total time: 30-60 seconds internally. No one sees you doing it.",
      when: "Every schema activation. Every single one.",
      duration: "30-60 seconds",
      frequency: "Every activation",
      successMarker: "You can run through ACTIVATE automatically within 30 seconds. The CAS doesn't complete its first loop."
    }
  },
  {
    id: "INT-03",
    source: "Integrated — Schema Therapy + ACT + CFT",
    sourceShort: "Integrated",
    framework: "integrated",
    concept_type: "weekly_review",
    name: "Weekly Wound Review — Progress Tracking",
    description: "Weekly structured review of schema activations, regulation successes, and healing progress. Prevents the schema from discounting all weekly evidence of change.",
    mechanism: "Combines Schema Therapy's pattern tracking, ACT's values audit, CFT's self-compassion check, and CBT's evidence accumulation. The weekly cadence is optimal — daily is too granular, monthly loses momentum. The structure ensures BOTH activations AND successes are tracked, preventing the schema's negativity bias from erasing progress.",
    schemaRelevance: ["Unrelenting Standards", "Subjugation", "Failure"],
    tags: ["weekly", "review", "progress", "tracking", "regulation", "evidence", "balance"],
    practice: {
      what: "30-minute weekly review every Friday evening",
      how: "Section 1 — Activations: How many schema activations this week? Which patterns? Which schemas? Section 2 — Regulations: How many did I regulate? How fast? What worked? Section 3 — Behavioral experiments: Did I do one? What happened? Section 4 — Mode distribution: How much time in Healthy Adult vs Demanding Parent vs Rebel? Section 5 — Soothing: Did I have at least 3 genuine pleasure activities this week? Section 6 — Credit: Write ONE sentence of full, undiscounted credit for the week's best regulation.",
      when: "Friday evening or Saturday morning",
      duration: "30 minutes",
      frequency: "Weekly. Non-negotiable.",
      successMarker: "Week-over-week data shows: faster regulation, fewer full CAS loops, more Healthy Adult time, more soothing activities. This is the data that proves healing is happening."
    }
  },
  {
    id: "INT-04",
    source: "Integrated — CFT + Schema Therapy",
    sourceShort: "Integrated",
    framework: "cft",
    concept_type: "compassion_exercise",
    name: "Compassionate Reframe of the Schema's Intelligence",
    description: "The schema was formed by a brilliant child reading his environment correctly. Healing does not require calling the child stupid — it requires honoring the intelligence while updating the conclusion. The child was right THEN. The adult can update NOW.",
    mechanism: "CFT's compassionate reframe prevents the healing process from becoming another Unrelenting Standards project ('I must heal perfectly'). If healing is approached with the same perfectionism that created the wound, no actual healing occurs — just a new domain for the schema to control. Compassion for the original adaptive strategy is what allows genuine updating.",
    schemaRelevance: ["Unrelenting Standards"],
    tags: ["compassion", "CFT", "reframe", "intelligence", "updating", "child", "adaptive", "Gilbert"],
    practice: {
      what: "Write and read a compassionate reframe of your schema",
      how: "'The boy who watched his sisters was right about that house. Excellence DID equal belonging there. His conclusion was intelligent, not pathological. He protected himself with the best tool available — his ability to observe and predict. That tool saved him. The question now is not whether the tool was good — it was. The question is whether the adult still needs a tool designed for a child's house. At AVIS, the rules are different. The tool can be honored AND retired from active duty.'",
      when: "Read when the schema feels like 'just who I am' rather than a strategy",
      duration: "2 minutes to read. 5 minutes to sit with it.",
      frequency: "Weekly. And any time the schema feels immovable.",
      successMarker: "You can hold both truths simultaneously: 'I was smart to develop this' AND 'I don't need it anymore.' Without contradiction."
    }
  }
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Try .env.local
    const { config } = await import("dotenv");
    config({ path: ".env.local" });
  }
  const finalUri = process.env.MONGODB_URI;
  if (!finalUri) throw new Error("MONGODB_URI not set");

  const client = new MongoClient(finalUri);
  await client.connect();
  const db = client.db("hope");

  // Drop existing collection if it exists
  const collections = await db.listCollections({ name: "hp" }).toArray();
  if (collections.length > 0) {
    await db.collection("hp").drop();
    console.log("Dropped existing hp collection");
  }

  // Create and seed
  await db.collection("hp").insertMany(records);
  console.log(`Seeded ${records.length} healing path records into hp collection`);

  // Create indexes
  await db.collection("hp").createIndex({ schemaRelevance: 1 });
  await db.collection("hp").createIndex({ framework: 1 });
  await db.collection("hp").createIndex({ tags: 1 });
  await db.collection("hp").createIndex({ id: 1 }, { unique: true });
  console.log("Indexes created");

  // Summary
  const byFramework = records.reduce((acc, r) => {
    acc[r.framework] = (acc[r.framework] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("\nRecords by framework:");
  Object.entries(byFramework).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const bySource = records.reduce((acc, r) => {
    acc[r.sourceShort] = (acc[r.sourceShort] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("\nRecords by source:");
  Object.entries(bySource).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  await client.close();
}

main().catch(console.error);
