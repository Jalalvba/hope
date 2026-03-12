"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pattern } from "@/types";

export function PatternActions({ pattern }: { pattern: Pattern }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "confirmDelete">("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    label: pattern.label,
    short: pattern.short,
    coreBelief: pattern.coreBelief,
    note: pattern.note ?? "",
  });

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
    <div className="glass rounded-xl p-4 border border-rust-400/20 space-y-3">
      <p className="text-sm text-parchment-200/70">Delete <span className="text-rust-400">{pattern.id}</span>? This cannot be undone.</p>
      {error && <p className="text-xs text-rust-400">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={destroy}
          disabled={saving}
          className="text-xs text-rust-400 border border-rust-400/30 px-3 py-1.5 rounded hover:bg-rust-400/10 transition-colors disabled:opacity-40"
        >
          {saving ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setMode("idle")}
          className="text-xs text-parchment-300/40 hover:text-parchment-300/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (mode === "edit") return (
    <div className="glass rounded-xl p-5 space-y-4 border border-parchment-300/8">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-parchment-300/35 uppercase tracking-widest">Edit pattern</span>
        <button onClick={() => setMode("idle")} className="text-parchment-300/25 hover:text-parchment-300/60 transition-colors text-sm">✕</button>
      </div>

      {[
        { key: "label", label: "Label" },
        { key: "short", label: "Short name" },
        { key: "coreBelief", label: "Core belief" },
        { key: "note", label: "Note (optional)" },
      ].map(({ key, label }) => (
        <div key={key}>
          <label className="block text-[10px] text-parchment-300/35 uppercase tracking-widest mb-1">{label}</label>
          <input
            value={form[key as keyof typeof form]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            className="w-full bg-parchment-300/4 border border-parchment-300/10 rounded-lg px-3 py-2 text-sm text-parchment-100 placeholder-parchment-300/20 focus:outline-none focus:border-gold-400/30"
          />
        </div>
      ))}

      {error && <p className="text-xs text-rust-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs bg-gold-400/10 text-gold-400 border border-gold-400/20 px-4 py-1.5 rounded hover:bg-gold-400/15 transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => setMode("idle")}
          className="text-xs text-parchment-300/40 hover:text-parchment-300/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // idle — just show action buttons
  return (
    <div className="flex gap-3">
      <button
        onClick={() => setMode("edit")}
        className="text-[10px] text-parchment-300/30 hover:text-gold-400/60 transition-colors uppercase tracking-widest"
      >
        Edit
      </button>
      <button
        onClick={() => setMode("confirmDelete")}
        className="text-[10px] text-parchment-300/30 hover:text-rust-400/60 transition-colors uppercase tracking-widest"
      >
        Delete
      </button>
    </div>
  );
}
