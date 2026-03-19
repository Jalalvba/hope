# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment

Requires a `.env.local` with:
- `MONGODB_URI` — connection string for MongoDB
- `ANTHROPIC_API_KEY` — Claude API key

## Architecture

**Psyche Log** is a personal clinical psychology pattern journal. Users log psychological patterns (P1, P2, ... P16+) and get AI-powered analysis using Claude, grounded in Schema Therapy, Metacognitive Therapy (MCT), and Compassion-Focused Therapy (CFT) frameworks.

### Stack
- **Next.js** (App Router) + React 19 + TypeScript
- **MongoDB** — stores patterns, field options, and reference data from therapy books
- **Anthropic SDK** — Claude AI for pattern analysis and extraction

### Data in MongoDB (`hope` database)
| Collection | Contents |
|---|---|
| `psy` | All patterns (P1–P16+) |
| `fields` | Predefined dropdown options (coreBeliefs, symptoms, cognitiveLabels) |
| `ryl` | *Reinventing Your Life* schema therapy reference data |
| `mct` | Metacognitive Therapy reference data |

### API Routes (`/app/api/patterns/`)
- `route.ts` — GET all patterns, POST create new pattern (auto-increments ID: P12, P13...)
- `[id]/route.ts` — GET, PATCH, DELETE a single pattern
- `analyze/route.ts` — POST: triggers Claude analysis on an existing pattern; queries `ryl` and `mct` for context, passes a 300+ line clinical system prompt
- `create-from-description/route.ts` — POST: takes a narrative description, has Claude extract pattern fields AND produce analysis in one call
- `field-options/route.ts` — GET: returns autocomplete options from the `fields` collection

### Key Types (`/types/`)
- `Pattern` — core entity with `id` (P-prefixed string), `label`, `coreBelief`, `symptoms[]`, `cognitiveLabels[]`, optional `analysis`
- `PatternAnalysis` — AI-generated output: schema activated, response mode (Surrender/Escape/Counterattack/Regulation), layer status (behavioral/cognitive/schema), practice recommendations, book mappings, etc.

### Frontend Components (`/components/`)
- `NewPatternButton` — modal with two creation modes: **Describe** (narrative → Claude extracts + analyzes) or **Manual** (fill fields with autocomplete)
- `AnalysisSection` — renders Claude's structured analysis; has a "Run Analysis" button for on-demand re-analysis with model selector (Sonnet/Opus)
- `PatternActions` — edit/delete controls for an existing pattern

### Pattern ID Convention
Reference patterns P1–P11 are pre-seeded. New patterns auto-increment from P12 onward. IDs are assigned server-side by querying the highest existing numeric suffix.
