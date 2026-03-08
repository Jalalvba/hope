"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewPatternButton() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nextId, setNextId] = useState<string | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    label: "", short: "", coreBelief: "",
    symptoms: "", cognitiveLabels: "", note: "",
  });
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const openModal = async () => {
    // Fetch all patterns to compute next ID
    try {
      const res = await fetch("/api/patterns");
      const json = await res.json();
      const ids: string[] = (json.data ?? []).map((p: { id: string }) => p.id);
      const nums = ids
        .map((id) => parseInt(id.replace("P", "")))
        .filter((n) => !isNaN(n));
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 12;
      setNextId(`P${next}`);
    } catch {
      setNextId("P?");
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!form.label.trim() || !form.coreBelief.trim() || !nextId) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: nextId,
          label: form.label.trim(),
          short: form.short.trim() || form.label.trim(),
          coreBelief: form.coreBelief.trim(),
          symptoms: form.symptoms.split("\n").map((s) => s.trim()).filter(Boolean),
          cognitiveLabels: form.cognitiveLabels.split(",").map((s) => s.trim()).filter(Boolean),
          note: form.note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setOpen(false);
      setForm({ label: "", short: "", coreBelief: "", symptoms: "", cognitiveLabels: "", note: "" });
      router.push(`/patterns/${json.data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { k: "label"           as const, label: "Label",            placeholder: "Catastrophic Waiting",          hint: "",                rows: 0 },
    { k: "short"           as const, label: "Short name",       placeholder: "Waiting",                       hint: "For badges",      rows: 0 },
    { k: "coreBelief"      as const, label: "Core belief",      placeholder: "If I don't know, I'm unsafe.",  hint: "",                rows: 2 },
    { k: "symptoms"        as const, label: "Symptoms",         placeholder: "One symptom per line",          hint: "One per line",    rows: 5 },
    { k: "cognitiveLabels" as const, label: "Cognitive labels", placeholder: "Mind reading, Catastrophizing", hint: "Comma separated", rows: 0 },
    { k: "note"            as const, label: "Note (optional)",  placeholder: "Variant of P3...",              hint: "",                rows: 0 },
  ];

  return (
    <>
      <button onClick={openModal}
        className="w-full py-3 rounded-xl border border-gold-400/25 text-gold-400 bg-gold-400/6 hover:bg-gold-400/12 transition-colors text-sm font-medium">
        + Log new pattern
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto">

            {/* Header with auto ID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-lg text-parchment-100">New pattern</h2>
                {nextId && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded border bg-amber-400/10 text-amber-400 border-amber-400/20">
                    {nextId}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)}
                className="text-parchment-300/30 hover:text-parchment-300/60 text-2xl leading-none">×</button>
            </div>

            {FIELDS.map(({ k, label, placeholder, hint, rows }) => (
              <div key={k} className="space-y-1">
                <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">{label}</label>
                <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
                  {rows > 0
                    ? <textarea rows={rows} placeholder={placeholder} value={form[k]} onChange={set(k)}
                        className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 leading-relaxed" />
                    : <input type="text" placeholder={placeholder} value={form[k]} onChange={set(k)}
                        className="w-full text-sm text-parchment-100 placeholder-parchment-300/20" />}
                </div>
                {hint && <p className="text-[10px] text-parchment-300/20 italic pl-0.5">{hint}</p>}
              </div>
            ))}

            {error && <p className="text-xs text-rust-400 bg-rust-400/8 px-3 py-2 rounded-lg">{error}</p>}

            <button onClick={submit} disabled={saving || !form.label || !form.coreBelief}
              className="w-full py-3 rounded-xl text-sm font-medium border border-gold-400/25 text-gold-400 bg-gold-400/10 hover:bg-gold-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {saving
                ? <span className="inline-flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-gold-400/30 border-t-gold-400 animate-spin" />
                    Saving…
                  </span>
                : `Save ${nextId ?? ""} & analyze`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}