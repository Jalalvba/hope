"use client";

import { useId, useState } from "react";

/**
 * A text input with autocomplete suggestions that holds a single value. Used
 * for the core belief, which is one sentence rather than a list.
 *
 * @param options - Suggestions to offer while typing.
 * @param value - The current value.
 * @param onChange - Called on every keystroke and on picking a suggestion.
 */
export function SuggestInput({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const suggestions = options.filter((option) => option.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-[10px] text-fg-muted uppercase tracking-widest">{label}</label>
      <div className="glass-subtle rounded-lg px-3 py-2.5 field-ring">
        <input
          id={inputId}
          type="text"
          placeholder={placeholder}
          value={search || value}
          onChange={(e) => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full text-sm text-fg-primary placeholder-fg-muted bg-transparent focus:outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="glass rounded-lg border border-parchment-300/10 max-h-40 overflow-y-auto z-10 relative">
          {suggestions.map((o) => (
            <button key={o} onMouseDown={() => { onChange(o); setSearch(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-fg-secondary hover:bg-parchment-300/5 hover:text-fg-primary transition-colors">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
