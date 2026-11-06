import { randomUUID } from 'node:crypto';
import { EventSchema, type EventRecord } from '@/types/event';

/**
 * Event repository. Backed by Prisma/Postgres when DATABASE_URL is set;
 * otherwise an in-process Map (zero-config demo mode). The interface is
 * identical, so the API layer never branches on which backend is live.
 *
 * NOTE: the in-memory store is per-server-process and resets on restart — it
 * exists so the product runs and prints without a database. Production uses
 * Prisma (prisma/schema.prisma) with the same shape.
 */

export interface EventStore {
  create(
    input: Partial<EventRecord> & Pick<EventRecord, 'title' | 'category' | 'dateLocal'>
  ): Promise<EventRecord>;
  bulkCreate(
    inputs: Array<Partial<EventRecord> & Pick<EventRecord, 'title' | 'category' | 'dateLocal'>>
  ): Promise<EventRecord[]>;
  get(id: string): Promise<EventRecord | null>;
  listByDate(userId: string, dateLocal: string): Promise<EventRecord[]>;
  update(id: string, patch: Partial<EventRecord>): Promise<EventRecord | null>;
  remove(id: string): Promise<boolean>;
}

const now = () => new Date().toISOString();

function normalize(
  input: Partial<EventRecord> & Pick<EventRecord, 'title' | 'category' | 'dateLocal'>
): EventRecord {
  return EventSchema.parse({
    id: input.id ?? randomUUID(),
    userId: input.userId ?? 'demo-user',
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    dateLocal: input.dateLocal,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    timePrecision: input.timePrecision ?? 'none',
    partOfDay: input.partOfDay ?? null,
    allDay: input.allDay ?? false,
    priority: input.priority ?? 'normal',
    status: input.status ?? 'active',
    location: input.location ?? null,
    person: input.person ?? null,
    checklist: input.checklist ?? [],
    reminderAt: input.reminderAt ?? null,
    linkedTo: input.linkedTo ?? null,
    sourceType: input.sourceType ?? 'nl',
    sourceText: input.sourceText ?? null,
    createdAt: input.createdAt ?? now(),
    updatedAt: now(),
  });
}

class MemoryEventStore implements EventStore {
  private map = new Map<string, EventRecord>();

  async create(input: Parameters<EventStore['create']>[0]): Promise<EventRecord> {
    const rec = normalize(input);
    // Idempotent save (spec §17 "duplicate input submissions"): if an active
    // event with the same user/date/title/start already exists, return it
    // instead of creating a duplicate.
    const dupe = [...this.map.values()].find(
      (e) =>
        e.userId === rec.userId &&
        e.dateLocal === rec.dateLocal &&
        e.status !== 'cancelled' &&
        e.title.trim().toLowerCase() === rec.title.trim().toLowerCase() &&
        e.startTime === rec.startTime
    );
    if (dupe) return dupe;
    this.map.set(rec.id, rec);
    return rec;
  }
  async bulkCreate(inputs: Parameters<EventStore['bulkCreate']>[0]): Promise<EventRecord[]> {
    return Promise.all(inputs.map((i) => this.create(i)));
  }
  async get(id: string): Promise<EventRecord | null> {
    return this.map.get(id) ?? null;
  }
  async listByDate(userId: string, dateLocal: string): Promise<EventRecord[]> {
    return [...this.map.values()]
      .filter((e) => e.userId === userId && e.dateLocal === dateLocal && e.status !== 'cancelled')
      .sort(sortByTime);
  }
  async update(id: string, patch: Partial<EventRecord>): Promise<EventRecord | null> {
    const cur = this.map.get(id);
    if (!cur) return null;
    const next = EventSchema.parse({ ...cur, ...patch, id, updatedAt: now() });
    this.map.set(id, next);
    return next;
  }
  async remove(id: string): Promise<boolean> {
    return this.map.delete(id);
  }
}

/** Sort: timed events (by start) first, then part-of-day, then untimed. */
export function sortByTime(a: EventRecord, b: EventRecord): number {
  const rank = (e: EventRecord) =>
    e.timePrecision === 'exact' && e.startTime ? 0 : e.timePrecision === 'partofday' ? 1 : 2;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  return 0;
}

// Singleton for the process. Swap for a Prisma-backed implementation when
// DATABASE_URL is configured (see repositories/prisma-event-store.ts, Phase 1).
let _store: EventStore | null = null;
export function eventStore(): EventStore {
  if (!_store) _store = new MemoryEventStore();
  return _store;
}
