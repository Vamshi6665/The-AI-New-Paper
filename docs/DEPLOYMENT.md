# Deployment

## Vercel (recommended)

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Or import the GitHub repo in the Vercel dashboard.

### Environment variables

| Variable | Required? | Enables |
|---|---|---|
| `ANTHROPIC_API_KEY` | optional | LLM event extraction (falls back to rule-based) |
| `AGENT_MODEL` | optional | model override (default `claude-sonnet-4-5`) |
| `DATABASE_URL` | optional (Phase 2) | Prisma/Postgres persistence |
| `CHROMIUM_PATH` | optional | override Chromium binary for the PDF route |
| `NEXT_PUBLIC_SITE_URL` | optional | absolute links |

With none set, the app runs in zero-config mode — ideal for a public demo.

### PDF route on Vercel

The PDF endpoint uses Playwright Chromium. On Vercel, add a build step so the
browser is present:

```json
// package.json → scripts
"postinstall": "playwright install chromium"
```

or set `CHROMIUM_PATH` to a system Chromium if your runtime provides one.

## Local

```bash
npm install
npx playwright install chromium
npm run dev
```

## Docker

```bash
docker build -t daily-edition .
docker run -p 3000:3000 --env-file .env.local daily-edition
```

The Dockerfile installs Chromium for the PDF route.

## Database (Phase 2)

The Prisma schema is ready at `prisma/schema.prisma`. To switch persistence from
in-memory to Postgres:

```bash
export DATABASE_URL=postgresql://...
npx prisma migrate dev --name init
```

Then implement `PrismaEventStore` against the same `EventStore` interface and
return it from `eventStore()` when `features.hasDatabase` is true — no other
layer changes.

## Verify a deploy

```bash
curl -X POST https://YOUR_APP/api/events/parse \
  -H 'Content-Type: application/json' \
  -d '{"text":"tomorrow gym at 7 and doctor at 3 PM","timezone":"America/Chicago"}'
```
