"use client";

import { useId, useState } from "react";

/**
 * A tag-style input: pick from suggestions or type a new value, with each
 * chosen value shown as a removable chip. Used for symptoms and cognitive
 * labels, which are both free-form string lists.
 *
 * @param options - Suggestions to offer; already-selected ones are hidden.
 * @param selected - The current values.
 * @param onChange - Called with the full new list on every add or remove.
 */
export function TagInput({ label, options, selected, onChange, placeholder }: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; placeholder: string;
}) {
  // Ties the <label> to the <input> so clicking the label focuses the field and
  // screen readers announce the two together.
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const suggestions = options.filter(
    (option) => option.toLowerCase().includes(search.toLowerCase()) && !selected.includes(option)
  );
  const remove = (value: string) => onChange(selected.filter((item) => item !== value));
  const add = (value: string) => { onChange([...selected, value]); setSearch(""); };

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-[10px] text-fg-muted uppercase tracking-widest">{label}</label>
      <div className="glass-subtle rounded-lg px-3 py-2 field-ring min-h-[40px]">
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gold-400/10 text-gold-400 border border-gold-400/20">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                aria-label={`Remove ${s}`}
                className="text-gold-400 hover:text-rust-400 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          id={inputId}
          type="text"
          placeholder={selected.length === 0 ? placeholder : "Add more..."}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full text-sm text-fg-primary placeholder-fg-muted bg-transparent focus:outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="glass rounded-lg border border-parchment-300/10 max-h-40 overflow-y-auto z-10 relative">
          {suggestions.map((option) => (
            <button key={option} onMouseDown={() => add(option)}
              className="w-full text-left px-3 py-2 text-xs text-fg-secondary hover:bg-parchment-300/5 hover:text-fg-primary transition-colors">
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
