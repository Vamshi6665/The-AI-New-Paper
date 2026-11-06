import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eventStore } from '@/server/repositories/event-store';
import { EVENT_CATEGORIES } from '@/types/event';

export const runtime = 'nodejs';

const USER = 'demo-user'; // single-user demo; swap for auth'd user in Phase 1

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(EVENT_CATEGORIES),
  dateLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  timePrecision: z.enum(['exact', 'partofday', 'none']).optional(),
  partOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  location: z.string().nullable().optional(),
  person: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  checklist: z.array(z.object({ title: z.string(), completed: z.boolean().default(false) })).optional(),
  reminderAt: z.string().nullable().optional(),
  sourceType: z.enum(['nl', 'manual', 'voice']).optional(),
  sourceText: z.string().nullable().optional(),
});

/** Accept either a single event or a batch (from the review screen). */
const BodySchema = z.union([CreateSchema, z.object({ events: z.array(CreateSchema).min(1).max(100) })]);

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event', details: parsed.error.flatten() }, { status: 422 });
  }
  const store = eventStore();
  const inputs = 'events' in parsed.data ? parsed.data.events : [parsed.data];
  const created = await store.bulkCreate(inputs.map((i) => ({ ...i, userId: USER })));
  return NextResponse.json({ events: created }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-MM-DD required' }, { status: 400 });
  }
  const events = await eventStore().listByDate(USER, date);
  return NextResponse.json({ date, events });
}
