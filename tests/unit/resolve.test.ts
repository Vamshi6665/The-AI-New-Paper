import { describe, it, expect } from 'vitest';
import {
  resolveRelativeDate,
  normalizeTime,
  addDays,
  detectPartOfDay,
  formatClock,
  type ResolveContext,
} from '../../src/lib/datetime/resolve';

// Reference: 2026-11-06 is a Friday.
const ctx: ResolveContext = { timezone: 'America/Chicago', todayLocal: '2026-11-06' };

describe('date resolution', () => {
  it('resolves tomorrow / today / yesterday', () => {
    expect(resolveRelativeDate('tomorrow I have a meeting', ctx)).toBe('2026-11-07');
    expect(resolveRelativeDate('today', ctx)).toBe('2026-11-06');
    expect(resolveRelativeDate('yesterday', ctx)).toBe('2026-11-05');
  });

  it('resolves next weekday', () => {
    // Friday -> next Monday is 2026-11-09
    expect(resolveRelativeDate('next monday', ctx)).toBe('2026-11-09');
  });

  it('bare weekday gives the upcoming occurrence, never today', () => {
    expect(resolveRelativeDate('friday', ctx)).toBe('2026-11-13');
  });

  it('passes through explicit iso date', () => {
    expect(resolveRelativeDate('on 2026-12-25', ctx)).toBe('2026-12-25');
  });

  it('returns null when no date phrase present', () => {
    expect(resolveRelativeDate('buy groceries', ctx)).toBeNull();
  });

  it('addDays crosses month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('time normalization', () => {
  it('parses 12-hour times', () => {
    expect(normalizeTime('7 AM')).toBe('07:00');
    expect(normalizeTime('3 PM')).toBe('15:00');
    expect(normalizeTime('8:30 pm')).toBe('20:30');
    expect(normalizeTime('12 am')).toBe('00:00');
    expect(normalizeTime('12 pm')).toBe('12:00');
  });
  it('rejects non-times', () => {
    expect(normalizeTime('evening')).toBeNull();
    expect(normalizeTime(null)).toBeNull();
  });
  it('formats back to clock', () => {
    expect(formatClock('07:00')).toBe('7:00 AM');
    expect(formatClock('15:30')).toBe('3:30 PM');
  });
});

describe('part of day', () => {
  it('detects phrases', () => {
    expect(detectPartOfDay('tomorrow evening')).toBe('evening');
    expect(detectPartOfDay('in the morning')).toBe('morning');
    expect(detectPartOfDay('at noon')).toBe('afternoon');
    expect(detectPartOfDay('buy milk')).toBeNull();
  });
});
