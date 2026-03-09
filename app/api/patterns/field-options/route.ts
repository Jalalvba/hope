import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function GET() {
  try {
    const client = await clientPromise;
    const doc = await client.db("hope").collection("fields")
      .findOne({ _id: "clinical_fields_v1" });

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