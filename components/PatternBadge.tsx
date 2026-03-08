"use client";

import { PATTERN_META, ALL_PATTERNS, type PatternId } from "@/types";

const COLOR: Record<string, { base: string; active: string }> = {
  amber: {
    base:   "border-amber-500/20 text-amber-400/60  bg-amber-400/5",
    active: "border-amber-400/50 text-amber-400     bg-amber-400/12 ring-1 ring-amber-400/30",
  },
  red: {
    base:   "border-rust-500/20  text-rust-400/60   bg-rust-400/5",
    active: "border-rust-400/50  text-rust-400      bg-rust-400/12  ring-1 ring-rust-400/30",
  },
  green: {
    base:   "border-sage-500/20  text-sage-400/60   bg-sage-400/5",
    active: "border-sage-400/50  text-sage-400      bg-sage-400/12  ring-1 ring-sage-400/30",
  },
  blue: {
    base:   "border-mist-500/20  text-mist-400/60   bg-mist-400/5",
    active: "border-mist-400/50  text-mist-400      bg-mist-400/12  ring-1 ring-mist-400/30",
  },
};

interface PatternBadgeProps {
  id: PatternId;
  size?: "xs" | "sm";
}

export function PatternBadge({ id, size = "sm" }: PatternBadgeProps) {
  const meta = PATTERN_META[id];
  const c = COLOR[meta.color].active;
  const sz = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded border font-mono font-medium ${sz} ${c}`}>
      <span className="opacity-50">{id}</span>
      <span>{meta.short}</span>
    </span>
  );
}

interface SelectorProps {
  selected: PatternId[];
  onChange: (p: PatternId[]) => void;
}

export function PatternSelector({ selected, onChange }: SelectorProps) {
  const toggle = (id: PatternId) => {
    onChange(
      selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PATTERNS.map((id) => {
        const meta = PATTERN_META[id];
        const c = selected.includes(id) ? COLOR[meta.color].active : COLOR[meta.color].base;
        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            title={meta.label}
            className={`
              inline-flex items-center gap-1 rounded border font-mono text-xs px-2 py-1
              cursor-pointer transition-all duration-150 active:scale-95 ${c}
            `}
          >
            <span className="opacity-50">{id}</span>
            <span>{meta.short}</span>
          </button>
        );
      })}
    </div>
  );
}
