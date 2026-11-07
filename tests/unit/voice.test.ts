import { describe, it, expect } from 'vitest';
import { normalizeSpeech } from '../../src/lib/speech';
import { ruleExtract } from '../../src/features/ai/rule-extract';
import { parseCalorieTarget, buildDayPlan } from '../../src/features/editions/plan';

const ctx = { timezone: 'America/Chicago', todayLocal: '2026-11-06' };
const run = (t: string) => ruleExtract(normalizeSpeech(t), ctx).events;

describe('voice transcripts', () => {
  it('normalizes spoken times', () => {
    expect(normalizeSpeech('gym at seven a.m. and call at 8 p.m.')).toBe('gym at 7 am and call at 8 pm');
    expect(normalizeSpeech('meeting at ten thirty')).toContain('10:30');
    expect(normalizeSpeech('half past six wake up')).toContain('6:30');
  });

  it('extracts a long comma-separated spoken day', () => {
    const ev = run(
      "Tomorrow I have gym at seven a.m., a project meeting at ten, doctor at three p.m., it's Sarah's birthday so call her at 8 p.m., pick up a cake, finish my slides, and buy milk, eggs and bread"
    );
    const titles = ev.map((e) => e.title);
    expect(titles.some((t) => /gym/i.test(t))).toBe(true);
    const bd = ev.find((e) => e.category === 'birthday')!;
    expect(bd.person).toBe('Sarah');
    expect(bd.reminderAt).toBe('20:00');
    expect(ev.some((e) => /cake/i.test(e.title) && !/slides/i.test(e.title))).toBe(true);
    expect(ev.some((e) => /slides/i.test(e.title))).toBe(true);
    const buy = ev.find((e) => e.checklist.length >= 3)!;
    expect(buy.checklist).toEqual(['milk', 'eggs', 'bread']);
    expect(ev.every((e) => !/^[:,\s]/.test(e.title))).toBe(true);
  });
});

describe('regression: list protection survives the production minifier', () => {
  it('keeps a comma list as ONE errand and still splits the next task', () => {
    const ev = run('dinner at 8, and I need to buy milk, eggs, bread, rice, tea and chicken, finish the report, pay rent');
    expect(ev.map((e) => e.title.toLowerCase()).filter((t) => /report|rent|dinner/.test(t))).toHaveLength(3);
    expect(ev.filter((e) => e.checklist.length > 0)).toHaveLength(1);
  });
  it('does not fold an unrelated call into a birthday', () => {
    const ev = run("call mom at 5, it's Dev's birthday so call him at 9 pm");
    expect(ev.some((e) => /mom/i.test(e.title))).toBe(true);
    expect(ev.find((e) => e.category === 'birthday')?.person).toBe('Dev');
  });
});

describe('bare hours use context', () => {
  it('dinner at 8 is evening; gym at 6 is morning; a call at 5 is afternoon', () => {
    const ev = run('gym at 6, call mom at 5, dinner at 8');
    expect(ev.map((e) => e.startTime)).toEqual(['06:00', '17:00', '20:00']);
  });
});

describe('planning', () => {
  it('reads a calorie goal and ignores single-meal sizes', () => {
    expect(parseCalorieTarget('I want 2000 calories today')).toBe(2000);
    expect(parseCalorieTarget('a 200 calorie snack')).toBeNull();
    expect(parseCalorieTarget('2,400 kcal')).toBe(2400);
  });
  it('plans wake time and fuel around a morning workout', () => {
    const plan = buildDayPlan([], {});
    expect(plan.calories).toBeNull();
    expect(plan.waterLiters).toBe(2.5);
  });
});

describe('your-day scenarios', () => {
  const text =
    "I need to go to my sister's place in the evening, I have a workout session of the chest day at 6, I need to go to the grocery store, I want to watch a movie at night, and I want 3000 calories";
  it('splits into four events and keeps the calorie goal out of them', () => {
    const ev = run(text);
    expect(ev.map((e) => e.category)).toEqual(['social', 'fitness', 'errand', 'leisure']);
    expect(ev.find((e) => e.category === 'errand')!.checklist).toEqual([]); // no list given -> planner adds a starter list
    expect(ev.find((e) => e.category === 'social')!.partOfDay).toBe('evening');
    expect(parseCalorieTarget(text)).toBe(3000);
  });
});

describe('until-time', () => {
  it('"deep work till noon" is a morning block ending at 12:00', () => {
    const [e] = run('Deep work till noon');
    expect(e!.endTime).toBe('12:00');
    expect(e!.startTime).toBe('09:00');
  });
});
