# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint — currently broken (see Known issues)
```

No test suite is configured.

## Environment

Requires a `.env.local` with:
- `MONGODB_URI` — connection string for MongoDB
- `GEMINI_API_KEY` — Gemini API key, required for analysis generation
- `USD_TO_MAD_RATE` — optional, MAD per USD for cost display (defaults to 9.4)
- `GEMINI_PREPAID_USD_BALANCE` — optional, starting prepaid credit in USD (defaults to 0)

## Architecture

**Psyche Log** is a personal clinical psychology pattern journal. The user logs psychological patterns (P1, P2, ... P16+) and gets AI-powered analysis, grounded in Schema Therapy (Young), with Gilbert's three-system model (threat/drive/soothing) as a secondary lens.

Analysis is a **live Gemini API call**: the app assembles the full prompt (fixed clinical system prompt + RAG context from `ryl`/`hp` + the pattern's data), sends it to Gemini in JSON mode, validates the response against the `PatternAnalysis` shape, and shows it for the user to review before saving to MongoDB. The user picks a model from a dropdown (`lib/geminiModels.ts`) before generating — if a cheaper/faster model's output isn't good enough, the escalation path is re-running against a more capable model, not falling back to manual copy/paste. There is no manual paste-into-chat-UI workflow for pattern analysis anymore (there still is one for creating a new pattern from a narrative description — see `create-from-description`/`create-from-paste` below, which is unrelated and unaffected).

Every Gemini call funnels through `callGeminiWithTracking` (`lib/gemini-cost-tracker.ts`), which records tokens/cost/tier to MongoDB (`usage_log`, `usage_totals`, `usage_quota` collections) and returns `costInfo` alongside the result so the UI can show what each call cost. Cost/free-tier accounting is an **estimate**, not real billing — see the header comment in that file. `lib/gemini.ts` is the raw Gemini REST wrapper; it must never be called directly outside the tracker.

The model list is **discovered live**, not hardcoded. `lib/getDynamicModel.ts` (server-only) calls Google's `/v1beta/models` with `GEMINI_API_KEY`, filters to the `gemini-*` text-generation family, excludes specialized variants (image/TTS/robotics/embedding/computer-use/etc.), classifies each into a tier (`flash-lite`/`flash`/`pro`) via `guessTier()`, and sorts newest-first within each tier. `GET /api/gemini-models` exposes this to the client (never the raw key); `lib/useGeminiModels.ts` is the client hook that fetches it, rendering the small static fallback list in `lib/geminiModels.ts` instantly and swapping in the live list once it loads (or staying on the fallback if discovery fails). `components/GeminiModelSelect.tsx` renders whichever list it's given as a tier-grouped `<select>`. `nextCapableModel(id, models)` returns the next tier up in a given list; both `AnalysisSection` and `NewPatternButton` call it on a failed generate to default the retry to a more capable model.

**Important caveat, discovered while building this (2026-08-16):** being listed by `/v1beta/models` does not mean a model is actually callable on this key — `gemini-2.5-flash` and `gemini-2.5-flash-lite` both appear in the discovery response but 404 on `generateContent` ("no longer available to new users"). Google's catalog and this key's per-model entitlements can disagree. Discovery is therefore *not* the thing that prevents 404s — `lib/gemini.ts`'s `generateJson` is: on a 404 it retries once against that model's tier rolling alias (`gemini-<tier>-latest`, which Google always resolves to something live) and returns whichever concrete snapshot actually served the request via `modelVersion`. So a stale/unentitled model in the dropdown degrades silently to a working one rather than erroring — verified live. If you add a model to the static fallback list in `lib/geminiModels.ts`, still verify it with a real call first, and add a matching row to `PRICING` in `lib/gemini-cost-tracker.ts` — a model missing from `PRICING` silently falls back to `UNKNOWN_MODEL_PRICING`.

### Theming
Light/dark is a global toggle (`components/ThemeToggle.tsx`, fixed top-right on every route via `app/layout.tsx`), backed by `next-themes` (`components/ThemeProvider.tsx`, `attribute="data-theme"`, `enableSystem`). Dark is the bare `:root` default in `app/globals.css`; light lives in `:root[data-theme="light"]`. Every component references Tailwind color tokens (`bg-ink-950`, `text-parchment-300`, `text-gold-400`, ...) that are CSS custom properties from `@theme` — retheming happens entirely in `globals.css` by overriding those properties, with zero changes needed to the ~290 utility-class usages across components. The token *names* are literal for dark mode (`ink` = dark surface, `parchment` = light text) and read backwards in light mode where the values invert — documented in a comment at the top of the theme block in `globals.css`, not worth a full rename for a personal app. One exception: the modal backdrop scrim in `NewPatternButton.tsx` intentionally uses `bg-black/70` instead of a themed token, since a dimming scrim should look the same in both modes. `.glass`/`.glass-subtle` panel colors are separate `--glass-*` custom properties (not derived from the `ink` scale) so they can be tuned per theme independently.

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript, React Compiler enabled (`next.config.ts`)
- **MongoDB** — stores patterns and reference data

### Data in MongoDB (`hope` database)
| Collection | Contents | Seeded by |
|---|---|---|
| `psy` | All patterns (P1–P16+) | app (create routes) |
| `fields` | Predefined dropdown options (`coreBeliefs`, `symptoms`, `cognitiveLabels`) — single doc `_id: "clinical_fields_v1"` | not in this repo |
| `ryl` | *Reinventing Your Life* schema therapy reference data, used as RAG context in `analyzePrompt.ts` | not in this repo |
| `hp` | Healing Path — schema therapy exercises (18-book library), used as RAG context in `analyzePrompt.ts` | `scripts/seed-healing.ts` |
| `usage_log`, `usage_totals`, `usage_quota` | Gemini call audit trail, running cost totals, and daily free-tier quota counters | app (`lib/gemini-cost-tracker.ts`) |

`mct` (Metacognitive Therapy reference data) is no longer queried anywhere in the app — the MCT RAG lookup was removed from `analyzePrompt.ts`. Treat any mention of MCT context as legacy.

### API Routes (`/app/api/patterns/`)
- `[id]/route.ts` — GET, PATCH, DELETE a single pattern
- `analyze/generate/route.ts` — POST `{ patternId, model? }`: assembles the analysis prompt (`lib/analyzePrompt.ts` — pulls RAG context from `ryl` and `hp`, keyword-scored top-N records, combined with a large fixed clinical system prompt that contains the user's real identity, history, and schema architecture — do not templatize or genericize this file), sends it to Gemini via `callGeminiWithTracking`, validates the response against `PatternAnalysis`, and returns `{ analysis, costInfo }`. Does not persist.
- `[id]/analysis/route.ts` — PUT: validates a `PatternAnalysis` JSON object against the type shape and saves it onto the pattern; called by the frontend after the user reviews and confirms the `analyze/generate` result
- `create-from-description/generate/route.ts` — POST `{ description, model? }`: same clinical system instruction and RAG pipeline as `analyze/generate`, but extracts a new pattern's fields AND analyzes it in one call (`createPatternWithAnalysisSchema`). Does not persist.
- `create-from-paste/route.ts` — POST: validates a pasted `{ pattern, analysis }` JSON object, auto-assigns the next pattern ID, and inserts the new pattern; called by `NewPatternButton` after the user reviews a `create-from-description/generate` draft
- `field-options/route.ts` — GET: returns autocomplete options from the `fields` collection. Only returns `coreBeliefs`, `symptoms`, `cognitiveLabels` — there is no `notes` field in this collection, so any UI that expects note suggestions will get an empty list.

### Output contract (`lib/patternAnalysisSchema.ts`)
The Gemini `responseSchema` is the **single source of truth** for the analysis output shape. Per-field instructions live there as schema `description`s — there is deliberately no prose JSON example in the user prompt, because Gemini enforces the shape natively and an example object would duplicate thousands of input tokens per call and drift from the schema. Open-ended arrays carry `maxItems` as an output-token budget (`bookMappings` 2, `healingPath` 5) — `healingPath` entries copy full RAG records verbatim and are the one field that can truncate a response. `analyzedAt`/`generatedBy` are NOT in the schema: the model invents timestamps, so both are stamped server-side in the route after the call returns. The schema constrains output; `lib/validatePatternAnalysis.ts` is still the gate before anything persists.

### Key Types (`/types/`)
- `Pattern` — core entity with `id` (P-prefixed string), `label`, `coreBelief`, `symptoms[]`, `cognitiveLabels[]`, optional `analysis`
- `PatternAnalysis` — structured analysis output: schema activated, response mode (Surrender/Escape/Counterattack/Regulation), layer status (behavioral/cognitive/schema), `healingPath` steps, book mappings, etc. Validated in `lib/validatePatternAnalysis.ts` before being saved.
- `getPatternColor(id)` — deterministic color assignment (amber/blue/red/green cycle) used by the home list and pattern detail page

### Frontend Components (`/components/`)
- `NewPatternButton` — modal: describe a narrative, pick a Gemini model, generate pattern+analysis live, review, save. No manual field-entry mode.
- `AnalysisSection` — lets the user pick a Gemini model (`lib/geminiModels.ts`) and generate an analysis live, shows the result plus `costInfo` for review, and saves it on confirm; renders the structured analysis once saved. `CostBadge` displays the per-call cost/tier
- `PatternActions` — edit/delete controls for an existing pattern (P12+ only; P1–P11 are read-only reference patterns)

### Pattern ID Convention
Reference patterns P1–P11 are pre-seeded and read-only in the UI. New patterns auto-increment from P12 onward. IDs are assigned server-side by querying the highest existing numeric suffix.

## Known issues

- `npm run lint` currently crashes (`eslint@10.1.0` is incompatible with the `eslint-plugin-react@7.37.5` pulled in by `eslint-config-next`) — not a code issue, a dependency version mismatch.
- `mct_database.json` and `ryl_database.json` (large one-off seed dumps, unreferenced by any code) were removed from the repo. They remain recoverable from git history if ever needed again. The `ryl` collection itself is still read at runtime as RAG context in `analyze/route.ts`; it just isn't seeded from a script in this repo.
