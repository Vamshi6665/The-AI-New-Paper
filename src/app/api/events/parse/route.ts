import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { extractEvents } from '@/features/ai/extract';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  timezone: z.string().default('America/Chicago'),
});

/** POST /api/events/parse — natural language → extracted events (not yet saved). */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const result = await extractEvents(parsed.data.text, parsed.data.timezone);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Extraction failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
