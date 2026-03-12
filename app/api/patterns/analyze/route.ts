import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import Anthropic from "@anthropic-ai/sdk";
import type { Pattern } from "@/types";

const DB = "hope";
const ai = new Anthropic();

// ── helpers ──────────────────────────────────────────────────────────────────

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

function pickTop(
  collection: Record<string, unknown>[],
  keywords: string[],
  n: number
): Record<string, unknown>[] {
  return [...collection]
    .map((r) => ({ r, s: scoreRecord(r, keywords) }))
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
      ? toStr((r.intervention as Record<string,unknown>).primary ?? r.intervention).slice(0, 200)
      : String(r.intervention).slice(0, 200);
    parts.push(`Intervention: ${intv}`);
  }
  return parts.join("\n");
}

function buildQuery(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

// ── keywords from pattern ─────────────────────────────────────────────────────

function extractKeywords(pattern: Pattern): string[] {
  const base = [
    ...pattern.symptoms,
    ...pattern.cognitiveLabels,
    pattern.coreBelief,
    pattern.label,
  ].join(" ").toLowerCase();

  // Always include core profile keywords
  const profile = [
    "defectiveness", "failure", "unrelenting standards",
    "incompetence", "threat", "competence",
  ];

  // Extract meaningful words from pattern fields (>4 chars)
  const fromPattern = base.split(/\W+/).filter((w) => w.length > 4);

  return [...new Set([...profile, ...fromPattern])];
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { patternId } = await req.json();
    const mongo = await clientPromise;
    const db = mongo.db(DB);

    const pattern = await db.collection<Pattern>("psy").findOne(buildQuery(patternId));
    if (!pattern) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch knowledge bases
    const [rylRaw, mctRaw] = await Promise.all([
      db.collection("ryl").find({}).toArray(),
      db.collection("mct").find({}).toArray(),
    ]);

    const keywords = extractKeywords(pattern);

    // Pick top relevant records
    const rylRecords = rylRaw.length > 0
      ? pickTop(rylRaw as Record<string, unknown>[], keywords, 5)
      : [];
    const mctRecords = mctRaw.length > 0
      ? pickTop(mctRaw as Record<string, unknown>[], keywords, 5)
      : [];

    // Format knowledge context
    const rylContext = rylRecords.length > 0
      ? `\n\nRELEVANT SCHEMA THERAPY RECORDS (Young & Klosko):\n${rylRecords.map(formatRecord).join("\n\n")}`
      : "";
    const mctContext = mctRecords.length > 0
      ? `\n\nRELEVANT MCT RECORDS (Wells):\n${mctRecords.map(formatRecord).join("\n\n")}`
      : "";

    const SYSTEM = `You are a clinical psychologist specialized in schema therapy (Young & Klosko), metacognitive therapy (Wells), and compassion-focused therapy (Gilbert).

PATIENT PROFILE:
ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
ORIGIN: DEKRA Automotive Maroc, 7 years. Nervous system formed under chronic professional threat.
SCHEMAS: Defectiveness (root) → Failure (achievement domain) → Unrelenting Standards (compensatory)
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by fear (fearful striving). Soothing severely underdeveloped — safety was never given freely, always conditional on proof of competence.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Social Simulation, P9=Third-Person Eval Simulation, P10=Rumination Engine, P11=Status Threat

You have been provided with relevant clinical records from the patient's knowledge bases below. Use them to ground your analysis in specific concepts, mechanisms, and interventions from those frameworks — not generic clinical language.

Respond ONLY with valid JSON. No preamble. No markdown. No code fences. Start with { end with }.${rylContext}${mctContext}`;

    const prompt = `PATTERN TO ANALYZE:
- ID: ${pattern.id}
- Label: ${pattern.label}
- Short: ${pattern.short}
- Core belief: ${pattern.coreBelief}
- Symptoms: ${(pattern.symptoms ?? []).join("; ")}
- Cognitive labels: ${(pattern.cognitiveLabels ?? []).join(", ")}
${pattern.note ? `- Note: ${pattern.note}` : ""}

Using the clinical records provided in the system prompt, return a JSON analysis:
{
  "analyzedAt": "<ISO string>",
  "summary": "<3-4 sentence clinical narrative grounded in the specific frameworks — name the exact mechanisms at work>",
  "schemaActivated": ["Defectiveness" | "Failure" | "Unrelenting Standards"],
  "responseMode": "Surrender" | "Escape" | "Counterattack",
  "systemsInvolved": ["threat" | "drive" | "soothing"],
  "relatedPatterns": ["P1" etc — which known patterns share the same mechanism],
  "bookMappings": [
    {
      "concept": "<exact concept name from the provided records>",
      "source": "<exact source string from the record>",
      "relevance": "<one sentence: how this specific concept maps to this specific pattern>"
    }
  ],
  "practiceRecommendation": "<one specific, concrete practice drawn from the intervention field of a relevant record — not generic advice>"
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
