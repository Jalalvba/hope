import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import type { Pattern } from "@/types";

const DB = "hope";

export async function GET() {
  try {
    const client = await clientPromise;
    const docs = await client.db(DB).collection<Pattern>("psy")
      .find({ type: "pattern" }).sort({ id: 1 }).toArray();
    return NextResponse.json({ data: docs.map((d) => ({ ...d, _id: String(d._id) })) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, short, coreBelief, symptoms, cognitiveLabels, note } = body;

    if (!label?.trim() || !coreBelief?.trim()) {
      return NextResponse.json({ error: "label and coreBelief are required" }, { status: 400 });
    }

    const mongo = await clientPromise;
    const db = mongo.db(DB);

    // Auto-generate next ID
    const patterns = await db.collection<Pattern>("psy")
      .find({ type: "pattern" }).project({ id: 1 }).toArray();
    const nums = patterns
      .map((p) => parseInt(String(p.id).replace("P", "")))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 12;
    const nextId = `P${nextNum}`;

    const doc = {
      id: nextId,
      type: "pattern" as const,
      label: label.trim(),
      short: (short?.trim()) || label.trim(),
      coreBelief: coreBelief.trim(),
      symptoms: symptoms ?? [],
      cognitiveLabels: cognitiveLabels ?? [],
      note: note?.trim() ?? "",
      createdAt: new Date(),
    };

    const result = await db.collection("psy").insertOne(doc);

    return NextResponse.json({
      data: { ...doc, _id: String(result.insertedId) },
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}