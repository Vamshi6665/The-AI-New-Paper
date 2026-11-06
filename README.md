<div align="center">

# The Daily Edition

### Your life. Your headlines. Your tomorrow.

**Describe your day in plain words. Get a personalized newspaper of your own schedule — agenda, appointments, reminders — set in editorial type and ready to print.**

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md)

</div>

---

The Daily Edition is a **chatbot** that turns your day into a printable newspaper. You tell it, in plain words, what's happening — "tomorrow gym at 7, a project meeting at 10, a doctor at 3, call Sarah for her birthday tonight, buy groceries" — and it replies with a finished front page: an invented masthead for the day, a morning quote themed to your plans, a "Your Say" lead story, and every item laid out in editorial sections. Print it or export a PDF.

Every day is different because you just talk to it — it's not a form or a checklist maker. Events are the **system of record**; the newspaper is a rendering of them, with a verified **zero-missing-event guarantee** so nothing is ever silently dropped.

## What's new

- **Voice input** — tap the mic and talk. Spoken forms ("seven a.m.", "half past six") are normalised before extraction. Works in Chrome, Edge and Safari (Web Speech API); typing always works.
- **One-page paper** — a single magazine-style sheet that auto-fits (type scales up on a light day, tightens on a packed one). The *same markup* drives the screen preview, the browser print dialog and the server PDF, so what you read is what prints.
- **Detailed plans, not just a list** — each item gets a brief: workout with sets/reps and estimated burn, calorie and hydration plan (or your own target, e.g. "2200 calorie"), leave-by and check-in times for appointments, bring-lists, birthday prep, grocery checklist, wake time and lights-out, a 24-hour day bar, "three wins" and notes space.
- **Nano theme** — graphite and silver, hairline borders, one cool-steel accent.
- **Print fixed** — the old print stylesheet could hide the whole paper (blank PDF). Printing now goes through a dedicated page-size sheet with forced print colours, and is covered by tests.

## How it reads (matches a real morning paper)

1. **Masthead** — a title invented for the day (e.g. "The Morning Dispatch").
2. **Quote** — a short, real quote chosen to echo the day's mood (a health-heavy day → a health quote).
3. **Your Say** — a front-page lead headline and short story summarizing the day.
4. **The sections** — glance, chronological agenda, health, celebrations, appointments, work, to-do, reminders, editor's note.

## What works today (end to end)

- **Chat interface** → type your day in one message; the paper renders inline in the reply. `/api/chat`.
- **Natural-language extraction** → AI (or deterministic fallback) splits a sentence into distinct, categorized events with timezone-aware dates and a planner time heuristic.
- **Editorial enrichment** → an invented masthead per day, a quote themed to the day's mood, a lead headline and front story. AI when configured, deterministic otherwise.
- **Newspaper composition** → masthead, quote, "Your Say" lead, and editorial sections (glance, agenda, health, celebrations, appointments, work, to-do, reminders, editor's note).
- **Zero-missing-event guarantee** → source event IDs are diffed against represented IDs; gaps are flagged, never hidden.
- **Print & PDF** → browser print + server-side Chromium PDF (Letter/A4) of the exact edition shown.
- **Runs with zero configuration** → no API key, no database required to demo. Add `ANTHROPIC_API_KEY` for richer extraction and editorial copy.

> There is also a structured **form flow** (`/api/events/*`, `/api/editions/*`) and a Prisma schema for the persistent, multi-day version — the chat is the fast path; those are the Phase-2 foundation.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript (strict) |
| AI | Anthropic (structured extraction) — deterministic fallback when absent |
| Database | Prisma schema over Postgres (in-memory store for zero-config demo) |
| PDF | Playwright / Chromium, server-side |
| Validation | Zod (user input and untrusted AI output) |
| Tests | Vitest |

## Quick start

```bash
npm install
npx playwright install chromium   # for the PDF route
npm run dev                        # http://localhost:3000
```

No `.env` needed — the app runs in zero-config mode (rule-based extraction, in-memory events). To enable richer LLM extraction:

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY
```

## The acceptance test (spec §21)

Enter:

> "Tomorrow I want to wake up at 6 AM, do a 45-minute upper-body workout at 7 AM, attend a project meeting at 10 AM, go to the doctor at 3 PM, call Sarah for her birthday at 8 PM, buy groceries, and finish my presentation before my meeting."

The app extracts all distinct events, keeps every explicit time, leaves groceries unscheduled, links the presentation to the meeting, associates Sarah with the birthday call, flags genuinely ambiguous times for confirmation, composes a titled newspaper with every event represented, and prints a complete multi-section edition. ✓ verified.

## Project layout

```
src/
  app/
    page.tsx                 landing + planner/review/studio flow
    api/
      events/parse/          NL → extracted events
      events/                CRUD (+ idempotent save)
      events/[id]/           get / patch / delete
      editions/generate/     compose + zero-missing check
      editions/pdf/          server-side Chromium PDF
  components/
    Studio.tsx               plan → review → newspaper (client)
    NewspaperView.tsx        on-screen edition (same model as PDF)
  features/
    ai/                      extract (LLM) + rule-extract (fallback)
    editions/                compose + render-html (PDF)
  lib/datetime/              deterministic date/time resolution
  server/repositories/       event store (memory / Prisma-ready)
  types/                     event + edition contracts (Zod)
prisma/schema.prisma         production data model
tests/unit/                  resolve · extract · compose (zero-missing)
```

## Testing

```bash
npm run typecheck   # strict TS, 0 errors
npm run test        # 23 tests — date parsing, extraction, zero-missing guarantee
npm run build
```

## Roadmap

- **Phase 2:** wire the Prisma store (schema is ready); editions archive + settings pages.
- **Phase 3:** recurrence expansion, auth, saved-edition snapshots, e2e + print-regression tests.

## License

MIT © 2026 Vamshi
