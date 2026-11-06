import { describe, it, expect } from 'vitest';
import { composeEdition } from '../../src/features/editions/compose';
import { paperHtml } from '../../src/features/paper/paper';
import { renderEditionHtml } from '../../src/features/editions/render-html';
import { EventSchema, type EventRecord } from '../../src/types/event';

let n = 0;
const ev = (p: Partial<EventRecord> & Pick<EventRecord, 'title' | 'category'>) =>
  EventSchema.parse({ id: `p${n++}`, dateLocal: '2026-11-07', ...p });

const events = [
  ev({ title: 'Leg day at the gym', category: 'fitness', startTime: '07:00', timePrecision: 'exact', description: 'leg day' }),
  ev({ title: 'Doctor', category: 'medical', startTime: '15:00', timePrecision: 'exact' }),
  ev({ title: "Sarah's birthday", category: 'birthday', person: 'Sarah', reminderAt: '20:00' }),
  ev({ title: 'Pick up a cake', category: 'errand' }),
  ev({ title: 'Buy groceries', category: 'errand', checklist: [{ title: 'milk', completed: false }] }),
];

describe('one-page paper', () => {
  const edition = composeEdition({ events, editionDate: '2026-11-07', calorieTarget: 2200 });

  it('plans every event in detail', () => {
    expect(edition.items).toHaveLength(events.length);
    const gym = edition.items.find((i) => i.group === 'fitness')!;
    expect(gym.brief.steps.join(' ')).toMatch(/Back squat — 4 × 8/); // "leg day" detected from the description
    const doc = edition.items.find((i) => i.category === 'medical')!;
    expect(doc.brief.metrics.find((m) => m.label === 'Leave by')?.value).toBe('2:20 PM');
    expect(edition.plan.calories?.target).toBe(2200);
    expect(edition.plan.calories?.source).toBe('you');
    // the cake belongs with the celebration it serves
    expect(edition.items.find((i) => i.title === 'Pick up a cake')?.group).toBe('celebration');
  });

  it('renders a single self-contained sheet, escaping untrusted text', () => {
    const evil = composeEdition({
      events: [ev({ title: '<img src=x onerror=alert(1)>', category: 'task' })],
      editionDate: '2026-11-07',
      masthead: '<script>alert(1)</script>',
    });
    const html = renderEditionHtml(evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect((paperHtml(edition).match(/class="paper"/g) ?? []).length).toBe(1);
  });

  it('forces print backgrounds and a fixed page size', () => {
    const html = renderEditionHtml(edition, { paperSize: 'a4' });
    expect(html).toContain('print-color-adjust:exact');
    expect(html).toContain('@page{size:A4;margin:0}');
  });
});
