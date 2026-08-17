"use client";

import { useState } from "react";
import type { PatternAnalysis } from "@/types";
import { AnalysisReport } from "@/components/patterns/analysis/AnalysisReport";
import { GenerateAnalysisFlow } from "@/components/patterns/analysis/GenerateAnalysisFlow";

/**
 * The analysis panel on a pattern's detail page.
 *
 * This component only decides WHICH of three things to show; each one lives in
 * its own file under ./analysis/:
 *
 *   - no analysis yet  -> a button to start one
 *   - generating one   -> <GenerateAnalysisFlow>, which handles pick-model,
 *                         generate, review, and save
 *   - analysis exists  -> <AnalysisReport>, which just displays it
 *
 * The saved analysis is held in state so that finishing a generation swaps the
 * panel over immediately, without waiting for a page reload.
 *
 * @param patternId - The pattern's MongoDB `_id`, used in the API calls.
 * @param existingAnalysis - The analysis already saved, or null if never run.
 */
export function AnalysisSection({
  patternId,
  existingAnalysis,
}: {
  patternId: string;
  existingAnalysis: PatternAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(existingAnalysis);
  const [generating, setGenerating] = useState(false);

  if (generating) {
    return (
      <GenerateAnalysisFlow
        patternId={patternId}
        onCancel={() => setGenerating(false)}
        onSaved={(saved) => {
          setAnalysis(saved);
          setGenerating(false);
        }}
      />
    );
  }

  if (!analysis) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center gap-3">
        <p className="text-xs text-fg-muted">No analysis yet.</p>
        <button
          onClick={() => setGenerating(true)}
          className="text-xs text-gold-400 hover:bg-gold-400/10 transition-colors border border-gold-400/25 rounded-lg px-4 py-2"
        >
          Analyze with Gemini
        </button>
      </div>
    );
  }

  return <AnalysisReport analysis={analysis} onRegenerate={() => setGenerating(true)} />;
}
