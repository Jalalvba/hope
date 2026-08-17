# Psyche Log

A personal clinical psychology pattern journal. You log psychological patterns
(P1, P2, …) and get an AI-written analysis of each one, grounded in Schema
Therapy (Young) with Gilbert's three-system model (threat/drive/soothing) as a
secondary lens.

Built with Next.js (App Router), React, TypeScript, and MongoDB.

## Getting started

Create a `.env.local` file in the project root:

```bash
MONGODB_URI=...      # connection string for your MongoDB
MONGODB_DB=hope      # database name
GEMINI_API_KEY=...   # required to generate analyses
```

Then:

```bash
pnpm install     # this repo uses pnpm — there is a pnpm-lock.yaml, no package-lock.json
pnpm dev         # http://localhost:3000
pnpm build       # production build
pnpm start       # run the production build
```

`pnpm lint` currently crashes on a dependency version mismatch — see the Known
issues section of [CLAUDE.md](./CLAUDE.md). It is not a problem with the code.

## How it works

There are two AI-backed actions, and both work the same way — **generate,
review, then save**. Nothing is written to the database until you have read the
result and confirmed it, because every generation costs money.

**Analyzing an existing pattern** (`AnalysisSection`)

1. You pick a Gemini model and hit generate.
2. `POST /api/patterns/analyze/generate` builds the prompt: it loads the
   pattern, pulls the most relevant reference records out of MongoDB (the RAG
   step), and pairs them with a fixed clinical system instruction.
3. Gemini answers in JSON, constrained by a response schema.
4. The answer is checked field by field by `validatePatternAnalysis()`, and
   returned to you along with what the call cost — but not saved.
5. If you confirm, `PUT /api/patterns/[id]/analysis` saves it.

**Creating a pattern from a description** (`NewPatternButton`) is the same
shape: `POST /api/patterns/create-from-description/generate` extracts a new
pattern from what you wrote *and* analyzes it in one call, then
`POST /api/patterns/create-from-paste` saves the draft you approved.

## Where things live

```
app/          pages and API routes — no business logic lives here
components/   ui/ = generic pieces · patterns/ = this app's screens
lib/          db/ = every MongoDB query · ai/ = everything Gemini
              utils/ = helpers · hooks/ = client-side React hooks
types/        shared TypeScript types
```

Two rules keep it navigable: route handlers and pages never write a database
query inline (they call a helper in `lib/db/`), and every Gemini call goes
through `callGeminiWithTracking` in `lib/ai/geminiCostTracker.ts`, so no action
can spend money without recording what it cost.

Patterns P1–P11 were seeded by hand and are read-only. Anything from P12 up was
created through the app and can be edited, re-analyzed, or deleted.

See [CLAUDE.md](./CLAUDE.md) for the full architecture, data model, and the
reasoning behind the less obvious decisions.
