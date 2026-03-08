import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import type { Pattern } from "@/types";

const DB = "hope";
const COL = "psy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    // id can be the pattern string id (P1) or mongo _id
    const doc = await client.db(DB).collection<Pattern>(COL).findOne(
      ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: doc });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
