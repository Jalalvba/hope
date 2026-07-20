# Psyche Log

A personal clinical psychology pattern journal. Log psychological patterns (P1, P2, ...) and get AI-powered analysis, grounded in Schema Therapy (Young) with Gilbert's three-system model (threat/drive/soothing) as a secondary lens.

Analysis is a manual copy/paste workflow: the prompt is generated in-app, the analysis is run manually in Claude or Gemini's chat UI, and the JSON result is pasted back into the app to be validated and saved.

Built with Next.js (App Router), React, TypeScript, and MongoDB.

See [CLAUDE.md](./CLAUDE.md) for full architecture, data model, and API details.

## Getting started

Requires a `.env.local` with `MONGODB_URI`.

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
```

Open [http://localhost:3000](http://localhost:3000).
