import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import type { Pattern } from "@/types";

const DB = "hope";
const COL = "psy";

export async function GET() {
  try {
    const client = await clientPromise;
    const docs = await client
      .db(DB).collection<Pattern>(COL)
      .find({ type: "pattern" })
      .sort({ id: 1 })
      .toArray();
    return NextResponse.json({ data: docs });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, label, short, coreBelief, symptoms, cognitiveLabels, note } = body;

    if (!id || !label || !coreBelief) {
      return NextResponse.json({ error: "id, label and coreBelief are required" }, { status: 400 });
    }

    const doc: Pattern = {
      id, type: "pattern", label,
      short: short || label,
      coreBelief,
      symptoms: symptoms || [],
      cognitiveLabels: cognitiveLabels || [],
      note: note || "",
      createdAt: new Date(),
    };

    const client = await clientPromise;
    const result = await client.db(DB).collection<Pattern>(COL).insertOne(doc);
    return NextResponse.json({ data: { _id: result.insertedId, ...doc } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
