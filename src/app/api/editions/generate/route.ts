import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eventStore } from '@/server/repositories/event-store';
import { composeEdition, verifyCoverage } from '@/features/editions/compose';

export const runtime = 'nodejs';
export const maxDuration = 30;

const USER = 'demo-user';

const BodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  masthead: z.string().max(80).optional(),
});

/**
 * POST /api/editions/generate — collect the date's events (system of record),
 * compose the newspaper, and verify zero-missing-event coverage before return.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });
  }

  const events = await eventStore().listByDate(USER, parsed.data.date);
  const edition = composeEdition({
    events,
    editionDate: parsed.data.date,
    masthead: parsed.data.masthead,
  });

  const coverage = verifyCoverage(edition);
  // The guarantee: we never silently drop events. If any source event is not
  // represented, we flag it — the client shows a labeled "missing" block.
  return NextResponse.json(
    { edition, coverage },
    { status: coverage.ok ? 200 : 207 } // 207: generated, but with flagged gaps
  );
}
