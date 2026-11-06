import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eventStore } from '@/server/repositories/event-store';

export const runtime = 'nodejs';

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  timePrecision: z.enum(['exact', 'partofday', 'none']).optional(),
  partOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).nullable().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  dateLocal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checklist: z.array(z.object({ title: z.string(), completed: z.boolean() })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ev = await eventStore().get(params.id);
  if (!ev) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid patch', details: parsed.error.flatten() }, { status: 422 });
  }
  const updated = await eventStore().update(params.id, parsed.data);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await eventStore().remove(params.id);
  return NextResponse.json({ deleted: ok }, { status: ok ? 200 : 404 });
}
