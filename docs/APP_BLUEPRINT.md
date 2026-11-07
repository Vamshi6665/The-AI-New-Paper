# The Daily Edition — Mobile App Blueprint

Hand this file to any AI builder (Cursor, Lovable, v0, Bolt, Claude Code). It describes the product, flows, data model, API, notification engine and build order. The website in this repo is the working prototype of the "plan engine" — reuse its logic.

## 1. Product in one line
Dictate your day once. The app turns it into a timed plan, sends smart notifications through the day, and can print the plan as a one-page newspaper.

## 2. Users and core loop
1. **Capture** — speak or type ("chest day at 6, sister at 6 PM, movie, groceries, 3000 calories").
2. **Plan** — engine extracts events, assigns time slots, builds details (workout cycles, meals, leave-by times, movie picks).
3. **Confirm** — user sees the timeline, edits/drags items, taps Confirm.
4. **Nudge** — notifications fire at the right moments; user taps Done / Snooze / Skip.
5. **Review** — evening wrap-up; optional one-page "Edition" PDF.

## 3. Screens
| Screen | Purpose |
|---|---|
| Onboarding | Name, wake/sleep time, calorie goal (optional), notification permission, timezone |
| Home (Today) | Timeline of today, next-up card, water tracker, quick-add mic button |
| Dictate | Big mic, live transcript, "Build my day" |
| Plan review | Timeline with suggested slots flagged; edit time, duration, delete |
| Item detail | Workout cycles / meal split / visit prep / movie picks, checklist |
| Edition | The one-page paper preview, Print / Download PDF / Share |
| Settings | Notification rules, quiet hours, units, theme, account |

Theme: dark "Velocity" (navy `#080b14`, electric blue `#2e7dff`, racing red `#e3122e`; Oswald headings, Inter body). The paper uses its own warm-newsprint look (cream `#f4eedd`, ink `#1c1a16`, deep green `#1f5c4a`).

## 4. Data model (Postgres / Prisma)
- **User** id, email, timezone, wakeTime, sleepTime, calorieGoal, pushTokens[]
- **Event** id, userId, date, title, category (fitness|social|leisure|errand|meeting|medical|finance|study|meal|birthday|task|…), startTime, endTime, timePrecision (exact|partofday|none), suggested (bool), location, person, priority, checklist[], brief (json), status (planned|done|skipped|snoozed)
- **Plan** id, userId, date, calories json (target, meals[{name,time,kcal}]), waterLiters, lightsOut
- **Notification** id, eventId, fireAt, kind (prep|leave|start|water|meal|winddown|summary), status (scheduled|sent|acted), payload json
- **Device** id, userId, platform, token

Source of truth is **events**; the paper and the plan are renderings of them.

## 5. API
- `POST /api/chat` `{message, timezone}` → `{events, edition}` (exists)
- `POST /api/chat/pdf` `{edition, paperSize}` → PDF (exists)
- `GET /api/health` (exists)
- To add: `POST /auth/*`, `GET/PATCH /events`, `POST /plans/:date/confirm`, `POST /devices`, `POST /notifications/:id/action`

## 6. Notification engine (the new part)
When a plan is confirmed, generate notifications from each event (times in user's timezone):
| Event | Notifications |
|---|---|
| Workout | pre-workout meal (-45 min), "Pack your bag" (-30), "Warm-up starts" (0), "Protein within 45 min" (+end) |
| Visit (sister etc.) | "Leave by HH:MM" (-30 min travel), "Bring: gift/sweets" (-2 h) |
| Movie | "Choose a film + snacks" (-30 min), "Lights low" (0) |
| Grocery / errand | at start; "List: milk, bread…" |
| Meals (from calorie split) | at each meal time with the idea ("Lunch 900 kcal: chicken bowl") |
| Water | every ~90 min between wake and sleep, front-loaded |
| Wind-down | 45 min before lights-out |
| Morning summary | wake time: "Your day: 4 items, first at 6:00" |
Rules: respect quiet hours, collapse items closer than 10 min, actions: **Done / Snooze 10 min / Skip**.

Delivery options (pick one):
- **Fastest:** PWA (this Next.js site + service worker + Web Push/VAPID). Works on Android and iOS 16.4+ when installed to home screen.
- **Best native:** Expo (React Native) + Expo Notifications; schedule local notifications on-device (works offline) and sync with the API.
- Server-side: a job queue (BullMQ / Vercel Cron / Supabase pg_cron) that fires due `Notification` rows.

## 7. Plan engine (reuse from the repo)
- `src/features/ai/rule-extract.ts` — zero-config extractor (works without a key)
- `src/features/ai/extract.ts` — Anthropic extraction (Zod-validated), falls back to rules
- `src/features/editions/schedule.ts` — slot suggestions (groceries ~4:30 PM, movie 6–9 PM, visit ~6 PM; conflict-free with buffers)
- `src/features/editions/plan.ts` — workout cycles (chest: 60 min in 4 cycles), meals split to the calorie goal, leave-by, picks
- `src/features/editions/movies.ts` + `src/server/movies.ts` — curated picks, live TMDB when `TMDB_API_KEY` is set
- Voice: Web Speech API on web; `expo-speech-recognition` or the OS keyboard dictation on mobile

## 8. Build order
1. **Website (done):** chat → one-page paper, voice, print/PDF.
2. **Accounts + database:** Prisma schema is ready; add Supabase/Neon Postgres and auth (Clerk or Auth.js).
3. **Persist events and plans;** Today screen; edit/confirm.
4. **Notifications:** PWA push first (service worker, VAPID, `/api/push/subscribe`, cron to fire).
5. **Native shell (optional):** Expo app calling the same API, local notifications.
6. **Polish:** calendar import (Google Calendar), widgets, streaks, weekly review.

## 9. Environment variables
`ANTHROPIC_API_KEY` (server only), `TMDB_API_KEY` (optional), `DATABASE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CHROMIUM_PATH` (PDF). Never expose keys via `NEXT_PUBLIC_*`.

## 10. Prompt to give another AI builder
> Build a mobile-first app called "The Daily Edition" following `docs/APP_BLUEPRINT.md`. Reuse the plan engine from this repo (do not rewrite extraction/scheduling). Start with the Today screen, Dictate screen and Plan review, backed by the existing `/api/chat`. Then add accounts, persistence and push notifications per section 6. Use the Velocity theme for the app and the newsprint theme for the paper.
