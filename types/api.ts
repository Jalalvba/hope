/**
 * Shapes shared between the API routes and the client components that call
 * them. Every route in this app answers with either `{ data }` or `{ error }`.
 */

// Returned inline by every Gemini-backed action alongside its result, so the UI
// can show what the action cost in the same round trip. Lives here rather than
// in lib/ai/geminiCostTracker.ts so client components can import the type
// without pulling the server-only tracker (and MongoDB) into the bundle.

export interface CostInfo {
  /** The concrete model that served the call, resolved from any rolling alias. */
  model: string;
  /** ESTIMATED from our own daily call count — see lib/ai/geminiCostTracker.ts. */
  tier: "free" | "paid";
  inputTokens: number;
  /** Visible output plus reasoning tokens; both bill at the output rate. */
  outputTokens: number;
  /** 0 on the free tier. */
  costUsd: number;
  costMad: number;
  /** Prepaid balance remaining after this call. */
  remainingCreditUsd: number;
}

/** A successful JSON response from any route in `app/api/`. */
export interface ApiSuccess<T> {
  data: T;
}

/** A failed JSON response. `costInfo` is present when a Gemini call was billed
 *  before the failure (e.g. the model answered, but off-contract). */
export interface ApiError {
  error: string;
  costInfo?: CostInfo;
}
