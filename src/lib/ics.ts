import type { Edition } from '@/types/edition';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
const stamp = (d: string, hhmm: string) => `${d.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const t = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Timed items of an edition as an iCalendar file (floating local time, 10-min alert). */
export function editionToIcs(edition: Edition): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Daily Edition//EN', 'CALSCALE:GREGORIAN'];
  for (const it of edition.items) {
    if (!it.startTime) continue;
    const end = it.endTime ?? addMinutes(it.startTime, 60);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${edition.editionDate}-${it.eventId}@daily-edition`,
      `DTSTAMP:${stamp(edition.editionDate, '00:00')}Z`,
      `DTSTART:${stamp(edition.editionDate, it.startTime)}`,
      `DTEND:${stamp(edition.editionDate, end)}`,
      `SUMMARY:${esc(it.title)}`,
      ...(it.location ? [`LOCATION:${esc(it.location)}`] : []),
      `DESCRIPTION:${esc(it.brief.blurb)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(it.title)}`, 'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
