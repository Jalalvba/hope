"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { ObservationForm } from "./ObservationForm";
import { ObservationCard } from "./ObservationCard";
import type { Observation, PatternId } from "@/types";

export function Dashboard() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PatternId | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/observations")
      .then((r) => r.json())
      .then((j) => { setObservations(j.data ?? []); setLoading(false); });
  }, []);

  const visible = useMemo(
    () => filter ? observations.filter((o) => o.patterns.includes(filter)) : observations,
    [observations, filter]
  );

  const onSaved = (o: Observation) => {
    setObservations((p) => [o, ...p]);
    setShowForm(false);
  };

  const onUpdate = (updated: Observation) =>
    setObservations((p) => p.map((o) => (String(o._id) === String(updated._id) ? updated : o)));

  const onDelete = (id: string) =>
    setObservations((p) => p.filter((o) => String(o._id) !== id));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto p-6 border-r border-parchment-300/[0.05]">
        <Sidebar observations={observations} filter={filter} onFilter={setFilter} />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 max-w-2xl mx-auto px-4 py-8">

        {/* Mobile title */}
        <div className="lg:hidden mb-6">
          <h1 className="font-display text-2xl text-parchment-100">
            Psyche <span className="text-gold-400">Log</span>
          </h1>
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-parchment-300/35">
            {filter
              ? `${visible.length} entries — ${filter}`
              : `${observations.length} total observations`}
          </p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`text-xs px-4 py-2 rounded-lg border transition-all duration-150 ${
              showForm
                ? "border-parchment-300/15 text-parchment-300/40"
                : "border-gold-400/25 text-gold-400 bg-gold-400/6 hover:bg-gold-400/12"
            }`}
          >
            {showForm ? "Cancel" : "+ New observation"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-5 animate-fade-up">
            <ObservationForm onSaved={onSaved} />
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0.9, 0.6, 0.3].map((o, i) => (
              <div key={i} className="glass rounded-xl h-20" style={{ opacity: o }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 space-y-2">
            <p className="font-display text-xl text-parchment-300/15 italic">No observations yet</p>
            <p className="text-xs text-parchment-300/20">
              {filter ? `No entries tagged ${filter}` : "Begin logging when the pattern fires"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((o, i) => (
              <ObservationCard
                key={String(o._id)}
                obs={o}
                onUpdate={onUpdate}
                onDelete={onDelete}
                index={i}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
