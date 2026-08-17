// ─── Gemini cost tracking ─────────────────────────────────────────────────────
// Server-only. Single funnel through which every Gemini call in this app must
// pass, so no action can ever spend money without reporting what it cost.
//
// ⚠️  EVERYTHING HERE IS AN ESTIMATE, NOT BILLING.
// Google's API response does not say whether a call was served on the free tier
// or billed against prepaid credit — that decision is made server-side by Google
// against a per-account quota that is not exposed to the API. The free/paid call
// below is therefore inferred from OUR OWN local count of calls made today.
// It drifts from reality whenever the same API key is used outside this app
// (AI Studio playground, scripts, another deployment), or when Google changes
// the account's quota. Cross-check periodically against the real usage figures
// at https://aistudio.google.com/  →  Usage & billing.

import { mongoClientPromise, dbName } from "@/lib/db/mongo";
import { generateJson, DEFAULT_MODEL, type GenerateJsonOptions } from "@/lib/ai/gemini";
import type { CostInfo } from "@/types";

// ─── Pricing ──────────────────────────────────────────────────────────────────
// USD per 1M tokens, paid tier, text/image/video input. Verified against
// https://ai.google.dev/gemini-api/docs/pricing (checked 2026-08-16).
// Note the model IDs use DOTS (gemini-3.5-flash-lite), not dashes.
// To add a model: add a row. Nothing else needs to change.

interface ModelPricing {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
  /**
   * Requests-per-day allowed on the free tier before calls start billing.
   *
   * Google no longer publishes per-model free-tier RPD in the public docs —
   * it is account-specific and shown at https://aistudio.google.com/rate-limit.
   * These are conservative defaults; replace them with YOUR dashboard numbers.
   */
  freeRequestsPerDay: number;
}

// gemini-2.5-flash-lite and gemini-2.5-flash removed — verified 2026-08-16
// that Google retired both on this API key (404 "no longer available to new
// users"). Keep this in sync with lib/ai/geminiModels.ts's GEMINI_MODELS list.
//
// gemini-3.6-flash and gemini-3.7-flash added 2026-08-16, verified live on
// this key. Introductory rate confirmed against
// https://ai.google.dev/gemini-api/docs/pricing — Google states this rate
// doubles 2027-01-01, so re-verify after that date. freeRequestsPerDay for
// both is an unverified conservative guess (Google doesn't publish per-model
// RPD) — replace with your dashboard number at https://aistudio.google.com/rate-limit.
// gemini-3.1-pro-preview added 2026-08-16, verified live on this key. Pro-tier
// rate ($2/$12 per 1M tokens, prompts up to 200K) taken from public pricing
// pages, not Google's own docs page (which didn't list preview pricing at
// check time) — treat as approximate and re-verify before relying on it for
// real budgeting. freeRequestsPerDay set to 0: preview/pro tiers are unlikely
// to carry a free allowance, and 0 is the safe (over-report) direction.
const PRICING: Record<string, ModelPricing> = {
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5, freeRequestsPerDay: 1000 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5, freeRequestsPerDay: 1000 },
  "gemini-3.5-flash": { input: 1.5, output: 9.0, freeRequestsPerDay: 250 },
  "gemini-3.6-flash": { input: 0.75, output: 3.75, freeRequestsPerDay: 250 },
  "gemini-3.7-flash": { input: 0.75, output: 3.75, freeRequestsPerDay: 250 },
  "gemini-3.1-pro-preview": { input: 2.0, output: 12.0, freeRequestsPerDay: 0 },
};

/** Fallback when a model ID isn't in PRICING — priced as the most expensive
 *  known lite tier so an unknown model over-reports rather than under-reports. */
const UNKNOWN_MODEL_PRICING: ModelPricing = { input: 0.3, output: 2.5, freeRequestsPerDay: 0 };

/**
 * The app calls the rolling alias `gemini-flash-lite-latest`, which has no
 * pricing row of its own. Gemini echoes the concrete model it actually served
 * in `modelVersion`, so that is what we price against; this map is only a
 * fallback for when the response omits it.
 */
const ALIAS_FALLBACK: Record<string, string> = {
  "gemini-flash-lite-latest": "gemini-3.5-flash-lite",
  "gemini-flash-latest": "gemini-3.5-flash",
};

function resolvePricing(model: string): { key: string; pricing: ModelPricing } {
  if (PRICING[model]) return { key: model, pricing: PRICING[model] };

  const aliased = ALIAS_FALLBACK[model];
  if (aliased && PRICING[aliased]) return { key: aliased, pricing: PRICING[aliased] };

  // `gemini-3.5-flash-lite-preview-11-2025` → longest matching known prefix.
  const prefix = Object.keys(PRICING)
    .filter((k) => model.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (prefix) return { key: prefix, pricing: PRICING[prefix] };

  console.warn(`[cost] no pricing row for model "${model}" — using fallback rate`);
  return { key: model, pricing: UNKNOWN_MODEL_PRICING };
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/** MAD per USD. Override with USD_TO_MAD_RATE; a static rate is fine here since
 *  these figures are indicative, not accounting. */
const USD_TO_MAD = Number(process.env.USD_TO_MAD_RATE) || 9.4;

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Cost of one call at paid-tier rates, regardless of which tier it was served on. */
function computeCallCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { usd: number; mad: number } {
  const { pricing } = resolvePricing(model);
  const usd = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  // 6dp on USD: a single flash-lite call can cost well under a hundredth of a cent.
  return { usd: round(usd, 6), mad: round(usd * USD_TO_MAD, 4) };
}

// ─── Storage (MongoDB) ────────────────────────────────────────────────────────
// The filesystem is not writable or persistent on Vercel, so the usage log,
// the running totals and the daily quota counter all live in Mongo alongside
// the rest of the app's data.

const QUOTA_COLLECTION = "usage_quota";   // one doc per model per day
const LOG_COLLECTION = "usage_log";       // append-only, one doc per call
const TOTALS_COLLECTION = "usage_totals"; // one doc per model, read-modify-write

async function db() {
  const client = await mongoClientPromise;
  return client.db(dbName);
}

/**
 * Today's date in Google's quota timezone.
 *
 * Verified against https://ai.google.dev/gemini-api/docs/rate-limits (2026-08-16):
 * "Requests per day (RPD) quotas reset at midnight Pacific time" — NOT UTC.
 * Pacific also observes DST, so this must go through the IANA zone rather than
 * a fixed offset.
 */
function quotaDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // en-CA formats as YYYY-MM-DD
}

/**
 * Reserves one slot in today's free-tier budget for `model` and reports whether
 * this call still fits inside it.
 *
 * Increments first and decides from the post-increment count, so two concurrent
 * calls can't both claim the last free slot. A call that later fails upstream
 * has still consumed the slot — that matches Google's own behaviour for calls
 * that reach the model, and over-counting is the safe direction for an estimate.
 */
async function reserveTier(modelKey: string, pricing: ModelPricing): Promise<{
  tier: "free" | "paid";
  callsToday: number;
}> {
  const day = quotaDayKey();
  const doc = await (await db())
    .collection<{ _id: string; model: string; day: string; calls: number }>(QUOTA_COLLECTION)
    .findOneAndUpdate(
      { _id: `${modelKey}:${day}` },
      { $inc: { calls: 1 }, $setOnInsert: { model: modelKey, day } },
      { upsert: true, returnDocument: "after" }
    );

  const callsToday = doc?.calls ?? 1;
  return { tier: callsToday <= pricing.freeRequestsPerDay ? "free" : "paid", callsToday };
}

// ─── Prepaid credit ───────────────────────────────────────────────────────────

/** Starting prepaid balance loaded on the API key, in USD. */
const STARTING_CREDIT_USD = Number(process.env.GEMINI_PREPAID_USD_BALANCE) || 0;

interface TotalsDoc {
  _id: string; // model key
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_cost_mad: number;
}

/**
 * Prepaid credit remaining, in USD.
 *
 * Derived — never stored separately — as the configured starting balance minus
 * everything the totals say we've spent on paid-tier calls. The totals
 * collection is the single source of truth for spend; this function and
 * `costInfo.remainingCreditUsd` both read it, so they cannot disagree.
 */
async function getRemainingCredit(): Promise<number> {
  const rows = await (await db()).collection<TotalsDoc>(TOTALS_COLLECTION).find({}).toArray();
  const spent = rows.reduce((sum, r) => sum + (r.total_cost_usd ?? 0), 0);
  return round(STARTING_CREDIT_USD - spent, 6);
}

// ─── Recording ────────────────────────────────────────────────────────────────

/**
 * Appends the audit record and folds the call into the running totals.
 *
 * Deliberately never throws: bookkeeping must not be able to fail an action the
 * user already paid for. Failures are logged and swallowed.
 */
async function record(action: string, info: CostInfo): Promise<void> {
  try {
    const database = await db();

    // Audit trail — one document per call, the Mongo equivalent of the
    // JSON-lines gemini-usage.log.
    await database.collection(LOG_COLLECTION).insertOne({
      timestamp: new Date(),
      action,
      model: info.model,
      input_tokens: info.inputTokens,
      output_tokens: info.outputTokens,
      tier: info.tier,
      cost_usd: info.costUsd,
      cost_mad: info.costMad,
    });

    // Running totals. Tokens and call counts accumulate for every call so the
    // free-tier volume stays visible; cost only moves on paid calls, since a
    // free call genuinely costs nothing.
    await database.collection<TotalsDoc>(TOTALS_COLLECTION).updateOne(
      { _id: info.model },
      {
        $inc: {
          total_calls: 1,
          total_input_tokens: info.inputTokens,
          total_output_tokens: info.outputTokens,
          total_cost_usd: info.costUsd,
          total_cost_mad: info.costMad,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[cost] failed to record usage:", err instanceof Error ? err.message : err);
  }
}

// ─── The wrapper ──────────────────────────────────────────────────────────────

export interface TrackedCall<T> {
  result: T;
  costInfo: CostInfo;
}

export type TrackedResult<T> =
  | ({ ok: true } & TrackedCall<T>)
  | { ok: false; error: string; status: number };

/**
 * The ONLY sanctioned way to call Gemini in this app.
 *
 * Every UI action (Analyze, and anything added later) must go through here
 * rather than `generateJson` directly, so a call can never be made without its
 * cost being measured, returned to the caller, and written to the audit log.
 *
 * `action` is a short label for the audit trail, e.g. "analyze".
 * On success the caller gets the model output AND the cost of producing it, in
 * one object, in the same round trip — pass `costInfo` straight through to the
 * HTTP response so the UI can show it next to the result.
 */
export async function callGeminiWithTracking<T = unknown>(
  action: string,
  opts: GenerateJsonOptions
): Promise<TrackedResult<T>> {
  const requestedModel = opts.model ?? DEFAULT_MODEL;

  // Tier is reserved against the requested name; if the response reveals a
  // different concrete model we re-price below but keep the reserved tier,
  // because the quota that was consumed was the one we counted against.
  //
  // This also applies when generateJson (lib/ai/gemini.ts) silently substitutes
  // a 404'd model for its rolling alias: the substitution happens inside
  // generateJson, after this reservation, so a discovered-but-unentitled
  // model (no PRICING row → 0 free requests) always reserves "paid" here even
  // though the model that actually served the request may have free quota
  // left. Cost itself is still priced correctly (against the served model,
  // below) — only the free/paid tier label can be pessimistic in this case.
  const { key: requestedKey, pricing } = resolvePricing(requestedModel);
  const { tier } = await reserveTier(requestedKey, pricing);

  const res = await generateJson<T>(opts);
  if (!res.ok) return res;

  // Token counts come from the response's usageMetadata — see lib/ai/gemini.ts for
  // where exactly they're read out of the payload.
  const { inputTokens, outputTokens } = res.usage;

  // Prefer the concrete model Gemini says it served over the alias we asked for.
  const { key: servedKey } = resolvePricing(res.modelVersion || requestedModel);

  const cost = tier === "free"
    ? { usd: 0, mad: 0 }
    : computeCallCost(servedKey, inputTokens, outputTokens);

  const costInfo: CostInfo = {
    model: servedKey,
    tier,
    inputTokens,
    outputTokens,
    costUsd: cost.usd,
    costMad: cost.mad,
    remainingCreditUsd: 0, // filled in below, after this call is folded into totals
  };

  await record(action, costInfo);
  costInfo.remainingCreditUsd = await getRemainingCredit();

  return { ok: true, result: res.data, costInfo };
}
