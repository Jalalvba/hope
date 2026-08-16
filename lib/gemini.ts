// ─── Gemini client ────────────────────────────────────────────────────────────
// Thin server-only wrapper around the Gemini generateContent REST endpoint.
//
// The API key is read strictly from process.env.GEMINI_API_KEY at call time and
// sent via the x-goog-api-key header. It is never inlined into a URL, never
// returned to the client, and never logged. Upstream error bodies are logged
// only as a status code plus a truncated message, never echoed to the caller.
//
// A model id 404ing is treated as recoverable, not fatal: Google retires
// snapshots (see lib/getDynamicModel.ts's header comment — a model can be
// listed as available and still 404 on generateContent). On a 404, this
// module retries once against that model's tier rolling alias
// (gemini-<tier>-latest), which Google always resolves to something live.
// The caller never sees the 404; costInfo.model ends up reflecting whichever
// concrete snapshot actually served the request, via modelVersion.

import { guessTier, rollingAliasFor } from "@/lib/geminiModels";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Rolling alias — cheapest active tier.
export const DEFAULT_MODEL = "gemini-flash-lite-latest";

export interface GeminiUsage {
  inputTokens: number;
  /** Visible output plus reasoning tokens — both are billed at the output rate. */
  outputTokens: number;
  totalTokens: number;
}

export type GeminiResult<T> =
  | {
      ok: true;
      data: T;
      usage: GeminiUsage;
      /** The concrete model Gemini actually served, e.g. "gemini-3.5-flash-lite".
       *  Differs from the requested name when a rolling alias was used. */
      modelVersion: string;
    }
  | { ok: false; error: string; status: number };

export interface GenerateJsonOptions {
  prompt: string;
  /** JSON schema constraining the model's response (Gemini structured output). */
  responseSchema: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

/**
 * Calls Gemini in JSON mode and returns the parsed object.
 *
 * Returns a discriminated result rather than throwing, so route handlers can
 * map failures onto their own error-response shape. The caller is still
 * responsible for validating the parsed object against the expected type —
 * JSON mode guarantees parseable output, not correct output.
 *
 * @internal Do NOT call this from a route handler or server action. Every call
 * must go through `callGeminiWithTracking` in lib/gemini-cost-tracker.ts, which
 * is what measures and reports what the call cost. Calling this directly
 * silently skips cost tracking.
 */
export async function generateJson<T = unknown>(
  opts: GenerateJsonOptions
): Promise<GeminiResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[gemini] GEMINI_API_KEY is not set");
    return { ok: false, error: "AI is not configured on this server.", status: 503 };
  }

  const requestedModel = opts.model ?? DEFAULT_MODEL;

  const doFetch = (modelId: string) =>
    fetch(`${ENDPOINT}/${modelId}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          responseMimeType: "application/json",
          responseSchema: opts.responseSchema,
        },
      }),
      signal: opts.signal,
    });

  let model = requestedModel;
  let res: Response;
  try {
    res = await doFetch(model);
  } catch (err) {
    // Network-level failure, timeout, or abort.
    console.error("[gemini] request failed:", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "Could not reach the AI service. Try again.", status: 502 };
  }

  // A 404 usually means the requested snapshot was retired; a 502 from
  // Google's own endpoint is typically a transient routing/upstream issue,
  // most often seen on a specific model id rather than the whole API. Either
  // way, retry once against that model's tier rolling alias rather than
  // failing the whole call. Skip the retry if we're already on the alias
  // (would just fail again) or the caller passed no model at all
  // (DEFAULT_MODEL is already an alias).
  if ((res.status === 404 || res.status === 502) && model !== rollingAliasFor(guessTier(model))) {
    const alias = rollingAliasFor(guessTier(model));
    console.warn(`[gemini] "${model}" returned ${res.status}, retrying against rolling alias "${alias}"`);
    try {
      res = await doFetch(alias);
      model = alias;
    } catch (err) {
      console.error("[gemini] retry request failed:", err instanceof Error ? err.message : "unknown");
      return { ok: false, error: "Could not reach the AI service. Try again.", status: 502 };
    }
  }

  if (!res.ok) {
    // Read the body only to log a truncated diagnostic — never returned to the client.
    const detail = await res.text().catch(() => "");
    console.error(`[gemini] upstream ${res.status}: ${detail.slice(0, 300)}`);

    if (res.status === 429) {
      return {
        ok: false,
        error: "AI rate limit reached. Wait a moment and try again, or try a different model.",
        status: 429,
      };
    }
    if (res.status >= 500) {
      return {
        ok: false,
        error: "The AI service is temporarily unavailable. Try again, or try a different model.",
        status: 503,
      };
    }
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { ok: false, error: "AI request was rejected. Check the server configuration.", status: 502 };
    }
    return { ok: false, error: "AI request failed.", status: 502 };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    console.error("[gemini] upstream returned a non-JSON body");
    return { ok: false, error: "AI returned an unreadable response.", status: 502 };
  }

  // ── Usage metadata ──
  // Verified against https://ai.google.dev/api/generate-content (2026-08-16):
  // token counts live on the top-level `usageMetadata`, and the concrete model
  // served is echoed in the top-level `modelVersion`.
  //
  // `thoughtsTokenCount` (reasoning tokens) is billed at the OUTPUT rate but is
  // reported separately from `candidatesTokenCount`, so it must be added in —
  // omitting it under-reports the cost of any thinking-capable model.
  // `cachedContentTokenCount` is billed at a discounted rate; this app doesn't
  // use context caching, so it is not modelled.
  const body = payload as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    modelVersion?: string;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      thoughtsTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  const um = body.usageMetadata;
  const usage: GeminiUsage = {
    inputTokens: um?.promptTokenCount ?? 0,
    outputTokens: (um?.candidatesTokenCount ?? 0) + (um?.thoughtsTokenCount ?? 0),
    totalTokens: um?.totalTokenCount ?? 0,
  };
  if (!um) console.warn("[gemini] response carried no usageMetadata — cost will read as 0 tokens");

  const modelVersion = body.modelVersion ?? model;

  const candidate = body.candidates?.[0];

  if (!candidate) {
    const reason = (payload as { promptFeedback?: { blockReason?: string } }).promptFeedback?.blockReason;
    console.error(`[gemini] no candidate returned${reason ? ` (blockReason=${reason})` : ""}`);
    return { ok: false, error: "AI returned no content.", status: 502 };
  }

  if (candidate.finishReason === "MAX_TOKENS") {
    console.error("[gemini] response truncated at maxOutputTokens");
    return {
      ok: false,
      error: "AI response was cut off before it finished. Try again, or use the manual prompt.",
      status: 502,
    };
  }

  const text = candidate.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    console.error("[gemini] empty text in candidate");
    return { ok: false, error: "AI returned an empty response.", status: 502 };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T, usage, modelVersion };
  } catch {
    console.error("[gemini] candidate text was not valid JSON");
    return { ok: false, error: "AI returned malformed JSON.", status: 502 };
  }
}
