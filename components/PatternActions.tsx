"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Pattern } from "@/types";

interface FieldOptions {
  cognitiveLabels: string[];
  symptoms: string[];
  coreBeliefs: string[];
}

function MultiSelect({ label, options, selected, onChange, placeholder }: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(
    (o) => o.toLowerCase().includes(search.toLowerCase()) && !selected.includes(o)
  );
  const remove = (v: string) => onChange(selected.filter((s) => s !== v));
  const add = (v: string) => { onChange([...selected, v]); setSearch(""); };

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
          className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 bg-transparent focus:outline-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="glass rounded-lg border border-parchment-300/10 max-h-40 overflow-y-auto z-10 relative">
          {filtered.map((o) => (
            <button key={o} onMouseDown={() => add(o)}
              className="w-full text-left px-3 py-2 text-xs text-parchment-200/70 hover:bg-parchment-300/5 hover:text-parchment-100 transition-colors">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelect({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; placeholder: string;
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
          className="w-full text-sm text-parchment-100 placeholder-parchment-300/20 bg-transparent focus:outline-none"
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

export function PatternActions({ pattern }: { pattern: Pattern }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "confirmDelete">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<FieldOptions | null>(null);

  const [form, setForm] = useState({
    label: pattern.label,
    short: pattern.short,
    coreBelief: pattern.coreBelief,
    symptoms: pattern.symptoms ?? [],
    cognitiveLabels: pattern.cognitiveLabels ?? [],
    note: pattern.note ?? "",
  });

  useEffect(() => {
    if (mode === "edit" && !options) {
      fetch("/api/patterns/field-options")
        .then((r) => r.json())
        .then((j) => setOptions(j.data))
        .catch(() => {});
    }
  }, [mode]);

  const save = async () => {
    if (!form.label.trim() || !form.coreBelief.trim()) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMode("idle");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const destroy = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setSaving(false);
    }
  };

  if (mode === "confirmDelete") return (
    <div className="glass rounded-xl p-4 border border-rust-400/20 space-y-3 mb-4">
      <p className="text-sm text-parchment-200/70">
        Delete <span className="text-rust-400 font-mono">{pattern.id}</span>? This cannot be undone.
      </p>
      {error && <p className="text-xs text-rust-400">{error}</p>}
      <div className="flex gap-3">
        <button onClick={destroy} disabled={saving}
          className="text-xs text-rust-400 border border-rust-400/30 px-3 py-1.5 rounded hover:bg-rust-400/10 transition-colors disabled:opacity-40">
          {saving ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setMode("idle")}
          className="text-xs text-parchment-300/40 hover:text-parchment-300/70 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  if (mode === "edit") return (
    <div className="glass rounded-xl p-5 space-y-4 border border-parchment-300/8 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-parchment-300/35 uppercase tracking-widest">Edit pattern</span>
        <button onClick={() => setMode("idle")}
          className="text-parchment-300/25 hover:text-parchment-300/60 transition-colors text-xl leading-none">✕</button>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Label</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full text-sm text-parchment-100 bg-transparent focus:outline-none" />
        </div>
      </div>

      {/* Short */}
      <div className="space-y-1">
        <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Short name</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input value={form.short}
            onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
            className="w-full text-sm text-parchment-100 bg-transparent focus:outline-none" />
        </div>
      </div>

      {/* Core belief */}
      <SingleSelect
        label="Core belief"
        options={options?.coreBeliefs ?? []}
        value={form.coreBelief}
        onChange={(v) => setForm((f) => ({ ...f, coreBelief: v }))}
        placeholder="Select or type a core belief..."
      />

      {/* Symptoms */}
      <MultiSelect
        label="Symptoms"
        options={options?.symptoms ?? []}
        selected={form.symptoms}
        onChange={(v) => setForm((f) => ({ ...f, symptoms: v }))}
        placeholder="Select symptoms..."
      />

      {/* Cognitive labels */}
      <MultiSelect
        label="Cognitive labels"
        options={options?.cognitiveLabels ?? []}
        selected={form.cognitiveLabels}
        onChange={(v) => setForm((f) => ({ ...f, cognitiveLabels: v }))}
        placeholder="Select cognitive distortions..."
      />

      {/* Note */}
      <div className="space-y-1">
        <label className="text-[10px] text-parchment-300/40 uppercase tracking-widest">Note (optional)</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full text-sm text-parchment-100 bg-transparent focus:outline-none"
            placeholder="e.g. Variant of P3..." />
        </div>
      </div>

      {error && <p className="text-xs text-rust-400">{error}</p>}

      <div className="flex gap-3">
        <button onClick={save} disabled={saving || !form.label.trim() || !form.coreBelief.trim()}
          className="text-xs bg-gold-400/10 text-gold-400 border border-gold-400/20 px-4 py-1.5 rounded hover:bg-gold-400/15 transition-colors disabled:opacity-40">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={() => setMode("idle")}
          className="text-xs text-parchment-300/40 hover:text-parchment-300/70 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-3">
      <button onClick={() => setMode("edit")}
        className="text-[10px] text-parchment-300/30 hover:text-gold-400/60 transition-colors uppercase tracking-widest">
        Edit
      </button>
      <button onClick={() => setMode("confirmDelete")}
        className="text-[10px] text-parchment-300/30 hover:text-rust-400/60 transition-colors uppercase tracking-widest">
        Delete
      </button>
    </div>
  );
}
