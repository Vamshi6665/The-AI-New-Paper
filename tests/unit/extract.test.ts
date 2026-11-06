import { describe, it, expect } from 'vitest';
import { ruleExtract } from '../../src/features/ai/rule-extract';
import type { ResolveContext } from '../../src/lib/datetime/resolve';

const ctx: ResolveContext = { timezone: 'America/Chicago', todayLocal: '2026-11-06' };

describe('rule-based extraction (zero-config path)', () => {
  it('splits multiple events from one sentence', () => {
    const r = ruleExtract(
      'Tomorrow I have a gym session at 6 AM, an interview at 11, a dentist appointment at 2 PM, and I need to buy groceries',
      ctx
    );
    expect(r.events.length).toBe(4);
  });

  it('keeps every event on tomorrow', () => {
    const r = ruleExtract('Tomorrow gym at 7 and meeting at 10', ctx);
    expect(r.events.every((e) => e.dateLocal === '2026-11-07')).toBe(true);
  });

  it('categorizes by keyword', () => {
    const r = ruleExtract('Tomorrow doctor at 3 PM', ctx);
    expect(r.events[0]?.category).toBe('medical');
  });

  it('keeps "evening" as part-of-day, not a clock time', () => {
    const r = ruleExtract('Tomorrow evening I need milk, eggs and bread', ctx);
    const e = r.events[0]!;
    expect(e.timePrecision).toBe('partofday');
    expect(e.partOfDay).toBe('evening');
    expect(e.startTime).toBeNull();
  });

  it('builds a checklist from a grocery list', () => {
    const r = ruleExtract('Tomorrow buy milk, eggs, bread and bananas', ctx);
    const e = r.events[0]!;
    expect(e.checklist.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts a person for a birthday call', () => {
    const r = ruleExtract("Tomorrow is Sarah's birthday, remind me to call her at 8 PM", ctx);
    const e = r.events[0]!;
    expect(e.person).toBe('Sarah');
  });

  it('flags ambiguous bare-hour time as missing', () => {
    const r = ruleExtract('Tomorrow meeting at 11', ctx);
    expect(r.events[0]?.missing.some((m) => /AM or PM/i.test(m))).toBe(true);
  });
});
