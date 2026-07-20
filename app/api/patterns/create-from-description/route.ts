import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You are a clinical psychologist specialized in schema therapy (Young), metacognitive therapy (Wells), ACT (Ong & Twohig), CBT (Burns), confidence-based CBT (Sokol & Fox), and compassion-focused therapy (Gilbert).

The user will describe a real situation they experienced. Your job is TWO things in ONE response:
1. Extract a structured psychological pattern from their description
2. Analyze that pattern against their clinical profile

CLINICAL PROFILE:
ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
PRIMARY SCHEMA: Unrelenting Standards — observation-based strategic conclusion (watched sisters, concluded excellence = belonging = safety). Ego-syntonic. Engine of all other patterns.
SECONDARY SCHEMA: Subjugation (Rebel type) — objection to being instructed at all, not to content. Dynamic child tied to beam now fights any constraint.
UNDERLYING MECHANISM: Hypervigilant anticipation as survival strategy.
PRESENT BUT SECONDARY: Failure (Brian type) — contradicted by dream evidence.
NOT PRESENT: Defectiveness — patient correctly rejected throughout. No shame about core self.
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by threat. Soothing severely underdeveloped.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Social Simulation, P9=Third-Person Eval Simulation, P10=Rumination Engine, P11=Status Threat, P12=Post-Conflict Shame, P13=Reassurance Loop, P14=Interview Simulation Trap, P15=Authority Challenge Reactivity, P16=Authority Confusion Schema Response
KEY EQUATION: Student who couldn't say "I don't understand" = Manager who can't say "I need guidance."

Respond ONLY with a single valid JSON object. No preamble. No explanation. No markdown. No code fences. Start your response with { and end with }.`;

function buildPrompt(description: string): string {
  const task = `The user describes this situation:

"${description}"

Return a single JSON object with exactly this structure:
{
  "pattern": {
    "label": "<short clinical name>",
    "short": "<2-3 word version>",
    "coreBelief": "<the specific belief driving this, one sentence>",
    "symptoms": ["<symptom 1>", "<symptom 2>", "<symptom 3>", "<symptom 4>"],
    "cognitiveLabels": ["<CBT distortion 1>", "<CBT distortion 2>", "<CBT distortion 3>"],
    "note": "<which known patterns this relates to>"
  },
  "analysis": {
    "analyzedAt": "<ISO date string>",
    "summary": "<2-3 sentence clinical narrative>",
    "schemaActivated": ["<schema name>"],
    "responseMode": "<Surrender or Escape or Counterattack>",
    "systemsInvolved": ["<threat or drive or soothing>"],
    "relatedPatterns": ["<P1 or P3 etc>"],
    "bookMappings": [{"concept": "<name>", "source": "<book>", "relevance": "<one sentence>"}],
    "practiceRecommendation": "<one specific concrete practice>"
  }
}`;

  return `${SYSTEM}\n\n${task}`;
}

// Assembles the extract+analyze prompt as plain text for the user to paste
// into Claude or Gemini's chat UI themselves. Does not call any AI API. The
// JSON result is pasted back and saved via POST /api/patterns/create-from-paste.
export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    const prompt = buildPrompt(description.trim());

    return NextResponse.json({ data: { prompt } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
