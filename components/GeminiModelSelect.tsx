import type { GeminiModelOption } from "@/lib/geminiModels";

const TIER_LABELS: Record<string, string> = {
  "flash-lite": "Flash-Lite — fast & cheap",
  flash: "Flash — balanced",
  pro: "Pro — deep reasoning",
};

// Shared <select> for every model picker in the app, grouped by tier so the
// cost/capability tradeoff is visible at a glance rather than just a flat
// list. Purely presentational — pass the live list from useGeminiModels().
export function GeminiModelSelect({
  value,
  onChange,
  models,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  models: GeminiModelOption[];
  disabled?: boolean;
  className?: string;
}) {
  const tiers = Array.from(new Set(models.map((m) => m.tier)));

  return (
    // The trigger's own colors are Tailwind classes and theme correctly, but
    // the native popup listbox (<option>/<optgroup>) is drawn by the OS/
    // browser, not by our CSS — most browsers ignore alpha-transparent
    // backgrounds there and several ignore inherited color entirely unless
    // `color-scheme` tells them which UA palette to draw the popup in (set
    // globally per theme in globals.css). Backgrounds here are solid (no /NN
    // opacity) for the same reason: a translucent bg-ink-950/40 looks right
    // on the closed trigger but several browsers render the popup solid
    // white anyway, which then collides with parchment-tinted option text.
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`text-[10px] bg-ink-950 text-parchment-100 border border-parchment-300/20 rounded px-1.5 py-1 disabled:opacity-50 ${className}`}
    >
      {tiers.map((tier) => (
        <optgroup key={tier} label={TIER_LABELS[tier] ?? tier} className="bg-ink-950 text-parchment-300">
          {models.filter((m) => m.tier === tier).map((m) => (
            <option key={m.id} value={m.id} title={m.description} className="bg-ink-950 text-parchment-100">
              {m.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
