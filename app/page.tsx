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
        <h1 className="font-display text-3xl text-fg-primary leading-tight">
          Psyche <span className="text-gold-400">Log</span>
        </h1>
        <p className="text-xs text-fg-muted mt-1 font-mono">
          {patterns.length} patterns · personal clinical journal
        </p>
      </div>

      <div className="mb-8">
        <NewPatternButton />
      </div>

      {recentEntries.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-3">
            Recent entries
          </p>
          <div className="space-y-3">
            {recentEntries.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {referencePatterns.length > 0 && (
        <div>
          <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-3">
            Reference patterns
          </p>
          <div className="space-y-3">
            {referencePatterns.map((pattern) => (
              <PatternCard key={pattern.id} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state: a brand-new database renders no cards at all, so say what
          this page is for rather than showing two bare headings. */}
      {patterns.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-fg-secondary">No patterns yet.</p>
          <p className="text-xs text-fg-muted mt-1">
            Describe a situation above and Gemini will draft the first one.
          </p>
        </div>
      )}
    </div>
  );
}
