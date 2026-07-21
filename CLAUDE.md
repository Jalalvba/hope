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

No AI API key is needed — analysis is run manually (see below).

## Architecture

**Psyche Log** is a personal clinical psychology pattern journal. The user logs psychological patterns (P1, P2, ... P16+) and gets AI-powered analysis, grounded in Schema Therapy (Young), with Gilbert's three-system model (threat/drive/soothing) as a secondary lens.

Analysis is a **manual copy/paste workflow**, not an API integration: the app assembles the full prompt (fixed clinical system prompt + RAG context from `ryl`/`hp` + the pattern's data) and displays/copies it as plain text. The user pastes that prompt into Claude or Gemini's own chat UI, runs it there, and pastes the JSON response back into the app. The app validates the pasted JSON against the `PatternAnalysis` shape before saving it to MongoDB. No Anthropic/Gemini API key is called from this codebase.

### Stack
- **Next.js 16** (App Router) + React 19 + TypeScript, React Compiler enabled (`next.config.ts`)
- **MongoDB** — stores patterns and reference data

### Data in MongoDB (`hope` database)
| Collection | Contents | Seeded by |
|---|---|---|
| `psy` | All patterns (P1–P16+) | app (create routes) |
| `fields` | Predefined dropdown options (`coreBeliefs`, `symptoms`, `cognitiveLabels`) — single doc `_id: "clinical_fields_v1"` | not in this repo |
| `ryl` | *Reinventing Your Life* schema therapy reference data, used as RAG context in `analyze` | not in this repo |
| `hp` | Healing Path — schema therapy exercises (18-book library), used as RAG context in `analyze` | `scripts/seed-healing.ts` |

`mct` (Metacognitive Therapy reference data) is no longer queried anywhere in the app — the MCT RAG lookup was removed from `analyze/route.ts`. Treat any mention of MCT context as legacy.

### API Routes (`/app/api/patterns/`)
- `route.ts` — GET all patterns, POST create new pattern (auto-increments ID: P12, P13...)
- `[id]/route.ts` — GET, PATCH, DELETE a single pattern
- `analyze/route.ts` — POST: assembles and returns the analysis prompt text for an existing pattern (no AI call); pulls RAG context from `ryl` and `hp` (keyword-scored top-N records) and combines it with a large fixed clinical system prompt (contains the user's real identity, history, and schema architecture — do not templatize or genericize this file)
- `[id]/analysis/route.ts` — PUT: validates a pasted `PatternAnalysis` JSON object against the type shape and saves it onto the pattern; used after the user runs the `analyze` prompt manually in Claude/Gemini's chat UI
- `create-from-description/route.ts` — POST: takes a narrative description and returns an extract+analyze prompt (no RAG context, no AI call)
- `create-from-paste/route.ts` — POST: validates a pasted `{ pattern, analysis }` JSON object, auto-assigns the next pattern ID, and inserts the new pattern; used after the user runs the `create-from-description` prompt manually
- `field-options/route.ts` — GET: returns autocomplete options from the `fields` collection. Only returns `coreBeliefs`, `symptoms`, `cognitiveLabels` — there is no `notes` field in this collection, so any UI that expects note suggestions will get an empty list.

### Key Types (`/types/`)
- `Pattern` — core entity with `id` (P-prefixed string), `label`, `coreBelief`, `symptoms[]`, `cognitiveLabels[]`, optional `analysis`
- `PatternAnalysis` — structured analysis output: schema activated, response mode (Surrender/Escape/Counterattack/Regulation), layer status (behavioral/cognitive/schema), `healingPath` steps, book mappings, etc. Validated in `lib/validatePatternAnalysis.ts` before being saved.
- `getPatternColor(id)` — deterministic color assignment (amber/blue/red/green cycle) used by the home list and pattern detail page

### Frontend Components (`/components/`)
- `NewPatternButton` — modal with two creation modes: **Describe** (narrative → generates a prompt → paste JSON back → saves) or **Manual** (fill fields with autocomplete, no AI involved)
- `AnalysisSection` — generates the analysis prompt, lets the user copy it and paste the JSON response back, validates it, then renders the structured analysis
- `PatternActions` — edit/delete controls for an existing pattern (P12+ only; P1–P11 are read-only reference patterns)

### Pattern ID Convention
Reference patterns P1–P11 are pre-seeded and read-only in the UI. New patterns auto-increment from P12 onward. IDs are assigned server-side by querying the highest existing numeric suffix.

## Known issues

- `npm run lint` currently crashes (`eslint@10.1.0` is incompatible with the `eslint-plugin-react@7.37.5` pulled in by `eslint-config-next`) — not a code issue, a dependency version mismatch.
- `mct_database.json` and `ryl_database.json` (large one-off seed dumps, unreferenced by any code) were removed from the repo. They remain recoverable from git history if ever needed again. The `ryl` collection itself is still read at runtime as RAG context in `analyze/route.ts`; it just isn't seeded from a script in this repo.
