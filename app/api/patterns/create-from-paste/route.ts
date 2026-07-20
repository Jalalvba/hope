import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import type { Pattern, PatternAnalysis } from "@/types";
import { validateNewPatternFields, validatePatternAnalysis } from "@/lib/validatePatternAnalysis";

const DB = "hope";

// Saves a {pattern, analysis} JSON object pasted back from Claude/Gemini's
// chat UI after running the create-from-description prompt.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const patternResult = validateNewPatternFields(body.pattern);
    if (!patternResult.valid) {
      return NextResponse.json({ error: patternResult.error }, { status: 400 });
    }
    const analysisResult = validatePatternAnalysis(body.analysis);
    if (!analysisResult.valid) {
      return NextResponse.json({ error: analysisResult.error }, { status: 400 });
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

    const doc: Pattern & { analysis: PatternAnalysis; createdAt: Date; updatedAt: Date } = {
      id: nextId,
      type: "pattern",
      ...patternResult.data,
      analysis: analysisResult.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { _id: _omit, ...docToInsert } = doc;
    const result = await db.collection("psy").insertOne(docToInsert);

    return NextResponse.json({
      data: { ...doc, _id: String(result.insertedId) },
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
