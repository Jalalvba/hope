"use client";

import { useState } from "react";
import { PatternBadge } from "./PatternBadge";
import type { Observation, PatternId } from "@/types";

function fmtDate(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleDateString("fr-MA", { day: "2-digit", month: "short" }) +
    " " + date.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });
}

const SCHEMA_CLS: Record<string, string> = {
  Defectiveness:          "text-rust-400",
  Failure:                "text-gold-400",
  "Unrelenting Standards":"text-mist-400",
};

const MODE_CLS: Record<string, string> = {
  Surrender:    "text-sage-400",
  Escape:       "text-mist-400",
  Counterattack:"text-rust-400",
};

const SYSTEM_CLS: Record<string, string> = {
  threat:   "bg-rust-400/12 text-rust-400",
  drive:    "bg-gold-400/12 text-gold-400",
  soothing: "bg-sage-400/12 text-sage-400",
};

export function ObservationCard({
  obs,
  onUpdate,
  onDelete,
  index,
}: {
  obs: Observation;
  onUpdate: (o: Observation) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const id = String(obs._id);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/observations/${id}/analyze`, { method: "POST" });
      const json = await res.json();
      if (res.ok) onUpdate(json.data);
    } finally {
      setAnalyzing(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this observation?")) return;
    await fetch(`/api/observations/${id}`, { method: "DELETE" });
    onDelete(id);
  };

  return (
    <div
      className="glass rounded-xl overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 hover:bg-parchment-100/[0.018] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-1.5 items-center">
              {obs.patterns.map((p) => (
                <PatternBadge key={p} id={p as PatternId} size="xs" />
              ))}
              {obs.analysis && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-sage-400/8 text-sage-400/70 border-sage-400/15 font-mono">
                  ✦ analyzed
                </span>
              )}
            </div>
            <p className="text-sm text-parchment-100/90 leading-snug line-clamp-2">
              {obs.trigger}
            </p>
          </div>
          <div className="shrink-0 text-right space-y-0.5">
            <p className="text-[10px] text-parchment-300/30 font-mono whitespace-nowrap">
              {fmtDate(obs.createdAt)}
            </p>
            <p className={`text-xs text-parchment-300/20 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
              ▾
            </p>
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-parchment-300/[0.05] px-4 pb-4 pt-3 space-y-4 animate-fade-in">

          {/* Fields */}
          {[
            { label: "Body sensation", val: obs.bodySensation },
            { label: "Response taken", val: obs.responseTaken },
            { label: "Reflection",     val: obs.reflection     },
          ].map(({ label, val }) =>
            val ? (
              <div key={label}>
                <p className="text-[10px] text-parchment-300/35 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm text-parchment-200/75 leading-relaxed">{val}</p>
              </div>
            ) : null
          )}

          {/* Analysis block */}
          {obs.analysis && (
            <div className="glass-subtle rounded-lg p-4 space-y-3 border-l-2 border-gold-400/25 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-gold-400 text-sm">✦</span>
                <span className="text-[10px] text-gold-400/70 uppercase tracking-widest font-medium">Analysis</span>
                <span className="ml-auto text-[10px] text-parchment-300/25 font-mono">
                  {fmtDate(obs.analysis.analyzedAt)}
                </span>
              </div>

              <p className="text-sm text-parchment-200/85 leading-relaxed italic">
                {obs.analysis.summary}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {obs.analysis.schemaActivated.map((s) => (
                  <span key={s} className={`font-medium ${SCHEMA_CLS[s] ?? ""}`}>{s}</span>
                ))}
                <span className="text-parchment-300/15">·</span>
                <span className={`font-medium ${MODE_CLS[obs.analysis.responseMode] ?? ""}`}>
                  {obs.analysis.responseMode}
                </span>
                <span className="text-parchment-300/15">·</span>
                {obs.analysis.systemsInvolved.map((s) => (
                  <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${SYSTEM_CLS[s]}`}>{s}</span>
                ))}
              </div>

              {/* Book mappings */}
              {obs.analysis.bookMappings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-parchment-300/30 uppercase tracking-widest">Book frameworks</p>
                  {obs.analysis.bookMappings.map((m, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-parchment-300/20 font-mono shrink-0">—</span>
                      <div>
                        <span className="text-gold-400/75 font-medium">{m.concept}</span>
                        <span className="text-parchment-300/30 mx-1">·</span>
                        <span className="text-parchment-300/50 italic">{m.relevance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Practice */}
              <div className="bg-sage-400/5 border border-sage-400/12 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-sage-400/60 uppercase tracking-widest mb-1">Practice</p>
                <p className="text-xs text-parchment-200/75 leading-relaxed">
                  {obs.analysis.practiceRecommendation}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={analyze}
              disabled={analyzing}
              className="flex-1 py-2 text-xs rounded-lg border border-gold-400/18 text-gold-400/70 bg-gold-400/5 hover:bg-gold-400/10 hover:text-gold-400 transition-colors disabled:opacity-40"
            >
              {analyzing ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
                  Analyzing…
                </span>
              ) : obs.analysis ? "Re-analyze" : "✦ Analyze with Claude"}
            </button>
            <button
              onClick={remove}
              className="px-3 py-2 text-xs rounded-lg border border-rust-400/10 text-rust-400/30 hover:text-rust-400/60 hover:border-rust-400/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
