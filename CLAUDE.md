# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev         # Start development server (Next.js)
pnpm build       # Production build
pnpm start       # Start production server
pnpm lint        # Run ESLint — currently broken (see Known issues)
```

The repo uses **pnpm** (`pnpm-lock.yaml`, no `package-lock.json`). The scripts
themselves are plain `next` commands, so `npm run …` also works.

No test suite is configured.

## Environment

Requires a `.env.local` with:
- `MONGODB_URI` — connection string for MongoDB. **Required** — `lib/db/mongo.ts` throws on import without it.
- `MONGODB_DB` — database name. **Required**, same throw. There is no default.
- `GEMINI_API_KEY` — Gemini API key. Not checked at import; `generateJson` returns a 503 result if it is missing, and model discovery falls back to the static list.
- `USD_TO_MAD_RATE` — optional, MAD per USD for cost display (defaults to 9.4)
- `GEMINI_PREPAID_USD_BALANCE` — optional, starting prepaid credit in USD (defaults to 0)

## Architecture

**Psyche Log** is a personal clinical psychology pattern journal. The user logs psychological patterns (P1, P2, ... P16+) and gets AI-powered analysis, grounded in Schema Therapy (Young), with Gilbert's three-system model (threat/drive/soothing) as a secondary lens.

Analysis is a **live Gemini API call**: the app assembles the full prompt (fixed clinical system prompt + RAG context from `ryl`/`hp` + the pattern's data), sends it to Gemini in JSON mode, validates the response against the `PatternAnalysis` shape, and shows it for the user to review before saving to MongoDB. The user picks a model from a dropdown (`lib/ai/geminiModels.ts`) before generating — if a cheaper/faster model's output isn't good enough, the escalation path is re-running against a more capable model, not falling back to manual copy/paste. There is no manual paste-into-chat-UI workflow left anywhere in the app: creating a pattern from a narrative description is also a live call (`create-from-description/generate`), and `create-from-paste` — despite its name — is now just the save step for the draft that route returned.

Every Gemini call funnels through `callGeminiWithTracking` (`lib/ai/geminiCostTracker.ts`), which records tokens/cost/tier to MongoDB (`usage_log`, `usage_totals`, `usage_quota` collections) and returns `costInfo` alongside the result so the UI can show what each call cost. Cost/free-tier accounting is an **estimate**, not real billing — see the header comment in that file. `lib/ai/gemini.ts` is the raw Gemini REST wrapper; it must never be called directly outside the tracker.

The model list is **discovered live**, not hardcoded. `lib/ai/geminiModelDiscovery.ts` (server-only) calls Google's `/v1beta/models` with `GEMINI_API_KEY`, filters to the `gemini-*` text-generation family, excludes specialized variants (image/TTS/robotics/embedding/computer-use/etc.), classifies each into a tier (`flash-lite`/`flash`/`pro`) via `guessTier()`, and sorts newest-first within each tier. `GET /api/gemini-models` exposes this to the client (never the raw key); `lib/hooks/useGeminiModels.ts` is the client hook that fetches it, rendering the small static fallback list in `lib/ai/geminiModels.ts` instantly and swapping in the live list once it loads (or staying on the fallback if discovery fails). `components/ui/GeminiModelSelect.tsx` renders whichever list it's given as a tier-grouped `<select>`. `nextCapableModel(id, models)` returns the next tier up in a given list; `GenerateAnalysisFlow` and `NewPatternButton` call it on a failed generate to default the retry to a more capable model.

**Important caveat, discovered while building this (2026-08-16):** being listed by `/v1beta/models` does not mean a model is actually callable on this key — `gemini-2.5-flash` and `gemini-2.5-flash-lite` both appear in the discovery response but 404 on `generateContent` ("no longer available to new users"). Google's catalog and this key's per-model entitlements can disagree. Discovery is therefore *not* the thing that prevents 404s — `lib/ai/gemini.ts`'s `generateJson` is: on a 404 it retries once against that model's tier rolling alias (`gemini-<tier>-latest`, which Google always resolves to something live) and returns whichever concrete snapshot actually served the request via `modelVersion`. So a stale/unentitled model in the dropdown degrades silently to a working one rather than erroring — verified live. If you add a model to the static fallback list in `lib/ai/geminiModels.ts`, still verify it with a real call first, and add a matching row to `PRICING` in `lib/ai/geminiCostTracker.ts` — a model missing from `PRICING` silently falls back to `UNKNOWN_MODEL_PRICING`.

### Theming
Light/dark is a global toggle (`components/ui/ThemeToggle.tsx`, fixed top-right on every route via `app/layout.tsx`), backed by `next-themes` (`components/ui/ThemeProvider.tsx`, `attribute="data-theme"`, `enableSystem`). Dark is the bare `:root` default in `app/globals.css`; light lives in `:root[data-theme="light"]`. Every component references Tailwind color tokens (`bg-ink-950`, `text-parchment-300`, `text-gold-400`, ...) that are CSS custom properties from `@theme` — retheming happens entirely in `globals.css` by overriding those properties, with zero changes needed to the 268 token utility-class usages across components (counted 2026-08-17). The token *names* are literal for dark mode (`ink` = dark surface, `parchment` = light text) and read backwards in light mode where the values invert — documented in a comment at the top of the theme block in `globals.css`, not worth a full rename for a personal app. One exception: the modal backdrop scrim in `components/patterns/NewPatternButton.tsx` intentionally uses `bg-black/70` instead of a themed token, since a dimming scrim should look the same in both modes. `.glass`/`.glass-subtle` panel colors are separate `--glass-*` custom properties (not derived from the `ink` scale) so they can be tuned per theme independently.

### Repository layout
```
app/                    Routes and pages ONLY — no business logic
  api/…/route.ts        HTTP handlers: parse request → call a lib helper → shape response
  page.tsx, layout.tsx  Server Components; read the DB through lib/db helpers
components/
  ui/                   Generic presentational primitives — CostBadge, GeminiModelSelect,
                        TagInput, SuggestInput, ThemeProvider, ThemeToggle
  patterns/             Feature components — PatternCard, PatternActions, NewPatternButton,
                        AnalysisSection (63 lines: picks one of the three views below)
    analysis/           AnalysisReport (renders a saved analysis), GenerateAnalysisFlow
                        (pick model → generate → review → save), HealingStepCard, shared.tsx
lib/
  db/                   mongo.ts (connection) + patterns.ts / fields.ts (every query lives here)
  ai/                   gemini.ts, geminiCostTracker.ts, geminiModels.ts, geminiModelDiscovery.ts,
                        analyzePrompt.ts, patternAnalysisSchema.ts, clinicalProfile.ts
    prompts/            clinicalSystemInstruction.ts — the clinical system instruction and
                        nothing else, so the prompt can be read straight through as prose
  utils/                validatePatternAnalysis.ts, patternColors.ts, patternTiers.ts
  hooks/                useGeminiModels.ts (client-side)
types/                  pattern.ts (Pattern, HealingStep, PatternAnalysis),
                        api.ts (CostInfo), index.ts (barrel re-exporting both)
```
No route handler or page writes a MongoDB query inline — they call `lib/db/patterns.ts`, which owns the two details that used to be duplicated: looking a pattern up by either `_id` or `"P14"` (`buildIdFilter`), and assigning the next id (`nextPatternId`). `patternNumber()` there is the one place that parses the numeric suffix out of a pattern id; `isEditablePattern()` in `lib/utils/patternTiers.ts` is the one place that encodes the P1–P11 read-only rule. Utility modules use named exports only (`mongoClientPromise`, not a default) so auto-import and grep both work.

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript, React Compiler enabled (`next.config.ts`)
- **MongoDB** — stores patterns and reference data

### Data in MongoDB (`hope` database)
| Collection | Contents | Seeded by |
|---|---|---|
| `psy` | All patterns. P1–P11 seeded by hand, P12+ inserted by `create-from-paste` | partly seeded, not from this repo |
| `fields` | Predefined dropdown options (`coreBeliefs`, `symptoms`, `cognitiveLabels`) — single doc `_id: "clinical_fields_v1"` | not in this repo |
| `ryl` | *Reinventing Your Life* schema therapy reference data, used as RAG context in `lib/ai/analyzePrompt.ts` | not in this repo |
| `hp` | Healing Path — schema therapy exercises (18-book library), used as RAG context in `lib/ai/analyzePrompt.ts` | `scripts/seed-healing.ts` |
| `usage_log`, `usage_totals`, `usage_quota` | Gemini call audit trail, running cost totals, and daily free-tier quota counters | app (`lib/ai/geminiCostTracker.ts`) |

`mct` (Metacognitive Therapy reference data) is no longer queried anywhere in the app — the MCT RAG lookup was removed from `lib/ai/analyzePrompt.ts`. Treat any mention of MCT context as legacy.

### API Routes (`/app/api/patterns/`)
- `[id]/route.ts` — GET, PATCH, DELETE a single pattern. `[id]` accepts either a MongoDB `_id` or a `"P14"`-style id; PATCH copies across only the six editable fields present in the body, ignoring anything else.
- `analyze/generate/route.ts` — POST `{ patternId, model? }`: assembles the analysis prompt (`lib/ai/analyzePrompt.ts` — pulls RAG context from `ryl` and `hp`, keyword-scored top-N records, combined with a large fixed clinical system prompt that contains the user's real identity, history, and schema architecture — do not templatize or genericize this file), sends it to Gemini via `callGeminiWithTracking`, validates the response against `PatternAnalysis`, and returns `{ data: { analysis, costInfo } }`. Does not persist. On a validation failure it answers 502 with `{ error, costInfo }` — the call was billed either way, so the cost is still reported. `maxOutputTokens` is 8192 and `temperature` 0.2.
- `[id]/analysis/route.ts` — PUT `{ analysis }`: validates against the `PatternAnalysis` shape and saves it onto the pattern; called by `GenerateAnalysisFlow` after the user reviews and confirms an `analyze/generate` result. 404s if the pattern is gone.
- `create-from-description/generate/route.ts` — POST `{ description, model? }`: same clinical system instruction and RAG pipeline as `analyze/generate`, but extracts a new pattern's fields AND analyzes it in one call (`createPatternWithAnalysisSchema`), validating each half separately so a failure says which one was malformed. Returns `{ data: { pattern, analysis, costInfo } }`. Does not persist.
- `create-from-paste/route.ts` — POST `{ pattern, analysis }`: validates both halves, assigns the next id via `nextPatternId()`, and inserts. Returns `{ data: Pattern }` with status 201. The name is historical — it no longer receives anything hand-pasted, only the draft `NewPatternButton` just reviewed.
- `field-options/route.ts` — GET: returns autocomplete options from the `fields` collection. Only returns `coreBeliefs`, `symptoms`, `cognitiveLabels` — there is no `notes` field in this collection, so any UI that expects note suggestions will get an empty list.

### Output contract (`lib/ai/patternAnalysisSchema.ts`)
The Gemini `responseSchema` is the **single source of truth** for the analysis output shape. Per-field instructions live there as schema `description`s — there is deliberately no prose JSON example in the user prompt, because Gemini enforces the shape natively and an example object would duplicate thousands of input tokens per call and drift from the schema. Every array carries `maxItems` as an output-token budget: `bookMappings` 2, `healingPath` 5, `relatedPatterns` 5, `schemaActivated`/`modesActive`/`systemsInvolved` 3, and on the extraction half `symptoms` 4, `cognitiveLabels` 3. `healingPath` is the one that matters most — its entries copy full RAG records verbatim, so it is the field that can truncate a response. `analyzedAt`/`generatedBy` are NOT in the schema: the model invents timestamps, so both are stamped server-side in the route after the call returns. The schema constrains output; `lib/utils/validatePatternAnalysis.ts` is still the gate before anything persists.

### The RAG pipeline (`lib/ai/analyzePrompt.ts`)
Both generate routes run the identical retrieval, in this order:

1. **Keywords** — `extractKeywordsFromPattern()` pools the pattern's symptoms, cognitive labels, core belief, label, note and (on older documents) `situationDescription`; `extractKeywordsFromText()` does the same for a raw description. Either way the text is lowercased, split on `\W+`, and words of 4 characters or fewer are dropped (`MIN_KEYWORD_LENGTH`). The result is unioned with `PROFILE_KEYWORDS` — 30 fixed clinical terms — so retrieval still works when the user's wording shares no vocabulary with the reference material.
2. **Score** — both collections are read whole (they are small; there is no text index) and each record scores +1 per keyword found anywhere in its searchable fields, plus `PRIORITY_TYPE_BONUS` (2) if its `concept_type` is in that collection's priority set. Records scoring 0 are dropped, not padded in.
3. **Take** — the top `RECORDS_PER_COLLECTION` (8) from each of `ryl` and `hp`.
4. **Format** — long fields are truncated to a fixed character budget (`SCHEMA_RECORD_LIMITS`: description 350, mechanism 250, intervention 250; `PRACTICE_RECORD_LIMITS`: description 350, mechanism 300, how 400). Eight records per collection ride along on every call, so this is a real cost lever.

The two prompt builders then append these blocks to the case data and nothing else — the output contract is carried entirely by the response schema.

### Key Types (`/types/`)
- `Pattern` (`types/pattern.ts`) — `id` (P-prefixed string, distinct from Mongo's `_id`), `type: "pattern"`, `label`, `short`, `coreBelief`, `symptoms[]`, `cognitiveLabels[]`, optional `note`, `createdAt`/`updatedAt`, optional `analysis`
- `PatternAnalysis` — structured analysis output: schema activated, response mode (Surrender/Escape/Counterattack/Regulation), layer status (behavioral/cognitive/schema), `healingPath` steps, book mappings, etc. Validated in `lib/utils/validatePatternAnalysis.ts` before being saved.
- `getPatternColorClasses(id)` (`lib/utils/patternColors.ts`) — deterministic colour per pattern (amber/blue/red/green cycle), returning the Tailwind classes for every place a pattern is rendered. Both pages share it; neither keeps its own colour map.

### Frontend Components (`/components/`)
- `PatternCard` — one pattern in the home list (id chip, title, core belief, labels)
- `NewPatternButton` — modal: describe a narrative, pick a Gemini model, generate pattern+analysis live, review, save. No manual field-entry mode.
- `AnalysisSection` — decides which of three views to show and owns the saved analysis in state; the work lives in `components/patterns/analysis/`: `GenerateAnalysisFlow` (pick model → generate → review → save, showing `costInfo` before the user commits) and `AnalysisReport` (renders a saved analysis; every list field is `Array.isArray`-guarded because older saved analyses can be missing fields that are required today)
- `CostBadge` displays the per-call cost/tier; `TagInput`/`SuggestInput` are the autocomplete fields the edit form uses
- `PatternActions` — edit/delete controls for an existing pattern (P12+ only; P1–P11 are read-only reference patterns)

### Pattern ID Convention
Reference patterns P1–P11 are pre-seeded and read-only in the UI. New patterns auto-increment from P12 onward. IDs are assigned server-side by querying the highest existing numeric suffix.

## Known issues

- `npm run lint` currently crashes (`eslint@10.1.0` is incompatible with the `eslint-plugin-react@7.37.5` pulled in by `eslint-config-next`) — not a code issue, a dependency version mismatch.
- `mct_database.json` and `ryl_database.json` (large one-off seed dumps, unreferenced by any code) were removed from the repo. They remain recoverable from git history if ever needed again. The `ryl` collection itself is still read at runtime as RAG context by `gatherRagContext()` in `lib/ai/analyzePrompt.ts`; it just isn't seeded from a script in this repo.
