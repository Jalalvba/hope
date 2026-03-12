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

// Priority concept types per DB
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
    "defectiveness", "failure", "unrelenting standards",
    "incompetence", "threat", "competence", "rumination",
    "worry", "counterattack", "surrender", "escape",
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

    const SYSTEM = `You are a clinical psychologist specialized in schema therapy (Young & Klosko), metacognitive therapy (Wells), and compassion-focused therapy (Gilbert).

PATIENT PROFILE:
ROOT BELIEF: "I am fundamentally at risk of being seen as incompetent by someone with power over me."
THREAT EQUATION: Competence = safety. Incompetence = attack.
ORIGIN: DEKRA Automotive Maroc, 7 years. Overqualified engineer trapped in a threatening environment. Competence-as-survival equation was written there and runs in every professional context since.
SCHEMAS: Defectiveness (root) → Failure (achievement domain) → Unrelenting Standards (compensatory)
GILBERT SYSTEMS: Threat chronically dominant. Drive contaminated by fear (fearful striving — performing to silence threat, not for satisfaction). Soothing severely underdeveloped — safety was never given freely, always conditional on proof of competence. The trial therefore never ends.
KNOWN PATTERNS: P1=Career Uncertainty, P2=Coworker Motives, P3=Boss Reaction, P4=Waiting Pain, P5=Social Validation, P6=Perfectionism, P7=Hostile Attribution, P8=Auto Social Simulation, P9=Third-Person Eval Simulation, P10=Rumination Engine, P11=Status Threat

RESPONSE MODE RULES — apply these precisely:
- Surrender = passively accepting the schema's premise: avoiding evaluation, people-pleasing, not defending, shrinking
- Escape = removing from situation: quitting, withdrawing, dissociating, changing jobs to avoid the threat
- Counterattack = active resistance: rehearsing defenses, over-explaining, justifying, preparing scripts, attacking back, seeking to control the narrative

You have been provided with relevant clinical records below. Ground your analysis in specific concepts, mechanisms, and interventions from those records — not generic clinical language.

Respond ONLY with valid JSON. No preamble. No markdown. No code fences. Start with { end with }.${rylContext}${mctContext}`;

    const prompt = `PATTERN TO ANALYZE:
- ID: ${pattern.id}
- Label: ${pattern.label}
- Short: ${pattern.short}
- Core belief: ${pattern.coreBelief}
- Symptoms: ${(pattern.symptoms ?? []).join("; ")}
- Cognitive labels: ${(pattern.cognitiveLabels ?? []).join(", ")}
${pattern.note ? `- Note: ${pattern.note}` : ""}

Return this JSON:
{
  "analyzedAt": "<ISO string>",
  "summary": "<4-5 sentence clinical narrative that must: (1) name the exact schema mechanism activating this pattern, (2) trace it explicitly to the DEKRA 7-year formation, (3) identify which Gilbert system is dominant and why, (4) explain what the pattern functionally maintains — what would happen if the pattern stopped running>",
  "schemaActivated": ["Defectiveness" and/or "Failure" and/or "Unrelenting Standards" — include all that apply],
  "responseMode": "Surrender" or "Escape" or "Counterattack" — use the rules above precisely,
  "systemsInvolved": ["threat" and/or "drive" and/or "soothing" — include all that apply],
  "relatedPatterns": ["P1" etc — patterns sharing the same underlying mechanism],
  "bookMappings": [
    {
      "concept": "<exact concept name from the provided records>",
      "source": "<exact source string from the record>",
      "relevance": "<one precise sentence: how this specific concept maps to this specific pattern instance>"
    }
  ],
  "practiceRecommendation": "<one specific, concrete practice drawn directly from the intervention field of a relevant record — name the technique, give one concrete step, make it actionable today>"
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
