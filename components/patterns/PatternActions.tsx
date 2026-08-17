"use client";

import { useEffect, useId, useState } from "react";
import { TagInput } from "@/components/ui/TagInput";
import { SuggestInput } from "@/components/ui/SuggestInput";
import { useRouter } from "next/navigation";
import type { Pattern } from "@/types";

/**
 * Autocomplete suggestions loaded from GET /api/patterns/field-options.
 *
 * Declared here rather than imported from lib/db/fields.ts on purpose: this is
 * a Client Component, and importing from a module that touches MongoDB would
 * drag the driver into the browser bundle.
 */
interface FieldOptions {
  cognitiveLabels: string[];
  symptoms: string[];
  coreBeliefs: string[];
}

/**
 * Edit and delete controls shown at the top of a pattern's detail page.
 *
 * Rendered only for patterns created through the app (P12+) — the seeded
 * reference patterns are read-only, which the page decides before mounting
 * this. Moves between three modes: the plain buttons, the edit form, and a
 * delete confirmation.
 *
 * @param pattern - The pattern being edited, used to seed the form.
 */
export function PatternActions({ pattern }: { pattern: Pattern }) {
  const router = useRouter();
  // One id prefix per mounted form, so labels can point at their own inputs.
  const fieldId = useId();
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
      // Autocomplete suggestions are a nicety: if the request fails the form
      // still works, so the error is deliberately swallowed.
      fetch("/api/patterns/field-options")
        .then((response) => response.json())
        .then((json) => setOptions(json.data))
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  };

  const destroy = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setSaving(false);
    }
  };

  if (mode === "confirmDelete") return (
    <div className="glass rounded-xl p-4 border border-rust-400/20 space-y-3 mb-4 w-full">
      <p className="text-sm text-fg-secondary">
        Delete <span className="text-rust-400 font-mono">{pattern.id}</span>? This cannot be undone.
      </p>
      {error && <p className="text-xs text-rust-400">{error}</p>}
      <div className="flex gap-3">
        <button onClick={destroy} disabled={saving}
          className="text-xs text-rust-400 border border-rust-400/30 px-3 py-1.5 rounded hover:bg-rust-400/10 transition-colors disabled:opacity-40">
          {saving ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setMode("idle")}
          className="text-xs text-fg-muted hover:text-fg-secondary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  if (mode === "edit") return (
    <div className="glass rounded-xl p-5 space-y-4 border border-parchment-300/8 mb-4 w-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-fg-muted uppercase tracking-widest">Edit pattern</span>
        <button onClick={() => setMode("idle")}
          className="text-fg-muted hover:text-fg-secondary transition-colors text-xl leading-none">✕</button>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label htmlFor={`${fieldId}-label`} className="text-[10px] text-fg-muted uppercase tracking-widest">Label</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input id={`${fieldId}-label`} value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="w-full text-sm text-fg-primary bg-transparent focus:outline-none" />
        </div>
      </div>

      {/* Short */}
      <div className="space-y-1">
        <label htmlFor={`${fieldId}-short`} className="text-[10px] text-fg-muted uppercase tracking-widest">Short name</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input id={`${fieldId}-short`} value={form.short}
            onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
            className="w-full text-sm text-fg-primary bg-transparent focus:outline-none" />
        </div>
      </div>

      {/* Core belief */}
      <SuggestInput
        label="Core belief"
        options={options?.coreBeliefs ?? []}
        value={form.coreBelief}
        onChange={(v) => setForm((f) => ({ ...f, coreBelief: v }))}
        placeholder="Select or type a core belief..."
      />

      {/* Symptoms */}
      <TagInput
        label="Symptoms"
        options={options?.symptoms ?? []}
        selected={form.symptoms}
        onChange={(v) => setForm((f) => ({ ...f, symptoms: v }))}
        placeholder="Select symptoms..."
      />

      {/* Cognitive labels */}
      <TagInput
        label="Cognitive labels"
        options={options?.cognitiveLabels ?? []}
        selected={form.cognitiveLabels}
        onChange={(v) => setForm((f) => ({ ...f, cognitiveLabels: v }))}
        placeholder="Select cognitive distortions..."
      />

      {/* Note */}
      <div className="space-y-1">
        <label htmlFor={`${fieldId}-note`} className="text-[10px] text-fg-muted uppercase tracking-widest">Note (optional)</label>
        <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
          <input id={`${fieldId}-note`} value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full text-sm text-fg-primary bg-transparent focus:outline-none"
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
          className="text-xs text-fg-muted hover:text-fg-secondary transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex gap-3">
      <button onClick={() => setMode("edit")}
        className="text-[10px] text-fg-muted hover:text-gold-400 transition-colors uppercase tracking-widest">
        Edit
      </button>
      <button onClick={() => setMode("confirmDelete")}
        className="text-[10px] text-fg-muted hover:text-rust-400 transition-colors uppercase tracking-widest">
        Delete
      </button>
    </div>
  );
}
