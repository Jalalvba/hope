import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import Anthropic from "@anthropic-ai/sdk";
import type { Pattern, PatternAnalysis } from "@/types";

const DB = "hope";
const ai = new Anthropic();

const SYSTEM = `You are a clinical psychologist specialized in schema therapy (Young), compassion-focused therapy (Gilbert), and CBT.

The user will describe a real situation they experienced. Your job is TWO things in ONE call:
1. Extract a structured psychological pattern from their description
2. Analyze that pattern against their clinical profile

CLINICAL PROFILE:
ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
SCHEMAS: Defectiveness (root) → Failure (achievement domain) → Unrelenting Standards (compensatory)
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by threat. Soothing severely underdeveloped.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Social Simulation, P9=Third-Person Eval Simulation, P10=Rumination Engine, P11=Status Threat

Respond ONLY with a single valid JSON object. No preamble. No explanation. No markdown. No code fences. Start your response with { and end with }.`;

export async function POST(req: NextRequest) {
  let rawText = "";
  try {
    const { description } = await req.json();
    if (!description?.trim()) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }

    const mongo = await clientPromise;
    const db = mongo.db(DB);

    const patterns = await db.collection<Pattern>("psy")
      .find({ type: "pattern" })
      .project({ id: 1 })
      .toArray();
    const nums = patterns
      .map((p) => parseInt(String(p.id).replace("P", "")))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 12;
    const nextId = `P${nextNum}`;

    const prompt = `The user describes this situation:

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
    "bookMappings": [{"concept": "<n>", "source": "<book>", "relevance": "<one sentence>"}],
    "practiceRecommendation": "<one specific concrete practice>"
  }
}`;

    const response = await ai.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const { pattern: patternFields, analysis } = parsed;
    analysis.analyzedAt = new Date(analysis.analyzedAt);

    const doc: Pattern & { analysis: PatternAnalysis; createdAt: Date; updatedAt: Date } = {
      id: nextId,
      type: "pattern",
      label: patternFields.label,
      short: patternFields.short,
      coreBelief: patternFields.coreBelief,
      symptoms: patternFields.symptoms ?? [],
      cognitiveLabels: patternFields.cognitiveLabels ?? [],
      note: patternFields.note ?? "",
      analysis,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("psy").insertOne(doc);

    return NextResponse.json({
      data: { ...doc, _id: String(result.insertedId) },
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({
      error: String(err),
      rawClaudeResponse: rawText,
      parseIssue: rawText ? `First 500 chars: ${rawText.substring(0, 500)}` : "Claude returned empty response",
    }, { status: 500 });
  }
}
