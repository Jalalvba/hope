/**
 * One pattern as it appears in the list on the home page: id chip, title,
 * quoted core belief, and the first few cognitive labels. The whole card is a
 * link to that pattern's detail page.
 */

import Link from "next/link";
import type { Pattern } from "@/types";
import { getPatternColorClasses } from "@/lib/utils/patternColors";
import { isEditablePattern } from "@/lib/utils/patternTiers";

/** How many cognitive labels fit on a card before the "+N more" chip. */
const MAX_VISIBLE_LABELS = 3;

/**
 * Renders a single pattern card.
 *
 * @param pattern - The pattern to display.
 */
export function PatternCard({ pattern }: { pattern: Pattern }) {
  const colors = getPatternColorClasses(pattern.id);

  // Only patterns created through the app carry an analysis, so only those
  // show the analyzed / pending status.
  const showsAnalysisStatus = isEditablePattern(pattern.id);
  const hiddenLabelCount = pattern.cognitiveLabels.length - MAX_VISIBLE_LABELS;

  return (
    <Link
      href={`/patterns/${pattern.id}`}
      className={`glass rounded-xl p-4 flex flex-col gap-2.5 border ${colors.border} hover:bg-parchment-100/[0.025] transition-all duration-200 active:scale-[0.99] block`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${colors.badge}`}>
          {pattern.id}
        </span>
        <div className="flex items-center gap-2">
          {showsAnalysisStatus && pattern.analysis && (
            <span className="text-[10px] font-mono text-sage-400/60">✦ analyzed</span>
          )}
          {showsAnalysisStatus && !pattern.analysis && (
            <span className="text-[10px] font-mono text-gold-400/40">pending</span>
          )}
          <span className="text-parchment-300/20 text-xs">→</span>
        </div>
      </div>

      <h2 className="font-display text-base text-parchment-100 leading-snug">{pattern.label}</h2>

      <p className={`text-xs italic leading-relaxed line-clamp-1 ${colors.belief}`}>
        &quot;{pattern.coreBelief}&quot;
      </p>

      {pattern.cognitiveLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pattern.cognitiveLabels.slice(0, MAX_VISIBLE_LABELS).map((label) => (
            <span
              key={label}
              className="text-[10px] px-1.5 py-0.5 rounded bg-parchment-300/5 text-parchment-300/30 font-mono"
            >
              {label}
            </span>
          ))}
          {hiddenLabelCount > 0 && (
            <span className="text-[10px] text-parchment-300/20">+{hiddenLabelCount}</span>
          )}
        </div>
      )}
    </Link>
  );
}
