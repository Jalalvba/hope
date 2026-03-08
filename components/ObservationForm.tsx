"use client";

import { useState } from "react";
import { PatternSelector } from "./PatternBadge";
import type { PatternId, Observation } from "@/types";

const FIELDS = [
  {
    key: "trigger" as const,
    label: "What happened",
    rows: 3,
    placeholder: "Describe the trigger precisely — the email, the exchange, the moment…",
    hint: "Protocol step 2 — name it precisely.",
  },
  {
    key: "bodySensation" as const,
    label: "Body sensation",
    rows: 2,
    placeholder: "Chest? Jaw? Stomach? Where did it land physically?",
    hint: "Protocol step 1 — feel it in the body first.",
  },
  {
    key: "responseTaken" as const,
    label: "Response taken",
    rows: 2,
    placeholder: "What did you actually do? Stayed quiet? Rehearsed? Sent the email?",
    hint: "Surrender / Escape / Counterattack — or something new.",
  },
  {
    key: "reflection" as const,
    label: "Reflection",
    rows: 2,
    placeholder: "Any insight about what was running? What the schema needed?",
    hint: "Protocol step 5 — what did the situation actually need?",
  },
];

export function ObservationForm({ onSaved }: { onSaved: (o: Observation) => void }) {
  const [patterns, setPatterns] = useState<PatternId[]>([]);
  const [fields, setFields] = useState({
    trigger: "", bodySensation: "", responseTaken: "", reflection: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const valid = patterns.length > 0 && fields.trigger.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patterns, ...fields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved(json.data);
      setPatterns([]);
      setFields({ trigger: "", bodySensation: "", responseTaken: "", reflection: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass rounded-xl p-5 space-y-5 field-ring">
      <div>
        <h2 className="text-lg font-display text-parchment-100">New observation</h2>
        <p className="text-xs text-parchment-300/40 mt-0.5">
          Log when the pattern fires — precise over complete.
        </p>
      </div>

      {/* Pattern selector */}
      <div className="space-y-2">
        <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
          Patterns triggered
        </label>
        <PatternSelector selected={patterns} onChange={setPatterns} />
        {patterns.length === 0 && (
          <p className="text-[11px] text-parchment-300/20">Select at least one</p>
        )}
      </div>

      {/* Text fields */}
      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">
            {f.label}
          </label>
          <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
            <textarea
              rows={f.rows}
              placeholder={f.placeholder}
              value={fields[f.key]}
              onChange={(e) => setFields((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 leading-relaxed font-body"
            />
          </div>
          <p className="text-[10px] text-parchment-300/25 italic pl-0.5">{f.hint}</p>
        </div>
      ))}

      {error && (
        <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={!valid || saving}
        className={`w-full py-2.5 rounded-lg text-sm font-medium tracking-wide transition-all duration-200 ${
          valid && !saving
            ? "bg-gold-400/12 text-gold-400 border border-gold-400/25 hover:bg-gold-400/20 active:scale-[0.99]"
            : "bg-ink-800/60 text-parchment-300/20 border border-parchment-300/5 cursor-not-allowed"
        }`}
      >
        {saving ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
            Saving…
          </span>
        ) : (
          "Log observation"
        )}
      </button>
    </div>
  );
}
