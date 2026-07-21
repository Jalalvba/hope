import { NextResponse } from "next/server";
import clientPromise, { dbName } from "@/lib/mongo";

export async function GET() {
  try {
    const client = await clientPromise;
    const doc = await client.db(dbName).collection("fields")
      .findOne({ _id: "clinical_fields_v1" } as any);

    if (!doc) {
      return NextResponse.json({
        data: { coreBeliefs: [], symptoms: [], cognitiveLabels: [] }
      });
    }

    return NextResponse.json({
      data: {
        coreBeliefs: doc.coreBeliefs ?? [],
        symptoms: doc.symptoms ?? [],
        cognitiveLabels: doc.cognitiveLabels ?? [],
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}