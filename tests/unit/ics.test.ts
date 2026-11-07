import { describe, it, expect } from 'vitest';
import { composeEdition } from '../../src/features/editions/compose';
import { editionToIcs } from '../../src/lib/ics';
import { EventSchema } from '../../src/types/event';

describe('calendar export', () => {
  it('writes timed items as VEVENTs with alerts', () => {
    const events = [
      EventSchema.parse({ id: 'a', title: 'Chest day', category: 'fitness', dateLocal: '2026-11-07', startTime: '06:00', timePrecision: 'exact' }),
      EventSchema.parse({ id: 'b', title: 'Call, mom', category: 'social', dateLocal: '2026-11-07' }),
    ];
    const ics = editionToIcs(composeEdition({ events, editionDate: '2026-11-07' }));
    expect(ics).toContain('DTSTART:20261107T060000');
    expect(ics).toContain('SUMMARY:Chest day');
    expect(ics).toContain('SUMMARY:Call\\, mom');
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(2); // un-timed items get suggested slots
    expect(ics).toContain('TRIGGER:-PT10M');
  });
});
