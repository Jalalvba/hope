"use client";

import { useState, useMemo } from "react";
import { PATTERN_META, ALL_PATTERNS, type PatternId, type Observation } from "@/types";

export function Sidebar({
  observations,
  filter,
  onFilter,
}: {
  observations: Observation[];
  filter: PatternId | null;
  onFilter: (p: PatternId | null) => void;
}) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of observations) {
      for (const p of o.patterns) m[p] = (m[p] ?? 0) + 1;
    }
    return m;
  }, [observations]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const analyzed = observations.filter((o) => !!o.analysis).length;

  return (
    <aside className="flex flex-col gap-6 h-full">
      {/* Logo */}
      <div>
        <h1 className="font-display text-2xl leading-tight text-parchment-100">
          Psyche<br />
          <span className="text-gold-400">Log</span>
        </h1>
        <p className="text-[10px] text-parchment-300/25 mt-0.5 font-mono">pattern journal</p>
      </div>

      {/* Stats */}
      <div className="glass rounded-xl p-4 space-y-2.5">
        {[
          { label: "Entries",  val: String(observations.length),    cls: "text-parchment-100" },
          { label: "Analyzed", val: String(analyzed),               cls: "text-sage-400"      },
          { label: "Active patterns", val: `${Object.keys(counts).length} / 9`, cls: "text-parchment-100" },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-parchment-300/35">{label}</span>
            <span className={`font-mono ${cls}`}>{val}</span>
          </div>
        ))}
      </div>

      {/* Pattern filter */}
      <div className="space-y-1">
        <p className="text-[10px] text-parchment-300/25 uppercase tracking-widest px-1 mb-2">
          Filter by pattern
        </p>
        <button
          onClick={() => onFilter(null)}
          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
            filter === null
              ? "text-parchment-100 bg-parchment-300/6"
              : "text-parchment-300/35 hover:text-parchment-300/55"
          }`}
        >
          All observations
        </button>

        {ALL_PATTERNS.map((id) => {
          const cnt = counts[id] ?? 0;
          const active = filter === id;
          const barW = cnt > 0 ? Math.max((cnt / maxCount) * 100, 6) : 0;

          return (
            <button
              key={id}
              onClick={() => onFilter(active ? null : id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                active
                  ? "text-gold-400 bg-gold-400/8"
                  : "text-parchment-300/35 hover:text-parchment-300/60 hover:bg-parchment-300/4"
              }`}
            >
              <div className="flex justify-between text-xs font-mono">
                <span>{id}</span>
                {cnt > 0 && <span className="opacity-50">{cnt}</span>}
              </div>
              <div className="text-[10px] mt-0.5 truncate opacity-60">
                {PATTERN_META[id].short}
              </div>
              {cnt > 0 && (
                <div className="mt-1.5 h-px bg-parchment-300/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-400/35 rounded-full"
                    style={{ width: `${barW}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Seed */}
      <div className="mt-auto pt-4 border-t border-parchment-300/[0.05]">
        <SeedButton />
      </div>
    </aside>
  );
}

function SeedButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const seed = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/books", { method: "POST" });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <button
        onClick={seed}
        disabled={status !== "idle"}
        className="w-full text-xs py-2 px-3 rounded-lg border border-parchment-300/8 text-parchment-300/25 hover:text-parchment-300/45 hover:border-parchment-300/15 transition-colors disabled:opacity-40"
      >
        {status === "idle"    && "Seed book patterns"}
        {status === "loading" && "Seeding…"}
        {status === "done"    && "✓ Books seeded"}
        {status === "error"   && "Seed failed"}
      </button>
      <p className="text-[10px] text-parchment-300/15 text-center mt-1">Run once on first setup</p>
    </>
  );
}
