import { z } from 'zod';
import type { EventCategory, EventRecord } from './event';

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

/** Extensive per-event detail so the paper is a plan, not just a list. */
export interface EventBrief {
  blurb: string; // one-line "what / why"
  steps: string[]; // ordered plan lines; "Name — detail" renders as two columns
  checklist: string[]; // tick-off items (bring / buy / prepare)
  metrics: { label: string; value: string }[]; // short chips: Duration, Leave by, Burn…
  suggestions?: { title: string; note: string }[]; // e.g. movie picks for the evening
  suggestionsLabel?: string; // heading for the suggestions block
}

export type ItemGroup = 'fitness' | 'celebration' | 'appointment' | 'work' | 'task' | 'social' | 'leisure';

/** One normalized, fully-detailed entry per source event — what the paper renders. */
export interface EditionItem {
  eventId: string;
  title: string;
  category: EventCategory;
  group: ItemGroup;
  timeLabel: string; // "7:00 AM" | "Morning" | "Anytime"
  startTime: string | null;
  endTime: string | null;
  exact: boolean;
  suggested: boolean; // time was chosen by the planner, not stated by the user
  endLabel: string | null;
  location: string | null;
  person: string | null;
  priority: 'low' | 'normal' | 'high';
  reminder: string | null; // formatted clock
  brief: EventBrief;
}

/** Day-level plan: rhythm, fuel and hydration. */
export interface DayPlan {
  wake: string; // "6:00 AM"
  firstMove: string | null;
  lastItem: string | null;
  lightsOut: string;
  calories: {
    target: number;
    source: 'you' | 'suggested';
    protein: number;
    meals: { name: string; kcal: number; idea: string; time: string }[];
    note: string;
  } | null;
  waterLiters: number;
  waterGlasses: number; // 250 ml each
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
  items: EditionItem[];
  plan: DayPlan;
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
