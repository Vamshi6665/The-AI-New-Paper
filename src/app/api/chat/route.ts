import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { extractEvents } from '@/features/ai/extract';
import { enrichEdition } from '@/features/ai/enrich';
import { composeEdition } from '@/features/editions/compose';
import { aiBriefs } from '@/features/ai/briefs';
import { liveMovies } from '@/server/movies';
import { parseCalorieTarget } from '@/features/editions/plan';
import { EventSchema, type EventRecord } from '@/types/event';
import { formatDateDisplay, todayInTz, addDays } from '@/lib/datetime/resolve';
import { handlePost, ok } from '@/server/http';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 45;

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  timezone: z.string().default('America/Chicago'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/**
 * POST /api/chat — the conversational entry point. One message in; events are
 * extracted, the edition is composed with an invented masthead + a quote themed
 * to the day, and the whole paper comes back with a short assistant reply.
 *
 * Validation, rate limiting, logging, and error handling are in handlePost.
 * Stateless by design here; persistence is the Phase-2 layer.
 */
export async function POST(req: NextRequest) {
  return handlePost(
    req,
    'chat',
    BodySchema,
    async ({ message, timezone, date }) => {
      const extraction = await extractEvents(message, timezone);

      const dates: string[] = extraction.events
        .map((e) => e.dateLocal)
        .filter((d): d is string => Boolean(d));
      const editionDate: string = date ?? mode(dates) ?? addDays(todayInTz(timezone), 1);

      const events: EventRecord[] = extraction.events
        .filter((e) => e.dateLocal === editionDate)
        .map((e) =>
          EventSchema.parse({
            id: randomUUID(),
            userId: 'chat',
            title: e.title,
            description: e.description,
            category: e.category,
            dateLocal: e.dateLocal,
            startTime: e.startTime,
            endTime: e.endTime,
            timePrecision: e.timePrecision,
            partOfDay: e.partOfDay,
            priority: e.priority,
            location: e.location,
            person: e.person,
            reminderAt: e.reminderAt,
            checklist: e.checklist.map((t) => ({ title: t, completed: false })),
            sourceType: 'nl',
            sourceText: message,
          })
        );

      const dateDisplay = formatDateDisplay(editionDate);
      const wantsMovies = events.some((e) => e.category === 'leisure' || e.category === 'social');
      const [enrich, briefOverrides, movies] = await Promise.all([
        enrichEdition(events, dateDisplay),
        aiBriefs(events, dateDisplay, message),
        wantsMovies ? liveMovies() : Promise.resolve(null),
      ]);

      const edition = composeEdition({
        events,
        editionDate,
        masthead: enrich.masthead,
        quote: enrich.quote,
        leadHeadline: enrich.leadHeadline,
        leadBody: enrich.leadBody,
        calorieTarget: parseCalorieTarget(message),
        briefOverrides,
        movies,
      });

      return ok({ reply: enrich.reply, edition, warnings: extraction.warnings, eventCount: events.length });
    },
    { limit: 12, windowMs: 60_000 }
  );
}

function mode(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts = new Map<string, number>();
  for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}
