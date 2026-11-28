# Neuhom AI Lighting Designer

Design, visualise and plan the lighting for a space. This folder is separate
from the Neuhom marketing website in the repository root, which is not
affected by anything here.

## What works today
- **Projects dashboard** — create, reopen and delete projects.
- **Guided steps** — project basics → photos & floor plans → space details
  (with "I don't know" for any dimension) → needs → analysis → design.
- **AI photo & floor-plan reading** (`/api/analyse`, Claude) — suggests ceiling, finishes,
  features and lighting ideas; reads sizes written on plans; the user accepts each suggestion.
  Works only when `ANTHROPIC_API_KEY` is set on the server; otherwise manual entry.
- **Design studio** — a scaled reflected-ceiling plan with ambient, task,
  accent and decorative layers; drag, add, remove, duplicate and edit fittings;
  layer toggles; light pools; five design concepts; undo; saved versions.
- **Live recalculation** — light level, fittings, connected load, energy and
  running cost update on every edit, with all assumptions listed.
- **Autosave** — projects and photos are stored in the browser (IndexedDB).

Coming next: product catalogue and matching, Bill of Quantities and PDF export,
real AI photo analysis and concept visualisation, accounts and cloud storage.

## Running it
Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 107 unit tests
npm run typecheck
npm run build && npm start
```

## Architecture
```
src/
  app/                     Next.js routes (/projects, /projects/[id])
  components/
    ui/                    design-system primitives (tokens in app/globals.css)
    workspace/steps/       guided steps 1–5
    workspace/studio/      design studio: plan canvas, inspector, schedule, summary
  lib/
    lighting/              calculation engine — deterministic, AI-free (docs/lighting-engine.md)
    design/                analysis schema, preferences, design generation, evaluation
    project/               project model, repository (persistence), workspace store
```

Key boundaries:
- **Engineering vs AI.** All quantities, light levels and energy figures come
  from `lib/lighting`. The analysis schema (`lib/design/analysis.ts`) is the
  contract a future AI vision service must satisfy; it cannot supply numbers
  used in calculations.
- **Persistence.** Screens only talk to `ProjectRepository`
  (`lib/project/repository.ts`). The browser implementation can be swapped for
  PostgreSQL + S3-compatible storage without changing the UI.
- **Fittings.** Designs use clearly labelled *generic reference fittings*
  (`lib/design/reference.ts`) until real products are selected.

## Environment
No environment variables are needed yet. See `.env.example` for the services
that will be connected later.
