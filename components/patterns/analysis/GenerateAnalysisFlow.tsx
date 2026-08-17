"use client";

import { useState, useEffect, useRef } from "react";
import type { PatternAnalysis, CostInfo } from "@/types";
import { CostBadge } from "@/components/ui/CostBadge";
import { GeminiModelSelect } from "@/components/ui/GeminiModelSelect";
import { DEFAULT_MODEL_ID, nextCapableModel } from "@/lib/ai/geminiModels";
import { useGeminiModels } from "@/lib/hooks/useGeminiModels";

export function GenerateAnalysisFlow({
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
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Analysis failed");
      // A call failing (rate limit, unusable output) is the escalation
      // trigger: default the retry to the next more-capable tier rather than
      // repeating the model that just failed. Still a suggestion — the
      // dropdown lets the user override before retrying.
      setModel((currentModel) => nextCapableModel(currentModel, models)?.id ?? currentModel);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save analysis");
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
