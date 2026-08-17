/**
 * Pattern detail page — everything known about one pattern, plus its analysis.
 *
 * A Server Component: the pattern is loaded from MongoDB during render. The
 * interactive parts (editing, generating an analysis) are Client Components
 * mounted inside it.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { findPattern } from "@/lib/db/patterns";
import { getPatternColorClasses } from "@/lib/utils/patternColors";
import { isEditablePattern } from "@/lib/utils/patternTiers";
import { AnalysisSection } from "@/components/patterns/AnalysisSection";
import { PatternActions } from "@/components/patterns/PatternActions";

export default async function PatternPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pattern = await findPattern(id);
  if (!pattern) notFound();

  const colors = getPatternColorClasses(pattern.id);
  // The seeded reference patterns (P1–P11) can't be edited or deleted.
  const isEditable = isEditablePattern(pattern.id);

  return (
    <div className="min-h-screen max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg-secondary transition-colors"
        >
          ← All patterns
        </Link>
        {isEditable && <PatternActions pattern={pattern} />}
      </div>

      <div className={`glass rounded-xl p-5 border ${colors.border} mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${colors.badge}`}>
            {pattern.id}
          </span>
          {pattern.note && (
            <span className="text-[10px] text-fg-muted italic">{pattern.note}</span>
          )}
        </div>

        <h1 className={`font-display text-2xl mb-4 ${colors.title}`}>{pattern.label}</h1>

        <div className="mb-5">
          <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-1">
            Core belief
          </p>
          <p className="text-sm text-fg-primary italic leading-relaxed">
            &quot;{pattern.coreBelief}&quot;
          </p>
        </div>

        {pattern.symptoms.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-2">
              Symptoms
            </p>
            <ul className="space-y-2">
              {pattern.symptoms.map((symptom, index) => (
                <li key={index} className="flex gap-2 text-sm text-fg-secondary leading-relaxed">
                  <span className="text-fg-faint shrink-0 font-mono mt-0.5" aria-hidden="true">—</span>
                  <span>{symptom}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pattern.cognitiveLabels.length > 0 && (
          <div>
            <p className="text-[10px] text-fg-muted uppercase tracking-widest mb-2">
              Cognitive labels
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pattern.cognitiveLabels.map((label) => (
                <span
                  key={label}
                  className="text-[10px] px-2 py-0.5 rounded bg-parchment-300/6 text-fg-secondary font-mono border border-parchment-300/8"
                >
                  {label}
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