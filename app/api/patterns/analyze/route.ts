import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import Anthropic from "@anthropic-ai/sdk";
import type { Pattern } from "@/types";

const DB = "hope";
const ai = new Anthropic();

const SYSTEM = `You are a clinical psychologist specialized in schema therapy (Young), compassion-focused therapy (Gilbert), and CBT.

ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
SCHEMAS: Defectiveness (root) → Failure (achievement) → Unrelenting Standards (compensatory)
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by threat. Soothing severely underdeveloped.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Simulation, P9=Third-Person Eval, P10=Rumination Engine, P11=Status Threat

Respond ONLY with valid JSON. No preamble. No markdown.`;

export async function POST(req: NextRequest) {
  try {
    const { patternId } = await req.json();
    const mongo = await clientPromise;
    const db = mongo.db(DB);

    const pattern = await db.collection<Pattern>("psy").findOne({ _id: new ObjectId(patternId) });
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const prompt = `NEW PATTERN LOGGED:
- ID: ${pattern.id}
- Label: ${pattern.label}
- Short: ${pattern.short}
- Core belief: ${pattern.coreBelief}
- Symptoms: ${pattern.symptoms.join("; ")}
- Cognitive labels: ${pattern.cognitiveLabels.join(", ")}
${pattern.note ? `- Note: ${pattern.note}` : ""}

Analyze this against the clinical profile. Return JSON:
{
  "analyzedAt": "<ISO string>",
  "summary": "<2-3 sentence clinical narrative>",
  "schemaActivated": ["Defectiveness" | "Failure" | "Unrelenting Standards"],
  "responseMode": "Surrender" | "Escape" | "Counterattack",
  "systemsInvolved": ["threat" | "drive" | "soothing"],
  "relatedPatterns": ["P1" | "P3" | "..."],
  "bookMappings": [{"concept": "<n>", "source": "<book>", "relevance": "<one sentence>"}],
  "practiceRecommendation": "<one specific concrete practice>"
}`;

    const response = await ai.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const analysis = JSON.parse(text);
    analysis.analyzedAt = new Date(analysis.analyzedAt);

    await db.collection<Pattern>("psy").updateOne(
      { _id: new ObjectId(patternId) },
      { $set: { analysis, updatedAt: new Date() } }
    );

    const updated = await db.collection<Pattern>("psy").findOne({ _id: new ObjectId(patternId) });
    return NextResponse.json({ data: { ...updated, _id: String(updated!._id) } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
