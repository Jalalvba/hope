"use client";

import type { PatternAnalysis } from "@/types";
import { HealingStepCard } from "@/components/patterns/analysis/HealingStepCard";
import { Label, formatDate, sourceLabel, SCHEMA_TEXT_COLOR, RESPONSE_MODE_TEXT_COLOR, SYSTEM_CHIP_COLOR } from "@/components/patterns/analysis/shared";

/**
 * Renders a saved analysis, read-only.
 *
 * Every list field is defended with `Array.isArray` before it is mapped over:
 * analyses saved by earlier versions of the app may be missing fields that are
 * required today, and a missing field should render as nothing rather than
 * crash the page.
 *
 * @param analysis - The saved analysis to display.
 * @param onRegenerate - Called when the user clicks "Regenerate", which hands
 * control back to the parent to start a fresh generation.
 */
export function AnalysisReport({
  analysis,
  onRegenerate,
}: {
  analysis: PatternAnalysis;
  onRegenerate: () => void;
}) {
  const schemaActivated = Array.isArray(analysis.schemaActivated) ? analysis.schemaActivated : [];
  const systemsInvolved = Array.isArray(analysis.systemsInvolved) ? analysis.systemsInvolved : [];
  const relatedPatterns = Array.isArray(analysis.relatedPatterns) ? analysis.relatedPatterns : [];
  const bookMappings = Array.isArray(analysis.bookMappings) ? analysis.bookMappings : [];
  const modesActive = Array.isArray(analysis.modesActive) ? analysis.modesActive : [];
  const healingPath = Array.isArray(analysis.healingPath) ? analysis.healingPath : [];

  return (
    <div className="glass rounded-xl p-5 space-y-5 border-l-2 border-gold-400/25">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gold-400">✦</span>
          <span className="text-[10px] text-gold-400 uppercase tracking-widest font-medium">
            {sourceLabel(analysis.generatedBy)}
          </span>
          {analysis.generatedBy && (
            <span
              title={analysis.generatedBy}
              className="text-[9px] font-mono text-fg-muted border border-parchment-300/10 rounded px-1.5 py-0.5"
            >
              {analysis.generatedBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {analysis.analyzedAt && (
            <span className="text-[10px] text-fg-muted font-mono">
              {formatDate(analysis.analyzedAt)}
            </span>
          )}
          <button
            onClick={onRegenerate}
            className="text-[10px] text-fg-muted hover:text-gold-400 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      {analysis.summary && (
        <p className="text-sm text-fg-primary leading-relaxed italic">
          {analysis.summary}
        </p>
      )}

      {/* ── Wound activation ── */}
      {analysis.woundActivation && (
        <div className="border-l-2 border-rust-400/30 pl-3">
          <p className="text-[10px] text-rust-400 uppercase tracking-widest mb-1">
            Wound activation
          </p>
          <p className="text-xs text-rust-400 leading-relaxed italic">
            {analysis.woundActivation}
          </p>
        </div>
      )}

      {/* ── Schema / mode / systems ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {schemaActivated.map((s) => (
          <span key={s} className={`text-xs font-medium ${SCHEMA_TEXT_COLOR[s] ?? "text-parchment-300"}`}>
            {s}
          </span>
        ))}
        {analysis.responseMode && (
          <>
            <span className="text-fg-muted">·</span>
            <span className={`text-xs font-medium ${RESPONSE_MODE_TEXT_COLOR[analysis.responseMode] ?? ""}`}>
              {analysis.responseMode}
            </span>
          </>
        )}
        {systemsInvolved.length > 0 && (
          <>
            <span className="text-fg-muted">·</span>
            {systemsInvolved.map((s) => (
              <span
                key={s}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${SYSTEM_CHIP_COLOR[s] ?? "bg-parchment-300/5 text-fg-muted"}`}
              >
                {s}
              </span>
            ))}
          </>
        )}
      </div>

      {/* ── Operational fact vs Schema narrative ── */}
      {(analysis.operationalFact || analysis.schemaNarrative) && (
        <div className="grid grid-cols-2 gap-2">
          {analysis.operationalFact && (
            <div className="bg-sage-400/5 border border-sage-400/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-sage-400 uppercase tracking-widest mb-1">
                Situation réelle
              </p>
              <p className="text-xs text-fg-secondary leading-relaxed">
                {analysis.operationalFact}
              </p>
            </div>
          )}
          {analysis.schemaNarrative && (
            <div className="bg-rust-400/5 border border-rust-400/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-rust-400 uppercase tracking-widest mb-1">
                Narration du schéma
              </p>
              <p className="text-xs text-fg-secondary leading-relaxed">
                {analysis.schemaNarrative}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Schema constructs vs Situation needs ── */}
      {(analysis.whatTheSchemaIsConstructing || analysis.whatTheSituationActuallyNeeds) && (
        <div className="space-y-2">
          {analysis.whatTheSchemaIsConstructing && (
            <div className="flex gap-2.5 text-xs">
              <span className="text-rust-400 shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-[10px] text-rust-400 uppercase tracking-widest mb-0.5">
                  Schema demands
                </p>
                <p className="text-fg-secondary italic leading-relaxed">
                  {analysis.whatTheSchemaIsConstructing}
                </p>
              </div>
            </div>
          )}
          {analysis.whatTheSituationActuallyNeeds && (
            <div className="flex gap-2.5 text-xs">
              <span className="text-sage-400 shrink-0 mt-0.5">→</span>
              <div>
                <p className="text-[10px] text-sage-400 uppercase tracking-widest mb-0.5">
                  Situation needs
                </p>
                <p className="text-fg-primary leading-relaxed">
                  {analysis.whatTheSituationActuallyNeeds}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Schema maintenance belief ── */}
      {analysis.schemaMaintenanceBelief && (
        <div className="bg-gold-400/5 border border-gold-400/10 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gold-400 uppercase tracking-widest mb-1">
            Demanding Parent voice
          </p>
          <p className="text-xs text-fg-secondary leading-relaxed italic">
            &quot;{analysis.schemaMaintenanceBelief}&quot;
          </p>
        </div>
      )}

      {/* ── Emotional schema running ── */}
      {(analysis as PatternAnalysis & { emotionalSchemaRunning?: string }).emotionalSchemaRunning && (
        <div className="flex gap-2.5 text-xs">
          <span className="text-mist-400 shrink-0 mt-0.5">◈</span>
          <div>
            <p className="text-[10px] text-mist-400 uppercase tracking-widest mb-0.5">
              Emotional schema active
            </p>
            <p className="text-fg-secondary leading-relaxed italic">
              {(analysis as PatternAnalysis & { emotionalSchemaRunning?: string }).emotionalSchemaRunning}
            </p>
          </div>
        </div>
      )}

      {/* ── Modes active ── */}
      {modesActive.length > 0 && (
        <div>
          <Label>Modes active</Label>
          <div className="flex flex-wrap gap-1.5">
            {modesActive.map((m) => (
              <span
                key={m}
                className="text-[10px] px-2 py-0.5 rounded bg-amber-400/6 text-amber-400/50 font-mono border border-amber-400/10"
              >
                {m.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Related patterns ── */}
      {relatedPatterns.length > 0 && (
        <div>
          <Label>Related patterns</Label>
          <div className="flex flex-wrap gap-1.5">
            {relatedPatterns.map((p) => (
              <span
                key={p}
                className="text-[10px] px-1.5 py-0.5 rounded border border-parchment-300/10 text-fg-muted font-mono"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Book frameworks ── */}
      {bookMappings.length > 0 && (
        <div className="space-y-2">
          <Label>Book frameworks</Label>
          {bookMappings.map((m, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-fg-faint font-mono shrink-0" aria-hidden="true">—</span>
              <div>
                <span className="text-gold-400 font-medium">{m.concept}</span>
                <span className="text-fg-muted mx-1">·</span>
                <span className="text-fg-secondary italic">{m.relevance}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Regulation evidence ── */}
      {analysis.regulationEvidence && (
        <div className="flex gap-2.5 text-xs">
          <span className="text-sage-400 shrink-0 mt-0.5">✓</span>
          <div>
            <p className="text-[10px] text-sage-400 uppercase tracking-widest mb-0.5">
              Regulation evidence
            </p>
            <p className="text-fg-secondary leading-relaxed">
              {analysis.regulationEvidence}
            </p>
          </div>
        </div>
      )}

      {/* ── Layer status ── */}
      {analysis.layerStatus && (
        <div className="space-y-2">
          <Label>Layer status</Label>
          {(["behavioral", "cognitive", "schema"] as const).map((layer) =>
            analysis.layerStatus![layer] ? (
              <div key={layer} className="flex gap-3 text-xs">
                <span className="text-fg-muted font-mono w-16 shrink-0 capitalize">
                  {layer}
                </span>
                <span className="text-fg-secondary leading-relaxed">
                  {analysis.layerStatus![layer]}
                </span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* ── Practice ── */}
      {analysis.practiceRecommendation && (
        <div className="bg-sage-400/5 border border-sage-400/10 rounded-lg px-3 py-3">
          <p className="text-[10px] text-sage-400 uppercase tracking-widest mb-1.5">Practice</p>
          <p className="text-xs text-fg-secondary leading-relaxed">
            {analysis.practiceRecommendation}
          </p>
        </div>
      )}

      {/* ── Healing Path — Action Plan ── */}
      {healingPath.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sage-400">⟡</span>
            <span className="text-[10px] text-sage-400 uppercase tracking-widest font-medium">
              Healing Path — Action Plan
            </span>
            <span className="text-[9px] text-fg-muted font-mono ml-auto">
              {healingPath.length} exercises
            </span>
          </div>
          {healingPath.map((step, i) => (
            <HealingStepCard key={step.id || i} step={step} index={i} />
          ))}
        </div>
      )}

    </div>
  );
}
