import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise, { dbName } from "@/lib/mongo";
import type { Pattern } from "@/types";
import { validatePatternAnalysis } from "@/lib/validatePatternAnalysis";

const DB = dbName;
const COL = "psy";

function buildQuery(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

// Saves a PatternAnalysis JSON object pasted back from Claude/Gemini's chat UI.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const result = validatePatternAnalysis(body.analysis);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB);

    const existing = await db.collection<Pattern>(COL).findOne(buildQuery(id));
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.collection<Pattern>(COL).updateOne(
      buildQuery(id),
      { $set: { analysis: result.data, updatedAt: new Date() } }
    );

    const updated = await db.collection<Pattern>(COL).findOne(buildQuery(id));
    return NextResponse.json({ data: { ...updated, _id: String(updated!._id) } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
