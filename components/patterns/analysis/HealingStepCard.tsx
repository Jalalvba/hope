"use client";

import { useState } from "react";
import type { HealingStep } from "@/types";

const FRAMEWORK_COLORS: Record<string, string> = {
  schema_therapy: "text-gold-400 bg-gold-400/8 border-gold-400/15",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  schema_therapy: "Schema",
};

const STEP_ICONS = ["⓵", "⓶", "⓷", "⓸", "⓹"];

/**
 * One exercise in the healing path, collapsed to its title until clicked.
 *
 * @param step - The exercise, copied from a Healing Path reference record.
 * @param index - Its position in the path; the first one starts expanded.
 */
export function HealingStepCard({ step, index }: { step: HealingStep; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const frameworkClass = FRAMEWORK_COLORS[step.framework] ?? "text-fg-secondary bg-parchment-300/5 border-parchment-300/10";
  const frameworkLabel = FRAMEWORK_LABELS[step.framework] ?? step.framework;

  return (
    <div className="rounded-lg border border-sage-400/10 overflow-hidden transition-all">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-sage-400/3 transition-colors"
      >
        <span className="text-sage-400 text-sm mt-px shrink-0">{STEP_ICONS[index] ?? "·"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-fg-primary font-medium">{step.name}</span>
            <span className={`text-[9px] px-1.5 py-px rounded border font-mono ${frameworkClass}`}>
              {frameworkLabel}
            </span>
          </div>
          {step.whyThisPattern && (
            <p className="text-[11px] text-sage-400 leading-relaxed mt-1 italic">
              {step.whyThisPattern}
            </p>
          )}
        </div>
        <span className={`text-fg-muted text-xs shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {/* Expanded — practice steps */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 border-t border-sage-400/8">
          {/* What */}
          <div className="mt-2.5">
            <p className="text-[9px] text-sage-400 uppercase tracking-widest mb-0.5">What to do</p>
            <p className="text-xs text-fg-primary leading-relaxed">{step.what}</p>
          </div>

          {/* How */}
          <div>
            <p className="text-[9px] text-sage-400 uppercase tracking-widest mb-0.5">How — step by step</p>
            <p className="text-xs text-fg-secondary leading-relaxed">{step.how}</p>
          </div>

          {/* When / Duration / Frequency — compact row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {step.when && (
              <div>
                <span className="text-[9px] text-fg-muted uppercase tracking-widest">When </span>
                <span className="text-[11px] text-fg-secondary">{step.when}</span>
              </div>
            )}
            {step.duration && (
              <div>
                <span className="text-[9px] text-fg-muted uppercase tracking-widest">Duration </span>
                <span className="text-[11px] text-fg-secondary">{step.duration}</span>
              </div>
            )}
            {step.frequency && (
              <div>
                <span className="text-[9px] text-fg-muted uppercase tracking-widest">Frequency </span>
                <span className="text-[11px] text-fg-secondary">{step.frequency}</span>
              </div>
            )}
          </div>

          {/* Success marker */}
          {step.successMarker && (
            <div className="bg-sage-400/5 rounded px-2.5 py-2 border border-sage-400/8">
              <p className="text-[9px] text-sage-400 uppercase tracking-widest mb-0.5">You know it's working when</p>
              <p className="text-[11px] text-sage-400 leading-relaxed">{step.successMarker}</p>
            </div>
          )}

          {/* Source */}
          <p className="text-[9px] text-fg-muted font-mono">{step.source}</p>
        </div>
      )}
    </div>
  );
}
