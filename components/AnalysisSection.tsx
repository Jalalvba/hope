"use client";

import { useState, useEffect, useRef } from "react";
import type { PatternAnalysis, HealingStep, CostInfo } from "@/types";
import { CostBadge } from "@/components/CostBadge";
import { GeminiModelSelect } from "@/components/GeminiModelSelect";
import { DEFAULT_MODEL_ID, nextCapableModel } from "@/lib/geminiModels";
import { useGeminiModels } from "@/lib/useGeminiModels";

const SCHEMA_CLS: Record<string, string> = {
  Failure: "text-gold-400",
  "Unrelenting Standards": "text-mist-400",
  Subjugation: "text-amber-400",
};
const MODE_CLS: Record<string, string> = {
  Surrender: "text-sage-400",
  Escape: "text-mist-400",
  Counterattack: "text-rust-400",
  Regulation: "text-sage-400",
};
const SYS_CLS: Record<string, string> = {
  threat: "bg-rust-400/10 text-rust-400",
  drive: "bg-gold-400/10 text-gold-400",
  soothing: "bg-sage-400/10 text-sage-400",
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

// Attribution for the analysis header: the live path always stamps an exact
// model id server-side. Anything with no provenance — analyses saved before
// generatedBy existed — gets a neutral label rather than a guessed one.
function sourceLabel(generatedBy?: string): string {
  if (!generatedBy) return "Analysis";
  const m = generatedBy.toLowerCase();
  if (m.includes("gemini")) return "Gemini Analysis";
  if (m.includes("claude")) return "Claude Analysis";
  return "Analysis";
}

const FRAMEWORK_COLORS: Record<string, string> = {
  schema_therapy: "text-amber-400/70 bg-amber-400/8 border-amber-400/15",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  schema_therapy: "Schema",
};

const STEP_ICONS = ["⓵", "⓶", "⓷", "⓸", "⓹"];

function HealingStepCard({ step, index }: { step: HealingStep; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const fwClass = FRAMEWORK_COLORS[step.framework] ?? "text-parchment-300/50 bg-parchment-300/5 border-parchment-300/10";
  const fwLabel = FRAMEWORK_LABELS[step.framework] ?? step.framework;

  return (
    <div className="rounded-lg border border-sage-400/10 overflow-hidden transition-all">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-sage-400/3 transition-colors"
      >
        <span className="text-sage-400/50 text-sm mt-px shrink-0">{STEP_ICONS[index] ?? "·"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-parchment-200/80 font-medium">{step.name}</span>
            <span className={`text-[9px] px-1.5 py-px rounded border font-mono ${fwClass}`}>
              {fwLabel}
            </span>
          </div>
          {step.whyThisPattern && (
            <p className="text-[11px] text-sage-400/60 leading-relaxed mt-1 italic">
              {step.whyThisPattern}
            </p>
          )}
        </div>
        <span className={`text-parchment-300/25 text-xs shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {/* Expanded — practice steps */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 border-t border-sage-400/8">
          {/* What */}
          <div className="mt-2.5">
            <p className="text-[9px] text-sage-400/45 uppercase tracking-widest mb-0.5">What to do</p>
            <p className="text-xs text-parchment-200/75 leading-relaxed">{step.what}</p>
          </div>

          {/* How */}
          <div>
            <p className="text-[9px] text-sage-400/45 uppercase tracking-widest mb-0.5">How — step by step</p>
            <p className="text-xs text-parchment-200/65 leading-relaxed">{step.how}</p>
          </div>

          {/* When / Duration / Frequency — compact row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {step.when && (
              <div>
                <span className="text-[9px] text-parchment-300/30 uppercase tracking-widest">When </span>
                <span className="text-[11px] text-parchment-200/55">{step.when}</span>
              </div>
            )}
            {step.duration && (
              <div>
                <span className="text-[9px] text-parchment-300/30 uppercase tracking-widest">Duration </span>
                <span className="text-[11px] text-parchment-200/55">{step.duration}</span>
              </div>
            )}
            {step.frequency && (
              <div>
                <span className="text-[9px] text-parchment-300/30 uppercase tracking-widest">Frequency </span>
                <span className="text-[11px] text-parchment-200/55">{step.frequency}</span>
              </div>
            )}
          </div>

          {/* Success marker */}
          {step.successMarker && (
            <div className="bg-sage-400/5 rounded px-2.5 py-2 border border-sage-400/8">
              <p className="text-[9px] text-sage-400/50 uppercase tracking-widest mb-0.5">You know it's working when</p>
              <p className="text-[11px] text-sage-400/70 leading-relaxed">{step.successMarker}</p>
            </div>
          )}

          {/* Source */}
          <p className="text-[9px] text-parchment-300/20 font-mono">{step.source}</p>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest mb-1.5">
      {children}
    </p>
  );
}

function LiveFlow({
  patternId,
  onSaved,
  onCancel,
}: {
  patternId: string;
  onSaved: (a: PatternAnalysis) => void;
  onCancel: () => void;
}) {
  const [stage, setStage] = useState<"select" | "generating" | "review" | "saving" | "failed">("select");
  const { models, defaultModelId } = useGeminiModels();
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [draft, setDraft] = useState<PatternAnalysis | null>(null);
  const [error, setError] = useState("");
  // Cost of the generate call, carried back on the same response as the draft.
  // Kept even on failure — a call that produced unusable output still cost money.
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Once the live model list loads, adopt its default instead of the static
  // fallback — only while still on the initial pick, so it never clobbers a
  // choice the user already made (or a retry escalation already in flight).
  useEffect(() => {
    if (stage === "select" && model === DEFAULT_MODEL_ID && defaultModelId !== DEFAULT_MODEL_ID) {
      setModel(defaultModelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultModelId]);

  const generate = async () => {
    setError("");
    setStage("generating");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/patterns/analyze/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, model }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (json.costInfo) setCostInfo(json.costInfo);
      if (!res.ok) throw new Error(json.error);
      setCostInfo(json.data.costInfo ?? null);
      setDraft(json.data.analysis);
      setStage("review");
    } catch (e: unknown) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Analysis failed");
      // A call failing (rate limit, unusable output) is the escalation
      // trigger: default the retry to the next more-capable tier rather than
      // repeating the model that just failed. Still a suggestion — the
      // dropdown lets the user override before retrying.
      setModel((m) => nextCapableModel(m, models)?.id ?? m);
      setStage("failed");
    }
  };

  const save = async () => {
    setError("");
    setStage("saving");
    try {
      const res = await fetch(`/api/patterns/${patternId}/analysis`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved(json.data.analysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save analysis");
      setStage("review");
    }
  };

  const modelPicker = (
    <GeminiModelSelect
      value={model}
      onChange={setModel}
      models={models}
      disabled={stage === "generating" || stage === "saving"}
    />
  );

  return (
    <div className="glass rounded-xl p-5 space-y-4 border-l-2 border-gold-400/25">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gold-400/70 uppercase tracking-widest font-medium">
          Gemini analysis
        </span>
        <button onClick={onCancel} className="text-parchment-300/30 hover:text-parchment-300/60 text-sm leading-none">
          Cancel
        </button>
      </div>

      {stage === "select" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Model</p>
            {modelPicker}
          </div>
          <button
            onClick={generate}
            className="w-full py-2.5 rounded-lg text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors"
          >
            Generate analysis
          </button>
        </div>
      )}

      {stage === "generating" && (
        <div className="flex items-center gap-3 py-4">
          <div className="w-4 h-4 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="text-xs text-parchment-300/40">Analyzing…</p>
        </div>
      )}

      {stage === "failed" && (
        <div className="space-y-3">
          <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg">{error}</p>
          {costInfo && <CostBadge costInfo={costInfo} />}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
              Try a different model
            </p>
            {modelPicker}
          </div>
          <button
            onClick={generate}
            className="w-full py-2.5 rounded-lg text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {(stage === "review" || stage === "saving") && draft && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
              Review before saving
            </p>
            {costInfo && <CostBadge costInfo={costInfo} className="justify-end" />}
          </div>
          <p className="text-sm text-parchment-100/80 leading-relaxed">{draft.summary}</p>
          <div className="flex flex-wrap gap-1.5">
            {(Array.isArray(draft.schemaActivated) ? draft.schemaActivated : []).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400/80">
                {s}
              </span>
            ))}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400/80">
              {draft.responseMode}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400/80">
              {(Array.isArray(draft.healingPath) ? draft.healingPath : []).length} healing steps
            </span>
          </div>

          {error && (
            <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg break-all">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={stage === "saving"}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {stage === "saving" ? "Saving…" : "Save analysis"}
            </button>
            <button
              onClick={() => setStage("select")}
              disabled={stage === "saving"}
              className="px-4 py-2.5 rounded-lg text-sm text-parchment-300/40 hover:text-parchment-300/70 transition-colors disabled:opacity-40"
            >
              Different model
            </button>
            <button
              onClick={onCancel}
              disabled={stage === "saving"}
              className="px-4 py-2.5 rounded-lg text-sm text-parchment-300/40 hover:text-parchment-300/70 transition-colors disabled:opacity-40"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export function AnalysisSection({
  patternId,
  existingAnalysis,
}: {
  patternId: string;
  existingAnalysis: PatternAnalysis | null;
}) {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(existingAnalysis);
  const [flow, setFlow] = useState<null | "live">(null);

  if (flow === "live") {
    return (
      <LiveFlow
        patternId={patternId}
        onCancel={() => setFlow(null)}
        onSaved={(a) => {
          setAnalysis(a);
          setFlow(null);
        }}
      />
    );
  }

  if (!analysis)
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center gap-3">
        <p className="text-xs text-parchment-300/40">No analysis yet.</p>
        <button
          onClick={() => setFlow("live")}
          className="text-xs text-gold-400/70 hover:text-gold-400 transition-colors border border-gold-400/25 rounded-lg px-4 py-2"
        >
          Analyze with Gemini
        </button>
      </div>
    );

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
          <span className="text-[10px] text-gold-400/70 uppercase tracking-widest font-medium">
            {sourceLabel(analysis.generatedBy)}
          </span>
          {analysis.generatedBy && (
            <span
              title={analysis.generatedBy}
              className="text-[9px] font-mono text-parchment-300/25 border border-parchment-300/10 rounded px-1.5 py-0.5"
            >
              {analysis.generatedBy}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {analysis.analyzedAt && (
            <span className="text-[10px] text-parchment-300/25 font-mono">
              {fmtDate(analysis.analyzedAt)}
            </span>
          )}
          <button
            onClick={() => setFlow("live")}
            className="text-[10px] text-parchment-300/25 hover:text-gold-400/50 transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      {analysis.summary && (
        <p className="text-sm text-parchment-200/85 leading-relaxed italic">
          {analysis.summary}
        </p>
      )}

      {/* ── Wound activation ── */}
      {analysis.woundActivation && (
        <div className="border-l-2 border-rust-400/30 pl-3">
          <p className="text-[10px] text-rust-400/50 uppercase tracking-widest mb-1">
            Wound activation
          </p>
          <p className="text-xs text-rust-400/80 leading-relaxed italic">
            {analysis.woundActivation}
          </p>
        </div>
      )}

      {/* ── Schema / mode / systems ── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {schemaActivated.map((s) => (
          <span key={s} className={`text-xs font-medium ${SCHEMA_CLS[s] ?? "text-parchment-300"}`}>
            {s}
          </span>
        ))}
        {analysis.responseMode && (
          <>
            <span className="text-parchment-300/15">·</span>
            <span className={`text-xs font-medium ${MODE_CLS[analysis.responseMode] ?? ""}`}>
              {analysis.responseMode}
            </span>
          </>
        )}
        {systemsInvolved.length > 0 && (
          <>
            <span className="text-parchment-300/15">·</span>
            {systemsInvolved.map((s) => (
              <span
                key={s}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${SYS_CLS[s] ?? "bg-parchment-300/5 text-parchment-300/40"}`}
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
              <p className="text-[10px] text-sage-400/55 uppercase tracking-widest mb-1">
                Situation réelle
              </p>
              <p className="text-xs text-parchment-200/65 leading-relaxed">
                {analysis.operationalFact}
              </p>
            </div>
          )}
          {analysis.schemaNarrative && (
            <div className="bg-rust-400/5 border border-rust-400/10 rounded-lg px-3 py-2.5">
              <p className="text-[10px] text-rust-400/55 uppercase tracking-widest mb-1">
                Narration du schéma
              </p>
              <p className="text-xs text-parchment-200/65 leading-relaxed">
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
              <span className="text-rust-400/50 shrink-0 mt-0.5">⚠</span>
              <div>
                <p className="text-[10px] text-rust-400/45 uppercase tracking-widest mb-0.5">
                  Schema demands
                </p>
                <p className="text-parchment-200/55 italic leading-relaxed">
                  {analysis.whatTheSchemaIsConstructing}
                </p>
              </div>
            </div>
          )}
          {analysis.whatTheSituationActuallyNeeds && (
            <div className="flex gap-2.5 text-xs">
              <span className="text-sage-400/50 shrink-0 mt-0.5">→</span>
              <div>
                <p className="text-[10px] text-sage-400/45 uppercase tracking-widest mb-0.5">
                  Situation needs
                </p>
                <p className="text-parchment-200/75 leading-relaxed">
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
          <p className="text-[10px] text-gold-400/50 uppercase tracking-widest mb-1">
            Demanding Parent voice
          </p>
          <p className="text-xs text-parchment-200/70 leading-relaxed italic">
            &quot;{analysis.schemaMaintenanceBelief}&quot;
          </p>
        </div>
      )}

      {/* ── Emotional schema running ── */}
      {(analysis as PatternAnalysis & { emotionalSchemaRunning?: string }).emotionalSchemaRunning && (
        <div className="flex gap-2.5 text-xs">
          <span className="text-mist-400/50 shrink-0 mt-0.5">◈</span>
          <div>
            <p className="text-[10px] text-mist-400/45 uppercase tracking-widest mb-0.5">
              Emotional schema active
            </p>
            <p className="text-parchment-200/55 leading-relaxed italic">
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
                className="text-[10px] px-1.5 py-0.5 rounded border border-parchment-300/10 text-parchment-300/40 font-mono"
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
              <span className="text-parchment-300/20 font-mono shrink-0">—</span>
              <div>
                <span className="text-gold-400/70 font-medium">{m.concept}</span>
                <span className="text-parchment-300/25 mx-1">·</span>
                <span className="text-parchment-300/45 italic">{m.relevance}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Regulation evidence ── */}
      {analysis.regulationEvidence && (
        <div className="flex gap-2.5 text-xs">
          <span className="text-sage-400/60 shrink-0 mt-0.5">✓</span>
          <div>
            <p className="text-[10px] text-sage-400/45 uppercase tracking-widest mb-0.5">
              Regulation evidence
            </p>
            <p className="text-parchment-200/55 leading-relaxed">
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
                <span className="text-parchment-300/25 font-mono w-16 shrink-0 capitalize">
                  {layer}
                </span>
                <span className="text-parchment-200/50 leading-relaxed">
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
          <p className="text-[10px] text-sage-400/55 uppercase tracking-widest mb-1.5">Practice</p>
          <p className="text-xs text-parchment-200/70 leading-relaxed">
            {analysis.practiceRecommendation}
          </p>
        </div>
      )}

      {/* ── Healing Path — Action Plan ── */}
      {healingPath.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-sage-400">⟡</span>
            <span className="text-[10px] text-sage-400/70 uppercase tracking-widest font-medium">
              Healing Path — Action Plan
            </span>
            <span className="text-[9px] text-parchment-300/25 font-mono ml-auto">
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
