"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PatternAnalysis, CostInfo } from "@/types";
import type { NewPatternFields } from "@/lib/utils/validatePatternAnalysis";
import { DEFAULT_MODEL_ID, nextCapableModel } from "@/lib/ai/geminiModels";
import { useGeminiModels } from "@/lib/hooks/useGeminiModels";
import { CostBadge } from "@/components/ui/CostBadge";
import { GeminiModelSelect } from "@/components/ui/GeminiModelSelect";

/**
 * Which step of the new-pattern modal is on screen.
 *
 * compose  — the user is typing the situation
 * generating — waiting on Gemini
 * review   — a draft came back and is being read; nothing is saved yet
 * saving   — the confirmed draft is being written to MongoDB
 * failed   — generation failed; the retry defaults to a stronger model
 */
type Phase = "compose" | "generating" | "review" | "saving" | "failed";

/**
 * The "new pattern" button and the modal behind it.
 *
 * The user describes a situation in their own words; Gemini extracts a pattern
 * from it and analyzes it in a single call. Nothing is written to the database
 * until the user has read the draft and confirmed it.
 */
export function NewPatternButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("compose");
  const { models, defaultModelId } = useGeminiModels();
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [draftPattern, setDraftPattern] = useState<NewPatternFields | null>(null);
  const [draftAnalysis, setDraftAnalysis] = useState<PatternAnalysis | null>(null);
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);

  const openModal = () => {
    setError("");
    setDescription("");
    setPhase("compose");
    setModel(defaultModelId);
    setDraftPattern(null);
    setDraftAnalysis(null);
    setCostInfo(null);
    setOpen(true);
  };

  const generate = async () => {
    if (!description.trim()) return;
    setPhase("generating");
    setError("");
    try {
      const res = await fetch("/api/patterns/create-from-description/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), model }),
      });
      const json = await res.json();
      if (json.costInfo) setCostInfo(json.costInfo);
      if (!res.ok) throw new Error(json.error ?? JSON.stringify(json));
      setCostInfo(json.data.costInfo ?? null);
      setDraftPattern(json.data.pattern);
      setDraftAnalysis(json.data.analysis);
      setPhase("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
      // Default the retry to the next more-capable tier — still overridable
      // via the dropdown before hitting Retry.
      setModel((currentModel) => nextCapableModel(currentModel, models)?.id ?? currentModel);
      setPhase("failed");
    }
  };

  const saveDraft = async () => {
    setError("");
    setPhase("saving");
    try {
      const res = await fetch("/api/patterns/create-from-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: draftPattern, analysis: draftAnalysis }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? JSON.stringify(json));
      setOpen(false);
      router.push(`/patterns/${json.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
      setPhase("review");
    }
  };

  const busy = phase === "generating" || phase === "saving";

  const modelPicker = <GeminiModelSelect value={model} onChange={setModel} models={models} disabled={busy} />;

  return (
    <>
      <button onClick={openModal}
        className="w-full py-3 rounded-xl border border-gold-400/25 text-gold-400 bg-gold-400/6 hover:bg-gold-400/12 transition-colors text-sm font-medium">
        + Log new pattern
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Scrim: intentionally not a themed token — a modal backdrop should
              dim the page the same way in light or dark mode. */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!busy) setOpen(false); }} />
          <div className="relative glass rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment-100">New pattern</h2>
              {!busy && (
                <button onClick={() => setOpen(false)}
                  className="text-parchment-300/30 hover:text-parchment-300/60 text-2xl leading-none">×</button>
              )}
            </div>

            {phase === "compose" && (
              <>
                <p className="text-xs text-parchment-300/40 leading-relaxed">
                  Describe what happened. Gemini extracts the pattern fields and analyzes it directly —
                  review the result below before saving.
                </p>
                <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
                  <textarea rows={6}
                    placeholder="e.g. My boss sent a one-line email saying 'we need to talk tomorrow'. I immediately started rehearsing defenses, couldn't sleep, ran through every possible mistake..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
                    autoFocus
                    className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 leading-relaxed" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Model</p>
                  {modelPicker}
                </div>
                <p className="text-[10px] text-parchment-300/20 italic">⌘ + Enter to generate</p>
              </>
            )}

            {phase === "generating" && (
              <div className="flex items-center gap-3 py-4">
                <span className="w-4 h-4 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
                <span className="text-sm text-gold-400/60">Analyzing…</span>
              </div>
            )}

            {phase === "failed" && (
              <div className="space-y-3">
                {costInfo && <CostBadge costInfo={costInfo} />}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
                    Try a different model
                  </p>
                  {modelPicker}
                </div>
              </div>
            )}

            {(phase === "review" || phase === "saving") && draftPattern && draftAnalysis && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
                    Review before saving
                  </p>
                  {costInfo && <CostBadge costInfo={costInfo} className="justify-end" />}
                </div>
                <div className="glass-subtle rounded-lg px-3 py-2.5 space-y-1.5">
                  <p className="text-sm text-parchment-100 font-medium">{draftPattern.label}</p>
                  <p className="text-xs text-parchment-300/50 italic">{draftPattern.coreBelief}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {draftPattern.symptoms.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400/80">{s}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-parchment-200/70 leading-relaxed">{draftAnalysis.summary}</p>
              </div>
            )}

            {error && (
              <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg break-all">{error}</p>
            )}

            {phase === "review" || phase === "saving" ? (
              <div className="flex gap-2">
                <button
                  onClick={saveDraft}
                  disabled={phase === "saving"}
                  className="flex-1 py-3 rounded-xl text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {phase === "saving" ? "Saving…" : "Save pattern"}
                </button>
                <button
                  onClick={() => setPhase("compose")}
                  disabled={phase === "saving"}
                  className="px-4 py-3 rounded-xl text-sm text-parchment-300/40 hover:text-parchment-300/70 transition-colors disabled:opacity-40">
                  Discard
                </button>
              </div>
            ) : phase === "failed" ? (
              <button
                onClick={generate}
                className="w-full py-3 rounded-xl text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors">
                Retry
              </button>
            ) : phase === "generating" ? null : (
              <button
                onClick={generate}
                disabled={!description.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Generate analysis
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
