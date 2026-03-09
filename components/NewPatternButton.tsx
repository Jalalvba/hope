"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "describe" | "manual";
type Stage = "input" | "processing";

interface FieldOptions {
  cognitiveLabels: string[];
  symptoms: string[];
  coreBeliefs: string[];
  notes: string[];
}

// Multi-select dropdown component
function MultiSelect({
  label, options, selected, onChange, placeholder,
}: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o));

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };
  const remove = (v: string) => onChange(selected.filter((s) => s !== v));

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">{label}</label>
      <div className="glass-subtle rounded-lg px-3 py-2 field-ring min-h-[40px]">
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gold-400/10 text-gold-400 border border-gold-400/20">
              {s}
              <button onClick={() => remove(s)} className="text-gold-400/50 hover:text-gold-400 leading-none">×</button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder={selected.length === 0 ? placeholder : "Add more..."}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 bg-transparent"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="glass rounded-lg border border-parchment-300/10 max-h-40 overflow-y-auto z-10 relative">
          {filtered.map((o) => (
            <button key={o} onMouseDown={() => { toggle(o); setSearch(""); }}
              className="w-full text-left px-3 py-2 text-xs text-parchment-200/70 hover:bg-parchment-300/5 hover:text-parchment-100 transition-colors">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Single select dropdown
function SingleSelect({
  label, options, value, onChange, placeholder,
}: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">{label}</label>
      <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
        <input
          type="text"
          placeholder={placeholder}
          value={search || value}
          onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 bg-transparent"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="glass rounded-lg border border-parchment-300/10 max-h-40 overflow-y-auto z-10 relative">
          {filtered.map((o) => (
            <button key={o} onMouseDown={() => { onChange(o); setSearch(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-parchment-200/70 hover:bg-parchment-300/5 hover:text-parchment-100 transition-colors">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewPatternButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("describe");
  const [stage, setStage] = useState<Stage>("input");
  const [error, setError] = useState("");
  const [options, setOptions] = useState<FieldOptions | null>(null);
  const router = useRouter();

  // Describe mode
  const [description, setDescription] = useState("");

  // Manual mode
  const [manual, setManual] = useState({
    label: "", short: "", coreBelief: "",
    symptoms: [] as string[],
    cognitiveLabels: [] as string[],
    note: "",
  });

  const openModal = async () => {
    setStage("input");
    setError("");
    setDescription("");
    setManual({ label: "", short: "", coreBelief: "", symptoms: [], cognitiveLabels: [], note: "" });
    setOpen(true);
    // Pre-fetch field options
    try {
      const res = await fetch("/api/patterns/field-options");
      const json = await res.json();
      setOptions(json.data);
    } catch { /* options stay null */ }
  };

  const submitDescribe = async () => {
    if (!description.trim()) return;
    setStage("processing");
    setError("");
    try {
      const res = await fetch("/api/patterns/create-from-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? JSON.stringify(json));
      setOpen(false);
      router.push(`/patterns/${json.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
      setStage("input");
    }
  };

  const submitManual = async () => {
    if (!manual.label.trim() || !manual.coreBelief.trim()) return;
    setStage("processing");
    setError("");
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: manual.label.trim(),
          short: manual.short.trim() || manual.label.trim(),
          coreBelief: manual.coreBelief.trim(),
          symptoms: manual.symptoms,
          cognitiveLabels: manual.cognitiveLabels,
          note: manual.note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOpen(false);
      router.push(`/patterns/${json.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
      setStage("input");
    }
  };

  return (
    <>
      <button onClick={openModal}
        className="w-full py-3 rounded-xl border border-gold-400/25 text-gold-400 bg-gold-400/6 hover:bg-gold-400/12 transition-colors text-sm font-medium">
        + Log new pattern
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm"
            onClick={() => { if (stage !== "processing") setOpen(false); }} />
          <div className="relative glass rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment-100">New pattern</h2>
              {stage !== "processing" && (
                <button onClick={() => setOpen(false)}
                  className="text-parchment-300/30 hover:text-parchment-300/60 text-2xl leading-none">×</button>
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-parchment-300/10">
              {(["describe", "manual"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} disabled={stage === "processing"}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === m ? "bg-gold-400/12 text-gold-400" : "text-parchment-300/35 hover:text-parchment-300/60"}`}>
                  {m === "describe" ? "✦ Describe situation" : "Manual fields"}
                </button>
              ))}
            </div>

            {/* DESCRIBE MODE */}
            {mode === "describe" && (
              <>
                <p className="text-xs text-parchment-300/40 leading-relaxed">
                  Describe what happened. Claude extracts the pattern, fills all fields, and analyzes it.
                </p>
                <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
                  <textarea rows={6}
                    placeholder="e.g. My boss sent a one-line email saying 'we need to talk tomorrow'. I immediately started rehearsing defenses, couldn't sleep, ran through every possible mistake..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitDescribe(); }}
                    disabled={stage === "processing"}
                    autoFocus
                    className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 leading-relaxed disabled:opacity-50" />
                </div>
                <p className="text-[10px] text-parchment-300/20 italic">⌘ + Enter to submit</p>
              </>
            )}

            {/* MANUAL MODE */}
            {mode === "manual" && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Label</label>
                  <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
                    <input type="text" placeholder="e.g. Pre-emptive Defense Rehearsal"
                      value={manual.label}
                      onChange={(e) => setManual((p) => ({ ...p, label: e.target.value }))}
                      className="w-full text-sm text-parchment-100 placeholder-parchment-300/20" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Short name</label>
                  <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
                    <input type="text" placeholder="e.g. Defense Rehearsal"
                      value={manual.short}
                      onChange={(e) => setManual((p) => ({ ...p, short: e.target.value }))}
                      className="w-full text-sm text-parchment-100 placeholder-parchment-300/20" />
                  </div>
                </div>

                <SingleSelect
                  label="Core belief"
                  options={options?.coreBeliefs ?? []}
                  value={manual.coreBelief}
                  onChange={(v) => setManual((p) => ({ ...p, coreBelief: v }))}
                  placeholder="Select or type a core belief..."
                />

                <MultiSelect
                  label="Symptoms"
                  options={options?.symptoms ?? []}
                  selected={manual.symptoms}
                  onChange={(v) => setManual((p) => ({ ...p, symptoms: v }))}
                  placeholder="Select symptoms..."
                />

                <MultiSelect
                  label="Cognitive labels"
                  options={options?.cognitiveLabels ?? []}
                  selected={manual.cognitiveLabels}
                  onChange={(v) => setManual((p) => ({ ...p, cognitiveLabels: v }))}
                  placeholder="Select cognitive distortions..."
                />

                <SingleSelect
                  label="Note (optional)"
                  options={options?.notes ?? []}
                  value={manual.note}
                  onChange={(v) => setManual((p) => ({ ...p, note: v }))}
                  placeholder="e.g. Variant of P3..."
                />
              </>
            )}

            {error && (
              <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg break-all">{error}</p>
            )}

            {stage === "processing" ? (
              <div className="w-full py-3 rounded-xl border border-gold-400/15 bg-gold-400/5 flex items-center justify-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
                <span className="text-sm text-gold-400/60">
                  {mode === "describe" ? "Claude is reading and structuring…" : "Saving…"}
                </span>
              </div>
            ) : (
              <button
                onClick={mode === "describe" ? submitDescribe : submitManual}
                disabled={mode === "describe" ? !description.trim() : !manual.label.trim() || !manual.coreBelief.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {mode === "describe" ? "Analyze & save pattern" : "Save pattern"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}