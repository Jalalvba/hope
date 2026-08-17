import type { CostInfo } from "@/types";

/**
 * Shows what one Gemini-backed action cost, using the `costInfo` that action's
 * own response carried back. Shared by every such action so cost reporting
 * looks the same everywhere. Presentational only — it never fetches.
 */

/** Formats a dirham amount, keeping very small costs from reading as free. */
function formatMad(mad: number): string {
  // Sub-centime calls are common on flash-lite; "0.00 MAD" would read as free.
  if (mad > 0 && mad < 0.01) return "<0.01";
  return mad.toFixed(2);
}

/**
 * @param costInfo - What the call cost, straight from the API response.
 */
export function CostBadge({ costInfo, className = "" }: { costInfo: CostInfo; className?: string }) {
  const { tier, inputTokens, outputTokens, costMad, model, remainingCreditUsd } = costInfo;
  const free = tier === "free";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] ${className}`}>
      <span
        className={
          free
            ? "px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400"
            : "px-2 py-0.5 rounded-full bg-rust-400/10 text-rust-400"
        }
        // The free/paid call is inferred locally, not reported by Google.
        title={
          free
            ? "Estimated free tier — based on this app's own daily call count, not Google's billing"
            : `Estimated paid tier · ${remainingCreditUsd.toFixed(2)} USD credit left`
        }
      >
        {free ? "free tier" : `${formatMad(costMad)} MAD · paid`}
      </span>

      <span className="text-fg-muted">
        {inputTokens.toLocaleString()} in / {outputTokens.toLocaleString()} out
      </span>

      <span className="text-fg-muted">{model}</span>
    </div>
  );
}
