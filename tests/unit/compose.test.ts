import { describe, it, expect } from 'vitest';
import { composeEdition, verifyCoverage } from '../../src/features/editions/compose';
import { EventSchema, type EventRecord } from '../../src/types/event';

let seq = 0;
function ev(partial: Partial<EventRecord> & Pick<EventRecord, 'title' | 'category'>): EventRecord {
  return EventSchema.parse({
    id: `e${seq++}`,
    userId: 'demo-user',
    dateLocal: '2026-11-07',
    ...partial,
  });
}

describe('composeEdition — zero-missing-event guarantee (spec §12)', () => {
  it('represents every source event', () => {
    const events = [
      ev({ title: 'Gym', category: 'fitness', startTime: '07:00', timePrecision: 'exact' }),
      ev({ title: 'Project meeting', category: 'meeting', startTime: '10:00', timePrecision: 'exact' }),
      ev({ title: 'Doctor', category: 'medical', startTime: '15:00', timePrecision: 'exact' }),
      ev({ title: 'Call Sarah', category: 'birthday', person: 'Sarah', reminderAt: '20:00' }),
      ev({ title: 'Buy groceries', category: 'errand', checklist: [{ title: 'Milk', completed: false }] }),
      ev({ title: 'Finish presentation', category: 'task', linkedTo: null }),
    ];
    const edition = composeEdition({ events, editionDate: '2026-11-07' });
    const cov = verifyCoverage(edition);
    expect(cov.ok).toBe(true);
    expect(cov.missing).toEqual([]);
    expect(new Set(edition.representedEventIds).size).toBe(events.length);
  });

  it('covers unscheduled events via the Anytime section', () => {
    const events = [
      ev({ title: 'Buy groceries', category: 'errand' }),
      ev({ title: 'Pay electricity bill', category: 'finance' }),
    ];
    const edition = composeEdition({ events, editionDate: '2026-11-07' });
    expect(verifyCoverage(edition).ok).toBe(true);
  });

  it('handles the empty day without crashing', () => {
    const edition = composeEdition({ events: [], editionDate: '2026-11-07' });
    expect(edition.sourceEventIds).toEqual([]);
    expect(verifyCoverage(edition).ok).toBe(true);
    expect(edition.leadHeadline).toMatch(/clear day/i);
  });

  it('scales to 50 events with full coverage', () => {
    const events = Array.from({ length: 50 }, (_, i) => ev({ title: `Task ${i}`, category: 'task' }));
    const edition = composeEdition({ events, editionDate: '2026-11-07' });
    expect(verifyCoverage(edition).ok).toBe(true);
    expect(edition.representedEventIds.length).toBe(50);
  });

  it('builds a chronological agenda for timed events', () => {
    const events = [
      ev({ title: 'Late', category: 'meeting', startTime: '15:00', timePrecision: 'exact' }),
      ev({ title: 'Early', category: 'fitness', startTime: '07:00', timePrecision: 'exact' }),
    ];
    const edition = composeEdition({ events, editionDate: '2026-11-07' });
    const agenda = edition.sections.find((s) => s.type === 'agenda');
    expect(agenda?.rows?.[0]?.title).toBe('Early');
  });

  it('counts the glance from structured data', () => {
    const events = [
      ev({ title: 'Gym', category: 'fitness', startTime: '07:00', endTime: '07:45', timePrecision: 'exact' }),
      ev({ title: 'Doctor', category: 'medical', startTime: '15:00', timePrecision: 'exact' }),
    ];
    const edition = composeEdition({ events, editionDate: '2026-11-07' });
    const glance = edition.sections.find((s) => s.type === 'glance');
    const text = glance?.items?.[0]?.lines.join(' ') ?? '';
    expect(text).toMatch(/45 min/);
    expect(text).toMatch(/2 planned/);
  });
});
