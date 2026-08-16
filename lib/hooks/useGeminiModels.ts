"use client";

import { useEffect, useState } from "react";
import { GEMINI_MODELS, type GeminiModelOption } from "@/lib/ai/geminiModels";

/**
 * React hook giving a model picker its list of Gemini models.
 *
 * Fetches the live, discovered Gemini model list from GET /api/gemini-models
 * (server-side discovery — see lib/ai/geminiModelDiscovery.ts). Renders instantly
 * with the small static fallback list from lib/ai/geminiModels.ts, then swaps
 * in the live list once it arrives; stays on the static list if the fetch
 * fails, so the picker is never empty.
 *
 * @returns `models` to render, `defaultModelId` to preselect, and `loading`,
 * which is true only until the live list has been fetched — `models` is
 * already usable while it is true.
 */
export function useGeminiModels(): {
  models: GeminiModelOption[];
  defaultModelId: string;
  loading: boolean;
} {
  const [models, setModels] = useState<GeminiModelOption[]>(GEMINI_MODELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/gemini-models");
        const json = await res.json();
        const live = json?.data?.models;
        if (!cancelled && Array.isArray(live) && live.length > 0) setModels(live);
      } catch {
        // Network failure — keep the static fallback already in state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultModelId = models.find((model) => model.isDefault)?.id ?? models[0]?.id ?? GEMINI_MODELS[0].id;

  return { models, defaultModelId, loading };
}
