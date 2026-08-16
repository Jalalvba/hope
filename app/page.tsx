/**
 * Home page — the list of every logged pattern.
 *
 * This is a Server Component: it reads from MongoDB directly while rendering,
 * with no client-side fetch. `force-dynamic` disables caching so a newly saved
 * pattern shows up immediately instead of on the next rebuild.
 */

export const dynamic = "force-dynamic";

import { findAllPatterns } from "@/lib/db/patterns";
import { isEditablePattern } from "@/lib/utils/patternTiers";
import { NewPatternButton } from "@/components/patterns/NewPatternButton";
import { PatternCard } from "@/components/patterns/PatternCard";

export default async function Home() {
  const patterns = await findAllPatterns();

  // The list is shown in two groups: entries created through the app, then the
  // seeded read-only reference patterns (P1–P11) underneath.
  const recentEntries = patterns.filter((pattern) => isEditablePattern(pattern.id));
  const referencePatterns = patterns.filter((pattern) => !isEditablePattern(pattern.id));

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl text-parchment-100 leading-tight">
          Psyche <span className="text-gold-400">Log</span>
        </h1>
        <p className="text-xs text-parchment-300/35 mt-1 font-mono">
          {patterns.length} patterns · personal clinical journal
        </p>
      </div>

      <div className="mb-8">
        <NewPatternButton />
      </div>

      {recentEntries.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest mb-3">
            Recent entries
          </p>
          <div className="space-y-3">
            {recentEntries.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest mb-3">
          Reference patterns
        </p>
        <div className="space-y-3">
          {referencePatterns.map((pattern) => (
            <PatternCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      </div>
    </div>
  );
}
