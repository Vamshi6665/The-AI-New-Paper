import { describe, it, expect } from 'vitest';
import { composeEdition } from '../../src/features/editions/compose';
import { EventSchema, type EventRecord } from '../../src/types/event';

let n = 0;
const ev = (p: Partial<EventRecord> & Pick<EventRecord, 'title' | 'category'>) =>
  EventSchema.parse({ id: `s${n++}`, dateLocal: '2026-11-07', ...p });

describe('suggested times and plans', () => {
  const events = [
    ev({ title: 'Workout session of the chest day', category: 'fitness', startTime: '06:00', timePrecision: 'exact' }),
    ev({ title: 'Grocery store', category: 'errand' }),
    ev({ title: "Visit my sister's place", category: 'social', partOfDay: 'evening', timePrecision: 'partofday' }),
    ev({ title: 'Watch a movie', category: 'leisure', partOfDay: 'night', timePrecision: 'partofday' }),
  ];
  const e = composeEdition({ events, editionDate: '2026-11-07', calorieTarget: 3000 });
  const by = (t: string) => e.items.find((i) => i.title.includes(t))!;

  it('gives un-timed items a flagged, conflict-free slot', () => {
    expect(by('Grocery').suggested).toBe(true);
    expect(by('Grocery').timeLabel).toBe('4:30 PM');
    expect(by('sister').timeLabel).toBe('6:00 PM');
    expect(by('movie').startTime).toBe('19:30'); // movie night, inside the evening at the sister's
    expect(by('chest').suggested).toBe(false);
  });

  it('plans the chest day in detail', () => {
    const steps = by('chest').brief.steps.join(' | ');
    expect(steps).toMatch(/Cycle 1 · 16 min — Strength: Flat bench press 4 × 8/);
    expect(by('chest').brief.metrics.map((m) => m.label)).toEqual(expect.arrayContaining(['Focus', 'Rest', 'Total sets']));
  });

  it('suggests movies once (on the movie card, not the visit) and a leave-by for the visit', () => {
    expect(by('movie').brief.suggestions).toHaveLength(3);
    expect(by('sister').brief.suggestions).toBeUndefined();
    expect(by('sister').brief.metrics.find((m) => m.label === 'Leave by')?.value).toBe('5:30 PM');
  });

  it('breaks 3000 kcal into timed meals that sum to the target and include workout fuel', () => {
    const c = e.plan.calories!;
    expect(c.source).toBe('you');
    expect(Math.abs(c.meals.reduce((a, m) => a + m.kcal, 0) - 3000)).toBeLessThanOrEqual(30);
    expect(c.meals.map((m) => m.name)).toContain('Pre-workout');
    expect(c.meals.every((m) => /^\d{1,2}:\d{2} (AM|PM)$/.test(m.time))).toBe(true);
  });
});

describe('movie night with no time given', () => {
  it('blocks 6–9 PM', () => {
    const e = composeEdition({
      events: [ev({ title: 'Watch a movie', category: 'leisure' })],
      editionDate: '2026-11-07',
    });
    expect(e.items[0]!.timeLabel).toBe('6:00 PM');
    expect(e.items[0]!.endLabel).toBe('9:00 PM');
  });
});

describe('the page tells the truth about the day', () => {
  const events = [
    ev({ title: 'Chest day workout', category: 'fitness', startTime: '06:00', timePrecision: 'exact' }),
    ev({ title: 'Grocery store', category: 'errand' }),
    ev({ title: "Visit my sister's place", category: 'social', partOfDay: 'evening', timePrecision: 'partofday' }),
    ev({ title: 'Watch a movie', category: 'leisure', partOfDay: 'night', timePrecision: 'partofday' }),
  ];
  const e = composeEdition({ events, editionDate: '2026-11-07', calorieTarget: 3000 });
  const mv = e.items.find((i) => i.title.includes('movie'))!;
  const visit = e.items.find((i) => i.title.includes('sister'))!;

  it('header: first/last item cover suggested slots; lights-out is sane', () => {
    expect(e.plan.firstMove).toBe('6:00 AM');
    expect(e.plan.lastItem).toBe('7:30 PM');
    expect(e.plan.lightsOut).toMatch(/PM$/);
    expect(e.plan.lightsOut).not.toMatch(/^12/);
  });
  it('the movie is watched during the visit, which lasts until the film ends', () => {
    expect(mv.endTime).toBe('21:30');
    expect(visit.endTime).toBe('21:30');
  });
  it('lead is built from the day, not a template', () => {
    expect(e.leadHeadline.replace(/\u00a0/g, ' ')).toBe('Chest day workout at 6 AM, movie night by 7:30 PM');
    expect(e.leadBody).toMatch(/4 things today/);
    expect(e.leadBody).toMatch(/3,000 kcal/);
  });
});
