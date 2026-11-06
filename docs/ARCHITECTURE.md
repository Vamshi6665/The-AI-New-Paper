# Architecture

## The core idea: events are the system of record

The spec's most important rule (§11, §12): the **structured events** are the
source of truth. The AI turns descriptions into editorial copy; it never decides
which events exist or get included. The newspaper is a *rendering*, and before
export the system proves every eligible event is represented.

```
Natural language
   │  POST /api/events/parse
   ▼
┌─────────────────────────────────────────────┐
│  EXTRACTION (features/ai/extract.ts)         │
│  Anthropic structured output, OR a           │
│  deterministic rule extractor (zero-config). │
│  Then a deterministic sanitize pass:         │
│  dates re-resolved, times normalized,        │
│  "evening" kept as part-of-day (never a      │
│  fabricated clock time).                     │
└───────────────┬─────────────────────────────┘
                │  user confirms / edits (review screen)
                ▼
┌─────────────────────────────────────────────┐
│  EVENT STORE (repositories/event-store.ts)   │
│  in-memory now · Prisma/Postgres-ready.      │
│  Idempotent create (dedupe on dupe submit).  │
│  THIS is the system of record.               │
└───────────────┬─────────────────────────────┘
                │  POST /api/editions/generate
                ▼
┌─────────────────────────────────────────────┐
│  COMPOSE (features/editions/compose.ts)      │
│  group → sections, build agenda, glance,     │
│  factual headline. Then DIFF:                │
│  sourceEventIds − representedEventIds         │
│  = missingEventIds (must be empty to pass).  │
└───────────────┬─────────────────────────────┘
                ▼
     NewspaperView (screen)   render-html → Chromium PDF
         same canonical Edition document model
```

## Deterministic layer around the model (spec §7)

The model is wrapped, not trusted. `lib/datetime/resolve.ts` owns all date and
time logic:

- `resolveRelativeDate` — "tomorrow", "next Monday", bare weekday, ISO, against the user's reference date.
- `normalizeTime` — "7 AM" → "07:00"; "evening" → null (stays part-of-day).
- The sanitize pass in `extract.ts` re-resolves dates and demotes any non-clock "time" to part-of-day or none.

This is why the app never fabricates an exact time, location, or date — the spec's central safety requirement.

## Zero-config by design

`lib/env.ts` exposes `features.hasAnthropic` / `hasDatabase`. Each subsystem
degrades:

- No `ANTHROPIC_API_KEY` → `ruleExtract` (a real clause-splitting, keyword-categorizing parser).
- No `DATABASE_URL` → in-memory event store.

So the product runs, extracts, composes, prints, and demos with nothing
configured — and upgrades cleanly when keys are added.

## The zero-missing-event guarantee (spec §12)

`composeEdition` tags every section with the event IDs it covers. Only the
*covering* sections (agenda + the five specialized sections) count toward
coverage — glance, reminders, and the editor's note are derived views.
`verifyCoverage` returns `{ ok, missing }`. The generate route returns HTTP 207
(not 200) when gaps exist, and the UI shows a labeled "Also on your schedule"
block rather than dropping anything. Unit tests assert full coverage for 1, 2,
6, and 50-event days.

## One document model, two renderers

`NewspaperView.tsx` (React, on screen) and `render-html.ts` (string, for PDF)
render the same `Edition` object. The preview and the PDF can't drift because
they share the source model (spec §13).

## Security notes

- AI calls are server-side only; the key never reaches the browser.
- Event text is treated as data, not instructions (prompt-injection safe): the
  extractor asks the model to categorize, and output is Zod-validated — model
  text can't change system behavior.
- Zod validates every API input and every piece of untrusted AI output.
