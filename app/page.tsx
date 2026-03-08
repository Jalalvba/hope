import Link from "next/link";
import clientPromise from "@/lib/mongo";
import type { Pattern } from "@/types";
import { getPatternColor } from "@/types";
import { NewPatternButton } from "@/components/NewPatternButton";

const COLOR: Record<string, { badge: string; border: string; belief: string }> = {
  amber: { badge: "bg-amber-400/10 text-amber-400 border-amber-400/20", border: "border-amber-400/15", belief: "text-amber-400/60" },
  blue:  { badge: "bg-mist-400/10 text-mist-400 border-mist-400/20",   border: "border-mist-400/15",  belief: "text-mist-400/60"  },
  red:   { badge: "bg-rust-400/10 text-rust-400 border-rust-400/20",   border: "border-rust-400/15",  belief: "text-rust-400/60"  },
  green: { badge: "bg-sage-400/10 text-sage-400 border-sage-400/20",   border: "border-sage-400/15",  belief: "text-sage-400/60"  },
};

async function getPatterns(): Promise<Pattern[]> {
  const client = await clientPromise;
  return client.db("hope").collection<Pattern>("psy")
    .find({ type: "pattern" }).sort({ id: 1 }).toArray()
    .then((docs) => docs.map((d) => ({ ...d, _id: String(d._id) })));
}

export default async function Home() {
  const patterns = await getPatterns();
  const reference = patterns.filter((p) => {
    const num = parseInt(p.id.replace("P", ""));
    return num <= 11;
  });
  const live = patterns.filter((p) => {
    const num = parseInt(p.id.replace("P", ""));
    return num > 11;
  });

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl text-parchment-100 leading-tight">
          Psyche <span className="text-gold-400">Log</span>
        </h1>
        <p className="text-xs text-parchment-300/35 mt-1 font-mono">
          {patterns.length} patterns · personal clinical journal
        </p>
      </div>

      {/* New pattern CTA */}
      <div className="mb-8">
        <NewPatternButton />
      </div>

      {/* Live patterns (P12+) */}
      {live.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest mb-3">Recent entries</p>
          <div className="space-y-3">
            {live.reverse().map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </div>
      )}

      {/* Reference patterns (P1–P11) */}
      <div>
        <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest mb-3">Reference patterns</p>
        <div className="space-y-3">
          {reference.map((p) => (
            <PatternCard key={p.id} pattern={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PatternCard({ pattern: p }: { pattern: Pattern }) {
  const color = getPatternColor(p.id);
  const cls = COLOR[color] ?? COLOR.amber;
  const isLive = parseInt(p.id.replace("P", "")) > 11;

  return (
    <Link
      href={`/patterns/${p.id}`}
      className={`glass rounded-xl p-4 flex flex-col gap-2.5 border ${cls.border} hover:bg-parchment-100/[0.025] transition-all duration-200 active:scale-[0.99] block`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls.badge}`}>{p.id}</span>
        <div className="flex items-center gap-2">
          {isLive && p.analysis && (
            <span className="text-[10px] font-mono text-sage-400/60">✦ analyzed</span>
          )}
          {isLive && !p.analysis && (
            <span className="text-[10px] font-mono text-gold-400/40">pending</span>
          )}
          <span className="text-parchment-300/20 text-xs">→</span>
        </div>
      </div>

      <h2 className="font-display text-base text-parchment-100 leading-snug">{p.label}</h2>

      <p className={`text-xs italic leading-relaxed line-clamp-1 ${cls.belief}`}>
        "{p.coreBelief}"
      </p>

      {p.cognitiveLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {p.cognitiveLabels.slice(0, 3).map((l) => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-parchment-300/5 text-parchment-300/30 font-mono">
              {l}
            </span>
          ))}
          {p.cognitiveLabels.length > 3 && (
            <span className="text-[10px] text-parchment-300/20">+{p.cognitiveLabels.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}
