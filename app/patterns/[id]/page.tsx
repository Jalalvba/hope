import { notFound } from "next/navigation";
import Link from "next/link";
import clientPromise from "@/lib/mongo";
import { ObjectId } from "mongodb";
import type { Pattern } from "@/types";
import { getPatternColor } from "@/types";
import { AnalysisSection } from "@/components/AnalysisSection";
import { PatternActions } from "@/components/PatternActions";

const COLOR: Record<string, { badge: string; title: string; border: string }> = {
  amber: { badge: "bg-amber-400/10 text-amber-400 border-amber-400/20", title: "text-amber-400", border: "border-amber-400/20" },
  blue:  { badge: "bg-mist-400/10 text-mist-400 border-mist-400/20",   title: "text-mist-400",  border: "border-mist-400/20"  },
  red:   { badge: "bg-rust-400/10 text-rust-400 border-rust-400/20",   title: "text-rust-400",  border: "border-rust-400/20"  },
  green: { badge: "bg-sage-400/10 text-sage-400 border-sage-400/20",   title: "text-sage-400",  border: "border-sage-400/20"  },
};

async function getPattern(id: string): Promise<Pattern | null> {
  const client = await clientPromise;
  const doc = await client.db("hope").collection<Pattern>("psy").findOne(
    ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id }
  );
  if (!doc) return null;
  return { ...doc, _id: String(doc._id) };
}

export default async function PatternPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pattern = await getPattern(id);
  if (!pattern) notFound();
  const color = getPatternColor(pattern.id);
  const cls = COLOR[color] ?? COLOR.amber;
  const isLive = parseInt(pattern.id.replace("P", "")) > 11;

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-parchment-300/35 hover:text-parchment-300/60 transition-colors"
        >
          ← All patterns
        </Link>
        {isLive && <PatternActions pattern={pattern} />}
      </div>

      <div className={`glass rounded-xl p-5 border ${cls.border} mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls.badge}`}>
            {pattern.id}
          </span>
          {pattern.note && (
            <span className="text-[10px] text-parchment-300/30 italic">{pattern.note}</span>
          )}
        </div>

        <h1 className={`font-display text-2xl mb-4 ${cls.title}`}>{pattern.label}</h1>

        <div className="mb-5">
          <p className="text-[10px] text-parchment-300/35 uppercase tracking-widest mb-1">
            Core belief
          </p>
          <p className="text-sm text-parchment-100 italic leading-relaxed">
            &quot;{pattern.coreBelief}&quot;
          </p>
        </div>

        {pattern.symptoms.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] text-parchment-300/35 uppercase tracking-widest mb-2">
              Symptoms
            </p>
            <ul className="space-y-2">
              {pattern.symptoms.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-parchment-200/65 leading-relaxed">
                  <span className="text-parchment-300/20 shrink-0 font-mono mt-0.5">—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pattern.cognitiveLabels.length > 0 && (
          <div>
            <p className="text-[10px] text-parchment-300/35 uppercase tracking-widest mb-2">
              Cognitive labels
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pattern.cognitiveLabels.map((l) => (
                <span
                  key={l}
                  className="text-[10px] px-2 py-0.5 rounded bg-parchment-300/6 text-parchment-300/45 font-mono border border-parchment-300/8"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnalysisSection
          patternId={String(pattern._id)}
          existingAnalysis={pattern.analysis ?? null}
        />
    </div>
  );
}