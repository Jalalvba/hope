import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import type { Pattern } from "@/types";

const DB = "hope";
const COL = "psy";

function buildQuery(id: string) {
  return ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const doc = await client.db(DB).collection<Pattern>(COL).findOne(buildQuery(id));
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { ...doc, _id: String(doc._id) } });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { label, short, coreBelief, symptoms, cognitiveLabels, note } = body;

    const client = await clientPromise;
    const db = client.db(DB);

    await db.collection<Pattern>(COL).updateOne(
      buildQuery(id),
      {
        $set: {
          ...(label !== undefined && { label }),
          ...(short !== undefined && { short }),
          ...(coreBelief !== undefined && { coreBelief }),
          ...(symptoms !== undefined && { symptoms }),
          ...(cognitiveLabels !== undefined && { cognitiveLabels }),
          ...(note !== undefined && { note }),
          updatedAt: new Date(),
        },
      }
    );

    const updated = await db.collection<Pattern>(COL).findOne(buildQuery(id));
    return NextResponse.json({ data: { ...updated, _id: String(updated!._id) } });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    await client.db(DB).collection(COL).deleteOne(buildQuery(id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
