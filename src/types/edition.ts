import { z } from 'zod';
import type { EventRecord } from './event';

/**
 * The newspaper document model (spec §6, §11). Composed FROM events; every
 * section item carries the source event IDs it represents, which is what the
 * zero-missing-event guarantee (spec §12) checks against.
 */

export type SectionType =
  | 'glance'
  | 'agenda'
  | 'fitness'
  | 'celebrations'
  | 'appointments'
  | 'work'
  | 'tasks'
  | 'reminders'
  | 'editorsNote';

export interface AgendaRow {
  time: string; // "7:00 AM" or "Morning" or "Anytime"
  title: string;
  details: string;
  eventId: string;
}

export interface SectionItem {
  heading?: string;
  lines: string[];
  checklist?: { title: string; completed: boolean }[];
  eventIds: string[]; // source events this item represents
}

export interface NewspaperSection {
  type: SectionType;
  title: string;
  lead?: string; // optional editorial headline for the section
  rows?: AgendaRow[]; // for the agenda table
  items?: SectionItem[];
  eventIds: string[]; // every source event covered by this section
}

export interface Edition {
  id: string;
  userId: string;
  editionDate: string; // yyyy-mm-dd
  dateDisplay: string; // "Saturday, November 7, 2026"
  editionNo: number;
  masthead: string;
  tagline: string;
  quote: { text: string; author: string } | null;
  leadHeadline: string;
  leadBody: string;
  sections: NewspaperSection[];
  sourceEventIds: string[]; // all eligible events for the date
  representedEventIds: string[]; // all events actually placed in sections
  missingEventIds: string[]; // sourceEventIds not represented (must be empty to pass)
  generatedAt: string;
  contentHash: string;
}

export const GlanceSchema = z.object({
  totalActivities: z.number(),
  appointments: z.number(),
  tasks: z.number(),
  reminders: z.number(),
  workoutMinutes: z.number().nullable(),
  earliest: z.string().nullable(),
  latest: z.string().nullable(),
});
export type Glance = z.infer<typeof GlanceSchema>;

export interface EditionInput {
  events: EventRecord[];
  editionDate: string;
  timezone: string;
  masthead?: string;
}
